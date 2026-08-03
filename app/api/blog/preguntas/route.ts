import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

export const runtime = 'edge'
export const preferredRegion = 'mex1'

const bodySchema = z.object({
  articuloId: z.string().uuid('ID de artículo inválido'),
  pregunta: z.string().trim().min(5).max(1000),
  nombre: z.string().trim().max(100).optional(),
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Insert público sin cuenta: la tabla blog_preguntas no tiene ninguna
// política RLS para anon/authenticated a propósito (ver comentario en la
// migración), así que este endpoint con service role es el único camino de
// escritura. Sin PII más allá de un nombre opcional — no se pide ni guarda
// correo/teléfono. Rate limit conservador por IP, mismo patrón que
// /api/citas/buscar-paciente.
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

  try {
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415, headers: HEADERS })
    }

    const ip = getClientIp(request)

    try {
      const count = await redis.incr(`blog_preguntas:${ip}`)
      if (count === 1) await redis.expire(`blog_preguntas:${ip}`, 3600)
      if (count > 5) {
        return NextResponse.json(
          { error: 'Demasiadas preguntas enviadas. Intenta en 1 hora.' },
          { status: 429, headers: { ...HEADERS, 'Retry-After': '3600' } }
        )
      }
    } catch (redisError) {
      console.error(`[${requestId}] Redis error:`, redisError)
    }

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400, headers: HEADERS })
    }

    const { articuloId, pregunta, nombre } = validation.data

    // El artículo debe existir y estar publicado — no aceptamos preguntas
    // colgadas de un borrador que el público no puede ver.
    const { data: articulo } = await supabase
      .from('blog_articulos')
      .select('id')
      .eq('id', articuloId)
      .eq('estado', 'publicado')
      .maybeSingle()

    if (!articulo) {
      return NextResponse.json({ error: 'Artículo no encontrado' }, { status: 404, headers: HEADERS })
    }

    const { error: insertError } = await supabase
      .from('blog_preguntas')
      .insert({ articulo_id: articuloId, pregunta, nombre: nombre || null })

    if (insertError) {
      console.error(`[${requestId}] Error guardando pregunta:`, insertError)
      return NextResponse.json({ error: 'No se pudo enviar tu pregunta' }, { status: 500, headers: HEADERS })
    }

    return NextResponse.json(
      { message: 'Gracias, recibimos tu pregunta.' },
      { headers: { ...HEADERS, 'X-Request-ID': requestId } }
    )
  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    return NextResponse.json({ error: 'Ocurrió un error inesperado' }, { status: 500, headers: HEADERS })
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
