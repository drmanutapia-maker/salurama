import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Shield, ArrowRight, BookOpen } from 'lucide-react'
import { getStateLabel } from '@/lib/locations'
import { getCombinacionesCalificadas, resolverPorSlugs, especialidadSlug, estadoSlug } from '@/lib/especialidadEstado'
import { getArticulosPorEspecialidadTexto } from '@/lib/blog'
import type { Medico } from '@/app/buscar/BuscarClient'

// ISR — mismo patrón que /buscar y la homepage: la lista de combinaciones
// calificadas se recalcula cada 10 min, así una combinación que sube o baja
// del umbral se refleja sin necesidad de un nuevo deploy.
export const revalidate = 600
export const dynamicParams = true

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateStaticParams() {
  const combinaciones = await getCombinacionesCalificadas()
  return combinaciones.map(c => ({
    especialidad: especialidadSlug(c.especialidad),
    estado: estadoSlug(c.estado),
  }))
}

type Params = { especialidad: string; estado: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { especialidad, estado } = await params
  const combinacion = await resolverPorSlugs(especialidad, estado)
  if (!combinacion) return { title: 'Página no encontrada' }

  const estadoLabel = getStateLabel(combinacion.estado)
  const title = `Especialistas en ${combinacion.especialidad} en ${estadoLabel}`
  const description = `${combinacion.total} especialistas en ${combinacion.especialidad} en ${estadoLabel}, verificables en Salurama. Consulta su cédula profesional, reseñas de pacientes reales y agenda tu cita.`
  const canonicalUrl = `https://salurama.com/especialistas/${especialidad}/${estado}`

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title, description, url: canonicalUrl },
  }
}

function calcularRangoPrecio(medicos: Medico[]): string | null {
  const precios = medicos.map(m => m.consultation_price_general).filter((p): p is number => !!p && p > 0)
  if (precios.length === 0) return null
  const min = Math.min(...precios)
  const max = Math.max(...precios)
  if (min === max) return `$${min.toLocaleString('es-MX')} MXN`
  return `$${min.toLocaleString('es-MX')} – $${max.toLocaleString('es-MX')} MXN`
}

export default async function EspecialidadEstadoPage({ params }: { params: Promise<Params> }) {
  const { especialidad, estado } = await params
  const combinacion = await resolverPorSlugs(especialidad, estado)
  if (!combinacion) notFound()

  const estadoLabel = getStateLabel(combinacion.estado)

  const [{ data }, articulosRelacionados] = await Promise.all([
    getSupabase()
      .from('doctors')
      .select(`id, slug, full_name, specialty, photo_url, ciudad, estado,
             consultation_price_general, years_experience, min_patient_age, max_patient_age,
             clinic_lat, clinic_lng, hospital_affiliation, languages, insurance_accepted, professional_license`)
      .eq('is_active', true)
      .eq('specialty', combinacion.especialidad)
      .eq('estado', combinacion.estado)
      .order('created_at', { ascending: false }),
    getArticulosPorEspecialidadTexto(combinacion.especialidad, 3),
  ])

  const medicos = (data ?? []) as Medico[]

  // Defensa en profundidad: si entre resolverPorSlugs() y esta query el
  // roster cambió y ya no llega al umbral, no serví una página delgada.
  if (medicos.length === 0) notFound()

  const rangoPrecio = calcularRangoPrecio(medicos)

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .medico-card { display: block; background: #fff; border-radius: 16px; padding: 18px 20px; border: 1px solid #E5E7EB; text-decoration: none; color: inherit; transition: border-color .18s, box-shadow .18s; }
        .medico-card:hover { border-color: #C4B5FD; box-shadow: 0 8px 24px rgba(139,92,246,.1); }
      `}</style>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 100px' }}>
        {/* ── HERO ── */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 36px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Directorio médico verificable
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, color: '#1E3A5F', lineHeight: 1.2, marginBottom: 14 }}>
            Especialistas en {combinacion.especialidad} en {estadoLabel}
          </h1>
          <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7 }}>
            Encontramos {combinacion.total} especialistas en {combinacion.especialidad} activos en {estadoLabel}. Cada perfil incluye su cédula profesional para que la verifiques directamente en la SEP, además de reseñas de pacientes reales. Nunca certificamos ni avalamos a ningún médico nosotros mismos.
          </p>
        </div>

        {/* ── MINI-FAQ CON DATOS REALES ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 40 }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
              ¿Cuántos especialistas en {combinacion.especialidad} hay en {estadoLabel} en Salurama?
            </p>
            <p style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.6 }}>
              Hoy hay {combinacion.total} especialistas en {combinacion.especialidad} con perfil activo en {estadoLabel}. Cada uno muestra su cédula profesional para que la confirmes en la fuente oficial.
            </p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
              ¿Cuánto cuesta una consulta con especialista en {combinacion.especialidad} en {estadoLabel}?
            </p>
            <p style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.6 }}>
              {rangoPrecio
                ? `El costo de consulta entre los especialistas listados va de ${rangoPrecio}, según el médico y el tipo de consulta.`
                : 'El costo varía por médico: consulta el precio directamente en cada perfil.'}
            </p>
          </div>
        </div>

        {/* ── LISTA DE MÉDICOS ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F', marginBottom: 18 }}>
            Especialistas disponibles
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {medicos.map(medico => (
              <Link key={medico.id} href={`/doctor/${medico.slug ?? medico.id}`} className="medico-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#1E3A5F', marginBottom: 3 }}>{medico.full_name}</p>
                    <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{medico.specialty}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: '#6B7280', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={13} color="#9CA3AF" />
                        {medico.ciudad ? `${medico.ciudad}, ${estadoLabel}` : estadoLabel}
                      </span>
                      {medico.professional_license && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#059669' }}>
                          <Shield size={13} /> Consulta cédula
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#8B5CF6', fontSize: 13, fontWeight: 700 }}>
                    Ver perfil <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── ARTÍCULOS RELACIONADOS ── */}
        {articulosRelacionados.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1E3A5F', marginBottom: 14 }}>
              Sobre {combinacion.especialidad}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {articulosRelacionados.map(a => (
                <Link
                  key={a.id}
                  href={`/blog/${a.slug}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '10px 16px', textDecoration: 'none', maxWidth: 320 }}
                >
                  <BookOpen size={16} color="#2A9D8F" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.titulo}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA AL BUSCADOR COMPLETO ── */}
        <div style={{ textAlign: 'center', padding: '24px 20px', background: '#E8ECF3', borderRadius: 16 }}>
          <p style={{ fontSize: 14, color: '#1E3A5F', marginBottom: 12 }}>
            ¿Buscas otra especialidad o estado?
          </p>
          <Link
            href="/buscar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1E3A5F', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '12px 26px', borderRadius: 50, fontSize: 14 }}
          >
            Ir al buscador completo <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    </div>
  )
}
