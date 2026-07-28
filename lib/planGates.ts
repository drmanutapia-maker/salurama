import { PLAN_TO_TIER_CODE } from './pricingTiers'

// Proxy temporal del futuro plan "Plus" (rediseño a 2 planes, pendiente y
// congelado — ver PLAN_CHANGES_FROZEN en pricingTiers.ts): hoy equivale a
// los tiers superiores existentes, premium y clinica.
export function isPlusTier(pricingTier: string | null | undefined): boolean {
  return pricingTier === PLAN_TO_TIER_CODE.premium || pricingTier === PLAN_TO_TIER_CODE.clinica
}

// Mismo umbral que ya usan estadisticas/page.tsx y su API de PDF/Excel,
// antes duplicado inline en cada archivo — punto único de verdad.
export function isPremiumTier(pricingTier: string | null | undefined): boolean {
  return pricingTier === PLAN_TO_TIER_CODE.premium || pricingTier === PLAN_TO_TIER_CODE.clinica
}
