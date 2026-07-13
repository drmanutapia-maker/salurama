import { createClient } from '@supabase/supabase-js'
import { permanentRedirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isUuid } from '@/lib/slug'
import DoctorProfileClient from './DoctorProfileClient'

type DoctorLookup = {
  id: string
  slug: string | null
  full_name: string
  display_name: string | null
  professional_title: string | null
  specialty: string
  about_me: string | null
  photo_url: string | null
  ciudad: string | null
  estado: string | null
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function resolveDoctor(slugParam: string): Promise<DoctorLookup | null> {
  const column = isUuid(slugParam) ? 'id' : 'slug'
  const { data } = await getSupabase()
    .from('doctors')
    .select('id, slug, full_name, display_name, professional_title, specialty, about_me, photo_url, ciudad, estado')
    .eq(column, slugParam)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const doctor = await resolveDoctor(slug)

  if (!doctor) {
    return { title: 'Perfil no encontrado' }
  }

  const displayName = doctor.display_name || doctor.full_name
  const titlePrefix = doctor.professional_title ? `${doctor.professional_title} ` : ''
  const title = `${titlePrefix}${displayName} — ${doctor.specialty}`
  const description = (doctor.about_me?.slice(0, 157) || null)
    ? `${doctor.about_me!.slice(0, 157)}...`
    : `${titlePrefix}${displayName}, especialista en ${doctor.specialty}${doctor.ciudad ? ` en ${doctor.ciudad}` : ''}. Cédula verificada, agenda tu cita en Salurama.`
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

  if (!doctor) {
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

  return <DoctorProfileClient doctorId={doctor.id} />
}
