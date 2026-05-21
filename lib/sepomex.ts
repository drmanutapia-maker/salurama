// lib/sepomex.ts
import { z } from 'zod'

// Schema de validación
const SepomexSchema = z.object({
  d_codigo: z.string(),
  d_asentamiento: z.string(),
  d_tipo_asentamiento: z.string(),
  d_mnpio: z.string(),
  d_estado: z.string(),
  d_ciudad: z.string().optional(),
  id_asentamiento_cp: z.string(),
})

type SepomexRaw = z.infer<typeof SepomexSchema>

export interface CPResult {
  cp: string
  estado: string
  municipio: string
  ciudad: string
  colonias: Array<{ nombre: string; tipo: string; id: string }>
}

// Cache con índices
class SepomexIndex {
  private byCP = new Map<string, SepomexRaw[]>()
  private byEstado = new Map<string, Set<string>>()
  private loaded = false
  private loading: Promise<void> | null = null

  async load(): Promise<void> {
    if (this.loaded) return
    if (this.loading) return this.loading

    this.loading = (async () => {
      try {
        // En 2026: usa API route en vez de fetch directo
        const res = await fetch('/api/sepomex', {
          next: { revalidate: 86400 }, // Cache 24h
        })

        if (!res.ok) throw new Error(`SEPOMEX ${res.status}`)

        const data = await res.json() as SepomexRaw[]

        // Build índices O(n)
        for (const item of data) {
          const parsed = SepomexSchema.safeParse(item)
          if (!parsed.success) continue

          const valid = parsed.data
          const cp = valid.d_codigo

          // Índice por CP
          if (!this.byCP.has(cp)) this.byCP.set(cp, [])
          this.byCP.get(cp)!.push(valid)

          // Índice por estado (para autocomplete)
          const estado = valid.d_estado
          if (!this.byEstado.has(estado)) {
            this.byEstado.set(estado, new Set())
          }
          this.byEstado.get(estado)!.add(valid.d_mnpio)
        }

        this.loaded = true
      } catch (error) {
        this.loading = null
        throw error
      }
    })()

    return this.loading
  }

  getByCP(cp: string): SepomexRaw[] | null {
    return this.byCP.get(cp) || null
  }

  getEstados(): string[] {
    return Array.from(this.byEstado.keys()).sort()
  }

  getMunicipios(estado: string): string[] {
    return Array.from(this.byEstado.get(estado) || []).sort()
  }
}

// Singleton
const index = new SepomexIndex()

/**
 * Buscar CP - O(1) con índice
 * @example await searchCP('11560') // Polanco
 */
export async function searchCP(cp: string): Promise<CPResult | null> {
  const clean = cp.replace(/\D/g, '').slice(0, 5)
  if (clean.length!== 5) return null

  await index.load()
  const results = index.getByCP(clean)

  if (!results?.length) return null

  const first = results[0]
  const colonias = results.map(r => ({
    nombre: r.d_asentamiento,
    tipo: r.d_tipo_asentamiento,
    id: r.id_asentamiento_cp,
  }))

  // Deduplicar y ordenar
  const unique = Array.from(
    new Map(colonias.map(c => [c.id, c])).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return {
    cp: clean,
    estado: first.d_estado,
    municipio: first.d_mnpio,
    ciudad: first.d_ciudad || first.d_mnpio,
    colonias: unique,
  }
}

/**
 * Búsqueda difusa por colonia
 */
export async function searchColonia(query: string, limit = 10) {
  if (query.length < 3) return []

  await index.load()
  const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

  const results: Array<{ cp: string; colonia: string; estado: string }> = []

  for (const [cp, items] of index['byCP']) {
    for (const item of items) {
      if (item.d_asentamiento.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized)) {
        results.push({ cp, colonia: item.d_asentamiento, estado: item.d_estado })
        if (results.length >= limit) break
      }
    }
    if (results.length >= limit) break
  }

  return results
}

export function formatCP(value: string): string {
  return value.replace(/\D/g, '').slice(0, 5)
}

/**
 * Preload en background - no bloquea
 */
export function preload(): void {
  if (typeof window!== 'undefined') {
    requestIdleCallback(() => {
      index.load().catch(() => {})
    })
  }
}

// API Route necesaria: app/api/sepomex/route.ts
export const dynamic = 'force-static'