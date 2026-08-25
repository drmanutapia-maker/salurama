import { createClient } from '@supabase/supabase-js'
import { permanentRedirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { cache } from 'react'
import { isUuid } from '@/lib/slug'
import DoctorProfileClient, {
  type Medico,
  type License,
  type EducationItem,
  type ExperienceItem,
  type Condition,
  type Review,
  type SpecialtyCredential,
  type GalleryPhoto,
} from './DoctorProfileClient'

// Sin ISR aquí a propósito: esta página lee `searchParams` (ver DoctorPage
// más abajo, para el redirect 301 que preserva el query string), y eso es
// una Dynamic API de Next.js — fuerza render dinámico en cada request y
// anula cualquier `export const revalidate`. Confirmado en vivo: las
// cabeceras de producción ya traen Cache-Control: no-store en cada
// petición, o sea que el perfil siempre sale fresco, sin necesidad de ISR.

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Service role, solo para el chequeo de "¿tiene al menos una cita
// completada?" — citas no tiene (ni debe tener) una política RLS pública de
// lectura para anon, a diferencia de doctors/reviews/gallery, porque guarda
// PII del paciente (nombre, correo, teléfono). Este chequeo corre en el
// servidor (Server Component, nunca llega al cliente) y solo expone un
// booleano derivado, no las citas mismas.
function getSupabaseServiceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// select('*') porque este mismo lookup alimenta tanto generateMetadata como
// el perfil completo (envuelto en cache() de React para que, aunque Next
// invoque esta función por separado en cada uno, solo se ejecute una query
// por request). No filtra is_active: un perfil inactivo (ej. correo aún sin
// confirmar) debe tratarse como no encontrado, no simplemente omitirse de
// listados, así que el chequeo se hace explícito donde se usa este lookup.
const resolveDoctor = cache(async (slugParam: string): Promise<Medico | null> => {
  const column = isUuid(slugParam) ? 'id' : 'slug'
  const { data } = await getSupabase()
    .from('doctors')
    .select('*')
    .eq(column, slugParam)
    .maybeSingle()
  return data
})

// Resto de la data pública del perfil (licencias, educación, experiencia,
// condiciones, reseñas, credenciales, galería) — se resuelve en el servidor
// para que el HTML inicial (y el JSON-LD) traigan el contenido real, en vez
// de depender de un useEffect del lado del cliente.
async function getDoctorProfileData(doctorId: string) {
  const supabase = getSupabase()
  const [licRes, eduRes, expRes, condRes, revRes, credRes, galRes, citaCompletadaRes] = await Promise.all([
    supabase.from('doctor_licenses').select('*').eq('doctor_id', doctorId),
    supabase.from('doctor_education').select('*').eq('doctor_id', doctorId).order('graduation_year', { ascending: false }),
    supabase.from('doctor_experience').select('*').eq('doctor_id', doctorId).order('is_current', { ascending: false }),
    supabase.from('doctor_conditions').select('*').eq('doctor_id', doctorId).order('category'),
    // Columnas explícitas (no '*'): moderation_reason/moderation_flagged_by
    // son solo para la bandeja interna del admin, nunca deben llegar al HTML
    // público de esta página.
    // Sin límite: el perfil solo muestra 5 reseñas de entrada (ver
    // DoctorProfileClient, botón "Ver más"), pero eso es paginación de UI,
    // no debe recortar qué reseñas existen para el paciente que llega desde
    // el link de una respuesta (?review=) a una reseña antigua.
    supabase.from('reviews').select('id, rating, comment, created_at, review_responses(id, respuesta)').eq('doctor_id', doctorId).eq('is_visible', true).order('created_at', { ascending: false }),
    supabase.from('doctor_specialty_credentials').select('id, credentials_status, specialty_granular_mapping(granular_name, conacem_councils(council_name))').eq('doctor_id', doctorId),
    supabase.from('doctor_gallery_photos').select('id, photo_url, caption').eq('doctor_id', doctorId).order('position'),
    // Solo existencia (head:true) — para el badge de "perfil completo y con
    // consultas reales", no hace falta traer las citas mismas. Service role
    // porque citas no tiene política RLS pública para anon (ver comentario
    // en getSupabaseServiceRole).
    getSupabaseServiceRole().from('citas').select('id', { count: 'exact', head: true }).eq('medico_id', doctorId).eq('estado', 'completed'),
  ])

  return {
    tieneConsultaCompletada: (citaCompletadaRes.count ?? 0) > 0,
    licenses: (licRes.data ?? []) as License[],
    education: (eduRes.data ?? []) as EducationItem[],
    experience: (expRes.data ?? []) as ExperienceItem[],
    conditions: (condRes.data ?? []) as Condition[],
    galleryPhotos: (galRes.data ?? []) as GalleryPhoto[],
    specialtyCredentials: (credRes.data ?? []).map((r: any) => ({
      id: r.id,
      credentials_status: r.credentials_status,
      granular_name: r.specialty_granular_mapping?.granular_name,
      council_name: r.specialty_granular_mapping?.conacem_councils?.council_name ?? null,
    })) as SpecialtyCredential[],
    reviews: (revRes.data ?? []).map((r: any) => {
      const resp = Array.isArray(r.review_responses) ? (r.review_responses[0] ?? null) : (r.review_responses ?? null)
      return {
        id: r.id,
        user_name: 'Paciente',
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        respuesta: resp?.respuesta ?? null,
        respuestaId: resp?.id ?? null,
      }
    }) as Review[],
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doctor = await resolveDoctor(slug)

  if (!doctor || !doctor.is_active) {
    return { title: 'Perfil no encontrado' }
  }

  const displayName = doctor.display_name || doctor.full_name
  const titlePrefix = doctor.professional_title ? `${doctor.professional_title} ` : ''
  const title = `${titlePrefix}${displayName}: ${doctor.specialty}`
  const description = (doctor.about_me?.slice(0, 157) || null)
    ? `${doctor.about_me!.slice(0, 157)}...`
    : `${titlePrefix}${displayName}, especialista en ${doctor.specialty}${doctor.ciudad ? ` en ${doctor.ciudad}` : ''}. Agenda tu cita en Salurama.`
  const canonicalUrl = `https://salurama.com/doctor/${doctor.slug ?? doctor.id}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      images: doctor.photo_url ? [{ url: doctor.photo_url }] : undefined,
    },
  }
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function DoctorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}) {
  const { slug } = await params
  const doctor = await resolveDoctor(slug)

  if (!doctor || !doctor.is_active) {
    notFound()
  }

  // UUID legado (URLs ya indexadas) o alias que no coincide con el slug vigente
  // del médico — 301/308 permanente hacia el slug canónico, no se sirve contenido
  // duplicado en dos URLs. Se preserva el query string tal cual llegó.
  if (doctor.slug && doctor.slug !== slug) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(await searchParams)) {
      if (Array.isArray(value)) value.forEach(v => qs.append(key, v))
      else if (value !== undefined) qs.set(key, value)
    }
    const queryString = qs.toString()
    permanentRedirect(`/doctor/${doctor.slug}${queryString ? `?${queryString}` : ''}`)
  }

  const profileData = await getDoctorProfileData(doctor.id)

  return <DoctorProfileClient medico={doctor} {...profileData} />
}
