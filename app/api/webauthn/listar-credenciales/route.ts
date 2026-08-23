import { NextResponse } from 'next/server'
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

// A diferencia de /api/webauthn/mis-credenciales (que solo devuelve algo UNA
// vez, para la migración silenciosa de dispositivoLocal.ts), este endpoint
// siempre devuelve la lista completa -- es el que alimenta la gestión real
// en /dashboard/seguridad ("perdí mi celular, quita esa credencial"). Un
// médico necesita poder ver TODOS sus dispositivos activos, no solo el
// actual, para poder revocar el de un celular perdido/robado desde otro
// aparato.
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

  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, device_name, created_at')
    .eq('medico_id', doctor.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'No se pudieron cargar los dispositivos' }, { status: 500, headers: securityHeaders })
  }

  const credenciales = (data || []).map(c => ({
    credentialId: c.credential_id,
    deviceName: c.device_name,
    createdAt: c.created_at,
  }))

  return NextResponse.json({ credenciales }, { headers: securityHeaders })
}
