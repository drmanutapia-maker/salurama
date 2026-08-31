// device_id: identificador persistente del navegador, independiente de
// credential_id y de session_id. Se genera una sola vez por navegador (antes
// de cualquier registro de huella) y se manda tanto al registrar una
// credencial WebAuthn como al iniciar sesión, para poder fusionar sesión +
// huella del mismo dispositivo real en /dashboard/seguridad sin depender de
// comparar el texto de user-agent (que puede repetirse en dos máquinas).

const LOCAL_KEY = 'salurama_device_id'

export function obtenerOCrearDeviceId(): string {
  try {
    let id = localStorage.getItem(LOCAL_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(LOCAL_KEY, id)
    }
    return id
  } catch {
    // localStorage no disponible (modo privado estricto, etc.) -- se manda
    // un id nuevo cada vez, simplemente no habrá fusión de tarjetas para
    // este navegador. No debe romper login ni registro de huella.
    return crypto.randomUUID()
  }
}
