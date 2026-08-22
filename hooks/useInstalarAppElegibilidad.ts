'use client'

import { useEffect, useState } from 'react'
import { detectarPlataforma } from '@/lib/push/activarNotificaciones'

// El navegador no tiene un tipo estandar para este evento -- mismo patron
// que components/chat/AvisoNotificaciones.tsx.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type ModoInstalacion = 'esperando' | 'android' | 'ios' | 'ninguno'

/**
 * Escucha 'beforeinstallprompt' desde el primer render de quien la llama --
 * a propósito NO depende de si InstalarAppBanner está montado, porque ese
 * banner solo aparece varios pasos después (tras confirmar una cita, tras
 * completar un formulario de varios pasos) y para entonces Chrome ya disparó
 * el evento una sola vez, si es que lo iba a disparar. Por eso esta captura
 * debe vivir en el componente de página/modal que se monta desde que se
 * entra a la pantalla, no dentro del propio banner condicional.
 */
export function useInstalarAppElegibilidad() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [modo, setModo] = useState<ModoInstalacion>('esperando')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const { esIOS, esSafari, esStandalone } = detectarPlataforma()
    if (esStandalone) { setModo('ninguno'); return }
    if (esIOS) { setModo(esSafari ? 'ios' : 'ninguno'); return }
    if (deferredPrompt) setModo('android')
  }, [deferredPrompt])

  return { modo, deferredPrompt }
}
