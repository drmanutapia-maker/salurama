import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import MSLChat from '@/components/msl/MSLChat'
import { isManuelEmail } from '@/lib/manuelOnly'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard/msl-virtual')
  }

  // MSL Virtual: excepción de cuenta, no de plan — ver lib/manuelOnly.ts
  if (!isManuelEmail(user.email)) {
    redirect('/dashboard')
  }

  return (
    <div className="h-[calc(100svh-72px)]">
      <MSLChat />
    </div>
  )
}
