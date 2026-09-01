// Excepción de cuenta específica (no de plan) para herramientas ocultas
// temporalmente a todos los médicos excepto la cuenta de prueba de Manuel:
// MSL Virtual (corpus insuficiente — 8 artículos de mieloma), HEMA (módulo
// clínico propio, sin listo multi-tenant) y el asistente de Aviso de
// Publicidad COFEPRIS. Deliberadamente por email de cuenta, no por
// pricing_tier: ningún cambio de plan debe desbloquear estas 3 herramientas.
export const MANUEL_EMAIL = 'drmanutapia@gmail.com'

export function isManuelEmail(email: string | null | undefined): boolean {
  return (email ?? '').toLowerCase() === MANUEL_EMAIL
}

// Criterio decidido (sesión 2026-08-29) para cuando el asistente de Aviso de
// Publicidad COFEPRIS se abra a médicos reales: doctors.verification_status
// === 'verificado', gratis para todos (sin gate de pricing_tier). NO
// implementado todavía -- el gate real de COFEPRIS sigue siendo
// isManuelEmail() en app/dashboard/cofepris/page.tsx y
// app/api/dashboard/cofepris/*/route.ts, hasta nueva indicación explícita.
// Cuando se apruebe, reemplazar esos usos de isManuelEmail(user.email) por
// una verificación de verification_status del doctor, sin agregar ningún
// check de plan/pricing_tier. Este criterio NO aplica a MSL Virtual ni a
// HEMA, que se quedan bajo isManuelEmail() sin cambio de plan.
export const COFEPRIS_CRITERIO_ACCESO_FUTURO = "verification_status === 'verificado', gratis para todos" as const
