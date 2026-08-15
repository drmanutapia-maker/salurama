import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { rpIDDesdeRequest, TIMEOUT_MS_WEBAUTHN } from '@/lib/webauthn/config'
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

// Cuando el navegador rechaza crear una credencial nueva porque ya
// reconoce una existente de la cuenta (InvalidStateError al registrar,
// tipico con passkeys sincronizadas via la misma cuenta de Google/Apple en
// varios navegadores) -- en vez de dejar a la persona en un callejon sin
// salida, le pedimos que use esa credencial que YA reconoce para iniciar
// sesion. El navegador nunca nos dice cual coincidio en el error de
// creacion, pero si completa un login con ella, ahi sí sabemos cual es.
export async function POST(request: NextRequest) {
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

  const { data: existentes } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('medico_id', doctor.id)

  const options = await generateAuthenticationOptions({
    rpID: rpIDDesdeRequest(request),
    userVerification: 'preferred',
    timeout: TIMEOUT_MS_WEBAUTHN,
    allowCredentials: (existentes || []).map(c => ({
      id: c.credential_id,
      transports: (c.transports || undefined) as any,
    })),
  })

  await guardarReto(`recuperar:${doctor.id}`, options.challenge)

  return NextResponse.json({ options }, { headers: securityHeaders })
}
