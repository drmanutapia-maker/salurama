import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarSalaMedico } from '@/lib/chat/token'
import { descifrar } from '@/lib/chat/crypto'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  salaId: z.string().uuid(),
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
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400, headers: securityHeaders })
    }
    const { salaId } = validation.data

    const rateKey = `chat_medico_poll:${salaId}`
    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 900)
      if (count > 180) {
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

    const [mensajesRes, archivosRes] = await Promise.all([
      supabase
        .from('chat_mensajes')
        .select('id, cita_id, remitente_tipo, contenido, created_at')
        .eq('sala_id', sesion.salaId)
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_archivos')
        .select('id, cita_id, remitente_tipo, storage_path, nombre_original, tipo_mime, tamano_bytes, created_at')
        .eq('sala_id', sesion.salaId)
        .order('created_at', { ascending: true }),
    ])

    if (mensajesRes.error || archivosRes.error) {
      console.error(`[${requestId}] Error leyendo sala:`, mensajesRes.error || archivosRes.error)
      return NextResponse.json({ error: 'Error al cargar la conversación' }, { status: 500, headers: securityHeaders })
    }

    // Un mensaje individual corrupto o cifrado con otra llave no debe tumbar
    // el resto de la conversación — se degrada solo esa fila (mismo criterio
    // que /api/chat/paciente/sesion).
    const mensajesDescifrados = (mensajesRes.data || []).map(m => {
      try {
        return { ...m, contenido: descifrar(m.contenido) }
      } catch (decryptError) {
        console.error(`[${requestId}] Error al descifrar mensaje ${m.id}:`, decryptError)
        return { ...m, contenido: '[mensaje no disponible]' }
      }
    })

    const citaIds = Array.from(new Set([
      sesion.citaActualId,
      ...mensajesDescifrados.map(m => m.cita_id),
      ...(archivosRes.data || []).map(a => a.cita_id),
    ]))
    const { data: citasData } = await supabase
      .from('citas')
      .select('id, fecha, hora, motivo, estado, completed_at')
      .in('id', citaIds)

    return NextResponse.json(
      {
        salaId: sesion.salaId,
        citaActualId: sesion.citaActualId,
        puedeEscribir: sesion.puedeEscribir,
        mensajes: mensajesDescifrados,
        archivos: archivosRes.data,
        citas: citasData || [],
      },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
