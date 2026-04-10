import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const doctorName = searchParams.get('name')
  const council = searchParams.get('council')

  if (!doctorName) {
    return NextResponse.json({ error: 'Nombre del médico requerido' }, { status: 400 })
  }

  try {
    // Intentar obtener datos de CONACEM
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos

    // CONACEM tiene diferentes URLs dependiendo del consejo
    const conacemUrl = council 
      ? `https://conacem.org.mx/buscador?search=${encodeURIComponent(doctorName)}`
      : `https://conacem.org.mx/buscador?search=${encodeURIComponent(doctorName)}`
    
    const response = await fetch(conacemUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow'
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`CONACEM responded with ${response.status}`)
    }

    const html = await response.text()
    
    // Parsear HTML para extraer información
    const data = parseCONACEMHtml(html, doctorName, council)

    return NextResponse.json({
      success: true,
      verified: data.found,
      data: data,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error verificando en CONACEM:', error)
    
    if (error.name === 'AbortError') {
      return NextResponse.json({
        error: 'CONACEM está tardando demasiado. Intenta de nuevo más tarde.',
        timeout: true
      }, { status: 504 })
    }

    return NextResponse.json({
      error: 'No se pudo verificar en CONACEM en este momento',
      details: error.message
    }, { status: 500 })
  }
}

function parseCONACEMHtml(html: string, doctorName: string, council: string | null) {
  const result: any = {
    found: false,
    doctorName: doctorName,
    council: council || 'CONACEM',
    specialty: null,
    certificateNumber: null,
    issueDate: null,
    expiryDate: null,
    status: null
  }

  // Buscar patrones comunes en el HTML de CONACEM
  // Extraer nombre del médico
  const nameMatch = html.match(new RegExp(doctorName.replace(/\s+/g, '\\s+'), 'i'))
  if (nameMatch) {
    result.found = true
  }

  // Extraer especialidad
  const specialtyMatch = html.match(/(?:Especialidad|Certificación)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  if (specialtyMatch) {
    result.specialty = cleanText(specialtyMatch[1])
  }

  // Extraer número de certificado
  const certMatch = html.match(/(?:Certificado|Registro|Folio)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  if (certMatch) {
    result.certificateNumber = cleanText(certMatch[1])
  }

  // Extraer fecha de expedición
  const issueMatch = html.match(/(?:Expedición|Emisión|Fecha)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  if (issueMatch) {
    result.issueDate = cleanText(issueMatch[1])
  }

  // Extraer vigencia
  const expiryMatch = html.match(/(?:Vigencia|Válido|Expira)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  if (expiryMatch) {
    result.expiryDate = cleanText(expiryMatch[1])
  }

  // Extraer estatus
  const statusMatch = html.match(/(?:Estatus|Estado|Vigente)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  if (statusMatch) {
    result.status = cleanText(statusMatch[1])
  }

  // Si no encontró nada específico, buscar si el nombre existe en el HTML
  if (!result.found) {
    if (html.includes(doctorName.split(' ')[0]) || html.includes(doctorName.split(' ').pop())) {
      result.found = true
      result.status = 'Encontrado en CONACEM'
    }
  }

  return result
}

function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}