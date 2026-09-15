import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isManuelEmail } from '@/lib/manuelOnly'
import RegimenReviewClient, { type Regimen } from './RegimenReviewClient'

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
    redirect('/login?next=/dashboard/msl-virtual/admin')
  }

  // Mismo gate que MSL Virtual y HEMA — excepción de cuenta, no de plan (ver lib/manuelOnly.ts)
  if (!isManuelEmail(user.email)) {
    redirect('/dashboard')
  }

  // msl_regimens no tiene ninguna policy de RLS a propósito (ver migración
  // MSL-006) — inaccesible para authenticated/anon. Solo el service role,
  // solo del lado del servidor, puede leerla.
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: regimens, error } = await db
    .from('msl_regimens')
    .select('id, regimen_name, pathology, cie10_codes, treatment_line, drugs, cycles, source_pmcid, source_license, source_excerpt, review_status, created_at')
    .eq('review_status', 'pendiente_revision')
    .order('pathology', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los esquemas pendientes: ${error.message}`)
  }

  const groups = new Map<string, Regimen[]>()
  for (const r of (regimens ?? []) as Regimen[]) {
    const list = groups.get(r.pathology) ?? []
    list.push(r)
    groups.set(r.pathology, list)
  }

  return (
    <RegimenReviewClient
      groups={Array.from(groups.entries()).map(([pathology, items]) => ({ pathology, items }))}
    />
  )
}
