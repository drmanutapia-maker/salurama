import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import { getEstadisticasData } from '@/lib/estadisticasData'
import { buildEstadisticasExcel } from '@/lib/estadisticasExcel'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function getAnonSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

export async function GET() {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const rateKey = `estadisticas_excel:${user.id}`
    const count = await redis.incr(rateKey)
    if (count === 1) await redis.expire(rateKey, 600)
    if (count > 20) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }
  } catch (redisError) {
    console.error('[estadisticas/excel] Redis error:', redisError)
  }

  const result = await getEstadisticasData(user.id)
  if (!result) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  const excelBuffer = await buildEstadisticasExcel(result.data)

  return new NextResponse(new Uint8Array(excelBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="salurama-estadisticas-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  })
}
