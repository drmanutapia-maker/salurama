import type { Rule } from '../types'

const ANTI_CD20 = ['rituximab', 'obinutuzumab', 'ofatumumab']

const LEUCOVORIN_ALIASES = [
  'leucovorin', 'folinato', 'acido folinico', 'ácido folínico', 'levoleucovorin',
]

const PJP_PROPHYLAXIS = [
  'trimetoprima', 'trimetoprim', 'cotrimoxazol', 'tmp-smx', 'sulfametoxazol',
  'pentamidina', 'atovacuona',
  'trimethoprim', 'cotrimoxazole', 'pentamidine', 'atovaquone',
]

const CORTICOSTEROIDS = [
  'prednisona', 'dexametasona', 'metilprednisolona', 'prednisolona', 'hidrocortisona',
  'prednisone', 'dexamethasone', 'methylprednisolone', 'prednisolone', 'hydrocortisone',
]

function hasMed(concurrent: string[] | undefined, keywords: string[]): boolean {
  if (!concurrent || concurrent.length === 0) return false
  const lower = concurrent.map(m => m.toLowerCase())
  return keywords.some(kw => lower.some(m => m.includes(kw.toLowerCase())))
}

export const protocolRules: Rule[] = [
  // R-PRO-01: LPA (C92.4 EXCLUSIVAMENTE) + GB > 10×10⁹/L sin prednisona profiláctica
  {
    id: 'R-PRO-01',
    evaluate(input) {
      if (input.diagnosis_code !== 'C92.4') return null
      const wbc = input.labs.wbc
      if (wbc === undefined || wbc <= 10) return null
      if (hasMed(input.concurrent_medications, ['prednisona', 'prednisone', 'dexametasona', 'dexamethasone'])) return null
      return {
        ruleId: 'R-PRO-01',
        severity: 'block',
        message_es: `LPA (C92.4) con leucocitos ${wbc}×10⁹/L > 10×10⁹/L. Alto riesgo de síndrome de diferenciación. Agrega prednisona 0.5 mg/kg/día profiláctica antes de iniciar ATRA/ATO.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-PRO-02: Linfoma de Burkitt (C83.7) sin rasburicasa → block SLT
  {
    id: 'R-PRO-02',
    evaluate(input) {
      if (input.diagnosis_code !== 'C83.7') return null
      if (hasMed(input.concurrent_medications, ['rasburicasa', 'rasburicase'])) return null
      return {
        ruleId: 'R-PRO-02',
        severity: 'block',
        message_es: 'Linfoma de Burkitt (C83.7) sin rasburicasa documentada. Alto riesgo de síndrome de lisis tumoral grave. Agrega rasburicasa + hiperhidratación + monitoreo electrolítico antes de quimioterapia.',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-PRO-03: Anti-CD20 sin serología VHB → block
  {
    id: 'R-PRO-03',
    evaluate(input) {
      const hasAntiCD20 = input.protocol.drugs.some(d => ANTI_CD20.includes(d.inn.toLowerCase()))
      if (!hasAntiCD20) return null
      if (input.hbv_screened === true) return null
      return {
        ruleId: 'R-PRO-03',
        severity: 'block',
        message_es: 'Anti-CD20 sin serología VHB confirmada (HBsAg + anti-HBc < 90 días). Reactivación de VHB puede ser fatal. Obtén serología y, si positiva, inicia profilaxis con entecavir antes de proceder.',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-PRO-04: Corticosteroide ≥ 4 semanas sin profilaxis de PJP → block
  {
    id: 'R-PRO-04',
    evaluate(input) {
      const hasCortico = input.protocol.drugs.some(d => CORTICOSTEROIDS.some(c => d.inn.toLowerCase().includes(c))) ||
        hasMed(input.concurrent_medications, CORTICOSTEROIDS)
      if (!hasCortico) return null
      if (hasMed(input.concurrent_medications, PJP_PROPHYLAXIS)) return null
      return {
        ruleId: 'R-PRO-04',
        severity: 'block',
        message_es: 'Corticosteroide ≥ 4 semanas sin profilaxis de Pneumocystis jirovecii documentada. Agrega TMP-SMX (o pentamidina inhalada si alergia) antes de iniciar.',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-PRO-05: Daratumumab → warn primera infusión
  {
    id: 'R-PRO-05',
    evaluate(input) {
      const hasDara = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'daratumumab')
      if (!hasDara) return null
      return {
        ruleId: 'R-PRO-05',
        severity: 'warn',
        message_es: 'Daratumumab presente. Verifica ruta SC vs IV. Primera infusión IV: premedicación completa (corticoide, antihistamínico, paracetamol) + monitoreo de reacción infusional ≥ 6 h.',
        drug_inn: 'daratumumab',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-PRO-06: MTX ≥ 1 g/m² sin plan de leucovorin → block
  {
    id: 'R-PRO-06',
    evaluate(input) {
      const mtx = input.protocol.drugs.find(d => d.inn.toLowerCase() === 'metotrexato')
      if (!mtx || mtx.dose_per_m2 < 1000) return null
      if (hasMed(input.concurrent_medications, LEUCOVORIN_ALIASES)) return null
      return {
        ruleId: 'R-PRO-06',
        severity: 'block',
        message_es: `Metotrexato ${mtx.dose_per_m2} mg/m² (≥ 1 g/m²) sin rescate con leucovorin en el plan de medicación. Agrega leucovorin comenzando 24 h post-infusión.`,
        drug_inn: 'metotrexato',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-HIERRO-01: Dextrano de hierro sin dosis de prueba → block
  {
    id: 'R-HIERRO-01',
    evaluate(input) {
      const hierro = input.protocol.drugs.find(d => {
        const inn = d.inn.toLowerCase()
        return inn.includes('dextrano') || inn.includes('iron dextran') || inn.includes('hierro dextrano')
      })
      if (!hierro) return null
      if (!hierro.requires_test_dose) return null
      if (hierro.test_dose_completed === true) return null
      return {
        ruleId: 'R-HIERRO-01',
        severity: 'block',
        message_es: 'Dextrano de hierro requiere dosis de prueba (25 mg IV en 15 min + observación 15 min) antes de la dosis terapéutica. Riesgo de reacción anafiláctica fatal sin dosis de prueba.',
        drug_inn: hierro.inn,
        override_allowed: false,
        requires_second_signer: false,
      }
    },
  },
]
