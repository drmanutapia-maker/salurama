import Stripe from 'stripe'
import { PLAN_TO_TIER_CODE, type PricingTierCode, type PlanSlug, type BillingPeriod } from './pricingTiers'

export type { PricingTierCode, PlanSlug, BillingPeriod }
export { PLAN_TO_TIER_CODE }

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  }
  return _stripe
}

const PRICE_ID_BY_PLAN_AND_PERIOD: Record<PlanSlug, Record<BillingPeriod, string | undefined>> = {
  profesional: {
    monthly: process.env.STRIPE_PRICE_PROFESIONAL_MONTHLY,
    annual:  process.env.STRIPE_PRICE_PROFESIONAL_ANNUAL,
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    annual:  process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
  },
  clinica: {
    monthly: process.env.STRIPE_PRICE_CLINICA_MONTHLY,
    annual:  process.env.STRIPE_PRICE_CLINICA_ANNUAL,
  },
}

export function getPriceId(plan: PlanSlug, period: BillingPeriod): string {
  const priceId = PRICE_ID_BY_PLAN_AND_PERIOD[plan][period]
  if (!priceId) {
    throw new Error(`No hay STRIPE_PRICE_* configurado para plan=${plan} period=${period}`)
  }
  return priceId
}

// Mapa inverso price.id → { tier, period }, usado por el webhook para saber
// qué escribir en doctors a partir de la subscription de Stripe.
export function findTierByPriceId(priceId: string): { tier: PricingTierCode; period: BillingPeriod } | null {
  for (const plan of Object.keys(PRICE_ID_BY_PLAN_AND_PERIOD) as PlanSlug[]) {
    for (const period of ['monthly', 'annual'] as BillingPeriod[]) {
      if (PRICE_ID_BY_PLAN_AND_PERIOD[plan][period] === priceId) {
        return { tier: PLAN_TO_TIER_CODE[plan], period }
      }
    }
  }
  return null
}
