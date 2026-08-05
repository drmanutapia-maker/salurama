import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

let _client: SupabaseClient | null = null

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
}

const cpSchema = z.string().regex(/^\d{5}$/)
const qSchema = z.string().trim().min(3).max(100)

const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET(req: NextRequest) {
  // Endpoint público de baja sensibilidad (catálogo abierto de códigos
  // postales, sin PII) usado como autocomplete desde /registro y
  // /dashboard/editar-perfil. Sec-Fetch-Site solo filtra bots genéricos que
  // no imitan un navegador real — no es un control de acceso, la defensa
  // real es el rate limit de abajo (mismo patrón que /api/buscar/sugerencias).
  const secFetchSite = req.headers.get('sec-fetch-site')
  if (secFetchSite === 'cross-site') {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403, headers: HEADERS })
  }

  const ip = getClientIp(req)
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  try {
    const count = await redis.incr(`sepomex:${ip}`)
    if (count === 1) await redis.expire(`sepomex:${ip}`, 600)
    if (count > 60) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429, headers: { ...HEADERS, 'Retry-After': '600' } }
      )
    }
  } catch (redisError) {
    console.error('[sepomex] Redis error:', redisError)
  }

  const supabaseAdmin = getClient()
  const cpRaw = req.nextUrl.searchParams.get('cp')
  const qRaw = req.nextUrl.searchParams.get('q')

  const cpParsed = cpRaw !== null ? cpSchema.safeParse(cpRaw) : null
  if (cpParsed?.success) {
    const { data, error } = await supabaseAdmin
      .from('sepomex')
      .select('cp, estado, municipio, ciudad, colonia, lat, lng')
      .eq('cp', cpParsed.data)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { headers: HEADERS })
  }

  const qParsed = qRaw !== null ? qSchema.safeParse(qRaw) : null
  if (qParsed?.success) {
    const { data, error } = await supabaseAdmin
      .from('sepomex')
      .select('cp, colonia, estado')
      .ilike('colonia', `%${qParsed.data}%`)
      .limit(10)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { headers: HEADERS })
  }

  return NextResponse.json({ error: 'cp o q requerido' }, { status: 400, headers: HEADERS })
}