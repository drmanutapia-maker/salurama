'use client'

import { useEffect } from 'react'

// Registra el service worker en todas las paginas (antes solo se registraba
// al activar notificaciones push desde el chat -- ver lib/push/activarNotificaciones.ts).
// Sin un service worker controlando el sitio desde la primera visita, Chrome
// nunca dispara 'beforeinstallprompt' y el banner de "instalar app" es
// imposible de ofrecer. register() es idempotente: si ya estaba registrado
// (ej. por el flujo de notificaciones) no hace nada distinto.
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  return null
}
