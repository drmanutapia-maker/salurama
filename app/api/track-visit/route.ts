import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0].trim() || realIp || 'unknown'
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

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Registra una visita a un perfil público en profile_views. Fire-and-forget
// desde el cliente — nunca debe bloquear ni afectar el render del perfil,
// así que siempre responde 200 salvo body inválido.
export async function POST(request: NextRequest) {
  let body: { doctorId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const doctorId = typeof body.doctorId === 'string' ? body.doctorId : ''
  if (!UUID_RE.test(doctorId)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const ip = getClientIp(request)

  try {
    const rateKey = `track_visit:${ip}`
    const count = await redis.incr(rateKey)
    if (count === 1) await redis.expire(rateKey, 600)
    if (count > 60) {
      return NextResponse.json({ ok: false }, { status: 429, headers: { 'Retry-After': '600' } })
    }

    // Evita que la misma IP infle el contador de un médico refrescando o
    // repitiendo la solicitud — solo cuenta una visita real por (ip, doctor)
    // cada 5 minutos.
    const dedupeKey = `track_visit_dedupe:${ip}:${doctorId}`
    const isNew = await redis.set(dedupeKey, '1', { nx: true, ex: 300 })
    if (!isNew) {
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
    }
  } catch (redisError) {
    console.error('[track-visit] Redis error:', redisError)
  }

  const anonClient = await getAnonSupabase()
  const { data: { user } } = await anonClient.auth.getUser()

  const db = getServiceSupabase()

  // No cuenta como visita si el médico ve su propio perfil.
  if (user) {
    const { data: doctor } = await db.from('doctors').select('user_id').eq('id', doctorId).maybeSingle()
    if (doctor?.user_id === user.id) {
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 })
    }
  }

  const { error } = await db.from('profile_views').insert({
    id:        crypto.randomUUID(),
    doctor_id: doctorId,
    user_id:   user?.id ?? null,
    source:    'perfil_publico',
  })

  if (error) {
    console.error('[track-visit] Error insertando visita:', error)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

// Cuenta las visitas reales del médico autenticado a su propio perfil.
// profile_views tiene RLS habilitado sin políticas (nadie puede leerlo desde
// el cliente) — se resuelve vía service role, igual que el insert de arriba.
// También devuelve la serie de los últimos 6 meses (mismo criterio que
// citasPorMes en app/dashboard/estadisticas) para la tendencia mensual y la
// gráfica de línea (beneficio Premium) — mismo motivo: esos conteos tampoco
// se pueden leer directo desde el cliente. mesActual/mesAnterior se derivan
// de esa misma serie, sin consultas repetidas.
export async function GET() {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const db = getServiceSupabase()
  const { data: doctor } = await db.from('doctors').select('id').eq('user_id', user.id).maybeSingle()
  if (!doctor) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  const ahora = new Date()

  const [totalRes, ...mesesRes] = await Promise.all([
    db.from('profile_views').select('*', { count: 'exact', head: true }).eq('doctor_id', doctor.id),
    ...Array.from({ length: 6 }, (_, i) => {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
      const fin = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i) + 1, 1)
      return db.from('profile_views').select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctor.id).gte('viewed_at', inicio.toISOString()).lt('viewed_at', fin.toISOString())
        .then(res => ({ ...res, label: MESES[inicio.getMonth()] }))
    }),
  ])

  const error = totalRes.error || mesesRes.find(r => r.error)?.error
  if (error) {
    console.error('[track-visit] Error contando visitas:', error)
    return NextResponse.json({ error: 'Error al contar visitas' }, { status: 500 })
  }

  const vistasPorMes = mesesRes.map(r => ({ label: r.label, count: r.count ?? 0 }))

  return NextResponse.json({
    count: totalRes.count ?? 0,
    mesActual: vistasPorMes[5].count,
    mesAnterior: vistasPorMes[4].count,
    vistasPorMes,
  }, { status: 200 })
}
