import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { verificarToken } from '@/lib/chat/token'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const TAMANO_MAXIMO_BYTES = 15728640 // 15 MB — mismo límite que el bucket chat-archivos

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
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 })
    }

    const ip = getClientIp(request)

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Formulario inválido' }, { status: 400, headers: securityHeaders })
    }

    const token = form.get('token')
    const archivo = form.get('archivo')

    if (typeof token !== 'string' || !token || token.length > 200) {
      return NextResponse.json({ error: 'Enlace inválido' }, { status: 400, headers: securityHeaders })
    }
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400, headers: securityHeaders })
    }

    const sesion = await verificarToken(supabase, token)

    // Mismo esquema de presupuesto que /api/chat/paciente/sesion: solo los
    // intentos con token inválido cuentan contra la adivinanza por IP
    // (10/15min, compartido con mensaje/sesion); un token válido consume en
    // cambio el presupuesto por sala (180/15min) pensado para uso activo de
    // la conversación — más apropiado aquí que el budget crudo por IP, ya que
    // un paciente puede adjuntar varios archivos en una sesión.
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

    if (!sesion.puedeEscribir) {
      return NextResponse.json(
        { error: 'Esta conversación ya no admite archivos nuevos' },
        { status: 403, headers: securityHeaders }
      )
    }

    if (!(TIPOS_MIME_PERMITIDOS as readonly string[]).includes(archivo.type)) {
      return NextResponse.json(
        { error: 'Solo se permiten imágenes (JPG, PNG, WEBP) o PDF' },
        { status: 400, headers: securityHeaders }
      )
    }
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      return NextResponse.json(
        { error: 'El archivo no puede pesar más de 15 MB' },
        { status: 400, headers: securityHeaders }
      )
    }

    const archivoId = crypto.randomUUID()
    const ext = archivo.name.split('.').pop() || 'bin'
    const path = `${sesion.salaId}/${archivoId}.${ext}`

    const buffer = Buffer.from(await archivo.arrayBuffer())
    const { error: uploadError } = await supabase.storage
      .from('chat-archivos')
      .upload(path, buffer, { contentType: archivo.type })

    if (uploadError) {
      console.error(`[${requestId}] Error subiendo a Storage:`, uploadError)
      return NextResponse.json({ error: 'No se pudo subir el archivo' }, { status: 500, headers: securityHeaders })
    }

    const { data: fila, error } = await supabase
      .from('chat_archivos')
      .insert({
        id: archivoId,
        sala_id: sesion.salaId,
        cita_id: sesion.citaActualId,
        remitente_tipo: 'paciente',
        medico_id: null,
        storage_path: path,
        nombre_original: archivo.name,
        tipo_mime: archivo.type,
        tamano_bytes: archivo.size,
      })
      .select('id, created_at')
      .single()

    if (error || !fila) {
      console.error(`[${requestId}] Error insertando archivo:`, error)
      // El archivo ya se subió a Storage pero el registro falló — borrarlo
      // para no dejarlo huérfano sin fila que lo referencie.
      await supabase.storage.from('chat-archivos').remove([path]).catch(() => {})
      return NextResponse.json({ error: 'Error al registrar el archivo' }, { status: 500, headers: securityHeaders })
    }

    console.info(`[${requestId}] Archivo creado: ${fila.id}`)

    return NextResponse.json(
      { success: true, archivo: fila },
      { headers: { ...securityHeaders, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
