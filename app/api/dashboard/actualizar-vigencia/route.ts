import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  vigenciaHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida').nullable(),
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

// Deja que el médico autenticado edite SOLO la vigencia de su especialidad
// principal en doctor_specialty_credentials — nunca credentials_status,
// numero_certificacion ni source_constancia_id, esos siguen siendo
// admin-only (ver /admin/medicos). No hay policy de UPDATE para el médico
// sobre su propia fila (por diseño — ver doctor_specialty_credentials_admin_all
// en la migración del rediseño), así que este endpoint con service_role,
// acotado a un solo campo, es la única vía. Editar la vigencia no oculta ni
// cambia la visibilidad de la especialidad en el perfil público — esa la
// decide credentials_status, que este endpoint nunca toca.
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

  const db = getServiceSupabase()

  const { data: doctor, error: doctorError } = await db
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (doctorError || !doctor) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  const { data: primaryRow, error: primaryError } = await db
    .from('doctor_specialty_credentials')
    .select('id')
    .eq('doctor_id', doctor.id)
    .eq('is_primary', true)
    .maybeSingle()

  if (primaryError) {
    console.error('[actualizar-vigencia] Error buscando credencial primaria:', primaryError)
    return NextResponse.json({ error: 'Error al buscar tu especialidad' }, { status: 500 })
  }
  if (!primaryRow) {
    return NextResponse.json({ error: 'Tu especialidad actual no tiene consejo certificador — no hay vigencia que editar' }, { status: 404 })
  }

  const { error: updateError } = await db
    .from('doctor_specialty_credentials')
    .update({ vigencia_hasta: parsed.data.vigenciaHasta })
    .eq('id', primaryRow.id)

  if (updateError) {
    console.error('[actualizar-vigencia] Error actualizando vigencia:', updateError)
    return NextResponse.json({ error: 'Error al guardar la vigencia' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
