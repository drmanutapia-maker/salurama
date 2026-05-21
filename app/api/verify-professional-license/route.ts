import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const license = searchParams.get('license')?.trim()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  if (!license ||!/^\d{6,10}$/.test(license)) {
    return NextResponse.json({ error: 'Cédula inválida' }, { status: 400 })
  }

  // Rate limit: 10 consultas por hora
  const key = `sep:${ip}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 3600)
  if (count > 10) {
    return NextResponse.json({ error: 'Demasiadas consultas' }, { status: 429 })
  }

  // Cache 24h
  const cacheKey = `cedula:${license}`
  const cached = await redis.get(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 8000)

    const solrUrl = `https://search.sep.gob.mx/solr/cedulasCore/select?q=idCedula:${license}&fl=idCedula,nombre,paterno,materno,titulo,institucion,fregistro&rows=1&wt=json`

    const response = await fetch(solrUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) throw new Error('SEP error')

    const json = await response.json()
    const doc = json?.response?.docs?.[0]

    const result = {
      success: true,
      data: doc? {
        found: true,
        license: doc.idCedula,
        name: [doc.nombre, doc.paterno, doc.materno].filter(Boolean).join(' '),
        degree: doc.titulo,
        institution: doc.institucion,
        date: doc.fregistro,
      } : { found: false, license },
      timestamp: new Date().toISOString()
    }

    await redis.set(cacheKey, result, { ex: 86400 }) // 24h cache
    return NextResponse.json(result)

  } catch (error) {
    console.error('SEP error:', error)
    return NextResponse.json({ error: 'No se pudo verificar' }, { status: 500 })
  }
}