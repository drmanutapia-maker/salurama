import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
        setAll() {
          // No-op en Server Components
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login?redirect=/dashboard')
  }

  // Verificación adicional: ¿es médico activo?
  const { data: doctor } = await supabase
   .from('doctors')
   .select('id, is_active')
   .eq('user_id', user.id)
   .maybeSingle()

  if (!doctor?.is_active) {
    redirect('/login?error=inactive')
  }

  return <>{children}</>
}