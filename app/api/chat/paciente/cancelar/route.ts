import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarToken } from '@/lib/chat/token'
import { sendCitaCanceladaPorPacienteEmail } from '@/lib/email'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  token: z.string().min(1).max(200),
})

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

function formatFechaHora(fecha: string, hora: string): string {
  const d = new Date(fecha + 'T00:00:00')
  const fechaFmt = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${fechaFmt} · ${hora.slice(0, 5)}`
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415, headers: securityHeaders })
    }

    const ip = getClientIp(request)

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Enlace inválido' }, { status: 400, headers: securityHeaders })
    }

    const sesion = await verificarToken(supabase, validation.data.token)

    // Mismo criterio que /api/chat/paciente/sesion: la adivinanza de tokens
    // inválidos consume un presupuesto por IP; una sesión ya verificada
    // consume uno propio ligado a la sala, más generoso pero acotado —
    // cancelar es una mutación puntual, no polling, así que el límite es bajo.
    const rateKey = sesion ? `chat_cancelar_sala:${sesion.salaId}` : `chat_cancelar:${ip}`
    const rateLimite = sesion ? 5 : 10

    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 900)
      if (count > rateLimite) {
        console.warn(`[${requestId}] Rate limit exceeded: ${rateKey}`)
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 15 minutos.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '900' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    if (!sesion) {
      console.warn(`[${requestId}] Token no encontrado: ${ip}`)
      return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 404, headers: securityHeaders })
    }

    const { data: cita, error: citaError } = await supabase
      .from('citas')
      .select('id, fecha, hora, estado, paciente_nombre')
      .eq('id', sesion.citaActualId)
      .maybeSingle()

    if (citaError || !cita) {
      console.error(`[${requestId}] Error leyendo cita:`, citaError)
      return NextResponse.json({ error: 'No se pudo cargar la cita' }, { status: 500, headers: securityHeaders })
    }

    if (cita.estado === 'cancelled' || cita.estado === 'cancelada_paciente' || cita.estado === 'completed') {
      return NextResponse.json({ error: 'Esta cita ya no se puede cancelar.' }, { status: 400, headers: securityHeaders })
    }

    // Cálculo de las 24h en el servidor, con la hora del momento del click —
    // nunca se confía en un cálculo hecho en el navegador del paciente.
    const citaDateTime = new Date(`${cita.fecha}T${cita.hora}`)
    const horasRestantes = (citaDateTime.getTime() - Date.now()) / (60 * 60 * 1000)

    if (horasRestantes < 24) {
      return NextResponse.json(
        { error: 'Ya no es posible cancelar esta cita, faltan menos de 24 horas para tu consulta.' },
        { status: 400, headers: securityHeaders }
      )
    }

    const { error: updateError } = await supabase
      .from('citas')
      .update({ estado: 'cancelada_paciente' })
      .eq('id', cita.id)

    if (updateError) {
      console.error(`[${requestId}] Error cancelando cita:`, updateError)
      return NextResponse.json({ error: 'No se pudo cancelar la cita' }, { status: 500, headers: securityHeaders })
    }

    const { data: doctor } = await supabase
      .from('doctors')
      .select('email, full_name, display_name')
      .eq('id', sesion.medicoId)
      .maybeSingle()

    if (doctor?.email) {
      try {
        await sendCitaCanceladaPorPacienteEmail(
          doctor.email,
          cita.paciente_nombre,
          formatFechaHora(cita.fecha, cita.hora)
        )
      } catch (emailError) {
        console.error(`[${requestId}] Error enviando correo de cancelación al médico:`, emailError)
      }
    }

    return NextResponse.json({ success: true }, { headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
