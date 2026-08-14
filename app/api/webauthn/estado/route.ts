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

// Dice si ESTE dispositivo (identificado por el credential_id que el propio
// navegador guarda localmente, ver lib/webauthn/dispositivoLocal.ts) tiene
// una credencial biometrica activa en la cuenta autenticada -- ya no basta
// con que la cuenta tenga alguna credencial en cualquier otro aparato.
export async function GET(request: NextRequest) {
  const credentialId = request.nextUrl.searchParams.get('credential_id')
  if (!credentialId) {
    return NextResponse.json({ activo: false }, { headers: securityHeaders })
  }

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
    .select('device_name')
    .eq('medico_id', doctor.id)
    .eq('credential_id', credentialId)
    .maybeSingle()

  return NextResponse.json(
    { activo: !!credencial, deviceName: credencial?.device_name ?? null },
    { headers: securityHeaders }
  )
}
