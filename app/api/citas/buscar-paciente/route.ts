import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { generateOtpCode, hashOtpCode, OTP_EXPIRY_MINUTES } from '@/lib/pacienteOtp'
import { sendPacienteOtpEmail } from '@/lib/email'

export const runtime = 'edge'
export const preferredRegion = 'mex1'

const bodySchema = z.object({
  medicoId: z.string().uuid('ID de médico inválido'),
  contacto: z.string().trim().min(3).max(254),
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Respuesta genérica, siempre igual exista o no coincidencia — nunca revela
// si el contacto pertenece a un paciente real de este médico (confirmar
// eso ya es de por sí una fuga de información médica sensible). Ver
// auditoría del flujo de citas, 2026-07-28.
function respuestaGenerica(requestId: string) {
  return NextResponse.json(
    { message: 'Si tienes una cita previa con este médico, te enviamos un código a tu correo registrado.' },
    { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
  )
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415, headers: securityHeaders })
    }

    const ip = getClientIp(request)

    try {
      const count = await redis.incr(`buscar_paciente:${ip}`)
      if (count === 1) await redis.expire(`buscar_paciente:${ip}`, 3600)
      if (count > 8) {
        console.warn(`[${requestId}] Rate limit exceeded: ${ip}`)
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 1 hora.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '3600' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400, headers: securityHeaders })
    }

    const { medicoId, contacto } = validation.data

    const { data: match, error: rpcError } = await supabase
      .rpc('buscar_paciente_medico', { p_medico_id: medicoId, p_contacto: contacto })
      .maybeSingle() as { data: { paciente_id: string; nombre: string | null; email: string; telefono: string | null } | null; error: { message: string } | null }

    if (rpcError) {
      console.error(`[${requestId}] Error buscando paciente:`, rpcError)
      return respuestaGenerica(requestId)
    }

    if (match) {
      // Límite adicional por paciente (no solo por IP) — evita que alguien
      // bombardee el correo de una persona específica con códigos.
      try {
        const otpCount = await redis.incr(`buscar_paciente_otp:${match.paciente_id}`)
        if (otpCount === 1) await redis.expire(`buscar_paciente_otp:${match.paciente_id}`, 3600)
        if (otpCount > 3) {
          return respuestaGenerica(requestId)
        }
      } catch (redisError) {
        console.error(`[${requestId}] Redis error (otp):`, redisError)
      }

      const code = generateOtpCode()
      const codeHash = await hashOtpCode(code)
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString()

      await supabase
        .from('pacientes')
        .update({ otp_code_hash: codeHash, otp_expires_at: expiresAt, otp_attempts: 0 })
        .eq('id', match.paciente_id)

      const { data: medico } = await supabase.from('doctors').select('full_name').eq('id', medicoId).single()

      // No se espera el envío — la respuesta al cliente no debe variar en
      // tiempo según si hubo o no coincidencia. Pero "no esperar" con un
      // simple fire-and-forget es peligroso en edge runtime: en cuanto la
      // función responde, la plataforma puede cortar la ejecución antes de
      // que el envío a Resend termine, y el correo nunca llega -- sin que
      // ni siquiera el catch de abajo alcance a registrar el error (falla
      // en silencio). after() le garantiza a la plataforma que complete
      // esta tarea en segundo plano ANTES de cortar, sin retrasar la
      // respuesta que ya se le mandó al usuario.
      after(() =>
        sendPacienteOtpEmail(match.email, code, medico?.full_name || 'tu médico').catch((err) =>
          console.error(`[${requestId}] Error enviando OTP:`, err)
        )
      )
    }

    return respuestaGenerica(requestId)
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return respuestaGenerica(requestId)
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || '',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
