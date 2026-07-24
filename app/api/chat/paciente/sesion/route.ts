import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarToken } from '@/lib/chat/token'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  token: z.string().min(1).max(200),
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

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 })
    }

    const ip = getClientIp(request)
    const rateKey = `chat_token:${ip}`

    try {
      const count = await redis.incr(rateKey)
      if (count === 1) await redis.expire(rateKey, 900)
      if (count > 10) {
        console.warn(`[${requestId}] Rate limit exceeded: ${ip}`)
        return NextResponse.json(
          { error: 'Demasiados intentos. Intenta en 15 minutos.' },
          { status: 429, headers: { ...securityHeaders, 'Retry-After': '900' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Enlace inválido' }, { status: 400, headers: securityHeaders })
    }

    const sesion = await verificarToken(supabase, validation.data.token)
    if (!sesion) {
      console.warn(`[${requestId}] Token no encontrado: ${ip}`)
      return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 404, headers: securityHeaders })
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

    return NextResponse.json(
      {
        citaActualId: sesion.citaActualId,
        puedeEscribir: sesion.puedeEscribir,
        mensajes: mensajesRes.data,
        archivos: archivosRes.data,
      },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
