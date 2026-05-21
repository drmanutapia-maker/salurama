// proxy.ts
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // Next.js 16: proxy solo para operaciones de red
  // Auth se movió a layouts (más seguro)
  return {
    headers: {
      'x-pathname': request.nextUrl.pathname,
    },
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}