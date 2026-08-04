import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isManuelEmail } from '@/lib/manuelOnly'

// Contrato B2B de MSL Virtual: excepción de cuenta, no de plan, mientras
// MSL Virtual siga incompleto — ver lib/manuelOnly.ts. Solo aplica a esta
// subcarpeta, no a los demás documentos-adicionales (públicos).
export default async function ContratoB2BLayout({
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
    redirect('/login?next=/documentos-adicionales/contrato-b2b')
  }

  if (!isManuelEmail(user.email)) {
    redirect('/')
  }

  return <>{children}</>
}
