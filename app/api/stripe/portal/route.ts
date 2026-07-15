import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

async function getAnonSupabase() {
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
    }
  )
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST() {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return err('No autorizado', 401)
  }

  const db = getServiceSupabase()
  const { data: doctor } = await db
    .from('doctors')
    .select('id, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!doctor?.stripe_customer_id) {
    return err('Aún no tienes una suscripción activa', 400)
  }

  const stripe = getStripe()
  const baseUrl = process.env.NEXT_PUBLIC_URL!
  const session = await stripe.billingPortal.sessions.create({
    customer:   doctor.stripe_customer_id,
    return_url: `${baseUrl}/dashboard/plan`,
  })

  return NextResponse.json({ url: session.url })
}
