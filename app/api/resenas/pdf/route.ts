import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import { getResenasData } from '@/lib/resenasData'
import { buildResenasPdf } from '@/lib/resenasPdf'

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
    const rateKey = `resenas_pdf:${user.id}`
    const count = await redis.incr(rateKey)
    if (count === 1) await redis.expire(rateKey, 600)
    if (count > 20) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }
  } catch (redisError) {
    console.error('[resenas/pdf] Redis error:', redisError)
  }

  const result = await getResenasData(user.id)
  if (!result) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  const pdfBytes = await buildResenasPdf(result.data)

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="salurama-resenas-${new Date().toISOString().slice(0, 10)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
