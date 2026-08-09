// Service worker de notificaciones push (Web Push API/VAPID) — Parte 1.
// Todavía no se registra desde ningún lado de la app (eso es Parte 2, junto
// con el flujo de permiso); este archivo solo define qué pasa cuando llega
// un push y cuando el paciente hace clic en la notificación.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Salurama', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Salurama'
  const options = {
    body: data.body || '',
    icon: '/apple-touch-icon.png',
    data: { url: data.url || '/' },
  }

  console.log('[sw] push recibido', title, options.data.url)
  event.waitUntil(self.registration.showNotification(title, options))
})

// Al tocar la notificación: si ya hay una pestaña abierta en esa misma URL
// exacta, la enfoca; si no, abre una nueva. La URL de cada notificación
// incluye un token de chat recién emitido (ver /api/chat/medico/mensaje), así
// que una pestaña vieja con un link ya rotado no cuenta como "la misma".
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  console.log('[sw] notificationclick', targetUrl)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
