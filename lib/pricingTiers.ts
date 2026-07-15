// Fuente única de verdad para el mapeo entre planes y el código persistido en
// doctors.pricing_tier ('gratis' | '349' | '799' | '1999' — los precios mensuales
// como string, ya usados por MSL Virtual en app/api/msl-chat/route.ts, no se
// renombran para no romper ese gating). No importar Stripe aquí: este archivo
// se usa también desde componentes de cliente (app/dashboard/plan/page.tsx).

export type PricingTierCode = '349' | '799' | '1999'
export type TierCode = 'gratis' | PricingTierCode
export type PlanSlug = 'profesional' | 'premium' | 'clinica'
export type BillingPeriod = 'monthly' | 'annual'

export const PLAN_TO_TIER_CODE: Record<PlanSlug, PricingTierCode> = {
  profesional: '349',
  premium:     '799',
  clinica:     '1999',
}

export const PLAN_NAME: Record<PlanSlug, string> = {
  profesional: 'Profesional',
  premium:     'Premium',
  clinica:     'Clínica',
}

export const PLAN_MONTHLY_PRICE_MXN: Record<PlanSlug, number> = {
  profesional: 349,
  premium:     799,
  clinica:     1999,
}
