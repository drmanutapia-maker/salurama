import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { getStripe, findTierByPriceId } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function applySubscription(db: ReturnType<typeof getServiceSupabase>, subscription: Stripe.Subscription) {
  const doctorId = subscription.metadata?.doctor_id
  const priceId  = subscription.items.data[0]?.price?.id

  if (!doctorId || !priceId) {
    console.error('[stripe/webhook] subscription sin doctor_id o price id:', subscription.id)
    return
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trialing'
  if (!isActive) {
    await db.from('doctors')
      .update({ pricing_tier: 'gratis', pricing_period: null })
      .eq('id', doctorId)
    return
  }

  const mapped = findTierByPriceId(priceId)
  if (!mapped) {
    console.error('[stripe/webhook] price id no reconocido:', priceId)
    return
  }

  await db.from('doctors')
    .update({
      pricing_tier:            mapped.tier,
      pricing_period:          mapped.period,
      stripe_subscription_id:  subscription.id,
    })
    .eq('id', doctorId)
}

async function revertToFree(db: ReturnType<typeof getServiceSupabase>, subscriptionId: string) {
  await db.from('doctors')
    .update({ pricing_tier: 'gratis', pricing_period: null })
    .eq('stripe_subscription_id', subscriptionId)
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Falta stripe-signature' }, { status: 400 })
  }

  const rawBody = await request.text()

  let stripe: Stripe
  let event: Stripe.Event
  try {
    stripe = getStripe()
    event  = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e) {
    console.error('[stripe/webhook] firma inválida:', e)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  const db = getServiceSupabase()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await applySubscription(db, subscription)
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await applySubscription(db, subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await revertToFree(db, subscription.id)
        break
      }
      default:
        break
    }
  } catch (e) {
    console.error(`[stripe/webhook] error procesando ${event.type}:`, e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
