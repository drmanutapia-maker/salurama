import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { rpIDDesdeRequest, expectedOriginDesdeRequest } from '@/lib/webauthn/config'
import { leerYBorrarReto } from '@/lib/webauthn/challengeStore'
import { hexAUint8Array } from '@/lib/webauthn/bytea'

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

// Verifica la ceremonia de "recuperar" (ver recuperar-opciones/route.ts) y,
// si es válida, confirma cuál credencial exacta es -- para que el cliente
// la guarde como la de este navegador. Nunca crea ni borra ninguna fila,
// solo confirma la identidad de una que ya existía.
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
    const credentialId = response?.id as string | undefined
    if (!response || !credentialId) {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400, headers: securityHeaders })
    }

    const expectedChallenge = await leerYBorrarReto(`recuperar:${doctor.id}`)
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'La verificación expiró, intenta de nuevo' }, { status: 400, headers: securityHeaders })
    }

    const { data: fila, error: filaError } = await supabase
      .from('webauthn_credentials')
      .select('id, medico_id, public_key, counter, transports')
      .eq('credential_id', credentialId)
      .maybeSingle()

    // Debe ser una credencial que realmente pertenece a ESTA cuenta -- si
    // el navegador devolviera cualquier otra cosa, se rechaza aquí.
    if (filaError || !fila || fila.medico_id !== doctor.id) {
      return NextResponse.json({ error: 'Esta credencial no pertenece a tu cuenta' }, { status: 403, headers: securityHeaders })
    }

    const verificacion = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOriginDesdeRequest(request),
      expectedRPID: rpIDDesdeRequest(request),
      credential: {
        id: credentialId,
        publicKey: hexAUint8Array(fila.public_key),
        counter: fila.counter,
        transports: fila.transports || undefined,
      },
    })

    if (!verificacion.verified) {
      return NextResponse.json({ error: 'No se pudo verificar la credencial' }, { status: 401, headers: securityHeaders })
    }

    const { newCounter } = verificacion.authenticationInfo

    // Mismo criterio anti-clon que el login normal (ver login/verificar).
    if (fila.counter > 0 && newCounter <= fila.counter) {
      console.error(`[${requestId}] Contador de firmas no avanzó al recuperar — posible credencial clonada: ${credentialId}`)
      return NextResponse.json({ error: 'No se pudo verificar la credencial' }, { status: 401, headers: securityHeaders })
    }

    await supabase
      .from('webauthn_credentials')
      .update({ counter: newCounter, last_used_at: new Date().toISOString() })
      .eq('id', fila.id)

    return NextResponse.json({ credentialId }, { headers: { ...securityHeaders, 'X-Request-ID': requestId } })
  } catch (error) {
    console.error(`[${requestId}] Error recuperando credencial:`, error)
    return NextResponse.json({ error: 'Error al verificar' }, { status: 500, headers: securityHeaders })
  }
}
