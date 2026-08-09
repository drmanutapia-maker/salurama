import { createClient } from '@supabase/supabase-js'
import { calculateProfileCompletion } from '@/hooks/useProfileCompletion'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Tendencia mensual. `cambioPct` es null cuando no hay base real de
// comparación (mes anterior en 0, o sin reseñas ese mes) — un porcentaje
// contra cero da infinito, así que ese caso se marca como 'nuevo' en vez
// de inventar un número.
export interface TrendMetric {
  actual: number
  anterior: number
  cambioPct: number | null
  direccion: 'up' | 'down' | 'flat' | 'nuevo'
}

// Benchmark de especialidad — compara al médico contra sus pares, nunca expone
// datos de un médico específico, solo agregados. `null` en ratingPromedio/
// tasaConfirmacion significa "sin suficientes pares" (umbral: 3 médicos
// más aportando ese dato), no que el valor sea cero.
export interface BenchmarkGrupo {
  ratingPromedio: number | null
  ratingSuficiente: boolean
  otrosConRating: number
  tasaConfirmacion: number | null
  tasaSuficiente: boolean
  otrosConCitas: number
}

export interface Benchmark {
  especialidad: string
  ciudad: string | null
  nacional: BenchmarkGrupo
  ciudadGrupo: BenchmarkGrupo | null
}

export interface EstadisticasData {
  doctorNombre: string
  profileViews: number
  total: number
  porStatus: { pending_verification: number; confirmed: number; completed: number; cancelled: number }
  tasaConfirmacion: number
  ratingPromedio: number
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[]
  citasPorMes: { label: string; count: number }[]
  citasPorDia: { label: string; count: number }[]
  ratingDist: { stars: number; count: number; pct: number }[]
  completionPct: number
  checks: { label: string; ok: boolean }[]
  tendencias: {
    vistas: TrendMetric
    calificacion: TrendMetric
    reseñas: TrendMetric
  }
  benchmark: Benchmark | null
}

const BENCHMARK_MIN_PARES = 3

// Promedio "de promedios": cada médico del grupo cuenta igual sin importar
// cuántas reseñas/citas tenga, para que uno con mucho volumen no domine el
// número (decisión confirmada al planear esta función). Las filas de
// reviews/citas de los pares nunca salen de esta función — solo el
// agregado final y el conteo de cuántos médicos lo componen.
async function calcularGrupoBenchmark(
  db: ReturnType<typeof getServiceSupabase>,
  doctorIds: string[]
): Promise<BenchmarkGrupo> {
  if (doctorIds.length === 0) {
    return { ratingPromedio: null, ratingSuficiente: false, otrosConRating: 0, tasaConfirmacion: null, tasaSuficiente: false, otrosConCitas: 0 }
  }

  const [reviewsRes, citasRes] = await Promise.all([
    db.from('reviews').select('doctor_id, rating').in('doctor_id', doctorIds).eq('is_visible', true),
    db.from('citas').select('medico_id, estado').in('medico_id', doctorIds),
  ])

  const reviewsPorDoctor = new Map<string, number[]>()
  for (const r of reviewsRes.data ?? []) {
    const arr = reviewsPorDoctor.get(r.doctor_id) ?? []
    arr.push(r.rating)
    reviewsPorDoctor.set(r.doctor_id, arr)
  }

  const citasPorDoctor = new Map<string, { total: number; confirmadas: number }>()
  for (const c of citasRes.data ?? []) {
    const entry = citasPorDoctor.get(c.medico_id) ?? { total: 0, confirmadas: 0 }
    entry.total += 1
    if (c.estado === 'confirmed' || c.estado === 'completed') entry.confirmadas += 1
    citasPorDoctor.set(c.medico_id, entry)
  }

  const ratingsPorDoctor = Array.from(reviewsPorDoctor.values()).map(
    (ratings) => ratings.reduce((s, r) => s + r, 0) / ratings.length
  )
  const tasasPorDoctor = Array.from(citasPorDoctor.values())
    .filter((c) => c.total > 0)
    .map((c) => (c.confirmadas / c.total) * 100)

  const otrosConRating = ratingsPorDoctor.length
  const otrosConCitas = tasasPorDoctor.length
  const ratingSuficiente = otrosConRating >= BENCHMARK_MIN_PARES
  const tasaSuficiente = otrosConCitas >= BENCHMARK_MIN_PARES

  return {
    ratingPromedio: ratingSuficiente ? Math.round((ratingsPorDoctor.reduce((s, r) => s + r, 0) / otrosConRating) * 10) / 10 : null,
    ratingSuficiente,
    otrosConRating,
    tasaConfirmacion: tasaSuficiente ? Math.round(tasasPorDoctor.reduce((s, t) => s + t, 0) / otrosConCitas) : null,
    tasaSuficiente,
    otrosConCitas,
  }
}

// Compara un valor de este mes contra el mes anterior. `anterior === 0` se
// trata como "sin base" (no como caída del -100%) porque lo más común es
// que sea el primer mes con actividad, no que se haya perdido todo.
function calcularTendencia(actual: number, anterior: number): TrendMetric {
  if (anterior === 0) {
    return { actual, anterior, cambioPct: null, direccion: actual > 0 ? 'nuevo' : 'flat' }
  }
  const cambioPct = ((actual - anterior) / anterior) * 100
  const direccion = actual > anterior ? 'up' : actual < anterior ? 'down' : 'flat'
  return { actual, anterior, cambioPct, direccion }
}

// Reusa exactamente la misma lógica que app/dashboard/estadisticas/page.tsx,
// server-side, para que los reportes exportados coincidan con lo que el médico ve.
export async function getEstadisticasData(userId: string): Promise<{ data: EstadisticasData; pricingTier: string | null } | null> {
  const db = getServiceSupabase()

  const { data: doctor } = await db
    .from('doctors')
    .select('id, full_name, photo_url, about_me, clinic_lat, clinic_lng, horario, consultation_price_first_time, consultation_price_general, phone, clinic_phone, whatsapp_phone, languages, pricing_tier, specialty, ciudad')
    .eq('user_id', userId)
    .single()

  if (!doctor) return null

  // Límites de "este mes" / "mes anterior" — mismo criterio que
  // app/dashboard/page.tsx (inicio de mes calendario, no 30 días rodantes).
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const inicioMesIso = inicioMes.toISOString()
  const inicioMesAnteriorIso = inicioMesAnterior.toISOString()

  // Vistas — misma fuente que /dashboard y /dashboard/estadisticas: cuenta
  // real desde la tabla profile_views, no la columna doctors.profile_views
  // (esa quedó congelada, ver app/dashboard/page.tsx).
  const [citasRes, reviewsRes, eduRes, expRes, condRes, visitasRes, visitasMesRes, visitasMesAnteriorRes] = await Promise.all([
    db.from('citas').select('id, estado, fecha').eq('medico_id', doctor.id).order('fecha'),
    db.from('reviews').select('id, rating, comment, created_at').eq('doctor_id', doctor.id).eq('is_visible', true).order('created_at', { ascending: false }),
    db.from('doctor_education').select('id').eq('doctor_id', doctor.id),
    db.from('doctor_experience').select('id').eq('doctor_id', doctor.id),
    db.from('doctor_conditions').select('id').eq('doctor_id', doctor.id),
    db.from('profile_views').select('*', { count: 'exact', head: true }).eq('doctor_id', doctor.id),
    db.from('profile_views').select('*', { count: 'exact', head: true }).eq('doctor_id', doctor.id).gte('viewed_at', inicioMesIso),
    db.from('profile_views').select('*', { count: 'exact', head: true }).eq('doctor_id', doctor.id).gte('viewed_at', inicioMesAnteriorIso).lt('viewed_at', inicioMesIso),
  ])

  const citas = citasRes.data ?? []
  const reviews = reviewsRes.data ?? []

  // Tendencias mensuales (beneficio Premium) — reseñas y calificación se
  // calculan sobre `reviews` (ya trae created_at), sin consultas extra.
  const reviewsMes = reviews.filter((r) => new Date(r.created_at) >= inicioMes)
  const reviewsMesAnterior = reviews.filter((r) => new Date(r.created_at) >= inicioMesAnterior && new Date(r.created_at) < inicioMes)
  const promedio = (arr: { rating: number }[]) => (arr.length > 0 ? arr.reduce((s, r) => s + r.rating, 0) / arr.length : 0)

  // Calificación: NO se compara "promedio de reseñas recibidas este mes" vs
  // "el mes pasado" — con 0 reseñas nuevas ese cálculo da un falso -100%
  // (parece que la calificación se desplomó, cuando en realidad no cambió
  // nada). Se compara el promedio ACUMULADO de siempre hasta hoy contra el
  // acumulado hasta inicios de este mes — si no llegan reseñas nuevas,
  // ambos son iguales y correctamente sale "sin cambio".
  const reviewsHastaInicioMes = reviews.filter((r) => new Date(r.created_at) < inicioMes)

  const tendencias = {
    vistas: calcularTendencia(visitasMesRes.count || 0, visitasMesAnteriorRes.count || 0),
    calificacion: calcularTendencia(
      Math.round(promedio(reviews) * 10) / 10,
      Math.round(promedio(reviewsHastaInicioMes) * 10) / 10
    ),
    reseñas: calcularTendencia(reviewsMes.length, reviewsMesAnterior.length),
  }

  const total = citas.length
  const porStatus = {
    pending_verification: citas.filter((c) => c.estado === 'pending_verification').length,
    confirmed: citas.filter((c) => c.estado === 'confirmed').length,
    completed: citas.filter((c) => c.estado === 'completed').length,
    cancelled: citas.filter((c) => c.estado === 'cancelled').length,
  }
  const tasaConfirmacion = total > 0 ? Math.round(((porStatus.confirmed + porStatus.completed) / total) * 100) : 0
  const ratingPromedio = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  const hoy = new Date()
  const citasPorMes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1)
    const mesNum = d.getMonth()
    const anio = d.getFullYear()
    const count = citas.filter((c) => {
      const cd = new Date(c.fecha + 'T00:00:00')
      return cd.getMonth() === mesNum && cd.getFullYear() === anio
    }).length
    return { label: MESES[mesNum], count }
  })

  const citasPorDia = DIAS.map((label, idx) => ({
    label,
    count: citas.filter((c) => new Date(c.fecha + 'T00:00:00').getDay() === idx).length,
  }))

  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: reviews.filter((rv) => rv.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter((rv) => rv.rating === r).length / reviews.length) * 100 : 0,
  }))

  const { checks, percentage: completionPct } = calculateProfileCompletion({
    medico: doctor,
    experienceCount: expRes.data?.length || 0,
    educationCount: eduRes.data?.length || 0,
    conditionsCount: condRes.data?.length || 0,
  })

  // Benchmark de especialidad (beneficio Premium) — el gate real de "quién
  // puede verlo" vive en la UI y en los API routes de reporte, no aquí
  // (mismo criterio que `tendencias` arriba).
  const especialidad = doctor.specialty as string | null
  const ciudadDoctor = doctor.ciudad as string | null
  let benchmark: Benchmark | null = null

  if (especialidad) {
    const { data: pares } = await db
      .from('doctors')
      .select('id, ciudad')
      .eq('specialty', especialidad)
      .eq('is_active', true)
      .neq('id', doctor.id)

    const paresIds = (pares ?? []).map((p) => p.id)
    const paresCiudadIds = ciudadDoctor
      ? (pares ?? []).filter((p) => p.ciudad === ciudadDoctor).map((p) => p.id)
      : []

    const [nacional, ciudadGrupo] = await Promise.all([
      calcularGrupoBenchmark(db, paresIds),
      ciudadDoctor ? calcularGrupoBenchmark(db, paresCiudadIds) : Promise.resolve(null),
    ])

    benchmark = { especialidad, ciudad: ciudadDoctor, nacional, ciudadGrupo }
  }

  return {
    pricingTier: doctor.pricing_tier ?? null,
    data: {
      doctorNombre: doctor.full_name,
      profileViews: visitasRes.count || 0,
      total,
      porStatus,
      tasaConfirmacion,
      ratingPromedio,
      reviews,
      citasPorMes,
      citasPorDia,
      ratingDist,
      completionPct,
      checks,
      tendencias,
      benchmark,
    },
  }
}
