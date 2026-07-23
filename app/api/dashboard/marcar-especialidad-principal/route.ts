import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  specialtyId: z.string().uuid(),
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

// Intercambia cuál especialidad es la principal del médico autenticado,
// llamando a la función de base de datos marcar_especialidad_principal
// (todo-o-nada: si algo falla a medias, Postgres revierte los 4 movimientos
// completos). El doctor_id SIEMPRE se resuelve aquí, del lado del servidor,
// a partir de la sesión — nunca se confía en un doctor_id que mande el
// cliente (por eso la función de base de datos exige ambos ids y valida que
// coincidan).
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

  const { error: rpcError } = await db.rpc('marcar_especialidad_principal', {
    p_doctor_id: doctor.id,
    p_specialty_row_id: parsed.data.specialtyId,
  })

  if (rpcError) {
    console.error('[marcar-especialidad-principal] Error en la función de base de datos:', rpcError)
    return NextResponse.json({ error: rpcError.message || 'Error al cambiar la especialidad principal' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
