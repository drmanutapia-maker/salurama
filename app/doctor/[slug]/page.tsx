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

// Columnas públicas de doctors que usa el perfil (todas dentro del GRANT de
// anon). Explícitas a propósito: NO incluyen email, phone, whatsapp,
// clinic_phone ni whatsapp_phone -- esos no son legibles con la clave
// anónima; el teléfono y el WhatsApp se piden aparte por función
// (get_doctor_clinic_phone / get_doctor_whatsapp), que solo los devuelven si
// el médico los marcó como visibles. user_id se usa para isOwner.
const COLUMNAS_DOCTOR_PUBLICO = [
  'id', 'slug', 'is_active', 'user_id', 'full_name', 'display_name', 'professional_title',
  'specialty', 'sub_specialty', 'ciudad', 'estado', 'colonia', 'cp', 'street', 'ext_number',
  'int_number', 'floor', 'clinic_type', 'clinic_name', 'clinic_address', 'clinic_lat',
  'clinic_lng', 'clinic_addresses', 'clinic_phone_visible', 'consultation_price_general',
  'consultation_price_first_time', 'consultation_price_followup', 'photo_url', 'about_me',
  'rating_avg', 'rating_count', 'years_experience', 'hospital_affiliation', 'languages',
  'insurance_names', 'accepts_insurance', 'payment_methods', 'factura_disponible',
  'whatsapp_available', 'facebook_url', 'instagram_url', 'tiktok_url', 'linkedin_url',
  'website_url', 'professional_license', 'review_status', 'min_patient_age',
  'max_patient_age', 'horario', 'duracion_cita_minutos', 'pricing_tier',
].join(', ')

// Este mismo lookup alimenta tanto generateMetadata como el perfil completo
// (envuelto en cache() de React para que, aunque Next invoque esta función
// por separado en cada uno, solo se ejecute una query por request). No filtra
// is_active: un perfil inactivo (ej. correo aún sin confirmar) debe tratarse
// como no encontrado, no simplemente omitirse de listados, así que el chequeo
// se hace explícito donde se usa este lookup.
const resolveDoctor = cache(async (slugParam: string): Promise<Medico | null> => {
  const column = isUuid(slugParam) ? 'id' : 'slug'
  const { data } = await getSupabase()
    .from('doctors')
    .select(COLUMNAS_DOCTOR_PUBLICO)
    .eq(column, slugParam)
    .maybeSingle()
  return data as unknown as Medico | null
})

// clinic_addresses es una columna JSON pública que guarda el teléfono de cada
// consultorio adicional junto con su flag de visibilidad. Es la única vía por
// la que un teléfono sigue viajando en doctors, así que se vacía aquí (en el
// servidor, antes de pasar nada al cliente) el de los consultorios que el
// médico no marcó como visibles. El teléfono y el WhatsApp del consultorio
// principal ya no vienen de esta fila: se piden por función.
function ocultarTelefonosDeAdicionales(doctor: Medico): Medico {
  if (!Array.isArray(doctor.clinic_addresses)) return doctor
  return {
    ...doctor,
    clinic_addresses: doctor.clinic_addresses.map(c => ({
      ...c,
      clinic_phone: c?.clinic_phone_visible === true ? c.clinic_phone : null,
    })),
  }
}

// Teléfono y WhatsApp públicos del consultorio principal: solo los devuelve la
// base de datos si el médico los marcó como visibles (clinic_phone_visible /
// whatsapp_available); si no, null. Un fallo de la función no debe tumbar el
// perfil: se trata como "sin teléfono".
async function getContactoPublico(doctorId: string) {
  const supabase = getSupabase()
  const [telefonoRes, whatsappRes] = await Promise.all([
    supabase.rpc('get_doctor_clinic_phone', { p_doctor_id: doctorId }),
    supabase.rpc('get_doctor_whatsapp', { p_doctor_id: doctorId }),
  ])
  return {
    telefonoVisible: telefonoRes.error ? null : ((telefonoRes.data as string | null) ?? null),
    whatsappVisible: whatsappRes.error ? null : ((whatsappRes.data as string | null) ?? null),
  }
}

// Resto de la data pública del perfil (licencias, educación, experiencia,
// condiciones, reseñas, credenciales, galería) — se resuelve en el servidor
// para que el HTML inicial (y el JSON-LD) traigan el contenido real, en vez
// de depender de un useEffect del lado del cliente.
async function getDoctorProfileData(doctorId: string) {
  const supabase = getSupabase()
  const [licRes, eduRes, expRes, condRes, revRes, credRes, galRes, citaCompletadaRes] = await Promise.all([
    supabase.from('doctor_licenses').select('id, license_number, license_type, institution').eq('doctor_id', doctorId),
    supabase.from('doctor_education').select('id, institution, degree, field_of_study, graduation_year').eq('doctor_id', doctorId).order('graduation_year', { ascending: false }),
    supabase.from('doctor_experience').select('id, institution_name, position, location, start_date, end_date, is_current').eq('doctor_id', doctorId).order('is_current', { ascending: false }),
    supabase.from('doctor_conditions').select('id, condition_name, category').eq('doctor_id', doctorId).order('category'),
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

  const [profileData, contacto] = await Promise.all([
    getDoctorProfileData(doctor.id),
    getContactoPublico(doctor.id),
  ])

  return <DoctorProfileClient medico={ocultarTelefonosDeAdicionales(doctor)} {...profileData} {...contacto} />
}
