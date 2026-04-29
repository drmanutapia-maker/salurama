// hooks/useCP.ts
import { useState, useCallback } from 'react'
import { searchCP, formatCP, preloadSepomexData, type CPResult } from '@/lib/sepomex'

export function useCP() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cpData, setCpData] = useState<CPResult | null>(null)

  // Pre-cargar datos al montar el hook
  useState(() => {
    preloadSepomexData()
  })

  const search = useCallback(async (cp: string) => {
    const formatted = formatCP(cp)
    
    if (formatted.length !== 5) {
      setError('El CP debe tener 5 dígitos')
      setCpData(null)
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const result = await searchCP(formatted)
      
      if (!result) {
        setError('CP no encontrado. Verifica o ingresa manualmente.')
        setCpData(null)
        return null
      }

      setCpData(result)
      return result
    } catch (err) {
      setError('Error al buscar CP. Intenta de nuevo.')
      setCpData(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setCpData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    loading,
    error,
    cpData,
    search,
    reset,
    formatCP,
  }
}