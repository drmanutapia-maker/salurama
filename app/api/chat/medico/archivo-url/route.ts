import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import { z } from 'zod'
import { verificarSalaMedico } from '@/lib/chat/token'
import { descifrarBuffer } from '@/lib/chat/crypto'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const bodySchema = z.object({
  salaId: z.string().uuid(),
  archivoId: z.string().uuid(),
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
    const { salaId, archivoId } = validation.data

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

    // El archivo debe pertenecer a la sala verificada — evita que un médico
    // use el salaId de una sala suya para descargar archivos de otra.
    const { data: fila, error } = await supabase
      .from('chat_archivos')
      .select('storage_path, tipo_mime, nombre_original')
      .eq('id', archivoId)
      .eq('sala_id', sesion.salaId)
      .maybeSingle()

    if (error || !fila) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404, headers: securityHeaders })
    }

    const { data: descargado, error: downloadError } = await supabase.storage
      .from('chat-archivos')
      .download(fila.storage_path)

    if (downloadError || !descargado) {
      console.error(`[${requestId}] Error descargando de Storage:`, downloadError)
      return NextResponse.json({ error: 'No se pudo obtener el archivo' }, { status: 500, headers: securityHeaders })
    }

    let bufferDescifrado: Buffer
    try {
      const bufferCifrado = Buffer.from(await descargado.arrayBuffer())
      bufferDescifrado = descifrarBuffer(bufferCifrado)
    } catch (decryptError) {
      console.error(`[${requestId}] Error al descifrar archivo ${archivoId}:`, decryptError)
      return NextResponse.json({ error: 'No se pudo abrir el archivo' }, { status: 500, headers: securityHeaders })
    }

    const nombreEscapado = encodeURIComponent(fila.nombre_original)

    return new NextResponse(new Uint8Array(bufferDescifrado), {
      headers: {
        ...securityHeaders,
        'X-Request-ID': requestId,
        'Content-Type': fila.tipo_mime,
        'Content-Disposition': `inline; filename*=UTF-8''${nombreEscapado}`,
      },
    })
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500, headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  }
}
