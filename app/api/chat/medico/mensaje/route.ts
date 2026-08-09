import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarSalaMedico, rotarToken } from '@/lib/chat/token'
import { cifrar } from '@/lib/chat/crypto'
import { notificarPacientePush } from '@/lib/push/enviarPush'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  salaId: z.string().uuid(),
  contenido: z.string().trim().min(1).max(4000),
})

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

async function getAnonSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: securityHeaders })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400, headers: securityHeaders })
    }
    const { salaId, contenido } = validation.data

    const rateKey = `chat_medico_mensaje:${user.id}`
    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 900)
      if (count > 60) {
        console.warn(`[${requestId}] Rate limit exceeded: ${rateKey}`)
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 15 minutos.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '900' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const sesion = await verificarSalaMedico(supabase, user.id, salaId)
    if (!sesion) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404, headers: securityHeaders })
    }
    if (!sesion.puedeEscribir) {
      return NextResponse.json(
        { error: 'Esta conversación ya no admite mensajes nuevos' },
        { status: 403, headers: securityHeaders }
      )
    }

    const { data: mensaje, error } = await supabase
      .from('chat_mensajes')
      .insert({
        sala_id: sesion.salaId,
        cita_id: sesion.citaActualId,
        remitente_tipo: 'medico',
        medico_id: sesion.medicoId,
        contenido: cifrar(contenido),
      })
      .select('id, created_at')
      .single()

    if (error || !mensaje) {
      console.error(`[${requestId}] Error insertando mensaje:`, error)
      return NextResponse.json({ error: 'Error al enviar el mensaje' }, { status: 500, headers: securityHeaders })
    }

    console.info(`[${requestId}] Mensaje creado: ${mensaje.id}`)

    // Notificar por push al paciente — nunca debe hacer fallar la respuesta
    // (el mensaje ya se guardó). Solo se rota el link del chat (mismo patrón
    // que /api/chat/reenviar-link, ver comentario ahí) si de verdad hay al
    // menos una suscripción a la que avisar; si el paciente nunca aceptó
    // notificaciones, no tiene sentido invalidar su link actual sin motivo.
    try {
      const { count: totalSuscripciones } = await supabase
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', sesion.pacienteId)

      if (totalSuscripciones && totalSuscripciones > 0) {
        const [{ data: doctor }, token] = await Promise.all([
          supabase.from('doctors').select('display_name, full_name').eq('id', sesion.medicoId).maybeSingle(),
          rotarToken(supabase, sesion.salaId),
        ])
        // Sin prefijo "Dr./Dra." agregado a mano — mismo criterio que el
        // resto de los correos de chat (lib/email.ts), que usan el nombre
        // del médico tal cual.
        const medicoNombre = doctor?.display_name || doctor?.full_name || 'tu médico'
        const chatUrl = `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/chat/${token}`

        await notificarPacientePush(supabase, sesion.pacienteId, {
          title: medicoNombre,
          body: 'Tienes un mensaje nuevo en tu chat.',
          url: chatUrl,
        })
      }
    } catch (pushError) {
      console.error(`[${requestId}] Error notificando por push:`, pushError)
    }

    return NextResponse.json(
      { success: true, mensaje },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
