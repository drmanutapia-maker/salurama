// Rango fisiológico aceptado para cálculo de BSA
const WEIGHT_MIN_KG = 20
const WEIGHT_MAX_KG = 250
const HEIGHT_MIN_CM = 100
const HEIGHT_MAX_CM = 220

export class BsaRangeError extends Error {
  constructor(field: 'weight_kg' | 'height_cm', value: number) {
    const label = field === 'weight_kg' ? 'Peso' : 'Talla'
    const [min, max] =
      field === 'weight_kg'
        ? [WEIGHT_MIN_KG, WEIGHT_MAX_KG]
        : [HEIGHT_MIN_CM, HEIGHT_MAX_CM]
    super(`${label} fuera de rango fisiológico: ${value} (válido: ${min}–${max})`)
    this.name = 'BsaRangeError'
  }
}

function assertRange(weight_kg: number, height_cm: number): void {
  if (weight_kg < WEIGHT_MIN_KG || weight_kg > WEIGHT_MAX_KG) {
    throw new BsaRangeError('weight_kg', weight_kg)
  }
  if (height_cm < HEIGHT_MIN_CM || height_cm > HEIGHT_MAX_CM) {
    throw new BsaRangeError('height_cm', height_cm)
  }
}

/**
 * Fórmula de Mosteller (1987) — predeterminada por el plan clínico HEMA.
 * BSA (m²) = √[(kg × cm) / 3600]
 *
 * Verificación de referencia: 66 kg / 160 cm → 1.71 m²
 * √[(66 × 160) / 3600] = √[10560 / 3600] = √2.9333 = 1.7127 ≈ 1.71 m²
 *
 * ASCO 2021: NO auto-capear a 2.0 m² — eso es decisión del médico (R-BSA-02).
 */
export function calculateBSAMosteller(weight_kg: number, height_cm: number): number {
  assertRange(weight_kg, height_cm)
  return Math.round(Math.sqrt((weight_kg * height_cm) / 3600) * 100) / 100
}

/**
 * Fórmula de DuBois & DuBois (1916) — guardada para trazabilidad comparativa.
 * BSA (m²) = 0.007184 × kg^0.425 × cm^0.725
 */
export function calculateBSADuBois(weight_kg: number, height_cm: number): number {
  assertRange(weight_kg, height_cm)
  const raw = 0.007184 * Math.pow(weight_kg, 0.425) * Math.pow(height_cm, 0.725)
  return Math.round(raw * 100) / 100
}
