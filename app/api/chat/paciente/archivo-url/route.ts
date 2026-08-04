import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarToken } from '@/lib/chat/token'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Vigencia corta a propósito: se pide una URL nueva cada vez que el paciente
// hace clic en un archivo, nunca se cachea del lado del cliente.
const SIGNED_URL_TTL_SEGUNDOS = 300

const bodySchema = z.object({
  token: z.string().min(1).max(200),
  archivoId: z.string().uuid(),
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

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400, headers: securityHeaders })
    }

    const { token, archivoId } = validation.data

    const sesion = await verificarToken(supabase, token)

    // Mismo esquema de presupuesto que /api/chat/paciente/sesion y archivo.
    const rateKey = sesion ? `chat_poll:${sesion.salaId}` : `chat_token:${ip}`
    const rateLimite = sesion ? 180 : 10

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

    // El archivo debe pertenecer a la sala del token — evita que un token
    // válido de una conversación sirva para firmar URLs de archivos de otra.
    const { data: fila, error } = await supabase
      .from('chat_archivos')
      .select('storage_path')
      .eq('id', archivoId)
      .eq('sala_id', sesion.salaId)
      .maybeSingle()

    if (error || !fila) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404, headers: securityHeaders })
    }

    const { data: firmada, error: signError } = await supabase.storage
      .from('chat-archivos')
      .createSignedUrl(fila.storage_path, SIGNED_URL_TTL_SEGUNDOS)

    if (signError || !firmada) {
      console.error(`[${requestId}] Error firmando URL:`, signError)
      return NextResponse.json({ error: 'No se pudo generar el enlace' }, { status: 500, headers: securityHeaders })
    }

    return NextResponse.json(
      { url: firmada.signedUrl },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
