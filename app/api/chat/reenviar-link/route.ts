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
      .select('id, medico_id, cita_actual_id')
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

    const chatsParaEnviar: { medicoNombre: string; chatUrl: string }[] = []

    for (const sala of salas) {
      const { data: cerrada, error: cerradaError } = await supabase
        .rpc('sesion_cerrada', { p_cita_id: sala.cita_actual_id })

      if (cerradaError) {
        console.error(`[${requestId}] Error evaluando sesion_cerrada para sala ${sala.id}:`, cerradaError)
        continue
      }
      if (cerrada) continue

      // Rotación intencional: a diferencia de emitirTokenSiFalta (Paso 5), aquí
      // sí se pisa un token_hash existente — el link anterior queda invalidado.
      const token = generarToken()
      const hash = hashToken(token)

      const { error: updateError } = await supabase
        .from('chat_salas')
        .update({ token_hash: hash })
        .eq('id', sala.id)

      if (updateError) {
        console.error(`[${requestId}] Error rotando token de sala ${sala.id}:`, updateError)
        continue
      }

      chatsParaEnviar.push({
        medicoNombre: nombrePorMedicoId.get(sala.medico_id) || 'tu médico',
        chatUrl: `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/chat/${token}`,
      })
    }

    if (chatsParaEnviar.length === 0) {
      return respuestaGenerica(requestId)
    }

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
