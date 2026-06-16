import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

  // getUser() valida contra el servidor de Supabase y garantiza que el
  // access_token en la cookie de respuesta es el más reciente (con los
  // claims del Auth Hook). No usar getSession() aquí — puede devolver
  // un token stale del cookie sin re-validar.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log('PROXY-ALL:', {
    pathname: request.nextUrl.pathname,
    user: !!user,
    allCookies: request.cookies.getAll().map(c => c.name)
  })

  // ─── Guard /hema/* ────────────────────────────────────────────────────────
  if (request.nextUrl.pathname.startsWith('/hema')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }

    // TEMPORAL diagnóstico — skip modules check
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
