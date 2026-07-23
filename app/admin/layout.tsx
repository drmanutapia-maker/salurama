import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Portero server-side para /admin y todo lo que cuelga de ella (ej. /admin/medicos).
// Se ejecuta ANTES de que el navegador reciba una sola línea de la pantalla de
// login del panel — si no hay sesión, o si la sesión no pertenece a un admin
// registrado en la tabla `admins`, no se llega a ver ni el formulario de login,
// se manda directo a la página principal. Mismo patrón que app/hema/admin/layout.tsx.
export default async function AdminLayout({
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
    redirect('/')
  }

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!adminRow) {
    redirect('/')
  }

  return <>{children}</>
}
