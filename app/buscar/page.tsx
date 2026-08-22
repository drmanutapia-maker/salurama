import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import BuscarClient, { type Medico } from './BuscarClient'
import { getStateLabel } from '@/lib/locations'
import { getArticulosPorEspecialidadTexto } from '@/lib/blog'
import { esCombinacionCalificada, especialidadSlug, estadoSlug } from '@/lib/especialidadEstado'
import { calcularCompletitudPorDoctor, compararPorMerito } from '@/lib/homepageEspecialistas'
import { proximoDiaDisponible } from '@/lib/proximaCitaDisponible'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type SearchParams = { especialidad?: string; estado?: string }

const norm = (t: string | null | undefined): string =>
  t ? t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : ''

// Misma lógica de filtrado que BuscarClient.tsx (substring en nombre/
// especialidad, comparación exacta de estado — el fix de ayer) pero
// server-side, solo para saber cuántos coinciden y armar el texto
// introductorio. Duplicada a propósito: una copia corre en el servidor
// para el conteo inicial, otra en el cliente para el filtrado interactivo
// en vivo — no vale la pena una abstracción compartida para ~6 líneas.
function contarCoincidencias(doctors: Medico[], especialidad?: string, estado?: string): number {
  let r = doctors
  if (especialidad) {
    const t = norm(especialidad)
    r = r.filter(m => norm(m.full_name).includes(t) || norm(m.specialty).includes(t))
  }
  if (estado) {
    const s = norm(estado)
    r = r.filter(m => m.estado && norm(m.estado) === s)
  }
  return r.length
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const { especialidad, estado } = await searchParams
  const estadoLabel = estado ? getStateLabel(estado) : undefined

  let title = 'Encuentra un especialista médico en México'
  let description = 'Busca médicos especialistas por nombre, especialidad o ciudad. Consulta su cédula profesional, lee reseñas de pacientes reales y agenda tu cita en Salurama.'

  if (especialidad && estadoLabel) {
    title = `${especialidad} en ${estadoLabel}`
    description = `Encuentra especialistas en ${especialidad} en ${estadoLabel}. Consulta su cédula profesional, lee reseñas de pacientes reales y agenda tu cita en Salurama.`
  } else if (especialidad) {
    title = `Médicos especialistas en ${especialidad}`
    description = `Encuentra y compara especialistas en ${especialidad} en México. Consulta su cédula profesional, lee reseñas de pacientes reales y agenda tu cita en Salurama.`
  } else if (estadoLabel) {
    title = `Médicos especialistas en ${estadoLabel}`
    description = `Encuentra especialistas médicos en ${estadoLabel}. Consulta su cédula profesional, lee reseñas de pacientes reales y agenda tu cita en Salurama.`
  }

  // Canónica auto-referenciada cuando hay especialidad/estado: son variantes
  // de contenido distintas y útiles de indexar (ej. "hematólogos en cdmx"),
  // no duplicados de /buscar a secas. El value real de la URL sigue siendo
  // el nombre oficial SEPOMEX (estado, no estadoLabel) — solo el texto
  // visible/título usa la etiqueta amigable.
  const qs = new URLSearchParams()
  if (especialidad) qs.set('especialidad', especialidad)
  if (estado) qs.set('estado', estado)
  const queryString = qs.toString()
  let canonicalUrl = `https://salurama.com/buscar${queryString ? `?${queryString}` : ''}`

  // Si la combinación ya tiene su propia página dedicada (/especialistas/...,
  // Parte 5 del plan de SEO), el canonical se consolida ahí en vez de
  // auto-referenciarse — evita que las dos URLs compitan como casi-duplicados
  // por el mismo contenido.
  if (especialidad && estado) {
    const combinacion = await esCombinacionCalificada(especialidad, estado)
    if (combinacion) {
      canonicalUrl = `https://salurama.com/especialistas/${especialidadSlug(combinacion.especialidad)}/${estadoSlug(combinacion.estado)}`
    }
  }

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl },
  }
}

// H1 + párrafo introductorio server-rendered, arriba de la barra de
// búsqueda — antes /buscar no tenía ningún <h1>. Sin especialidad/estado en
// la URL, solo se muestra el H1 genérico (sin párrafo); con alguno de los
// dos, se arma un texto específico usando el conteo real ya calculado en
// el servidor.
function armarHero(especialidad: string | undefined, estado: string | undefined, total: number): { titulo: string; texto: string | null } {
  const estadoLabel = estado ? getStateLabel(estado) : undefined

  if (!especialidad && !estadoLabel) {
    return { titulo: 'Encuentra un especialista médico en México', texto: null }
  }

  const titulo = especialidad && estadoLabel
    ? `Especialistas en ${especialidad} en ${estadoLabel}`
    : especialidad
      ? `Especialistas en ${especialidad}`
      : `Especialistas médicos en ${estadoLabel}`

  if (total > 0) {
    const especialista = total === 1 ? 'especialista' : 'especialistas'
    const especialistaMedico = total === 1 ? 'especialista médico' : 'especialistas médicos'
    const texto = especialidad && estadoLabel
      ? `Encontramos ${total} ${especialista} en ${especialidad} en ${estadoLabel}. Compara su cédula profesional, reseñas de pacientes reales y precio de consulta antes de agendar.`
      : especialidad
        ? `Encontramos ${total} ${especialista} en ${especialidad} en México. Compara su cédula profesional, reseñas de pacientes reales y precio de consulta antes de agendar.`
        : `Encontramos ${total} ${especialistaMedico} en ${estadoLabel}. Compara su cédula profesional, reseñas de pacientes reales y precio de consulta antes de agendar.`
    return { titulo, texto }
  }

  const registradosEn = especialidad && estadoLabel
    ? `en ${especialidad} registrados en ${estadoLabel}`
    : especialidad
      ? `en ${especialidad} registrados en la plataforma`
      : `registrados en ${estadoLabel}`
  return {
    titulo,
    texto: `Por ahora no hay especialistas ${registradosEn}. Puedes ver todos nuestros especialistas disponibles mientras se suman más.`,
  }
}

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { especialidad, estado } = await searchParams

  const supabase = getSupabase()

  // Lista inicial resuelta en el servidor para que el HTML traiga contenido
  // real desde el primer request (antes se pedía en un useEffect del
  // cliente). El filtro "cerca de mí" sigue reemplazando esta lista desde
  // el navegador porque depende de la geolocalización del usuario.
  //
  // Se piden más columnas de las que la tarjeta pinta directamente: about_me,
  // horario, consultation_price_first_time, phone, clinic_phone y
  // whatsapp_phone solo se usan aquí, server-side, para calcular la
  // completitud del perfil (mismo criterio que la home,
  // lib/homepageEspecialistas.ts) y la "próxima cita disponible" -- nunca se
  // mandan al cliente tal cual (ver el recorte al construir `medicos` más
  // abajo), para no exponer de más en el payload público.
  const { data } = await supabase
    .from('doctors')
    .select(`id, slug, full_name, specialty, photo_url, ciudad, estado,
           consultation_price_general, years_experience, min_patient_age, max_patient_age, atiende_ninos,
           clinic_lat, clinic_lng, hospital_affiliation, languages, insurance_accepted, professional_license,
           professional_title, rating_avg, rating_count, created_at,
           about_me, horario, consultation_price_first_time, phone, clinic_phone, whatsapp_phone`)
    .eq('is_active', true)
    .limit(100)

  const doctorsRaw = data ?? []
  const doctorIds = doctorsRaw.map(d => d.id)

  // Mismo criterio de mérito que ya usa la home (completitud de perfil →
  // rating con mínimo de reseñas → alfabético) -- antes esta lista se
  // ordenaba por fecha de registro más reciente primero, inconsistente con
  // el resto de la plataforma.
  const completitudPorId = await calcularCompletitudPorDoctor(supabase, doctorsRaw)
  const doctorsOrdenados = doctorsRaw
    .map(d => ({ ...d, completitud: completitudPorId.get(d.id) ?? 0 }))
    .sort(compararPorMerito)

  // Fechas bloqueadas de TODOS los médicos de esta lista en un solo
  // round-trip (no una consulta por médico) -- misma tabla que usa el
  // calendario de reserva en el perfil público, filtrada a partir de hoy.
  const hoyMx = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const { data: bloqueosData } = doctorIds.length > 0
    ? await supabase.from('doctor_blocked_dates').select('doctor_id, fecha').in('doctor_id', doctorIds).gte('fecha', hoyMx)
    : { data: [] as { doctor_id: string; fecha: string }[] }
  const bloqueosPorDoctor = new Map<string, Set<string>>()
  for (const b of bloqueosData ?? []) {
    if (!bloqueosPorDoctor.has(b.doctor_id)) bloqueosPorDoctor.set(b.doctor_id, new Set())
    bloqueosPorDoctor.get(b.doctor_id)!.add(b.fecha)
  }

  const medicos: Medico[] = doctorsOrdenados.map(d => ({
    id: d.id,
    slug: d.slug,
    full_name: d.full_name,
    specialty: d.specialty,
    photo_url: d.photo_url,
    ciudad: d.ciudad,
    estado: d.estado,
    consultation_price_general: d.consultation_price_general,
    years_experience: d.years_experience,
    min_patient_age: d.min_patient_age,
    max_patient_age: d.max_patient_age,
    atiende_ninos: d.atiende_ninos,
    clinic_lat: d.clinic_lat,
    clinic_lng: d.clinic_lng,
    hospital_affiliation: d.hospital_affiliation,
    languages: d.languages,
    insurance_accepted: d.insurance_accepted,
    professional_license: d.professional_license,
    professional_title: d.professional_title,
    rating_avg: d.rating_avg,
    rating_count: d.rating_count,
    created_at: d.created_at,
    proximaCita: proximoDiaDisponible(d.horario, bloqueosPorDoctor.get(d.id) ?? new Set()),
  }))

  const total = contarCoincidencias(medicos, especialidad, estado)
  const { titulo, texto } = armarHero(especialidad, estado, total)

  // Mitad "buscar → blog" del interlink bidireccional (la otra mitad, el CTA
  // de cada artículo hacia /buscar?especialidad=X, ya existe desde la Parte
  // 2). El estado no participa: un artículo de Hematología aplica sin
  // importar el estado filtrado.
  const articulosRelacionados = especialidad
    ? await getArticulosPorEspecialidadTexto(especialidad, 3)
    : []

  // Mismo chequeo que generateMetadata (Parte 3): si esta combinación ya
  // tiene página dedicada, se ofrece como link visible además de canonical.
  let paginaDedicada: string | null = null
  if (especialidad && estado) {
    const combinacion = await esCombinacionCalificada(especialidad, estado)
    if (combinacion) {
      paginaDedicada = `/especialistas/${especialidadSlug(combinacion.especialidad)}/${estadoSlug(combinacion.estado)}`
    }
  }

  return (
    <BuscarClient
      initialMedicos={medicos}
      heroTitulo={titulo}
      heroTexto={texto}
      articulosRelacionados={articulosRelacionados}
      paginaDedicada={paginaDedicada}
    />
  )
}
