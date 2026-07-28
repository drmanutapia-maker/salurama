import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { hashOtpCode, OTP_MAX_ATTEMPTS } from '@/lib/pacienteOtp'

export const runtime = 'edge'
export const preferredRegion = 'mex1'

const bodySchema = z.object({
  medicoId: z.string().uuid('ID de médico inválido'),
  contacto: z.string().trim().min(3).max(254),
  code: z.string().trim().regex(/^\d{6}$/, 'Código inválido'),
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

// Mismo error genérico para todos los casos de rechazo (sin coincidencia,
// sin código pendiente, expirado, incorrecto, agotado) — no hay que darle
// a quien lo intenta ninguna pista de cuál fue la razón exacta.
function codigoInvalido(requestId: string) {
  return NextResponse.json(
    { error: 'Código inválido o expirado. Vuelve a buscar tus datos.' },
    { status: 400, headers: { ...securityHeaders, 'X-Request-ID': requestId } }
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
      const count = await redis.incr(`verificar_otp:${ip}`)
      if (count === 1) await redis.expire(`verificar_otp:${ip}`, 3600)
      if (count > 15) {
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
      return codigoInvalido(requestId)
    }

    const { medicoId, contacto, code } = validation.data

    const { data: match, error: rpcError } = await supabase
      .rpc('buscar_paciente_medico', { p_medico_id: medicoId, p_contacto: contacto })
      .maybeSingle() as { data: { paciente_id: string; nombre: string | null; email: string; telefono: string | null } | null; error: { message: string } | null }

    if (rpcError || !match) {
      return codigoInvalido(requestId)
    }

    const { data: paciente } = await supabase
      .from('pacientes')
      .select('otp_code_hash, otp_expires_at, otp_attempts')
      .eq('id', match.paciente_id)
      .single()

    if (!paciente?.otp_code_hash || !paciente.otp_expires_at) {
      return codigoInvalido(requestId)
    }

    if (new Date(paciente.otp_expires_at) < new Date()) {
      return codigoInvalido(requestId)
    }

    if (paciente.otp_attempts >= OTP_MAX_ATTEMPTS) {
      return codigoInvalido(requestId)
    }

    const codeHash = await hashOtpCode(code)

    if (codeHash !== paciente.otp_code_hash) {
      await supabase
        .from('pacientes')
        .update({ otp_attempts: paciente.otp_attempts + 1 })
        .eq('id', match.paciente_id)
      return codigoInvalido(requestId)
    }

    // Código correcto: se consume (de un solo uso) y se marca la ventana de
    // "sesión corta" que /api/citas exigirá para confiar en pacienteId.
    await supabase
      .from('pacientes')
      .update({ otp_code_hash: null, otp_expires_at: null, otp_attempts: 0, otp_verified_at: new Date().toISOString() })
      .eq('id', match.paciente_id)

    return NextResponse.json(
      {
        pacienteId: match.paciente_id,
        nombre: match.nombre,
        email: match.email,
        telefono: match.telefono,
      },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return codigoInvalido(requestId)
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
