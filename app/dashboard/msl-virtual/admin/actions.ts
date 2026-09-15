'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isManuelEmail } from '@/lib/manuelOnly'

async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
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
    },
  )
}

export type ReviewDecision = 'aprobado' | 'rechazado'
export type ReviewResult = { success: true } | { success: false; error: string }

// Vuelve a verificar sesión + isManuelEmail() aquí — nunca confiar en que la
// página ya lo hizo, una Server Action es un endpoint invocable aparte.
export async function reviewRegimen(id: string, decision: ReviewDecision): Promise<ReviewResult> {
  const supabase = await getServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isManuelEmail(user.email)) {
    return { success: false, error: 'No autorizado' }
  }

  // msl_regimens no tiene policy de RLS a propósito — solo el service role
  // del lado del servidor puede escribir aquí.
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { error } = await db
    .from('msl_regimens')
    .update({
      review_status: decision,
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('review_status', 'pendiente_revision') // no pisar una revisión ya hecha por otra pestaña/sesión

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
