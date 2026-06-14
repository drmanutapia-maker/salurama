import { describe, it, expect } from 'vitest'
import { calculateCKDEPI2021, calculateCockcroftGault } from '../ckd-epi'

// ─────────────────────────────────────────────────────────────────────────────
// calculateCKDEPI2021
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCKDEPI2021', () => {
  // ── Caso normal — verificación de referencia del plan clínico ──────────────
  it('Cr 2.5 mg/dL, hombre, 60 a → eGFR ≈ 28.7 mL/min/1.73m² (referencia HEMA)', () => {
    // 142 × (2.5/0.9)^(-1.2) × (0.9938)^60 ≈ 28.7
    const egfr = calculateCKDEPI2021(2.5, 60, 'M')
    expect(egfr).toBeGreaterThanOrEqual(27)
    expect(egfr).toBeLessThanOrEqual(31)
  })

  it('Cr 1.0 mg/dL, mujer, 45 a → función renal normal (eGFR > 60)', () => {
    const egfr = calculateCKDEPI2021(1.0, 45, 'F')
    expect(egfr).toBeGreaterThan(60)
  })

  it('Cr 0.8 mg/dL, hombre, 30 a → función excelente (eGFR > 100)', () => {
    const egfr = calculateCKDEPI2021(0.8, 30, 'M')
    expect(egfr).toBeGreaterThan(100)
  })

  // ── CKD-EPI produce un resultado diferente para M vs F con la misma Cr ────
  it('M y F con misma Cr producen eGFR distintos (fórmula sensible a sexo)', () => {
    // Para Cr > κ de ambos, el cociente Cr/κ femenino (κ=0.7) > masculino (κ=0.9)
    // → mayor penalización para F en el rango elevado de Cr
    // La diferencia refleja el ajuste por masa muscular diferente entre sexos
    const male = calculateCKDEPI2021(2.5, 60, 'M')
    const female = calculateCKDEPI2021(2.5, 60, 'F')
    expect(male).not.toBeCloseTo(female, 0) // valores claramente distintos
  })

  // ── Caso límite — insuficiencia renal severa ──────────────────────────────
  it('Cr 4.0 mg/dL, hombre, 70 a → ERC avanzada (eGFR < 20)', () => {
    // 142 × (4/0.9)^(-1.2) × (0.9938)^70 ≈ 15.3 → ERC estadio 4-5
    const egfr = calculateCKDEPI2021(4.0, 70, 'M')
    expect(egfr).toBeLessThan(20)
  })

  it('eGFR disminuye con la edad para la misma Cr', () => {
    const young = calculateCKDEPI2021(1.5, 30, 'M')
    const old = calculateCKDEPI2021(1.5, 80, 'M')
    expect(young).toBeGreaterThan(old)
  })

  // ── Casos de fallo ────────────────────────────────────────────────────────
  it('lanza RangeError para creatinina = 0', () => {
    expect(() => calculateCKDEPI2021(0, 60, 'M')).toThrow(RangeError)
  })

  it('lanza RangeError para creatinina negativa', () => {
    expect(() => calculateCKDEPI2021(-1, 60, 'M')).toThrow(RangeError)
  })

  it('lanza RangeError para edad < 18 años', () => {
    expect(() => calculateCKDEPI2021(1.0, 16, 'M')).toThrow(RangeError)
  })

  it('lanza RangeError para edad > 120 años', () => {
    expect(() => calculateCKDEPI2021(1.0, 125, 'M')).toThrow(RangeError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateCockcroftGault
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateCockcroftGault', () => {
  // ── Caso normal ───────────────────────────────────────────────────────────
  it('Cr 2.5 mg/dL, hombre, 60 a, 70 kg → CrCl ≈ 31 mL/min', () => {
    // [(140-60) × 70] / (72 × 2.5) = 5600 / 180 = 31.1
    const crcl = calculateCockcroftGault(2.5, 60, 'M', 70)
    expect(crcl).toBeGreaterThanOrEqual(29)
    expect(crcl).toBeLessThanOrEqual(34)
  })

  it('Cr 1.0 mg/dL, mujer, 50 a, 65 kg → CrCl normal > 60 mL/min', () => {
    // [(140-50) × 65 × 0.85] / (72 × 1.0) = 4972.5 / 72 ≈ 69
    const crcl = calculateCockcroftGault(1.0, 50, 'F', 65)
    expect(crcl).toBeGreaterThan(60)
  })

  it('factor 0.85 aplica para sexo femenino (CrCl mujer < CrCl hombre, mismos parámetros)', () => {
    const male = calculateCockcroftGault(1.5, 65, 'M', 70)
    const female = calculateCockcroftGault(1.5, 65, 'F', 70)
    expect(female).toBeLessThan(male)
    // La diferencia exacta debe ser factor 0.85
    expect(female / male).toBeCloseTo(0.85, 1)
  })

  // ── Caso límite — ERC severa, relevante para lenalidomida (R-LAB-05) ──────
  it('Cr 3.5 mg/dL, hombre, 75 a, 60 kg → CrCl < 30 (indica reducción lenalidomida)', () => {
    const crcl = calculateCockcroftGault(3.5, 75, 'M', 60)
    expect(crcl).toBeLessThan(30)
  })

  it('Cr 1.8 mg/dL, hombre, 65 a, 75 kg → CrCl entre 30-60 (zona de alerta R-LAB-06)', () => {
    const crcl = calculateCockcroftGault(1.8, 65, 'M', 75)
    expect(crcl).toBeGreaterThanOrEqual(30)
    expect(crcl).toBeLessThanOrEqual(60)
  })

  it('CrCl aumenta con mayor peso corporal (mayor masa muscular)', () => {
    const light = calculateCockcroftGault(1.5, 60, 'M', 60)
    const heavy = calculateCockcroftGault(1.5, 60, 'M', 90)
    expect(heavy).toBeGreaterThan(light)
  })

  // ── Casos de fallo ────────────────────────────────────────────────────────
  it('lanza RangeError para creatinina = 0', () => {
    expect(() => calculateCockcroftGault(0, 60, 'M', 70)).toThrow(RangeError)
  })

  it('lanza RangeError para peso = 0', () => {
    expect(() => calculateCockcroftGault(1.5, 60, 'M', 0)).toThrow(RangeError)
  })

  it('lanza RangeError para edad < 18 años', () => {
    expect(() => calculateCockcroftGault(1.0, 15, 'M', 50)).toThrow(RangeError)
  })
})
