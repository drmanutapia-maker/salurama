import { describe, it, expect } from 'vitest'
import { searchDiagnosis, CIE10_CATALOG } from '../cie10'
import type { Diagnosis } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Integridad del catálogo
// ─────────────────────────────────────────────────────────────────────────────

describe('CIE10_CATALOG', () => {
  it('contiene todos los códigos del módulo HEMA (147 migración 015 + 7 hierro 016 = 154 total)', () => {
    // Los 7 códigos D50/D63 de hierro ya están incluidos en el conteo de 154
    expect(CIE10_CATALOG.length).toBeGreaterThanOrEqual(154)
  })

  it('incluye el código de hierro de la migración 016 (D50.9)', () => {
    const d = CIE10_CATALOG.find(e => e.code === 'D50.9')
    expect(d).toBeDefined()
    expect(d?.category).toBe('otro')
  })

  it('no tiene códigos duplicados', () => {
    const codes = CIE10_CATALOG.map(e => e.code)
    const unique = new Set(codes)
    expect(unique.size).toBe(codes.length)
  })

  it('todos los registros tienen code y description_es no vacíos', () => {
    for (const entry of CIE10_CATALOG) {
      expect(entry.code.length).toBeGreaterThan(0)
      expect(entry.description_es.length).toBeGreaterThan(0)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// searchDiagnosis — búsqueda por código exacto
// ─────────────────────────────────────────────────────────────────────────────

describe('searchDiagnosis — código exacto', () => {
  it('C90.0 devuelve Mieloma múltiple como primer resultado', () => {
    const results = searchDiagnosis('C90.0')
    expect(results[0]?.code).toBe('C90.0')
    expect(results[0]?.description_es).toContain('Mieloma')
  })

  it('C83.3 devuelve LDCBG (linfoma difuso células B grandes)', () => {
    const results = searchDiagnosis('C83.3')
    expect(results[0]?.code).toBe('C83.3')
  })

  it('D46.9 devuelve SMD no especificado', () => {
    const results = searchDiagnosis('D46.9')
    expect(results[0]?.code).toBe('D46.9')
    expect(results[0]?.category).toBe('mds')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// searchDiagnosis — búsqueda por texto en español
// ─────────────────────────────────────────────────────────────────────────────

describe('searchDiagnosis — texto libre en español', () => {
  it('"mieloma" devuelve resultados con categoría mieloma', () => {
    const results = searchDiagnosis('mieloma')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.category === 'mieloma')).toBe(true)
  })

  it('"waldenström" (sin tilde) devuelve C88.0', () => {
    const results = searchDiagnosis('waldenstrom')
    expect(results.some(r => r.code === 'C88.0')).toBe(true)
  })

  it('"leucemia aguda" devuelve LLA y LMA entre los primeros 5 resultados', () => {
    const results = searchDiagnosis('leucemia aguda')
    const codes = results.slice(0, 5).map(r => r.code)
    expect(codes.some(c => ['C91.0', 'C92.0', 'C95.0'].includes(c))).toBe(true)
  })

  it('"burkitt" devuelve C83.7', () => {
    const results = searchDiagnosis('burkitt')
    expect(results[0]?.code).toBe('C83.7')
  })

  it('"neutropenia quimioterapia" devuelve D70.1', () => {
    const results = searchDiagnosis('neutropenia quimioterapia')
    expect(results.some(r => r.code === 'D70.1')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// searchDiagnosis — filtro por categoría
// ─────────────────────────────────────────────────────────────────────────────

describe('searchDiagnosis — filtro por categoría', () => {
  it('category=mds solo devuelve resultados de MDS', () => {
    const results = searchDiagnosis('anemia', 'mds')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.category === 'mds')).toBe(true)
  })

  it('category=mpn solo devuelve resultados de MPN', () => {
    const results = searchDiagnosis('trombocitemia', 'mpn')
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.category === 'mpn')).toBe(true)
  })

  it('category=linfoma excluye resultados de leucemia', () => {
    const results = searchDiagnosis('C92', 'linfoma')
    // C92.x son leucemias — no deben aparecer si filtramos por linfoma
    expect(results.every(r => r.category === 'linfoma')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// searchDiagnosis — catálogo personalizado
// ─────────────────────────────────────────────────────────────────────────────

describe('searchDiagnosis — catálogo personalizado', () => {
  const miniCatalog: Diagnosis[] = [
    { code: 'C90.0', description_es: 'Mieloma múltiple', description_en: 'Multiple myeloma', category: 'mieloma' },
    { code: 'C91.0', description_es: 'Leucemia linfoblástica aguda (LLA)', description_en: 'ALL', category: 'leucemia' },
  ]

  it('busca dentro del catálogo inyectado, no del global', () => {
    const results = searchDiagnosis('linfoma', undefined, miniCatalog)
    // "linfoma" no está en el mini-catálogo → sin resultados
    expect(results).toHaveLength(0)
  })

  it('encuentra C90.0 en el mini-catálogo', () => {
    const results = searchDiagnosis('C90.0', undefined, miniCatalog)
    expect(results[0]?.code).toBe('C90.0')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// searchDiagnosis — sin resultados
// ─────────────────────────────────────────────────────────────────────────────

describe('searchDiagnosis — sin resultados / casos límite', () => {
  it('query vacío devuelve array vacío', () => {
    expect(searchDiagnosis('')).toHaveLength(0)
  })

  it('query de espacios en blanco devuelve array vacío', () => {
    expect(searchDiagnosis('   ')).toHaveLength(0)
  })

  it('código inexistente devuelve array vacío', () => {
    expect(searchDiagnosis('Z99.99')).toHaveLength(0)
  })

  it('devuelve máximo 20 resultados aunque haya más coincidencias', () => {
    // "otro" como query libre debería tocar muchas entradas de categoría 'otro'
    const results = searchDiagnosis('leucemia')
    expect(results.length).toBeLessThanOrEqual(20)
  })
})
