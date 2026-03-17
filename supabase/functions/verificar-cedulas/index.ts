import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

async function consultarSEP(cedula: string): Promise<string | null> {
  try {
    const url = `https://www.buholegal.com/consultacedula/?cedula=${cedula}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000)
    })
    if (!response.ok) return null
    const html = await response.text()
    const match = html.match(/Nombre[^:]*:\s*<[^>]+>([^<]+)</)
    if (match && match[1]) return match[1].trim()
    const match2 = html.match(/<td[^>]*>([A-ZÁÉÍÓÚÑ\s]{10,60})<\/td>/)
    if (match2 && match2[1]) return match2[1].trim()
    return null
  } catch (_) {
    return null
  }
}

function nombresCoinciden(nombreMedico: string, nombreSEP: string): boolean {
  const medico = normalizar(nombreMedico).replace(/^(dr\.|dra\.|doctor|doctora)\s+/i, '')
  const sep = normalizar(nombreSEP)
  if (medico === sep) return true
  const palabras = medico.split(' ').filter(p => p.length > 2)
  return palabras.filter(p => sep.includes(p)).length >= 2
}

Deno.serve(async (_req) => {
  const { data: medicos, error } = await supabase
    .from('doctors')
    .select('id, full_name, professional_license')
    .eq('verification_status', 'pendiente')
    .limit(50)

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  if (!medicos || medicos.length === 0)
    return new Response(JSON.stringify({ message: 'Sin pendientes', verificados: 0 }), { status: 200 })

  const resultados = { verificados: 0, revision_manual: 0, sin_respuesta: 0 }

  for (const medico of medicos) {
    const nombreSEP = await consultarSEP(medico.professional_license)
    let nuevoStatus: string
    let licenseVerified: boolean

    if (nombreSEP === null) {
      nuevoStatus = 'pendiente'; licenseVerified = false; resultados.sin_respuesta++
    } else if (nombresCoinciden(medico.full_name, nombreSEP)) {
      nuevoStatus = 'verificado'; licenseVerified = true; resultados.verificados++
    } else {
      nuevoStatus = 'revision_manual'; licenseVerified = false; resultados.revision_manual++
    }

    if (nuevoStatus !== 'pendiente') {
      await supabase.from('doctors').update({
        verification_status: nuevoStatus,
        license_verified: licenseVerified,
      }).eq('id', medico.id)
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return new Response(
    JSON.stringify({ message: 'Verificación completada', ...resultados }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})