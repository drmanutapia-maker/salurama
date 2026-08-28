import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardNavClient from './DashboardNavClient'

// Portero server-side para /dashboard y todo lo que cuelga de ella — antes
// este layout era 'use client' y el chequeo de sesión ocurría solo en el
// navegador después de hidratar, así que una petición sin sesión (incluido
// un bot) recibía 200 con un shell "Cargando" en vez de un redirect. Mismo
// patrón que app/admin/layout.tsx y app/hema/layout.tsx: se verifica la
// sesión ANTES de mandar una sola línea del contenido del dashboard.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login?next=/dashboard')
  }

  return <DashboardNavClient>{children}</DashboardNavClient>
}
