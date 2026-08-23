// Hosts reales de servicios de push conocidos. Sin esta lista, el endpoint
// de una suscripción push es una URL arbitraria que el servidor termina
// llamando (web-push hace el POST real) cada vez que un médico le escribe a
// un paciente -- sin allowlist, cualquiera con un token de chat válido podría
// apuntar el endpoint a un host interno o a su propio servidor (SSRF ciego).
const HOSTS_PUSH_PERMITIDOS = new Set([
  'fcm.googleapis.com', // Chrome, Edge, Samsung Internet, Brave (Android/desktop)
  'android.googleapis.com', // FCM legacy
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari (macOS/iOS 16.4+)
])

export function endpointPushPermitido(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  return url.protocol === 'https:' && HOSTS_PUSH_PERMITIDOS.has(url.hostname)
}
