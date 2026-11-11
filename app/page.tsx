import type { Metadata } from 'next'
import HomeClient from './HomeClient'
import { getEspecialistasDestacados } from '@/lib/homepageEspecialistas'

export const metadata: Metadata = {
  title: 'Salurama. Verifica. Elige. Confía.',
  description: 'Directorio médico en México. Encuentra especialistas verificados cerca de ti, agenda cita en línea y lee reseñas de pacientes reales.',
  alternates: {
    canonical: 'https://salurama.com',
  },
  openGraph: {
    title: 'Salurama: Directorio médico en México',
    description: 'Directorio médico en México. Encuentra especialistas verificados cerca de ti, agenda cita en línea y lee reseñas de pacientes reales.',
    url: 'https://salurama.com',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Salurama - Directorio médico en México' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Salurama: Directorio médico en México',
    description: 'Directorio médico en México. Encuentra especialistas verificados cerca de ti, agenda cita en línea y lee reseñas de pacientes reales.',
    images: ['/og-image.png'],
  },
}

// Home entera resuelta en el servidor (lista de especialistas + catálogo de
// especialidades) y cacheada 10 min vía ISR — antes ambas se pedían en
// useEffect del cliente, así que el HTML inicial llegaba vacío. No hay
// searchParams ni cookies aquí, así que la ruta califica para caché estática
// real (confirmado con `next build`: aparece como ○ con ventana de 10m).
export const revalidate = 600


// Organization/WebSite — sin afirmar certificación ni verificación por parte
// de Salurama, solo identidad de la organización (regla de producto, ver
// memoria del proyecto sobre verification_status).
function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Salurama',
    url: 'https://salurama.com',
    logo: 'https://salurama.com/favicon.png',
    description: 'Directorio médico en México. Encuentra especialistas, consulta su cédula profesional en SEP/CONACEM, lee reseñas de pacientes reales y agenda tu cita.',
  }
}

export default async function HomePage() {
  const especialistas = await getEspecialistasDestacados()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
      />
      <HomeClient especialistas={especialistas} />
    </>
  )
}
