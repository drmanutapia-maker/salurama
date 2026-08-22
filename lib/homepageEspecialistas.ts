import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { calculateProfileCompletion, type ProfileCompletionData } from '@/hooks/useProfileCompletion'

export interface EspecialistaHomepage {
  id: string
  slug: string | null
  full_name: string
  specialty: string
  photo_url: string | null
  ciudad: string | null
  estado: string | null
  clinic_name: string | null
  consultation_price_general: number | null
  whatsapp_available: boolean
}

const UMBRAL_ELEGIBILIDAD = 30
export const MIN_RESENAS_PARA_DESEMPATE = 3
const LIMITE = 50

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function contarPorDoctor(rows: { doctor_id: string }[] | null): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows ?? []) map.set(r.doctor_id, (map.get(r.doctor_id) ?? 0) + 1)
  return map
}

// Criterio de "mérito" compartido -- completitud de perfil desc; empate ->
// rating desc SOLO si ambos tienen MIN_RESENAS_PARA_DESEMPATE+ reseñas (si
// no, el rating no participa); último desempate: alfabético. Antes vivía
// solo aquí (usado por la home); ahora también lo usa /buscar cuando no hay
// especialidad/estado en la URL, para que el orden por defecto sea
// consistente en toda la plataforma en vez de "fecha de registro" ahí.
export function compararPorMerito(
  a: { full_name: string; rating_avg: number | null; rating_count: number | null; completitud: number },
  b: { full_name: string; rating_avg: number | null; rating_count: number | null; completitud: number }
): number {
  if (b.completitud !== a.completitud) return b.completitud - a.completitud

  const aCalifica = (a.rating_count ?? 0) >= MIN_RESENAS_PARA_DESEMPATE
  const bCalifica = (b.rating_count ?? 0) >= MIN_RESENAS_PARA_DESEMPATE
  if (aCalifica && bCalifica && a.rating_avg !== b.rating_avg) {
    return (b.rating_avg ?? 0) - (a.rating_avg ?? 0)
  }

  return a.full_name.localeCompare(b.full_name, 'es')
}

// Completitud de perfil (0-100) por doctor -- misma fórmula que
// calculateProfileCompletion(), reutilizada aquí y desde /buscar. Pide las
// 3 tablas de conteo (experiencia/educación/enfermedades tratadas) en un
// solo round-trip por tabla para todos los ids a la vez.
export async function calcularCompletitudPorDoctor(
  supabase: SupabaseClient,
  doctors: (NonNullable<ProfileCompletionData['medico']> & { id: string })[]
): Promise<Map<string, number>> {
  const ids = doctors.map(d => d.id)
  const [expRes, eduRes, condRes] = await Promise.all([
    supabase.from('doctor_experience').select('doctor_id').in('doctor_id', ids),
    supabase.from('doctor_education').select('doctor_id').in('doctor_id', ids),
    supabase.from('doctor_conditions').select('doctor_id').in('doctor_id', ids),
  ])
  const expCount = contarPorDoctor(expRes.data as { doctor_id: string }[] | null)
  const eduCount = contarPorDoctor(eduRes.data as { doctor_id: string }[] | null)
  const condCount = contarPorDoctor(condRes.data as { doctor_id: string }[] | null)

  const mapa = new Map<string, number>()
  for (const d of doctors) {
    const { percentage } = calculateProfileCompletion({
      medico: d,
      experienceCount: expCount.get(d.id) ?? 0,
      educationCount: eduCount.get(d.id) ?? 0,
      conditionsCount: condCount.get(d.id) ?? 0,
    })
    mapa.set(d.id, percentage)
  }
  return mapa
}

// Elegibilidad: perfil con completitud >= 30%. Por debajo de eso el médico
// sigue accesible normal por /buscar y su perfil directo — solo se omite de
// esta sección de la home. Orden: completitud desc; empate → rating desc
// SOLO si ambos tienen 3+ reseñas (si no, el rating no participa en
// absoluto); último desempate: alfabético por nombre. pricing_tier,
// years_experience y created_at nunca entran a este cálculo (regla de
// producto). Llamada desde app/page.tsx (Server Component, revalidate 10min).
export async function getEspecialistasDestacados(): Promise<EspecialistaHomepage[]> {
  const supabase = getSupabase()

  const { data: doctors, error } = await supabase
    .from('doctors')
    .select(`id, slug, full_name, specialty, photo_url, ciudad, estado, clinic_name,
      consultation_price_general, whatsapp_available, about_me, clinic_lat, clinic_lng,
      horario, consultation_price_first_time, phone, clinic_phone, whatsapp_phone, languages,
      rating_avg, rating_count`)
    .eq('is_active', true)

  if (error || !doctors) return []

  const completitudPorId = await calcularCompletitudPorDoctor(supabase, doctors)
  const elegibles = doctors
    .map(d => ({ ...d, completitud: completitudPorId.get(d.id) ?? 0 }))
    .filter(d => d.completitud >= UMBRAL_ELEGIBILIDAD)

  elegibles.sort(compararPorMerito)

  return elegibles.slice(0, LIMITE).map(d => ({
    id: d.id,
    slug: d.slug,
    full_name: d.full_name,
    specialty: d.specialty,
    photo_url: d.photo_url,
    ciudad: d.ciudad,
    estado: d.estado,
    clinic_name: d.clinic_name,
    consultation_price_general: d.consultation_price_general,
    whatsapp_available: d.whatsapp_available,
  }))
}
