import { createClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'
import { getEspecialistasDestacados } from '@/lib/homepageEspecialistas'

// Home entera resuelta en el servidor (lista de especialistas + catálogo de
// especialidades) y cacheada 10 min vía ISR — antes ambas se pedían en
// useEffect del cliente, así que el HTML inicial llegaba vacío. No hay
// searchParams ni cookies aquí, así que la ruta califica para caché estática
// real (confirmado con `next build`: aparece como ○ con ventana de 10m).
export const revalidate = 600

const ESPECIALIDADES_CONACEM: string[] = [
  'Alergología',
  'Anestesiología',
  'Angiología y Cirugía Vascular',
  'Cardiología',
  'Cardiología Pediátrica',
  'Cirugía Cardiovascular',
  'Cirugía General',
  'Cirugía Maxilofacial',
  'Cirugía Pediátrica',
  'Cirugía Plástica y Reconstructiva',
  'Dermatología',
  'Endocrinología',
  'Endocrinología Pediátrica',
  'Gastroenterología',
  'Gastroenterología y Endoscopia Pediátrica',
  'Geriatría',
  'Hematología',
  'Hematología Pediátrica',
  'Infectología',
  'Infectología Pediátrica',
  'Medicina Crítica',
  'Medicina Familiar',
  'Medicina Física y Rehabilitación',
  'Medicina Interna',
  'Nefrología',
  'Nefrología Pediátrica',
  'Neonatología',
  'Neumología',
  'Neumología Pediátrica',
  'Neurocirugía',
  'Neurología',
  'Neurología Pediátrica',
  'Oncología',
  'Oncología Pediátrica',
  'Oftalmología',
  'Ortopedia y Traumatología',
  'Otorrinolaringología',
  'Pediatría',
  'Psiquiatría',
  'Psiquiatría Infantil y de la Adolescencia',
  'Radiología e Imagen',
  'Reumatología',
  'Reumatología Pediátrica',
  'Urología',
  'Ginecología y Obstetricia',
  'Medicina General',
  'Nutrición',
  'Oncología Radioterápica',
  'Patología',
  'Pediatría del Desarrollo y Conducta',
]

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getEspecialidades(): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from('doctors')
    .select('specialty')
    .eq('is_active', true)
    .not('specialty', 'is', null)
    .limit(500)
  if (error || !data) return ESPECIALIDADES_CONACEM

  const fromDB = Array.from(new Set(data.map(d => d.specialty).filter(Boolean))) as string[]
  const extras = fromDB.filter(esp => !ESPECIALIDADES_CONACEM.includes(esp)).sort()
  return [...ESPECIALIDADES_CONACEM, ...extras]
}

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
  const [especialistas, especialidades] = await Promise.all([
    getEspecialistasDestacados(),
    getEspecialidades(),
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }}
      />
      <HomeClient especialistas={especialistas} especialidades={especialidades} />
    </>
  )
}
