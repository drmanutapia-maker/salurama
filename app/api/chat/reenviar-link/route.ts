import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { generarToken, hashToken } from '@/lib/chat/token'
import { sendChatLinkReenvioEmail } from '@/lib/email'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  turnstileToken: z.string().min(1),
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

// Mismo mensaje exista o no el correo en el sistema — nunca revela si un
// email tiene chats activos (mismo principio que /api/citas/buscar-paciente).
function respuestaGenerica(requestId: string) {
  return NextResponse.json(
    { success: true, message: 'Si ese correo tiene chats activos, te llegará un correo con el link.' },
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

  if (!process.env.TURNSTILE_SECRET_KEY) {
    console.error(`[${requestId}] Missing env vars`)
    return NextResponse.json({ error: 'Configuración inválida' }, { status: 500 })
  }

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415, headers: securityHeaders })
    }

    const ip = getClientIp(request)
    const rateKey = `reenviar_link:${ip}`

    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 3600)
      if (count > 5) {
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
      return NextResponse.json({ error: 'Correo inválido' }, { status: 400, headers: securityHeaders })
    }

    const { email, turnstileToken } = validation.data

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY!,
          response: turnstileToken,
          remoteip: ip,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const turnstileData = await turnstileRes.json()
      if (!turnstileData.success) {
        console.warn(`[${requestId}] Turnstile failed: ${ip}`)
        return NextResponse.json({ error: 'Verificación fallida' }, { status: 400, headers: securityHeaders })
      }
    } catch (e) {
      clearTimeout(timeoutId)
      console.error(`[${requestId}] Turnstile error:`, e)
      return NextResponse.json({ error: 'Error de verificación' }, { status: 400, headers: securityHeaders })
    }

    const { data: pacientes, error: pacientesError } = await supabase
      .from('pacientes')
      .select('id')
      .eq('email', email)

    if (pacientesError) {
      console.error(`[${requestId}] Error buscando pacientes:`, pacientesError)
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
    }

    if (!pacientes || pacientes.length === 0) {
      return respuestaGenerica(requestId)
    }

    const { data: salas, error: salasError } = await supabase
      .from('chat_salas')
      .select('id, medico_id, paciente_id, cita_actual_id')
      .in('paciente_id', pacientes.map(p => p.id))
      .not('token_hash', 'is', null)

    if (salasError) {
      console.error(`[${requestId}] Error buscando chat_salas:`, salasError)
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
    }

    if (!salas || salas.length === 0) {
      return respuestaGenerica(requestId)
    }

    const { data: doctors, error: doctorsError } = await supabase
      .from('doctors')
      .select('id, full_name')
      .in('id', salas.map(s => s.medico_id))

    if (doctorsError) {
      console.error(`[${requestId}] Error buscando doctors:`, doctorsError)
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
    }

    const nombrePorMedicoId = new Map((doctors || []).map(d => [d.id, d.full_name]))

    // Evaluación de "sesión cerrada" batcheada (mismo criterio exacto que la
    // función SQL sesion_cerrada()) en vez de un rpc por sala.
    const citaIds = [...new Set(salas.map(s => s.cita_actual_id))]
    const { data: citasRows, error: citasError } = await supabase
      .from('citas')
      .select('id, estado, completed_at')
      .in('id', citaIds)

    if (citasError) {
      console.error(`[${requestId}] Error evaluando estado de citas:`, citasError)
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
    }

    const citaById = new Map((citasRows || []).map(c => [c.id, c]))

    function estaCerrada(cita: { estado: string; completed_at: string | null } | undefined): boolean {
      if (!cita) return true // sin cita real = tratar como cerrada
      if (cita.estado === 'cancelled') return true
      if (cita.estado === 'completed') {
        if (!cita.completed_at) return true // sin completed_at = cerrada, mismo criterio que sesion_cerrada()
        return Date.now() > new Date(cita.completed_at).getTime() + 72 * 60 * 60 * 1000
      }
      return false
    }

    const salasAbiertas = salas.filter(sala => !estaCerrada(citaById.get(sala.cita_actual_id)))

    if (salasAbiertas.length === 0) {
      return respuestaGenerica(requestId)
    }

    // Rotación intencional: a diferencia de emitirTokenSiFalta (Paso 5), aquí
    // sí se pisa un token_hash existente — el link anterior queda invalidado.
    const rotaciones = salasAbiertas.map(sala => {
      const token = generarToken()
      return { sala, token, hash: hashToken(token) }
    })

    // Un solo upsert batcheado en vez de N updates secuenciales. Incluye las
    // columnas NOT NULL sin cambio (medico_id, paciente_id, cita_actual_id)
    // para que el conflicto por id solo actualice token_hash sin tocar el
    // resto.
    const { error: updateError } = await supabase
      .from('chat_salas')
      .upsert(rotaciones.map(({ sala, hash }) => ({
        id: sala.id,
        medico_id: sala.medico_id,
        paciente_id: sala.paciente_id,
        cita_actual_id: sala.cita_actual_id,
        token_hash: hash,
      })))

    if (updateError) {
      console.error(`[${requestId}] Error rotando tokens:`, updateError)
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
    }

    const chatsParaEnviar = rotaciones.map(({ sala, token }) => ({
      medicoNombre: nombrePorMedicoId.get(sala.medico_id) || 'tu médico',
      chatUrl: `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/chat/${token}`,
    }))

    try {
      await sendChatLinkReenvioEmail(email, chatsParaEnviar)
    } catch (emailError) {
      console.error(`[${requestId}] Error enviando correo de reenvío:`, emailError)
    }

    return respuestaGenerica(requestId)
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
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
