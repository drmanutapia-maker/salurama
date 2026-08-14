import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { rpName, rpID, TIMEOUT_MS_WEBAUTHN } from '@/lib/webauthn/config'
import { guardarReto } from '@/lib/webauthn/challengeStore'

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

// Registrar una credencial biometrica requiere una sesion ya autenticada --
// el estandar WebAuthn no permite registrar una passkey "en frio", primero
// hay que demostrar quien eres por otro medio (aqui, contrasena).
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

  try {
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, email, full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404, headers: securityHeaders })
    }

    const { data: existentes } = await supabase
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('medico_id', doctor.id)

    // El navegador ya nos dice (sin mostrar ningún cuadro, ver
    // platformAuthenticatorIsAvailable() en el cliente) si esta computadora
    // tiene su propia huella/Face ID configurada. Si la tiene, vamos directo
    // a ella -- si no, dejamos el menú completo para quien necesite usar su
    // celular como llave.
    const body = await request.json().catch(() => null)
    const preferirPlataforma = body?.preferirPlataforma === true

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: doctor.email,
      userID: new TextEncoder().encode(doctor.id),
      userDisplayName: doctor.full_name || doctor.email,
      attestationType: 'none',
      timeout: TIMEOUT_MS_WEBAUTHN,
      excludeCredentials: (existentes || []).map(c => ({
        id: c.credential_id,
        transports: (c.transports || undefined) as any,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        ...(preferirPlataforma ? { authenticatorAttachment: 'platform' as const } : {}),
      },
    })

    await guardarReto(`reg:${doctor.id}`, options.challenge)

    return NextResponse.json({ options }, { headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  } catch (error) {
    console.error(`[${requestId}] Error generando opciones de registro:`, error)
    return NextResponse.json({ error: 'Error al preparar el registro' }, { status: 500, headers: securityHeaders })
  }
}
