'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const IDLE_TIMEOUT = 120 * 60 * 1000 // 120 min
const WARNING_TIME = 115 * 60 * 1000 // 115 min
const REMEMBER_TIMEOUT = 30 * 24 * 60 * 60 * 1000 // 30 días
const WARNING_DURATION = 5000

export function useSessionTimeout() {
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRemembered, setIsRemembered] = useState(false)

  const logout = useCallback(async () => {
    localStorage.removeItem('salurama_remember')
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error al cerrar sesión (fetch falló, se continúa con limpieza local):', err)
    }
    router.push('/login?reason=timeout')
  }, [router])

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    setShowWarning(false)

    // ✅ Solo verifica UNA VEZ al inicio, no en cada movimiento
    const remember = localStorage.getItem('salurama_remember') === 'true'
    setIsRemembered(remember)

    const timeout = remember? REMEMBER_TIMEOUT : IDLE_TIMEOUT
    const warning = remember? REMEMBER_TIMEOUT - 300000 : WARNING_TIME

    // Solo muestra advertencia si NO está en modo "recordar"
    if (!remember) {
      warningRef.current = setTimeout(() => {
        setShowWarning(true)
        setTimeLeft(300)

        const interval = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(interval)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        setTimeout(() => setShowWarning(false), WARNING_DURATION)
      }, warning)
    }

    timeoutRef.current = setTimeout(logout, timeout)
  }, [logout])

  useEffect(() => {
    let isActive = true

    // ✅ Verifica sesión SOLO al montar
    supabase.auth.getUser().then(({ data }) => {
      if (!isActive) return
      if (!data.user) return

      resetTimer()

      const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
      const handleActivity = () => resetTimer()

      events.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true })
      })

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity)
        })
      }
    })

    return () => {
      isActive = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [resetTimer])

  return { showWarning, timeLeft, isRemembered }
}