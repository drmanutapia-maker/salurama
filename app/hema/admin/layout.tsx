import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import HemaAdminNav from '@/components/hema/HemaAdminNav'

const ADMIN_ROLES = ['admin', 'director_medico']

export default async function HemaAdminLayout({
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
    redirect('/login?next=/hema/admin')
  }

  const { data: roleData } = await supabase.rpc('hema_get_my_role')

  if (!ADMIN_ROLES.includes((roleData as string) ?? '')) {
    redirect('/hema')
  }

  return (
    <>
      <HemaAdminNav />
      {children}
    </>
  )
}
