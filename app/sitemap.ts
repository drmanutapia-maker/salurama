import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://salurama.com'

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, priority: 1.0, changeFrequency: 'daily' },
    { url: `${baseUrl}/buscar`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${baseUrl}/registro`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${baseUrl}/como-elegir-medico`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${baseUrl}/nosotros`, priority: 0.6, changeFrequency: 'monthly' },
  ]

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, slug, updated_at')
      .eq('is_active', true)
      .eq('verification_status', 'verificado')

    const doctorPages: MetadataRoute.Sitemap = (doctors ?? []).map(d => ({
      url: `${baseUrl}/doctor/${d.slug ?? d.id}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : undefined,
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    }))

    return [...staticPages, ...doctorPages]
  } catch {
    return staticPages
  }
}
