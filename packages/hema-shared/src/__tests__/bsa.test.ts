import { describe, it, expect } from 'vitest'
import { calculateBSAMosteller, calculateBSADuBois, BsaRangeError } from '../bsa'

// ─────────────────────────────────────────────────────────────────────────────
// calculateBSAMosteller
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateBSAMosteller', () => {
  // ── Caso normal — verificación de referencia del plan clínico ──────────────
  it('66 kg / 160 cm → 1.71 m² (caso de referencia HEMA)', () => {
    // √[(66 × 160) / 3600] = √[10560 / 3600] = √2.9333 = 1.7127 → redondeado 1.71
    expect(calculateBSAMosteller(66, 160)).toBe(1.71)
  })

  it('70 kg / 170 cm → 1.82 m² (adulto promedio hombre)', () => {
    // √[(70 × 170) / 3600] = √[11900 / 3600] = √3.3056 = 1.8182 → 1.82
    expect(calculateBSAMosteller(70, 170)).toBe(1.82)
  })

  it('50 kg / 155 cm → 1.47 m² (mujer pequeña)', () => {
    // √[(50 × 155) / 3600] = √[7750 / 3600] = √2.1528 = 1.4673 → 1.47
    expect(calculateBSAMosteller(50, 155)).toBe(1.47)
  })

  // ── BSA > 2.0 debe calcularse sin cap (ASCO 2021, R-BSA-02) ───────────────
  it('BSA > 2.0 m² se calcula y devuelve sin truncar (sin cap automático)', () => {
    // 100 kg / 190 cm → √[(100×190)/3600] = √5.2778 = 2.297
    const bsa = calculateBSAMosteller(100, 190)
    expect(bsa).toBeGreaterThan(2.0)
    expect(bsa).toBe(2.3)
  })

  // ── Casos límite del rango fisiológico ────────────────────────────────────
  it('peso mínimo 20 kg / talla 100 cm → calcula sin lanzar error', () => {
    expect(() => calculateBSAMosteller(20, 100)).not.toThrow()
  })

  it('peso máximo 250 kg / talla 220 cm → calcula sin lanzar error', () => {
    expect(() => calculateBSAMosteller(250, 220)).not.toThrow()
  })

  // ── Casos de fallo — fuera de rango ──────────────────────────────────────
  it('lanza BsaRangeError para peso < 20 kg', () => {
    expect(() => calculateBSAMosteller(10, 160)).toThrow(BsaRangeError)
  })

  it('lanza BsaRangeError para talla > 220 cm', () => {
    expect(() => calculateBSAMosteller(70, 230)).toThrow(BsaRangeError)
  })

  it('lanza BsaRangeError para talla < 100 cm', () => {
    expect(() => calculateBSAMosteller(30, 90)).toThrow(BsaRangeError)
  })

  it('lanza BsaRangeError para peso > 250 kg', () => {
    expect(() => calculateBSAMosteller(260, 170)).toThrow(BsaRangeError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateBSADuBois
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateBSADuBois', () => {
  // ── Caso normal ───────────────────────────────────────────────────────────
  it('66 kg / 160 cm → valor cercano a Mosteller (diferencia < 0.10 m²)', () => {
    // DuBois: 0.007184 × 66^0.425 × 160^0.725
    const dubois = calculateBSADuBois(66, 160)
    const mosteller = calculateBSAMosteller(66, 160)
    expect(Math.abs(dubois - mosteller)).toBeLessThan(0.1)
  })

  it('70 kg / 170 cm → resultado positivo y razonable (1.7–2.0 m²)', () => {
    const bsa = calculateBSADuBois(70, 170)
    expect(bsa).toBeGreaterThan(1.7)
    expect(bsa).toBeLessThan(2.0)
  })

  it('50 kg / 155 cm → resultado positivo y razonable (1.3–1.7 m²)', () => {
    const bsa = calculateBSADuBois(50, 155)
    expect(bsa).toBeGreaterThan(1.3)
    expect(bsa).toBeLessThan(1.7)
  })

  // ── Casos de fallo ────────────────────────────────────────────────────────
  it('lanza BsaRangeError para peso < 20 kg', () => {
    expect(() => calculateBSADuBois(15, 140)).toThrow(BsaRangeError)
  })

  it('lanza BsaRangeError para talla < 100 cm', () => {
    expect(() => calculateBSADuBois(40, 90)).toThrow(BsaRangeError)
  })
})
