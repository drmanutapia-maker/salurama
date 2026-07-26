import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { isManuelEmail } from '@/lib/manuelOnly'

export const dynamic = 'force-dynamic'

const schema = z.object({
  aviso_numero: z.string().trim().min(1).max(100),
})

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
}

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

// Guarda el número de aviso COFEPRIS del médico autenticado, y deja
// registro en cofepris_audit_log (tabla admin-only) — es un endpoint de
// servidor, no una escritura directa del navegador, porque el médico no
// tiene (ni debe tener) permiso de RLS para escribir en esa bitácora.
export async function POST(request: NextRequest) {
  const ip = getIp(request)
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Aviso de Publicidad COFEPRIS: excepción de cuenta, no de plan — ver lib/manuelOnly.ts
  if (!isManuelEmail(user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' }, { status: 400 })
  }
  const { aviso_numero } = parsed.data

  const db = getServiceSupabase()

  const { data: doctor, error: doctorError } = await db
    .from('doctors')
    .select('id, full_name, specialty')
    .eq('user_id', user.id)
    .single()

  if (doctorError || !doctor) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  const fecha = new Date().toISOString().slice(0, 10)

  const { error: updateError } = await db
    .from('doctors')
    .update({ cofepris_aviso_numero: aviso_numero, cofepris_aviso_fecha: fecha })
    .eq('id', doctor.id)

  if (updateError) {
    console.error('[guardar-numero] Error actualizando doctors:', updateError)
    return NextResponse.json({ error: 'Error al guardar el número de aviso' }, { status: 500 })
  }

  const { error: logError } = await db.from('cofepris_audit_log').insert({
    doctor_id: doctor.id,
    aviso_numero,
    full_name: doctor.full_name,
    specialty: doctor.specialty,
    estado_solicitud: 'pendiente_descarga',
    ip_registro: ip,
  })

  if (logError) {
    console.error('[guardar-numero] Error registrando en cofepris_audit_log:', logError)
  }

  return NextResponse.json({ success: true })
}
