// lib/sepomex.ts

interface SepomexData {
  d_codigo: string
  d_asentamiento: string
  d_tipo_asentamiento: string
  d_mnpio: string
  d_estado: string
  d_ciudad: string
  d_cp: string
  c_estado: string
  c_oficina: string
  c_cp: string
  c_tipo_asentamiento: string
  c_mnpio: string
  id_asentamiento_cp: string
}

export interface CPResult {
  estado: string
  municipio: string
  ciudad: string
  colonias: Array<{ nombre: string; codigo: string }>
}

let sepomexCache: SepomexData[] | null = null

/**
 * Cargar datos de Sepomex desde JSON local (lazy load con caché)
 */
export async function loadSepomexData(): Promise<SepomexData[]> {
  if (sepomexCache) {
    return sepomexCache
  }

  try {
    const response = await fetch('/data/sepomex.json')
    if (!response.ok) {
      throw new Error(`Error al cargar sepomex.json: ${response.status}`)
    }
    sepomexCache = await response.json()
    console.log(`✅ [SEPOMEX] Datos cargados: ${sepomexCache.length} registros`)
    return sepomexCache
  } catch (error) {
    console.error('❌ [SEPOMEX] Error loading ', error)
    throw error
  }
}

/**
 * Buscar CP y devolver información estructurada
 */
export async function searchCP(cp: string): Promise<CPResult | null> {
  // Validar y formatear CP (5 dígitos)
  const cpFormatted = cp.replace(/\D/g, '').padStart(5, '0')
  
  if (cpFormatted.length !== 5) {
    return null
  }

  try {
    const data = await loadSepomexData()
    
    // Filtrar por CP exacto
    const results = data.filter(item => item.d_codigo === cpFormatted)
    
    if (results.length === 0) {
      return null
    }

    const firstResult = results[0]
    
    // Agrupar colonias únicas
    const coloniasMap = new Map<string, string>()
    results.forEach(item => {
      const nombre = `${item.d_tipo_asentamiento} ${item.d_asentamiento}`.trim()
      coloniasMap.set(nombre, item.id_asentamiento_cp)
    })

    const colonias = Array.from(coloniasMap.entries())
      .map(([nombre, codigo]) => ({ nombre, codigo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))

    return {
      estado: firstResult.d_estado,
      municipio: firstResult.d_mnpio,
      ciudad: firstResult.d_ciudad || firstResult.d_mnpio,
      colonias,
    }
  } catch (error) {
    console.error('❌ [SEPOMEX] Error searching CP:', error)
    return null
  }
}

/**
 * Formatear CP para visualización (máscara de 5 dígitos)
 */
export function formatCP(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.slice(0, 5)
}

/**
 * Pre-cargar datos en background (mejora UX)
 */
export function preloadSepomexData(): void {
  if (!sepomexCache) {
    loadSepomexData().catch(console.error)
  }
}