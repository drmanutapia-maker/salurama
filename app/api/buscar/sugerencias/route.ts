import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

export const runtime = 'edge'
export const preferredRegion = 'mex1'

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

// Antes esta búsqueda salía directo del navegador a Supabase (anon key, sin
// pasar por Next) en cada tecleo — dato público y de baja sensibilidad, pero
// sin ningún límite propio: con miles de usuarios reales, cualquiera podía
// automatizarla sin control. Mismo patrón de rate limiting por IP que
// /api/citas/buscar-paciente, con una ventana más generosa porque aquí no
// hay PII de por medio, solo texto de especialidad.
export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const ip = getClientIp(request)

  try {
    const count = await redis.incr(`buscar_sugerencias:${ip}`)
    if (count === 1) await redis.expire(`buscar_sugerencias:${ip}`, 600)
    if (count > 60) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429, headers: { ...HEADERS, 'Retry-After': '600' } }
      )
    }
  } catch (redisError) {
    console.error('[buscar/sugerencias] Redis error:', redisError)
  }

  const validation = querySchema.safeParse({ q: request.nextUrl.searchParams.get('q') })
  if (!validation.success) {
    return NextResponse.json({ error: 'Parámetro q inválido' }, { status: 400, headers: HEADERS })
  }

  const { data, error } = await supabase
    .from('doctors')
    .select('specialty')
    .ilike('specialty', `%${validation.data.q}%`)
    .eq('is_active', true)
    .not('specialty', 'is', null)
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Error de búsqueda' }, { status: 500, headers: HEADERS })
  }

  const especialidades = Array.from(new Set((data ?? []).map(d => d.specialty).filter(Boolean)))
  return NextResponse.json({ especialidades }, { headers: HEADERS })
}
