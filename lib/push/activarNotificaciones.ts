// Lógica cliente compartida de notificaciones push (Parte 2). Todo lo de aquí
// corre en el navegador del paciente — registra el service worker de la
// Parte 1 (public/sw.js), pide permiso, se suscribe y guarda la suscripción
// vía /api/push/suscribir (también de la Parte 1).

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export interface InfoPlataforma {
  esIOS: boolean
  esSafari: boolean
  esStandalone: boolean
}

// iPadOS 13+ se reporta como 'MacIntel' pero tiene soporte táctil — se cuenta
// como iOS para efectos de instalación (mismo comportamiento de Safari que
// un iPhone).
export function detectarPlataforma(): InfoPlataforma {
  const ua = navigator.userAgent
  const esIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const esSafari = esIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  const esStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return { esIOS, esSafari, esStandalone }
}

export type ResultadoActivacion = 'activadas' | 'rechazadas' | 'no_soportado' | 'error'

/**
 * Registra el service worker (si no estaba), pide permiso de notificaciones,
 * crea la suscripción push y la guarda en el backend. Nunca lanza — cualquier
 * fallo se resuelve como 'error' para que quien llama decida qué mostrar.
 */
export async function activarNotificaciones(token: string): Promise<ResultadoActivacion> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'no_soportado'
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return 'rechazadas'

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('[push] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      return 'error'
    }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })
    }

    const res = await fetch('/api/push/suscribir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, subscription: sub.toJSON() }),
    })
    if (!res.ok) return 'error'

    return 'activadas'
  } catch (err) {
    console.error('[push] Error activando notificaciones:', err)
    return 'error'
  }
}

/**
 * Misma lógica que activarNotificaciones(), pero para el lado médico: en vez
 * de guardar la suscripción vía token de chat, usa el access_token real de
 * la sesión de Supabase Auth contra /api/push/suscribir-medico.
 */
export async function activarNotificacionesMedico(accessToken: string): Promise<ResultadoActivacion> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'no_soportado'
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const permiso = await Notification.requestPermission()
    if (permiso !== 'granted') return 'rechazadas'

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('[push] Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      return 'error'
    }

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })
    }

    const res = await fetch('/api/push/suscribir-medico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })
    if (!res.ok) return 'error'

    return 'activadas'
  } catch (err) {
    console.error('[push] Error activando notificaciones de médico:', err)
    return 'error'
  }
}

/**
 * true si este navegador ya tiene una suscripción push activa para el
 * service worker de la app — se comprueba en vivo (no con una bandera en
 * localStorage) para no mostrar el aviso de nuevo si el permiso ya estaba
 * concedido de una sesión anterior.
 */
export async function yaTieneSuscripcion(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}
