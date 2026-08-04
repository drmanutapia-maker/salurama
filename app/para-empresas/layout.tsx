import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isManuelEmail } from '@/lib/manuelOnly'

// Pitch B2B de MSL Virtual: excepción de cuenta, no de plan, mientras MSL
// Virtual siga incompleto — ver lib/manuelOnly.ts. Portero server-side,
// mismo patrón que app/dashboard/msl-virtual/page.tsx.
export default async function ParaEmpresasLayout({
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
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/para-empresas')
  }

  if (!isManuelEmail(user.email)) {
    redirect('/')
  }

  return <>{children}</>
}
