import { createClient } from '@supabase/supabase-js'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export interface ResenaItem {
  id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface ResenasData {
  doctorNombre: string
  reviews: ResenaItem[]
  ratingPromedio: number
  total: number
  ratingDist: { stars: number; count: number; pct: number }[]
}

// A diferencia de lib/estadisticasData.ts (que solo trae agregados/histograma
// para el dashboard general), esta trae TODAS las reseñas visibles del
// médico, sin límite — es la fuente para /dashboard/resenas y su reporte.
export async function getResenasData(userId: string): Promise<{ data: ResenasData } | null> {
  const db = getServiceSupabase()

  const { data: doctor } = await db
    .from('doctors')
    .select('id, full_name')
    .eq('user_id', userId)
    .single()

  if (!doctor) return null

  const { data: reviewsData } = await db
    .from('reviews')
    .select('id, rating, comment, created_at')
    .eq('doctor_id', doctor.id)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })

  const reviews = reviewsData ?? []
  const ratingPromedio = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: reviews.filter((rv) => rv.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter((rv) => rv.rating === r).length / reviews.length) * 100 : 0,
  }))

  return {
    data: {
      doctorNombre: doctor.full_name,
      reviews,
      ratingPromedio,
      total: reviews.length,
      ratingDist,
    },
  }
}
