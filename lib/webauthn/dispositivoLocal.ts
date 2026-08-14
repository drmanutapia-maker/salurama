// Identifica "este dispositivo" para el login biometrico: cada navegador
// guarda localmente el mismo credential_id que el servidor ya usa como
// llave unica en webauthn_credentials. No se guarda nada sensible aqui --
// el id de una credencial no sirve para nada sin el propio autenticador
// fisico (huella/Face ID) que lo generó.

const LOCAL_KEY = 'salurama_webauthn_credential_id'

export function obtenerCredencialLocal(): string | null {
  try {
    return localStorage.getItem(LOCAL_KEY)
  } catch {
    return null
  }
}

export function guardarCredencialLocal(credentialId: string) {
  try {
    localStorage.setItem(LOCAL_KEY, credentialId)
  } catch {}
}

export function borrarCredencialLocal() {
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {}
}

// Confirma si este dispositivo tiene una credencial biometrica activa.
//
// - Sin sesion (ej. /login, antes de autenticarse): solo confirma que el id
//   local guardado (si hay uno) todavia existe en el servidor.
// - Con sesion (ej. /dashboard/seguridad, el banner del dashboard): ademas,
//   si este navegador todavia no tiene ningun id local guardado, intenta
//   adoptar en silencio la credencial de la cuenta -- SOLO si es una unica
//   credencial, sin ambiguedad posible. Esto migra automaticamente a los
//   dispositivos que ya habian activado el biometrico antes de este cambio
//   (cuando "activado" se guardaba por cuenta, no por dispositivo).
export async function confirmarCredencialLocal(autenticado: boolean): Promise<boolean> {
  let id = obtenerCredencialLocal()

  if (!id && autenticado) {
    try {
      const res = await fetch('/api/webauthn/mis-credenciales')
      if (res.ok) {
        const { credenciales } = await res.json()
        if (Array.isArray(credenciales) && credenciales.length === 1) {
          id = credenciales[0].credentialId
          if (id) guardarCredencialLocal(id)
        }
      }
    } catch {}
  }

  if (!id) return false

  try {
    const endpoint = autenticado
      ? `/api/webauthn/estado?credential_id=${encodeURIComponent(id)}`
      : `/api/webauthn/credencial-existe?credential_id=${encodeURIComponent(id)}`
    const res = await fetch(endpoint)
    if (!res.ok) return false
    const { activo } = await res.json()
    if (!activo) borrarCredencialLocal()
    return !!activo
  } catch {
    return false
  }
}
