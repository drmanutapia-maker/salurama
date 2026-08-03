import { createClient } from '@supabase/supabase-js'
import { getStateLabel } from '@/lib/locations'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Decisión de producto (Manuel, 2026-08-03): una combinación especialidad+
// estado solo es pública/indexable con al menos este número de médicos
// activos reales. Por debajo del umbral, la ruta /especialistas/[e]/[s]
// debe devolver 404 — nunca una página delgada o casi vacía (riesgo de
// penalización de Google por doorway pages).
export const UMBRAL_MINIMO_MEDICOS = 3

export interface CombinacionEspecialidadEstado {
  especialidad: string
  estado: string
  total: number
}

const norm = (t: string | null | undefined): string =>
  t ? t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : ''

function slugify(texto: string): string {
  return norm(texto)
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// El slug de estado se genera desde la etiqueta amigable (getStateLabel),
// no del value crudo SEPOMEX — así la URL dice "ciudad-de-mexico", no
// "mexico" para el Estado de México ni cosas como "veracruz-de-ignacio-de-
// la-llave". El value real que se compara contra la DB sigue siendo SEPOMEX.
export function especialidadSlug(especialidad: string): string {
  return slugify(especialidad)
}

export function estadoSlug(estado: string): string {
  return slugify(getStateLabel(estado))
}

// El total de médicos activos hoy es chico (decenas, no miles) — se agrega
// en memoria en vez de un GROUP BY en Postgres, mismo criterio que ya usan
// getArticulosPorEspecialidadTexto (lib/blog.ts) y lib/homepageEspecialistas.ts.
export async function getCombinacionesCalificadas(): Promise<CombinacionEspecialidadEstado[]> {
  const { data } = await getSupabase()
    .from('doctors')
    .select('specialty, estado')
    .eq('is_active', true)
    .not('specialty', 'is', null)
    .not('estado', 'is', null)

  const conteo = new Map<string, CombinacionEspecialidadEstado>()
  for (const d of data ?? []) {
    const key = `${d.specialty}|||${d.estado}`
    const actual = conteo.get(key)
    if (actual) actual.total++
    else conteo.set(key, { especialidad: d.specialty as string, estado: d.estado as string, total: 1 })
  }

  return Array.from(conteo.values()).filter(c => c.total >= UMBRAL_MINIMO_MEDICOS)
}

// Resuelve un par de slugs de URL a la combinación calificada real (con el
// casing canónico de la DB) — null si no existe o no llega al umbral. Es el
// único punto de verdad que decide 404 vs. página real en
// /especialistas/[especialidad]/[estado].
export async function resolverPorSlugs(especialidadSlugParam: string, estadoSlugParam: string): Promise<CombinacionEspecialidadEstado | null> {
  const combinaciones = await getCombinacionesCalificadas()
  return combinaciones.find(
    c => especialidadSlug(c.especialidad) === especialidadSlugParam && estadoSlug(c.estado) === estadoSlugParam
  ) ?? null
}

// Usado desde /buscar (Parte 3): dado especialidad/estado tal como llegan en
// los searchParams (texto libre para especialidad, comparación tolerante a
// acentos/mayúsculas), confirma si esa combinación ya calificó y devuelve el
// casing canónico para construir el link a la página dedicada.
export async function esCombinacionCalificada(especialidadQuery: string, estadoQuery: string): Promise<CombinacionEspecialidadEstado | null> {
  const combinaciones = await getCombinacionesCalificadas()
  const e = norm(especialidadQuery)
  const s = norm(estadoQuery)
  return combinaciones.find(c => norm(c.especialidad) === e && norm(c.estado) === s) ?? null
}
