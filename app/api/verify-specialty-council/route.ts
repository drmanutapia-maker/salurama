import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

interface CouncilData {
  found: boolean
  doctorName: string
  council: string
  specialty: string | null
  certificateNumber: string | null
  issueDate: string | null
  expiryDate: string | null
  status: string | null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const doctorName = searchParams.get('name')?.trim() || ''
  const council = searchParams.get('council')?.trim() || null
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  if (!doctorName || doctorName.length < 3) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
  }

  // Rate limit: 5 consultas por hora por IP
  const rateKey = `conacem:${ip}`
  const count = await redis.incr(rateKey)
  if (count === 1) await redis.expire(rateKey, 3600)
  if (count > 5) {
    return NextResponse.json({ error: 'Demasiadas consultas' }, { status: 429 })
  }

  // Cache 24 horas
  const cacheKey = `conacem:${doctorName.toLowerCase().replace(/\s+/g, '-')}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const url = `https://conacem.org.mx/buscador?search=${encodeURIComponent(doctorName)}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Salurama/1.0)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
      cache: 'no-store',
    })

    clearTimeout(timeoutId)

    if (!response.ok) throw new Error(`CONACEM status ${response.status}`)

    const html = await response.text()
    const data = parseCONACEMHtml(html, doctorName, council)

    const result = {
      success: true,
      verified: data.found,
      data,
      timestamp: new Date().toISOString(),
    }

    // Guardar en cache
    await redis.set(cacheKey, result, { ex: 86400 })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Error CONACEM:', error)

    if (error.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout', timeout: true }, { status: 504 })
    }

    return NextResponse.json({ error: 'No se pudo verificar' }, { status: 500 })
  }
}

function parseCONACEMHtml(html: string, doctorName: string, council: string | null): CouncilData {
  const result: CouncilData = {
    found: false,
    doctorName,
    council: council || 'CONACEM',
    specialty: null,
    certificateNumber: null,
    issueDate: null,
    expiryDate: null,
    status: null,
  }

  const namePattern = doctorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  if (new RegExp(namePattern, 'i').test(html)) {
    result.found = true
  }

  const extract = (re: RegExp) => {
    const m = html.match(re)
    return m?.[1]? cleanText(m[1]) : null
  }

  result.specialty = extract(/(?:Especialidad)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  result.certificateNumber = extract(/(?:Certificado|Folio)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  result.issueDate = extract(/(?:Expedición)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  result.expiryDate = extract(/(?:Vigencia)[^:]*:\s*<[^>]*>\s*([^<]+)/i)
  result.status = extract(/(?:Estatus)[^:]*:\s*<[^>]*>\s*([^<]+)/i)

  if (!result.found) {
    const parts = doctorName.trim().split(/\s+/).filter(Boolean)
    const first = parts[0] || ''
    const last = parts[parts.length - 1] || ''

    if (first && last && html.toLowerCase().includes(first.toLowerCase()) && html.toLowerCase().includes(last.toLowerCase())) {
      result.found = true
      result.status = 'Encontrado en CONACEM'
    }
  }

  return result
}

function cleanText(text: string): string {
  return text.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
}