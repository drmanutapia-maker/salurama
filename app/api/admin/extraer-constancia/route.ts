import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import pdfParse from 'pdf-parse'
import { parseConstanciaText, normalizeForMatch } from '@/lib/constanciaParser'

export const dynamic = 'force-dynamic'

async function getAnonSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Extrae folio + certificaciones de una constancia SEP (PDF) y las empareja
// contra las especialidades certificables REALES del médico (no adivina —
// si el emparejamiento no es único, lo reporta y deja la captura al admin).
// Solo admins pueden usar este endpoint (mismo dato sensible que el resto de
// /admin/medicos).
export async function POST(request: NextRequest) {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const db = getServiceSupabase()
  const { data: adminRow } = await db.from('admins').select('id').eq('user_id', user.id).maybeSingle()
  if (!adminRow) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const file = formData.get('file')
  const doctorId = formData.get('doctorId')
  if (!(file instanceof Blob) || typeof doctorId !== 'string' || !doctorId) {
    return NextResponse.json({ error: 'Falta el archivo o el médico' }, { status: 400 })
  }

  let text: string
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await pdfParse(buffer)
    text = result.text
  } catch (e) {
    console.error('[extraer-constancia] Error leyendo el PDF:', e)
    return NextResponse.json({ error: 'No se pudo leer el PDF. Captura los datos a mano.' }, { status: 400 })
  }

  const parsed = parseConstanciaText(text)
  if (parsed.error) {
    return NextResponse.json({
      documentFolio: parsed.documentFolio,
      folioConsistente: parsed.folioConsistente,
      certifications: [],
      warning: parsed.error,
    })
  }

  // Especialidades certificables REALES de este médico, con su consejo.
  const { data: doctorRows } = await db
    .from('doctor_specialty_credentials')
    .select('id, specialty_granular_mapping(granular_name, conacem_councils(id, council_name))')
    .eq('doctor_id', doctorId)

  const doctorCredentials = (doctorRows || []).map((r: any) => ({
    credentialId: r.id as string,
    granularName: r.specialty_granular_mapping?.granular_name as string,
    councilId: r.specialty_granular_mapping?.conacem_councils?.id as string | undefined,
    councilName: r.specialty_granular_mapping?.conacem_councils?.council_name as string | undefined,
  }))

  const certifications = parsed.certifications.map(cert => {
    const normOrganismo = normalizeForMatch(cert.organismoCertificador)
    const matches = doctorCredentials.filter(dc =>
      dc.councilName && (
        normalizeForMatch(dc.councilName) === normOrganismo ||
        normalizeForMatch(dc.councilName).includes(normOrganismo) ||
        normOrganismo.includes(normalizeForMatch(dc.councilName))
      )
    )
    return {
      numeroCertificacion: cert.numeroCertificacion,
      especialidadTexto: cert.especialidadTexto,
      organismoCertificador: cert.organismoCertificador,
      vigenciaRaw: cert.vigenciaRaw,
      vigenciaFecha: cert.vigenciaFecha,
      matchStatus: matches.length === 1 ? 'exacto' : matches.length === 0 ? 'sin_match' : 'ambiguo',
      matchedCredentialId: matches.length === 1 ? matches[0].credentialId : null,
      matchedGranularName: matches.length === 1 ? matches[0].granularName : null,
    }
  })

  return NextResponse.json({
    documentFolio: parsed.documentFolio,
    folioConsistente: parsed.folioConsistente,
    certifications,
    warning: null,
  })
}
