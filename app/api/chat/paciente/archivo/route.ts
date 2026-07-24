import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarToken } from '@/lib/chat/token'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Límites provisionales (mismo tope que el bucket hema-lab-images) hasta que
// el paso de infraestructura de archivos defina el bucket real de chat_archivos.
const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const TAMANO_MAXIMO_BYTES = 15728640

const bodySchema = z.object({
  token: z.string().min(1).max(200),
  storagePath: z.string().trim().min(1).max(500),
  nombreOriginal: z.string().trim().min(1).max(255),
  tipoMime: z.enum(TIPOS_MIME_PERMITIDOS),
  tamanoBytes: z.number().int().positive().max(TAMANO_MAXIMO_BYTES),
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
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.issues[0].message },
        { status: 400, headers: securityHeaders }
      )
    }

    const { token, storagePath, nombreOriginal, tipoMime, tamanoBytes } = validation.data

    const sesion = await verificarToken(supabase, token)
    if (!sesion) {
      console.warn(`[${requestId}] Token no encontrado: ${ip}`)
      return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 404, headers: securityHeaders })
    }

    if (!sesion.puedeEscribir) {
      return NextResponse.json(
        { error: 'Esta conversación ya no admite archivos nuevos' },
        { status: 403, headers: securityHeaders }
      )
    }

    const { data: archivo, error } = await supabase
      .from('chat_archivos')
      .insert({
        sala_id: sesion.salaId,
        cita_id: sesion.citaActualId,
        remitente_tipo: 'paciente',
        medico_id: null,
        storage_path: storagePath,
        nombre_original: nombreOriginal,
        tipo_mime: tipoMime,
        tamano_bytes: tamanoBytes,
      })
      .select('id, created_at')
      .single()

    if (error || !archivo) {
      console.error(`[${requestId}] Error insertando archivo:`, error)
      return NextResponse.json({ error: 'Error al registrar el archivo' }, { status: 500, headers: securityHeaders })
    }

    console.info(`[${requestId}] Archivo creado: ${archivo.id}`)

    return NextResponse.json(
      { success: true, archivo },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
