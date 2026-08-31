// Lógica de búsqueda de médicos, en un solo lugar reutilizable -- antes vivía
// duplicada (a propósito, según un comentario ya retirado) entre
// app/buscar/page.tsx (conteo server-side) y app/buscar/BuscarClient.tsx
// (filtrado interactivo en el cliente), y ninguna de las dos copias
// comparaba contra `ciudad`. Función TS pura, sin dependencia de React ni de
// Supabase: recibe el array de médicos ya cargado, así que cualquier caller
// futuro (ej. el asistente de emparejamiento de Etapa 4) la puede reusar sin
// duplicar código, corra donde corra.

export function normalizarTexto(t: string | null | undefined): string {
  return t ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : ''
}

export interface MedicoBuscable {
  full_name: string
  specialty: string
  ciudad: string | null
  estado: string | null
}

// Substring (no exacto) contra nombre, especialidad y ciudad a la vez -- un
// médico califica si el texto aparece en cualquiera de los tres.
export function coincideBusqueda(medico: MedicoBuscable, query: string): boolean {
  const t = normalizarTexto(query)
  if (!t) return true
  return (
    normalizarTexto(medico.full_name).includes(t) ||
    normalizarTexto(medico.specialty).includes(t) ||
    normalizarTexto(medico.ciudad).includes(t)
  )
}

export function filtrarMedicos<T extends MedicoBuscable>(
  medicos: T[],
  opts: { query?: string | null; estado?: string | null }
): T[] {
  let r = medicos
  if (opts.query?.trim()) {
    r = r.filter(m => coincideBusqueda(m, opts.query!))
  }
  if (opts.estado) {
    // Comparación exacta, no substring: estado viene de un <select> de
    // catálogo cerrado (lib/locations.ts), no de texto libre. Con substring,
    // "México" (Estado) también hacía match con "Ciudad de México".
    const s = normalizarTexto(opts.estado)
    r = r.filter(m => m.estado && normalizarTexto(m.estado) === s)
  }
  return r
}
