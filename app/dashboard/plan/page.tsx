'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster, toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import BeneficiosCarousel from '@/components/BeneficiosCarousel'

function PlanContent() {
  const searchParams = useSearchParams()
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: medico } = await supabase
        .from('doctors')
        .select('slug')
        .eq('user_id', user.id)
        .single()
      setSlug(medico?.slug ?? null)
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

  // Recién confirmada la cuenta el perfil todavía está incompleto (solo
  // trae lo capturado en el registro) — no tiene caso invitar a ver un
  // perfil público que apenas se va a empezar a llenar.
  const justConfirmed = searchParams.get('justConfirmed') === 'true'

  return (
    <>
      <Toaster richColors position="top-center" />
      <BeneficiosCarousel
        primaryCta={{ label: 'Completa tu perfil ahora', href: '/dashboard/editar-perfil' }}
        secondaryCta={!justConfirmed && slug ? { label: 'Ver mi perfil público', href: `/doctor/${slug}` } : undefined}
      />
    </>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={null}>
      <PlanContent />
    </Suspense>
  )
}
