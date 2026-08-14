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

// Se usa solo para la adopcion silenciosa en lib/webauthn/dispositivoLocal.ts
// -- cuando un navegador no tiene ningun credential_id guardado localmente,
// esto le permite adoptar la credencial preexistente de la cuenta (migracion
// desde el diseño anterior, por cuenta, hacia el actual, por dispositivo).
//
// Solo devuelve algo la PRIMERA vez que se llama para una cuenta (marcada
// con webauthn_migrado_dispositivo), y solo si en ese momento la cuenta
// tiene exactamente una credencial, sin ambiguedad posible. Sin este límite
// de una sola vez, cualquier dispositivo NUEVO que visitara Seguridad justo
// cuando la cuenta tuviera una sola credencial (aunque fuera de OTRO
// dispositivo recién activado, no del propio) se adjudicaría por error una
// credencial ajena.
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

  const { data: yaMigrada } = await supabase
    .from('doctors')
    .update({ webauthn_migrado_dispositivo: true })
    .eq('id', doctor.id)
    .eq('webauthn_migrado_dispositivo', false)
    .select('id')
    .maybeSingle()

  if (!yaMigrada) {
    return NextResponse.json({ credenciales: [] }, { headers: securityHeaders })
  }

  const { data } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, device_name, created_at')
    .eq('medico_id', doctor.id)
    .order('created_at', { ascending: false })

  const credenciales = (data || []).map(c => ({
    credentialId: c.credential_id,
    deviceName: c.device_name,
    createdAt: c.created_at,
  }))

  return NextResponse.json({ credenciales }, { headers: securityHeaders })
}
