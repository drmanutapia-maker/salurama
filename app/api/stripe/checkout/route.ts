import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { getStripe, getPriceId, type PlanSlug, type BillingPeriod } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  plan:   z.enum(['profesional', 'premium', 'clinica']),
  period: z.enum(['monthly', 'annual']),
})

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

export async function POST(request: NextRequest) {
  let body: { plan?: unknown; period?: unknown }
  try {
    body = await request.json()
  } catch {
    return err('JSON inválido', 400)
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return err('plan o period inválido', 400)
  }
  const plan: PlanSlug = parsed.data.plan
  const period: BillingPeriod = parsed.data.period

  // Clínica todavía no tiene definido el flujo multi-médico — no se ofrece en la
  // UI de /dashboard/plan, y tampoco se acepta aquí aunque alguien llame la API directo.
  if (plan === 'clinica') {
    return err('El plan Clínica aún no está disponible', 400)
  }

  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return err('No autorizado', 401)
  }

  const db = getServiceSupabase()
  const { data: doctor } = await db
    .from('doctors')
    .select('id, email, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!doctor) {
    return err('No se encontró el perfil de médico para este usuario', 404)
  }

  let priceId: string
  try {
    priceId = getPriceId(plan, period)
  } catch (e) {
    console.error('[stripe/checkout] price id no configurado:', e)
    return err('Este plan no está disponible por el momento', 500)
  }

  const stripe = getStripe()
  let customerId = doctor.stripe_customer_id as string | null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email:    doctor.email ?? undefined,
      metadata: { doctor_id: doctor.id },
    })
    customerId = customer.id
    await db.from('doctors').update({ stripe_customer_id: customerId }).eq('id', doctor.id)
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL!
  const session = await stripe.checkout.sessions.create({
    mode:               'subscription',
    customer:           customerId,
    line_items:         [{ price: priceId, quantity: 1 }],
    subscription_data:  { metadata: { doctor_id: doctor.id } },
    metadata:           { doctor_id: doctor.id },
    success_url:        `${baseUrl}/dashboard/plan?checkout=success`,
    cancel_url:         `${baseUrl}/dashboard/plan?checkout=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
