'use client'

import { useSessionTimeout } from '@/hooks/useSessionTimeout'

export default function SessionManager() {
  const { showWarning, timeLeft, isRemembered } = useSessionTimeout()

  if (!showWarning || isRemembered) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: '#1E3A5F',
      color: 'white',
      padding: '12px 20px',
      borderRadius: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      zIndex: 9999,
      fontSize: 14,
      fontFamily: "'DM Sans', sans-serif",
      animation: 'fadeIn 0.3s ease-out',
    }}>
      Sesión expira en {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  )
}