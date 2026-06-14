'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'

interface BackButtonProps {
  fallback?: string
  label?: string
}

export default function BackButton({ fallback, label = 'Volver' }: BackButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [canGoBack, setCanGoBack] = useState(false)

  useEffect(() => {
    setCanGoBack(window.history.length > 1)
  }, [])

  const handleBack = () => {
    const from = searchParams.get('from')

    // 1. Prioridad: parámetro ?from=
    if (from === 'edit') {
      router.push('/dashboard/editar-perfil')
      return
    }
    if (from === 'dashboard') {
      router.push('/dashboard')
      return
    }

    // 2. Si hay historial real, úsalo
    if (canGoBack) {
      router.back()
      return
    }

    // 3. Fallback explícito
    if (fallback) {
      router.push(fallback)
      return
    }

    // 4. Fallbacks por tipo de página
    if (pathname.startsWith('/doctor/')) {
      router.push('/buscar')
      return
    }
      
    if (pathname.startsWith('/dashboard')) {
      router.push('/dashboard')
      return
    }

    // 5. Último recurso
    router.push('/')
  }

  return (
    <button
      onClick={handleBack}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#1E3A5F',
        fontSize: 14,
        fontWeight: 600,
        padding: 0,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <ArrowLeft size={18} />
      <span>{label}</span>
    </button>
  )
}