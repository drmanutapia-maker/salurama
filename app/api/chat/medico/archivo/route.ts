import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import { verificarSalaMedico } from '@/lib/chat/token'
import { cifrarBuffer } from '@/lib/chat/crypto'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TIPOS_MIME_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
const TAMANO_MAXIMO_BYTES = 15728640 // 15 MB — mismo límite que el bucket chat-archivos

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
    if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 })
    }

    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return NextResponse.json({ error: 'Formulario inválido' }, { status: 400, headers: securityHeaders })
    }

    const salaId = form.get('salaId')
    const archivo = form.get('archivo')

    if (typeof salaId !== 'string' || !salaId) {
      return NextResponse.json({ error: 'Sala inválida' }, { status: 400, headers: securityHeaders })
    }
    if (!(archivo instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400, headers: securityHeaders })
    }

    // Mismo presupuesto que chat/medico/sesion — subir/descargar archivos es
    // actividad de uso normal de la sala, igual que el paciente comparte
    // chat_poll:{salaId} entre sesion/archivo/archivo-url.
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

    // MIME/tamaño ya se validaron arriba contra el archivo real, antes de
    // cifrar — Storage a partir de aquí solo ve bytes cifrados.
    const buffer = Buffer.from(await archivo.arrayBuffer())
    const bufferCifrado = cifrarBuffer(buffer)
    const { error: uploadError } = await supabase.storage
      .from('chat-archivos')
      .upload(path, bufferCifrado, { contentType: 'application/octet-stream' })

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
        remitente_tipo: 'medico',
        medico_id: sesion.medicoId,
        storage_path: path,
        nombre_original: archivo.name,
        tipo_mime: archivo.type,
        tamano_bytes: archivo.size,
      })
      .select('id, created_at')
      .single()

    if (error || !fila) {
      console.error(`[${requestId}] Error insertando archivo:`, error)
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
