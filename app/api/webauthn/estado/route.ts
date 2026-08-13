import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
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

// Dice si el medico autenticado ya tiene una credencial biometrica guardada
// -- la tabla webauthn_credentials no tiene politicas RLS a proposito (solo
// service_role), asi que el cliente no puede saber esto directo.
export async function GET() {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: securityHeaders })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (doctorError || !doctor) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404, headers: securityHeaders })
  }

  const { data: credencial } = await supabase
    .from('webauthn_credentials')
    .select('device_name, created_at')
    .eq('medico_id', doctor.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json(
    { activo: !!credencial, deviceName: credencial?.device_name ?? null },
    { headers: securityHeaders }
  )
}
