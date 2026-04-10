// app/api/verify-professional-license/route.ts
//
// Usa la API pública Solr de la SEP en lugar de scraping HTML.
// Endpoint: search.sep.gob.mx/solr/cedulasCore/select
// Devuelve JSON directamente — no depende del portal web (que puede estar caído).

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const license = searchParams.get('license')?.trim()

  if (!license) {
    return NextResponse.json({ error: 'Cédula requerida' }, { status: 400 })
  }

  // Validación básica: la cédula profesional mexicana es numérica, 7-8 dígitos
  if (!/^\d{6,10}$/.test(license)) {
    return NextResponse.json({ error: 'Formato de cédula inválido' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

    // ── Endpoint Solr público de la SEP ──────────────────────────────────
    // Buscamos directamente por número de cédula usando el campo idCedula
    // La API devuelve JSON sin autenticación.
    const solrUrl = new URL('http://search.sep.gob.mx/solr/cedulasCore/select')
    solrUrl.searchParams.set('q', `idCedula:${license}`)
    solrUrl.searchParams.set('fl', 'idCedula,nombre,paterno,materno,titulo,institucion,fregistro')
    solrUrl.searchParams.set('rows', '5')
    solrUrl.searchParams.set('wt', 'json')
    solrUrl.searchParams.set('indent', 'on')

    const response = await fetch(solrUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Salurama/1.0)',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`SEP Solr respondió con status ${response.status}`)
    }

    const json = await response.json()
    const docs = json?.response?.docs ?? []
    const numFound = json?.response?.numFound ?? 0

    if (numFound === 0 || docs.length === 0) {
      // Cédula no encontrada en el registro — no es error del servidor
      return NextResponse.json({
        success: true,
        data: { found: false, license },
        timestamp: new Date().toISOString()
      })
    }

    const doc = docs[0]

    // Construir nombre completo desde los campos separados de la SEP
    const fullName = [doc.nombre, doc.paterno, doc.materno]
      .filter(Boolean)
      .map((s: string) => s.trim())
      .join(' ')

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        license: doc.idCedula || license,
        name: fullName || null,
        degree: doc.titulo || null,
        institution: doc.institucion || null,
        date: doc.fregistro || null,       // fecha de registro
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error verificando cédula SEP:', error)

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'La SEP no respondió a tiempo.', timeout: true },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'No se pudo consultar el registro de la SEP.', details: error.message },
      { status: 500 }
    )
  }
}
