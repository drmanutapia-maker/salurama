import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code       = searchParams.get('code')
  const tokenHash  = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const redirect   = searchParams.get('redirect') || '/dashboard'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // ── Flujo 1: token_hash (email de recuperación con {{ .TokenHash }}) ────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'recovery' | 'signup' | 'email',
    })

    if (error) {
      console.error('[auth/callback] verifyOtp error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=invalid_link`)
    }

    // Recuperación de contraseña → ir a reset-password
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`)
    }

    // Confirmación de cuenta u otros → ir al dashboard
    return NextResponse.redirect(`${origin}${redirect}`)
  }

  // ── Flujo 2: code (PKCE — OAuth, magic links) ─────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
    }

    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/reset-password`)
    }

    return NextResponse.redirect(`${origin}${redirect}`)
  }

  // ── Sin parámetros válidos ─────────────────────────────────────────────────
  console.error('[auth/callback] No code or token_hash received')
  return NextResponse.redirect(`${origin}/login?error=missing_params`)
}