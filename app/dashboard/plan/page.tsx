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

  return (
    <>
      <Toaster richColors position="top-center" />
      <BeneficiosCarousel
        primaryCta={{ label: 'Completa tu perfil ahora', href: '/dashboard/editar-perfil' }}
        secondaryCta={slug ? { label: 'Ver mi perfil público', href: `/doctor/${slug}` } : undefined}
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
