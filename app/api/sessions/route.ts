import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

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

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
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

function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido'

  let os = 'Desconocido'
  if (/iPhone/i.test(ua)) os = 'iPhone'
  else if (/iPad/i.test(ua)) os = 'iPad'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X/i.test(ua)) os = 'Mac'
  else if (/Linux/i.test(ua)) os = 'Linux'

  let browser = 'Navegador desconocido'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/OPR\//i.test(ua)) browser = 'Opera'
  else if (/Chrome\//i.test(ua) && !/Edg\/|OPR\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari'

  return `${browser} en ${os}`
}

// Lista las sesiones activas del médico autenticado. auth.sessions no está
// expuesta vía PostgREST — se resuelve con la función SECURITY DEFINER
// list_sessions_for_user, invocable solo con service_role.
export async function GET() {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: { session } } = await anonClient.auth.getSession()
  const currentSessionId = session?.access_token ? decodeSessionId(session.access_token) : null

  const db = getServiceSupabase()
  const { data, error } = await db.rpc('list_sessions_for_user', { target_user_id: user.id })

  if (error) {
    console.error('[sessions] Error listando sesiones:', error)
    return NextResponse.json({ error: 'Error al listar sesiones' }, { status: 500 })
  }

  // device_id por sesión -- vive en session_devices (nuestra tabla, llenada
  // al iniciar sesión), no en auth.sessions. Sirve para que /dashboard/seguridad
  // fusione esta sesión con su credencial WebAuthn del mismo dispositivo real,
  // en vez de comparar el texto de user-agent.
  const sessionIds = (data || []).map((s: { id: string }) => s.id)
  const deviceIdPorSesion = new Map<string, string>()
  if (sessionIds.length > 0) {
    const { data: vinculos } = await db
      .from('session_devices')
      .select('session_id, device_id')
      .in('session_id', sessionIds)
    for (const v of vinculos || []) deviceIdPorSesion.set(v.session_id, v.device_id)
  }

  const sessions = (data || []).map((s: { id: string; created_at: string; updated_at: string; user_agent: string | null; ip: string | null }) => ({
    id: s.id,
    device: parseUserAgent(s.user_agent),
    createdAt: s.created_at,
    lastActiveAt: s.updated_at,
    isCurrent: s.id === currentSessionId,
    deviceId: deviceIdPorSesion.get(s.id) ?? null,
  }))

  return NextResponse.json({ sessions }, { status: 200 })
}
