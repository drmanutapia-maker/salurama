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

// Handler de fetch vacio (sin cache, sin respondWith) -- Chrome exige que
// exista uno para ofrecer el banner nativo de instalacion ("beforeinstallprompt"),
// aunque no implemente ninguna estrategia de cache. Sin esto, el navegador
// nunca ofrece instalar la app sin importar que el resto del manifest sea
// valido.
self.addEventListener('fetch', () => {})

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
    // Un solo ícono para cualquier plataforma — mismo criterio que antes con
    // favicon.png (logo cuadrado sin recorte, para que Android aplique su
    // propia máscara circular), pero en notification-icon.png: una versión
    // ligera (192x192, ~19 KB en vez de los 173 KB de favicon.png a 512x512).
    // Un ícono tan pesado corre el riesgo de no llegar a descargarse a
    // tiempo en la primera notificación de una sesión nueva, y el sistema
    // operativo cae de vuelta a un ícono genérico.
    icon: '/notification-icon.png',
    // Ícono chico monocromático que Android muestra en la barra de estado —
    // silueta blanca sobre fondo transparente; Android la recolorea solo.
    badge: '/notification-badge.png',
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
