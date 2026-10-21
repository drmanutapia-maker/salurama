import HomeClient from './HomeClient'
import { getEspecialistasDestacados } from '@/lib/homepageEspecialistas'

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
