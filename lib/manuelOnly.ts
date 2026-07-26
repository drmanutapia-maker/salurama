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
