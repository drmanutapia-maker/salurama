import type { Metadata } from 'next'
import Link from 'next/link'
import { getArticulosPublicados } from '@/lib/blog'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'Blog para pacientes',
  description: 'Artículos sencillos sobre especialidades médicas, escritos para pacientes: qué esperar de una consulta, cuándo acudir con un especialista y cómo prepararte.',
  alternates: { canonical: 'https://salurama.com/blog' },
  openGraph: {
    title: 'Blog para pacientes | Salurama',
    description: 'Artículos sencillos sobre especialidades médicas, escritos para pacientes.',
    url: 'https://salurama.com/blog',
  },
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return ''
  return new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BlogPage() {
  const articulos = await getArticulosPublicados()

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .articulo-card { text-decoration: none; display: block; background: #fff; border: 1.5px solid #E5E7EB; border-radius: 16px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s; }
        .articulo-card:hover { box-shadow: 0 8px 24px #1E3A5F14; border-color: #1E3A5F33; }
      `}</style>

      <section style={{ padding: 'clamp(48px, 8vw, 72px) 20px 40px', textAlign: 'center', background: 'linear-gradient(160deg, #E8ECF3 0%, #fff 60%)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Blog para pacientes
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 900, color: '#1E3A5F', lineHeight: 1.15, marginBottom: 16 }}>
            Artículos para entender tu salud
          </h1>
          <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#6B7280', lineHeight: 1.75, maxWidth: 520, margin: '0 auto' }}>
            Explicaciones sencillas sobre especialidades médicas, escritas y revisadas por médicos, pensadas para pacientes, no para otros doctores.
          </p>
        </div>
      </section>

      <section style={{ padding: 'clamp(24px, 5vw, 48px) 20px 72px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          {articulos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 15, padding: '40px 0' }}>
              Todavía no hay artículos publicados. Vuelve pronto — publicamos contenido nuevo cada semana.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {articulos.map(articulo => (
                <Link key={articulo.id} href={`/blog/${articulo.slug}`} className="articulo-card">
                  {articulo.imagen_portada_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={articulo.imagen_portada_url}
                      alt={articulo.titulo}
                      style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                    />
                  )}
                  <div style={{ padding: '18px 20px' }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      {articulo.especialidad}
                    </p>
                    <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#111827', lineHeight: 1.3, marginBottom: 8 }}>
                      {articulo.titulo}
                    </h2>
                    <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 10 }}>
                      {articulo.resumen}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>{formatFecha(articulo.publicado_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
