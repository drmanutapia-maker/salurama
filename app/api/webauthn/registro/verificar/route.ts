import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { rpID, expectedOrigin } from '@/lib/webauthn/config'
import { leerYBorrarReto } from '@/lib/webauthn/challengeStore'
import { nombreDeDispositivo } from '@/lib/webauthn/deviceName'
import { uint8ArrayAHex } from '@/lib/webauthn/bytea'

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
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (doctorError || !doctor) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404, headers: securityHeaders })
    }

    const body = await request.json()
    const response = body?.response
    if (!response) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400, headers: securityHeaders })
    }

    const expectedChallenge = await leerYBorrarReto(`reg:${doctor.id}`)
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'El registro expiró, intenta de nuevo' }, { status: 400, headers: securityHeaders })
    }

    const verificacion = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    })

    if (!verificacion.verified || !verificacion.registrationInfo) {
      return NextResponse.json({ error: 'No se pudo verificar la credencial' }, { status: 400, headers: securityHeaders })
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verificacion.registrationInfo

    const { error: insertError } = await supabase.from('webauthn_credentials').insert({
      medico_id: doctor.id,
      credential_id: credential.id,
      public_key: uint8ArrayAHex(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports || [],
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      device_name: nombreDeDispositivo(request.headers.get('user-agent')),
    })

    if (insertError) {
      // Credencial duplicada (mismo autenticador ya registrado) u otro error de datos.
      console.error(`[${requestId}] Error guardando credencial:`, insertError)
      return NextResponse.json({ error: 'No se pudo guardar la credencial' }, { status: 500, headers: securityHeaders })
    }

    return NextResponse.json({ success: true }, { headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  } catch (error) {
    console.error(`[${requestId}] Error verificando registro:`, error)
    return NextResponse.json({ error: 'Error al verificar el registro' }, { status: 500, headers: securityHeaders })
  }
}
