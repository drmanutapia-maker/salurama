import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { ArrowRight } from 'lucide-react'
import { getArticuloPublicado, getArticulosRelacionados } from '@/lib/blog'
import BlogPreguntaForm from '@/components/BlogPreguntaForm'
import { jsonLdSeguro } from '@/lib/sanitizarTextoLibre'

export const revalidate = 600

function formatFecha(fecha: string | null): string {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const articulo = await getArticuloPublicado(slug)

  if (!articulo) {
    return { title: 'Artículo no encontrado' }
  }

  const description = articulo.resumen.length > 157 ? `${articulo.resumen.slice(0, 157)}...` : articulo.resumen
  const canonicalUrl = `https://salurama.com/blog/${articulo.slug}`

  return {
    title: articulo.titulo,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: articulo.titulo,
      description,
      url: canonicalUrl,
      type: 'article',
      images: articulo.imagen_portada_url ? [{ url: articulo.imagen_portada_url }] : undefined,
      publishedTime: articulo.publicado_at ?? undefined,
      modifiedTime: articulo.updated_at,
    },
  }
}

export default async function ArticuloPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const articulo = await getArticuloPublicado(slug)

  if (!articulo) {
    notFound()
  }

  const relacionados = await getArticulosRelacionados(articulo.especialidad, articulo.id)
  const canonicalUrl = `https://salurama.com/blog/${articulo.slug}`

  // MedicalWebPage además de BlogPosting: contenido médico dirigido a
  // pacientes (YMYL) — reviewedBy es la señal de revisión editorial por un
  // médico con cédula verificable, no una certificación de Salurama sobre el
  // contenido. Texto de reviewedBy exacto, aprobado por Manuel 2026-08-02.
  const articuloSchema = {
    '@context': 'https://schema.org',
    '@type': ['BlogPosting', 'MedicalWebPage'],
    headline: articulo.titulo,
    description: articulo.resumen,
    image: articulo.imagen_portada_url || undefined,
    datePublished: articulo.publicado_at,
    dateModified: articulo.updated_at,
    author: { '@type': 'Organization', name: 'Salurama', url: 'https://salurama.com' },
    reviewedBy: { '@type': 'Person', name: 'Manuel Tapia Dávila, Hematólogo, Cédula Profesional 14162379' },
    publisher: {
      '@type': 'Organization',
      name: 'Salurama',
      logo: { '@type': 'ImageObject', url: 'https://salurama.com/favicon.png' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
    url: canonicalUrl,
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#111827' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSeguro(articuloSchema) }}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .articulo-contenido { font-size: 16px; line-height: 1.8; color: #374151; }
        .articulo-contenido p { margin-bottom: 18px; }
        .articulo-contenido h2 { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 900; color: #1E3A5F; margin: 32px 0 14px; line-height: 1.3; }
        .articulo-contenido h3 { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 700; color: #1E3A5F; margin: 24px 0 10px; line-height: 1.3; }
        .articulo-contenido ul, .articulo-contenido ol { margin: 0 0 18px 22px; }
        .articulo-contenido li { margin-bottom: 8px; }
        .articulo-contenido a { color: #2A9D8F; }
        .articulo-contenido strong { font-weight: 700; color: #111827; }
        .relacionado-card { text-decoration: none; display: block; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 16px 18px; transition: border-color 0.2s; }
        .relacionado-card:hover { border-color: #1E3A5F55; }
      `}</style>

      <article style={{ maxWidth: 680, margin: '0 auto', padding: 'clamp(32px, 6vw, 56px) 20px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
          {articulo.especialidad}
        </p>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px, 6vw, 40px)', fontWeight: 900, color: '#1E3A5F', lineHeight: 1.2, marginBottom: 14 }}>
          {articulo.titulo}
        </h1>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 32 }}>
          {formatFecha(articulo.publicado_at)}
          {articulo.revisor_nombre ? ` · Revisado por ${articulo.revisor_nombre}` : ''}
        </p>

        {articulo.imagen_portada_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={articulo.imagen_portada_url}
            alt={articulo.titulo}
            style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 16, marginBottom: 32 }}
          />
        )}

        <div className="articulo-contenido">
          <ReactMarkdown>{articulo.contenido}</ReactMarkdown>
        </div>

        <div style={{ margin: '40px 0', padding: '24px 20px', background: '#E8ECF3', borderRadius: 16, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#1E3A5F', marginBottom: 14, lineHeight: 1.6 }}>
            ¿Buscas un especialista en {articulo.especialidad}?
          </p>
          <Link
            href={`/buscar?especialidad=${encodeURIComponent(articulo.especialidad)}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1E3A5F', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '12px 26px', borderRadius: 50, fontSize: 14 }}
          >
            Ver especialistas en {articulo.especialidad} <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{ marginBottom: 40 }}>
          <BlogPreguntaForm articuloId={articulo.id} />
        </div>
      </article>

      {relacionados.length > 0 && (
        <section style={{ background: '#F9FAFB', padding: 'clamp(32px, 5vw, 48px) 20px 64px', marginTop: 8 }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1E3A5F', marginBottom: 16 }}>
              Más sobre {articulo.especialidad}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {relacionados.map(rel => (
                <Link key={rel.id} href={`/blog/${rel.slug}`} className="relacionado-card">
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{rel.titulo}</p>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>{rel.resumen}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
