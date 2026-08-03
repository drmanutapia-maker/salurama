import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getArticulosPublicados } from '@/lib/blog'
import { getCombinacionesCalificadas, especialidadSlug, estadoSlug } from '@/lib/especialidadEstado'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://salurama.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, priority: 1.0, changeFrequency: 'daily' },
    { url: `${baseUrl}/buscar`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${baseUrl}/registro`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/como-elegir-medico`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${baseUrl}/nosotros`, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${baseUrl}/blog`, priority: 0.7, changeFrequency: 'weekly' },
  ]

  const articulos = await getArticulosPublicados().catch(() => [])
  const blogPages: MetadataRoute.Sitemap = articulos.map(a => ({
    url: `${baseUrl}/blog/${a.slug}`,
    lastModified: a.publicado_at ? new Date(a.publicado_at) : undefined,
    priority: 0.6,
    changeFrequency: 'monthly' as const,
  }))

  // Solo las combinaciones que ya cumplen el umbral mínimo de médicos —
  // getCombinacionesCalificadas() ya aplica ese filtro, así que cualquier
  // combinación por debajo nunca llega aquí (ni se genera su URL, ni se
  // indexa). Se recalcula en cada regeneración del sitemap, así que una
  // combinación que cae por debajo del umbral sale del sitemap sola.
  const combinaciones = await getCombinacionesCalificadas().catch(() => [])
  const especialidadEstadoPages: MetadataRoute.Sitemap = combinaciones.map(c => ({
    url: `${baseUrl}/especialistas/${especialidadSlug(c.especialidad)}/${estadoSlug(c.estado)}`,
    priority: 0.7,
    changeFrequency: 'weekly' as const,
  }))

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // No filtrar por verification_status: Salurama nunca certifica ni verifica
    // médicos de cara al público — es el paciente quien verifica credenciales
    // en fuentes oficiales, esa es la diferenciación del producto. Ese campo es
    // uso interno/seguridad legal y no debe condicionar visibilidad en ningún
    // mecanismo (sitemap, búsqueda, ranking). Un médico activo se indexa,
    // independientemente de su estado de verificación.
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, slug, updated_at')
      .eq('is_active', true)

    const doctorPages: MetadataRoute.Sitemap = (doctors ?? []).map(d => ({
      url: `${baseUrl}/doctor/${d.slug ?? d.id}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : undefined,
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    }))

    return [...staticPages, ...doctorPages, ...blogPages, ...especialidadEstadoPages]
  } catch {
    return staticPages
  }
}
