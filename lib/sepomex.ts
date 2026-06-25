// lib/sepomex.ts
import { z } from 'zod'

export interface CPResult {
  cp: string
  estado: string
  municipio: string
  ciudad: string
  colonias: Array<{ nombre: string }>
  lat: number | null
  lng: number | null
}

const SepomexRow = z.object({
  cp: z.string(),
  estado: z.string(),
  municipio: z.string(),
  ciudad: z.string().nullable(),
  colonia: z.string(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
})

/**
 * Buscar CP - consulta /api/sepomex (server-side, tabla Supabase), sin índice en memoria.
 * @example await searchCP('11560') // Polanco
 */
export async function searchCP(cp: string): Promise<CPResult | null> {
  const clean = cp.replace(/\D/g, '').slice(0, 5)
  if (clean.length !== 5) return null

  const res = await fetch(`/api/sepomex?cp=${clean}`, { next: { revalidate: 86400 } })
  if (!res.ok) return null

  const parsed = z.array(SepomexRow).safeParse(await res.json())
  if (!parsed.success || parsed.data.length === 0) return null

  const first = parsed.data[0]
  const colonias = Array.from(new Set(parsed.data.map(r => r.colonia)))
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map(nombre => ({ nombre }))

  return {
    cp: clean,
    estado: first.estado,
    municipio: first.municipio,
    ciudad: first.ciudad || first.municipio,
    colonias,
    lat: first.lat ?? null,
    lng: first.lng ?? null,
  }
}

/**
 * Búsqueda difusa por colonia
 */
export async function searchColonia(query: string, limit = 10) {
  if (query.length < 3) return []

  const res = await fetch(`/api/sepomex?q=${encodeURIComponent(query)}`)
  if (!res.ok) return []

  const parsed = z
    .array(z.object({ cp: z.string(), colonia: z.string(), estado: z.string() }))
    .safeParse(await res.json())

  return parsed.success ? parsed.data.slice(0, limit) : []
}

export function formatCP(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5)
}

/** No-op: ya no hay índice en memoria que precargar; los datos viven en Supabase. */
export function preload(): void {}
