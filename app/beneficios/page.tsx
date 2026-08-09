import type { Metadata } from 'next'
import BeneficiosCarousel from '@/components/BeneficiosCarousel'

export const metadata: Metadata = {
  title: 'Beneficios para médicos',
  description: 'Perfil con cédula verificable, chat directo con tus pacientes, reseñas reales, estadísticas de tu especialidad y más. Descubre todo lo que Salurama hace por ti.',
}

export default function BeneficiosPage() {
  return (
    <BeneficiosCarousel
      ctaSubtitle="Crea tu cuenta y arma tu perfil profesional en minutos."
      primaryCta={{ label: 'Regístrate gratis', href: '/registro' }}
    />
  )
}
