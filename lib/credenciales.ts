// Resume el estado de credenciales de un médico a partir de TODAS sus filas
// en doctor_specialty_credentials (una por especialidad certificable).
// Fuente única de verdad para /admin y /admin/medicos — antes vivía
// duplicada en cada pantalla y se desincronizaron (una seguía leyendo
// review_status/license_visible, campos que ya no controlan nada público).
export type CredencialesStatus = 'pendiente' | 'verificado' | 'no_coincide'
export type CredResumen = CredencialesStatus | 'sin_especialidad'

export function resumenCredenciales(rows: { credentials_status: CredencialesStatus }[] | undefined): CredResumen {
  if (!rows || rows.length === 0) return 'sin_especialidad'
  if (rows.some(r => r.credentials_status === 'no_coincide')) return 'no_coincide'
  if (rows.every(r => r.credentials_status === 'verificado')) return 'verificado'
  return 'pendiente'
}
