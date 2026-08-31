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

function decodeSessionId(accessToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString())
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch {
    return null
  }
}

// Se llama justo después de iniciar sesión (contraseña o biométrico) desde
// /login, con el device_id persistente de este navegador. Vincula la sesión
// recién creada a ese device_id -- best-effort, nunca debe bloquear el login
// si falla (el caller ignora el resultado).
export async function POST(request: NextRequest) {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: securityHeaders })
  }

  const body = await request.json().catch(() => null)
  const deviceId = body?.deviceId
  if (!deviceId || typeof deviceId !== 'string') {
    return NextResponse.json({ error: 'Falta deviceId' }, { status: 400, headers: securityHeaders })
  }

  const { data: { session } } = await anonClient.auth.getSession()
  const sessionId = session?.access_token ? decodeSessionId(session.access_token) : null
  if (!sessionId) {
    return NextResponse.json({ error: 'No se pudo identificar la sesión' }, { status: 400, headers: securityHeaders })
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

  const { error: upsertError } = await supabase
    .from('session_devices')
    .upsert({ session_id: sessionId, medico_id: doctor.id, device_id: deviceId }, { onConflict: 'session_id' })

  if (upsertError) {
    console.error('[sessions/vincular-dispositivo] Error:', upsertError)
    return NextResponse.json({ error: 'No se pudo vincular el dispositivo' }, { status: 500, headers: securityHeaders })
  }

  return NextResponse.json({ ok: true }, { status: 200, headers: securityHeaders })
}
