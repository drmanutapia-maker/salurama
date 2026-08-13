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

// Borra toda credencial biometrica del medico autenticado -- el feature se
// presenta como un solo interruptor por cuenta, no una lista por dispositivo.
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8)

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

  const { error: deleteError } = await supabase
    .from('webauthn_credentials')
    .delete()
    .eq('medico_id', doctor.id)

  if (deleteError) {
    console.error(`[${requestId}] Error desactivando biométrico:`, deleteError)
    return NextResponse.json({ error: 'No se pudo desactivar el biométrico' }, { status: 500, headers: securityHeaders })
  }

  return NextResponse.json({ success: true }, { headers: securityHeaders })
}
