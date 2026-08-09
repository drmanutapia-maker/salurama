// Utilidades de fecha compartidas entre CitaCard, CalendarioMensual y la
// vista de agenda móvil — antes vivían solo dentro de app/dashboard/citas/page.tsx.

export function formatFecha(fechaStr: string): string {
  const d = new Date(fechaStr + 'T00:00:00')
  // Bug pre-existente: comparar contra toISOString() usa el día en UTC, que
  // en horario de México (UTC-6) ya se adelantó al día siguiente por buena
  // parte de la noche — una cita de "hoy" se mostraba como "Ayer". Se
  // corrige comparando fecha local, igual que fechaISOLocal() de abajo (que
  // ya usa el mismo criterio para el calendario).
  const hoy = fechaISOLocal(new Date())
  const ayer = fechaISOLocal(new Date(Date.now() - 86400000))
  if (fechaStr === hoy) return 'Hoy'
  if (fechaStr === ayer) return 'Ayer'
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function isFutura(fechaStr: string): boolean {
  return new Date(fechaStr + 'T00:00') > new Date()
}

export function fechaISOLocal(d: Date): string {
  // Fijamos la zona horaria explícitamente (en vez de confiar en la del
  // entorno de ejecución) porque el servidor (SSR/producción) puede correr
  // en una zona distinta a la de médicos y pacientes, todos en México.
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}
