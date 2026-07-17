import { NextRequest, NextResponse } from 'next/server'
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Revoca una sesión del médico autenticado: la propia (scope local), todas
// las demás (scope others), o una específica de otro dispositivo. El
// user_id nunca se toma del body — siempre se deriva de la cookie verificada,
// así que no hay forma de pasar un sessionId ajeno y que afecte a otro médico:
// revoke_user_session solo borra filas donde user_id = el propio caller.
export async function POST(request: NextRequest) {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  let body: { sessionId?: unknown; all?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (body.all === true) {
    const { error } = await anonClient.auth.signOut({ scope: 'others' })
    if (error) {
      console.error('[sessions/revoke] Error cerrando otras sesiones:', error)
      return NextResponse.json({ error: 'Error al cerrar las demás sesiones' }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'sessionId inválido' }, { status: 400 })
  }

  const { data: { session } } = await anonClient.auth.getSession()
  const currentSessionId = session?.access_token ? decodeSessionId(session.access_token) : null

  // Es la sesión propia del caller: cierre normal vía el endpoint estándar de Auth.
  if (sessionId === currentSessionId) {
    const { error } = await anonClient.auth.signOut({ scope: 'local' })
    if (error) {
      console.error('[sessions/revoke] Error cerrando sesión propia:', error)
      return NextResponse.json({ error: 'Error al cerrar la sesión' }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  // Sesión de otro dispositivo del mismo médico: borrado directo vía
  // service_role, acotado por user_id dentro de la función — nunca puede
  // tocar una sesión de otro usuario aunque se le pase un sessionId ajeno.
  const db = getServiceSupabase()
  const { data: revoked, error } = await db.rpc('revoke_user_session', {
    target_user_id: user.id,
    target_session_id: sessionId,
  })

  if (error) {
    console.error('[sessions/revoke] Error revocando sesión:', error)
    return NextResponse.json({ error: 'Error al revocar la sesión' }, { status: 500 })
  }

  if (!revoked) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
