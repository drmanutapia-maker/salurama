'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { PLAN_TO_TIER_CODE, PLAN_NAME, PLAN_MONTHLY_PRICE_MXN, PLAN_CHANGES_FROZEN, PLAN_FREEZE_MESSAGE, type PlanSlug, type BillingPeriod, type TierCode } from '@/lib/pricingTiers'

type Feature = { text: string; comingSoon?: boolean }

const GRATIS_FEATURES: Feature[] = [
  { text: 'Perfil completo en el directorio' },
  { text: 'Agenda de citas online' },
  { text: 'WhatsApp (enlace directo)' },
  { text: 'Reseñas de pacientes' },
  { text: 'Redes sociales' },
  { text: 'Mapa de ubicación' },
  { text: 'Seguros aceptados' },
  { text: 'SEO básico' },
]

const PLANS: {
  slug: PlanSlug
  name: string
  monthlyPrice: number
  annualDiscountPct: number
  features: Feature[]
  disabled?: boolean
}[] = [
  {
    slug: 'profesional',
    name: PLAN_NAME.profesional,
    monthlyPrice: PLAN_MONTHLY_PRICE_MXN.profesional,
    annualDiscountPct: 10,
    features: [
      { text: 'Todo lo de Gratis' },
      { text: 'SEO optimizado' },
      { text: 'Estadísticas del perfil' },
      { text: 'Recordatorios automáticos de citas (por correo)', comingSoon: true },
      { text: 'MSL Virtual — 20 preguntas/día' },
    ],
  },
  {
    slug: 'premium',
    name: PLAN_NAME.premium,
    monthlyPrice: PLAN_MONTHLY_PRICE_MXN.premium,
    annualDiscountPct: 15,
    features: [
      { text: 'Todo lo de Profesional' },
      { text: 'Múltiples ubicaciones / consultorios', comingSoon: true },
      { text: 'Reportes descargables (PDF/Excel)', comingSoon: true },
      { text: 'Estadísticas avanzadas (comparativa contra el promedio de tu especialidad/ciudad)', comingSoon: true },
      { text: 'MSL Virtual — 50 preguntas/día' },
    ],
  },
  {
    slug: 'clinica',
    name: PLAN_NAME.clinica,
    monthlyPrice: PLAN_MONTHLY_PRICE_MXN.clinica,
    annualDiscountPct: 15,
    disabled: true,
    features: [
      { text: 'Todo lo de Premium' },
      { text: 'Múltiples médicos por cuenta' },
      { text: 'MSL Virtual — 200 preguntas/día' },
    ],
  },
]

function annualPrice(monthly: number, discountPct: number) {
  return Math.round(monthly * 12 * (1 - discountPct / 100))
}

function formatMXN(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function FeatureItem({ feature }: { feature: Feature }) {
  if (feature.comingSoon) {
    return (
      <li className="flex items-start gap-2 text-sm text-neutral-400">
        <Clock size={16} className="mt-0.5 shrink-0" />
        <span>
          {feature.text} <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">(Próximamente)</span>
        </span>
      </li>
    )
  }
  return (
    <li className="flex items-start gap-2 text-sm text-neutral-600">
      <CheckCircle size={16} className="text-secondary-500 mt-0.5 shrink-0" />
      {feature.text}
    </li>
  )
}

function PlanContent() {
  const searchParams = useSearchParams()
  const [pricingTier, setPricingTier] = useState<TierCode | null>(null)
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<PlanSlug | null>(null)
  const [loadingPortal, setLoadingPortal] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: medico } = await supabase
        .from('doctors')
        .select('pricing_tier')
        .eq('user_id', user.id)
        .single()
      setPricingTier((medico?.pricing_tier as TierCode) ?? 'gratis')
    }
    load()
  }, [])

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'success') {
      toast.success('¡Listo! Tu plan se actualizará en cuanto Stripe confirme el pago.')
    } else if (checkout === 'cancelled') {
      toast('Cancelaste el proceso de pago, no se hizo ningún cargo.')
    }
  }, [searchParams])

  const handleUpgrade = useCallback(async (plan: PlanSlug) => {
    if (PLAN_CHANGES_FROZEN) {
      toast.error(PLAN_FREEZE_MESSAGE)
      return
    }
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan, period }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'No se pudo iniciar el pago')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('No se pudo iniciar el pago')
    } finally {
      setLoadingPlan(null)
    }
  }, [period])

  const handleManageSubscription = useCallback(async () => {
    if (PLAN_CHANGES_FROZEN) {
      toast.error(PLAN_FREEZE_MESSAGE)
      return
    }
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'No se pudo abrir el portal de suscripción')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('No se pudo abrir el portal de suscripción')
    } finally {
      setLoadingPortal(false)
    }
  }, [])

  const hasPaidPlan = pricingTier != null && pricingTier !== 'gratis'

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Toaster richColors position="top-center" />

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Planes</h1>
        <p className="text-neutral-500 mt-1">Elige el plan que mejor se adapte a tu consultorio.</p>
      </div>

      {PLAN_CHANGES_FROZEN && (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-semibold text-amber-800">
          {PLAN_FREEZE_MESSAGE}
        </div>
      )}

      {hasPaidPlan && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleManageSubscription}
            disabled={loadingPortal || PLAN_CHANGES_FROZEN}
            className="px-5 py-2.5 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            {PLAN_CHANGES_FROZEN ? 'Disponible pronto' : loadingPortal ? 'Abriendo...' : 'Gestionar mi suscripción'}
          </button>
        </div>
      )}

      <div className="flex justify-center mb-10">
        <div className="inline-flex rounded-lg border border-neutral-200 p-1 bg-neutral-50">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${period === 'monthly' ? 'bg-white shadow text-primary-500' : 'text-neutral-500'}`}
          >
            Mensual
          </button>
          <button
            onClick={() => setPeriod('annual')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${period === 'annual' ? 'bg-white shadow text-primary-500' : 'text-neutral-500'}`}
          >
            Anual
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-xl border border-neutral-200 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-neutral-900">Gratis</h2>
          <p className="text-3xl font-bold text-neutral-900 mt-2">$0</p>
          <ul className="mt-4 space-y-2 flex-1">
            {GRATIS_FEATURES.map((feature) => (
              <FeatureItem key={feature.text} feature={feature} />
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-snug text-neutral-400">
            El posicionamiento en búsquedas se determina por mérito (verificación, completitud del perfil, reseñas) — nunca por el plan que pagas.
          </p>
          <div className="mt-6 text-sm text-center text-neutral-400 font-semibold">
            {pricingTier === 'gratis' ? 'Tu plan actual' : ''}
          </div>
        </div>

        {PLANS.map((plan) => {
          const isCurrent = pricingTier === PLAN_TO_TIER_CODE[plan.slug]
          const price = period === 'monthly' ? plan.monthlyPrice : annualPrice(plan.monthlyPrice, plan.annualDiscountPct)
          return (
            <div key={plan.slug} className={`rounded-xl border border-neutral-200 p-6 flex flex-col ${plan.disabled ? 'opacity-75' : ''}`}>
              <h2 className="text-lg font-bold text-neutral-900">{plan.name}</h2>
              <p className="text-3xl font-bold text-neutral-900 mt-2">
                {formatMXN(price)}
                <span className="text-sm font-normal text-neutral-500">/{period === 'monthly' ? 'mes' : 'año'}</span>
              </p>
              {period === 'annual' && (
                <p className="text-xs text-secondary-600 font-semibold mt-1">{plan.annualDiscountPct}% de descuento</p>
              )}
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <FeatureItem key={feature.text} feature={feature} />
                ))}
              </ul>
              <div className="mt-6">
                {plan.disabled ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg border border-neutral-200 text-neutral-400 text-sm font-semibold cursor-not-allowed"
                  >
                    Próximamente — en desarrollo
                  </button>
                ) : isCurrent ? (
                  <div className="text-sm text-center text-neutral-400 font-semibold">Tu plan actual</div>
                ) : hasPaidPlan ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={loadingPortal || PLAN_CHANGES_FROZEN}
                    className="w-full py-2.5 rounded-lg border border-primary-500 text-primary-500 text-sm font-semibold hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    {PLAN_CHANGES_FROZEN ? 'Disponible pronto' : `Cambiar a ${plan.name}`}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.slug)}
                    disabled={loadingPlan !== null || PLAN_CHANGES_FROZEN}
                    className="w-full py-2.5 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    {PLAN_CHANGES_FROZEN ? 'Disponible pronto' : loadingPlan === plan.slug ? 'Redirigiendo...' : `Actualizar a ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanContent />
    </Suspense>
  )
}
