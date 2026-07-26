import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isManuelEmail } from '@/lib/manuelOnly'

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request })
  response.headers.set('x-pathname', request.nextUrl.pathname)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ─── Guard /hema/* ────────────────────────────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/hema')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    let claims: Record<string, unknown> = {}

    const allRequestCookies = request.cookies.getAll()
    const authCookie = allRequestCookies.find(
      (c) => c.name.includes('auth-token') && !c.name.endsWith('-code-verifier')
    )

    if (authCookie?.value) {
      try {
        const raw = authCookie.value.startsWith('base64-')
          ? atob(authCookie.value.slice('base64-'.length))
          : decodeURIComponent(authCookie.value)
        const parsed = JSON.parse(raw)
        const accessToken: string =
          parsed.access_token ??
          (Array.isArray(parsed) ? parsed[0]?.access_token : null) ??
          ''
        if (accessToken) {
          claims = decodeJwtPayload(accessToken)
        }
      } catch {
        claims = decodeJwtPayload(authCookie.value)
      }
    }

    const modules = (claims.modules as string[]) ?? []

    // HEMA: además del módulo activo en la suscripción, exige que sea la
    // cuenta de Manuel — excepción de cuenta, no de plan. Capa extra sobre
    // el check de modules ya existente, no lo reemplaza. Ver lib/manuelOnly.ts.
    if (!modules.includes('hema') || !isManuelEmail(claims.email as string | undefined)) {
      return NextResponse.redirect(
        new URL('/dashboard?upgrade=hema', request.url)
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
