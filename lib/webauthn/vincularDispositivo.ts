import { obtenerOCrearDeviceId } from './deviceId'

// Se llama justo después de un login exitoso (contraseña o biométrico) para
// que /dashboard/seguridad pueda fusionar esta sesión con su credencial
// WebAuthn, si existe, por device_id en vez de por texto de user-agent.
// Nunca lanza -- un fallo aquí no debe impedir que el login continúe.
export async function vincularDispositivoSesionActual(): Promise<void> {
  try {
    const deviceId = obtenerOCrearDeviceId()
    await fetch('/api/sessions/vincular-dispositivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
  } catch {}
}
