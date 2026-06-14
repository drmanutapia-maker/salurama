// ─────────────────────────────────────────────────────────────────────────────
// CKD-EPI Creatinine Equation 2021 (race-free)
// Inker LA et al. NEJM 2021;385:1737-1749
// Unidad de salida: mL/min/1.73 m²
//
// Verificación de referencia:
// Creatinina 2.5 mg/dL, sexo M, edad 60a → eGFR ≈ 28.7 mL/min/1.73m²
// 142 × (2.5/0.9)^(-1.200) × (0.9938)^60 = 142 × 0.2935 × 0.6886 ≈ 28.7
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCKDEPI2021(
  creatinine_mg_dl: number,
  age_years: number,
  sex: 'M' | 'F',
): number {
  if (creatinine_mg_dl <= 0) throw new RangeError('La creatinina debe ser > 0 mg/dL')
  if (age_years < 18 || age_years > 120) throw new RangeError('Edad válida: 18–120 años')

  const kappa = sex === 'F' ? 0.7 : 0.9
  const alpha = sex === 'F' ? -0.241 : -0.302
  const sexFactor = sex === 'F' ? 1.012 : 1.0

  const ratio = creatinine_mg_dl / kappa

  // min(Scr/κ, 1)^α × max(Scr/κ, 1)^(-1.200)
  const minTerm = Math.pow(Math.min(ratio, 1), alpha)
  const maxTerm = Math.pow(Math.max(ratio, 1), -1.2)

  const ageTerm = Math.pow(0.9938, age_years)

  const egfr = 142 * minTerm * maxTerm * ageTerm * sexFactor
  return Math.round(egfr * 10) / 10
}

// ─────────────────────────────────────────────────────────────────────────────
// Cockcroft-Gault (1976)
// Unidad de salida: mL/min (no normalizada por superficie corporal)
// Usada principalmente para ajuste de dosis en fármacos renales (lenalidomida,
// bleomicina) según ficha técnica de agencia regulatoria original.
//
// Verificación de referencia:
// Creatinina 2.5 mg/dL, sexo M, edad 60a, peso 70 kg → CrCl ≈ 31 mL/min
// [(140-60) × 70] / (72 × 2.5) = 5600 / 180 = 31.1
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCockcroftGault(
  creatinine_mg_dl: number,
  age_years: number,
  sex: 'M' | 'F',
  weight_kg: number,
): number {
  if (creatinine_mg_dl <= 0) throw new RangeError('La creatinina debe ser > 0 mg/dL')
  if (age_years < 18 || age_years > 120) throw new RangeError('Edad válida: 18–120 años')
  if (weight_kg <= 0) throw new RangeError('El peso debe ser > 0 kg')

  const sexFactor = sex === 'F' ? 0.85 : 1.0
  const crcl = ((140 - age_years) * weight_kg) / (72 * creatinine_mg_dl) * sexFactor
  return Math.round(crcl * 10) / 10
}
