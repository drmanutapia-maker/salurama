// Código de un solo uso para el flujo de "paciente recurrente" (ver
// auditoría del flujo de citas, 2026-07-28) — reemplaza la búsqueda directa
// por email/teléfono, que devolvía PII sin ninguna prueba de identidad.
// Usa Web Crypto (no el módulo `crypto` de Node) porque las rutas que lo
// consumen corren en edge runtime.

export const OTP_EXPIRY_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
// Ventana de validez del "token de sesión corto" tras verificar el código
// — /api/citas confía en pacienteId solo si otp_verified_at cae dentro de
// esta ventana.
export const OTP_PROOF_WINDOW_MINUTES = 15

export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
  return n.toString().padStart(6, '0')
}

export async function hashOtpCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
