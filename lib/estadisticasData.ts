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
}

// Reusa exactamente la misma lógica que app/dashboard/estadisticas/page.tsx,
// server-side, para que los reportes exportados coincidan con lo que el médico ve.
export async function getEstadisticasData(userId: string): Promise<{ data: EstadisticasData; pricingTier: string | null } | null> {
  const db = getServiceSupabase()

  const { data: doctor } = await db
    .from('doctors')
    .select('id, full_name, photo_url, about_me, clinic_lat, clinic_lng, horario, consultation_price_first_time, consultation_price_general, phone, clinic_phone, whatsapp_phone, languages, pricing_tier')
    .eq('user_id', userId)
    .single()

  if (!doctor) return null

  // Vistas — misma fuente que /dashboard y /dashboard/estadisticas: cuenta
  // real desde la tabla profile_views, no la columna doctors.profile_views
  // (esa quedó congelada, ver app/dashboard/page.tsx).
  const [citasRes, reviewsRes, eduRes, expRes, condRes, visitasRes] = await Promise.all([
    db.from('citas').select('id, estado, fecha').eq('medico_id', doctor.id).order('fecha'),
    db.from('reviews').select('id, rating, comment, created_at').eq('doctor_id', doctor.id).eq('is_visible', true).order('created_at', { ascending: false }),
    db.from('doctor_education').select('id').eq('doctor_id', doctor.id),
    db.from('doctor_experience').select('id').eq('doctor_id', doctor.id),
    db.from('doctor_conditions').select('id').eq('doctor_id', doctor.id),
    db.from('profile_views').select('*', { count: 'exact', head: true }).eq('doctor_id', doctor.id),
  ])

  const citas = citasRes.data ?? []
  const reviews = reviewsRes.data ?? []

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
    },
  }
}
