import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  professional_license: z.string().regex(/^\d{7,8}$/, 'Cédula inválida — debe tener 7 u 8 dígitos'),
})

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

// Edita professional_license del médico autenticado. Un cambio de cédula
// reinicia la verificación (verification_status → 'pendiente',
// license_verified → false) y queda registrado en doctor_license_history —
// vuelve a entrar a la cola de revisión manual en /admin/medicos, mismo
// tratamiento que un registro nuevo (ver decisión del 2026-07-19 de
// retirar el sistema automático de verificación).
export async function POST(request: NextRequest) {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
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
  const { professional_license: newLicense } = parsed.data

  const db = getServiceSupabase()

  const { data: doctor, error: doctorError } = await db
    .from('doctors')
    .select('id, professional_license')
    .eq('user_id', user.id)
    .single()

  if (doctorError || !doctor) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  if (doctor.professional_license === newLicense) {
    return NextResponse.json({ success: true, changed: false })
  }

  const { error: updateError } = await db
    .from('doctors')
    .update({
      professional_license: newLicense,
      verification_status: 'pendiente',
      license_verified: false,
    })
    .eq('id', doctor.id)

  if (updateError) {
    console.error('[actualizar-cedula] Error actualizando doctors:', updateError)
    return NextResponse.json({ error: 'Error al actualizar la cédula' }, { status: 500 })
  }

  const { error: historyError } = await db
    .from('doctor_license_history')
    .insert({
      doctor_id: doctor.id,
      old_license: doctor.professional_license,
      new_license: newLicense,
      changed_by: user.id,
    })

  if (historyError) {
    // El cambio de cédula ya se aplicó — no revertimos por un fallo de
    // bitácora, pero sí lo dejamos visible en logs para investigar.
    console.error('[actualizar-cedula] Error registrando en doctor_license_history:', historyError)
  }

  return NextResponse.json({ success: true, changed: true })
}
