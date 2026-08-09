import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { generarToken, hashToken } from '@/lib/chat/token'
import { sendChatLinkReenvioEmail } from '@/lib/email'

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  telefono: z.string().trim().min(1).max(20).optional(),
  turnstileToken: z.string().min(1),
}).refine(data => !!data.email !== !!data.telefono, {
  message: 'Proporciona correo o teléfono, no ambos',
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

// Mismo criterio de normalización que el trigger vincular_paciente_cita()
// (10 dígitos, sin lada de país 52/521/1) — así el teléfono que escribe el
// paciente aquí coincide con el que quedó guardado en pacientes.telefono al
// agendar, sin importar el formato en que lo haya tecleado.
function normalizarTelefono(raw: string): string | null {
  let digitos = raw.replace(/\D/g, '')
  if (digitos.length === 12 && digitos.startsWith('52')) digitos = digitos.slice(2)
  else if (digitos.length === 13 && digitos.startsWith('521')) digitos = digitos.slice(3)
  else if (digitos.length === 11 && digitos.startsWith('1')) digitos = digitos.slice(1)
  return digitos.length === 10 ? digitos : null
}

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Mismo mensaje exista o no el dato en el sistema — nunca revela si un
// correo/teléfono tiene chats activos (mismo principio que
// /api/citas/buscar-paciente). No distingue si se buscó por correo o
// teléfono, por la misma razón.
function respuestaGenerica(requestId: string) {
  return NextResponse.json(
    { success: true, message: 'Si esos datos tienen chats activos, te llegará un correo con el link.' },
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
      return NextResponse.json({ error: 'Correo o teléfono inválido' }, { status: 400, headers: securityHeaders })
    }

    const { email, telefono, turnstileToken } = validation.data
    const telefonoNormalizado = telefono ? normalizarTelefono(telefono) : null

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

    // Teléfono con formato irreconocible: se trata igual que "no encontrado"
    // (misma respuesta genérica) — ya se validó Turnstile arriba, así que
    // esto no le ahorra a un bot el costo de resolver el challenge.
    if (telefono && !telefonoNormalizado) {
      return respuestaGenerica(requestId)
    }

    // Segundo límite, por contacto (no por IP): el mismo correo/teléfono
    // buscado solo puede rotar un token cada 15 min, sin importar desde qué
    // IP se pida. Evita que alguien invalide repetidamente el link de otra
    // persona cambiando de red. Bloqueo silencioso — misma respuesta
    // genérica de siempre, para no revelar que ese contacto existe ni que
    // se alcanzó este límite.
    const contactoKey = `reenviar_link_contacto:${email || telefonoNormalizado}`
    try {
      const contactoCount = await redis.incr(contactoKey)
      if (contactoCount === 1) await redis.expire(contactoKey, 900)
      if (contactoCount > 1) {
        console.warn(`[${requestId}] Contact rate limit exceeded (silent)`)
        return respuestaGenerica(requestId)
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error (contact rate limit):`, redisError)
    }

    const pacientesQuery = supabase.from('pacientes').select('id, email')
    const { data: pacientes, error: pacientesError } = email
      ? await pacientesQuery.eq('email', email)
      : await pacientesQuery.eq('telefono', telefonoNormalizado!)

    if (pacientesError) {
      console.error(`[${requestId}] Error buscando pacientes:`, pacientesError)
      return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
    }

    if (!pacientes || pacientes.length === 0) {
      return respuestaGenerica(requestId)
    }

    // El destino del correo siempre es pacientes.email — si se buscó por
    // teléfono, el link nunca se manda al teléfono (no hay canal SMS), se
    // manda a la dirección ya registrada para ese paciente.
    const emailPorPacienteId = new Map(pacientes.map(p => [p.id, p.email]))

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
      if (cita.estado === 'cancelled' || cita.estado === 'cancelada_paciente') return true
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

    // Agrupado por email destino (no por el dato que se buscó): si la
    // búsqueda fue por teléfono, o si ese teléfono resultó ligado a más de
    // un paciente con correos distintos, cada quien recibe solo sus chats.
    const chatsPorEmail = new Map<string, { medicoNombre: string; chatUrl: string }[]>()
    for (const { sala, token } of rotaciones) {
      const destino = emailPorPacienteId.get(sala.paciente_id)
      if (!destino) continue
      const chat = {
        medicoNombre: nombrePorMedicoId.get(sala.medico_id) || 'tu médico',
        chatUrl: `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/chat/${token}`,
      }
      chatsPorEmail.set(destino, [...(chatsPorEmail.get(destino) || []), chat])
    }

    await Promise.all(
      Array.from(chatsPorEmail.entries()).map(async ([destino, chats]) => {
        try {
          await sendChatLinkReenvioEmail(destino, chats)
        } catch (emailError) {
          console.error(`[${requestId}] Error enviando correo de reenvío:`, emailError)
        }
      })
    )

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
