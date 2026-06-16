import type { Rule } from '../types'

const STRONG_CYP3A4_INHIBITORS = [
  'claritromicina', 'itraconazol', 'ketoconazol', 'voriconazol', 'posaconazol',
  'ritonavir', 'lopinavir', 'nefazodona', 'cobicistat', 'indinavir',
  'clarithromycin', 'itraconazole', 'ketoconazole', 'voriconazole', 'posaconazole',
  'nefazodone',
]

const DVT_PROPHYLAXIS = [
  'aspirina', 'heparina', 'enoxaparina', 'rivaroxaban', 'apixaban', 'warfarina',
  'acenocumarol', 'fondaparinux', 'aspirin', 'heparin', 'enoxaparin', 'warfarin',
]

const LEUCOVORIN_ALIASES = [
  'leucovorin', 'folinato', 'acido folinico', 'ácido folínico', 'levoleucovorin',
  'leukovorin',
]

const MTX_INTERACTORS = [
  'ibuprofeno', 'naproxeno', 'diclofenaco', 'indometacina', 'ketoprofeno',
  'trimetoprima', 'trimetoprim', 'cotrimoxazol', 'tmp-smx', 'sulfametoxazol',
  'amoxicilina', 'ampicilina', 'piperacilina',
  'ibuprofen', 'naproxen', 'diclofenac', 'indomethacin',
  'trimethoprim', 'sulfamethoxazole', 'cotrimoxazole',
  'amoxicillin', 'ampicillin', 'piperacillin',
]

function hasMed(concurrent: string[] | undefined, keywords: string[]): boolean {
  if (!concurrent || concurrent.length === 0) return false
  const lower = concurrent.map(m => m.toLowerCase())
  return keywords.some(kw => lower.some(m => m.includes(kw.toLowerCase())))
}

export const ddiRules: Rule[] = [
  // R-DDI-01: Bortezomib + inhibidor fuerte CYP3A4 → warn
  {
    id: 'R-DDI-01',
    evaluate(input) {
      const hasBtz = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'bortezomib')
      if (!hasBtz) return null
      if (!hasMed(input.concurrent_medications, STRONG_CYP3A4_INHIBITORS)) return null
      return {
        ruleId: 'R-DDI-01',
        severity: 'warn',
        message_es: 'Bortezomib + inhibidor fuerte de CYP3A4. Aumenta exposición al bortezomib → mayor toxicidad. Monitorea efectos adversos y ajusta si es necesario.',
        drug_inn: 'bortezomib',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-DDI-02: Lenalidomida/Talidomida sin profilaxis TEV → block
  {
    id: 'R-DDI-02',
    evaluate(input) {
      const hasImid = input.protocol.drugs.some(d => {
        const inn = d.inn.toLowerCase()
        return inn === 'lenalidomida' || inn === 'talidomida' || inn === 'pomalidomida'
      })
      if (!hasImid) return null
      if (hasMed(input.concurrent_medications, DVT_PROPHYLAXIS)) return null
      return {
        ruleId: 'R-DDI-02',
        severity: 'block',
        message_es: 'Lenalidomida/Talidomida sin profilaxis de TEV documentada. Agrega aspirina, HBPM o anticoagulante oral según riesgo trombótico antes de iniciar.',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-DDI-03: Vincristina + inhibidor fuerte CYP3A4 → block (clase crítica — co-firma)
  {
    id: 'R-DDI-03',
    evaluate(input) {
      const hasVCR = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'vincristina')
      if (!hasVCR) return null
      if (!hasMed(input.concurrent_medications, STRONG_CYP3A4_INHIBITORS)) return null
      return {
        ruleId: 'R-DDI-03',
        severity: 'block',
        message_es: 'Vincristina + inhibidor fuerte de CYP3A4. Riesgo de neurotoxicidad grave y potencialmente fatal. Cambia el antifúngico/antibiótico antes de proceder. Requiere segunda firma.',
        drug_inn: 'vincristina',
        override_allowed: true,
        requires_second_signer: true,
      }
    },
  },

  // R-DDI-04: Ibrutinib + warfarina → block
  {
    id: 'R-DDI-04',
    evaluate(input) {
      const hasIbru = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'ibrutinib')
      if (!hasIbru) return null
      if (!hasMed(input.concurrent_medications, ['warfar', 'acenocumar'])) return null
      return {
        ruleId: 'R-DDI-04',
        severity: 'block',
        message_es: 'Ibrutinib + warfarina. Contraindicación absoluta por riesgo de sangrado fatal. Cambia a HBPM o anticoagulante oral directo (ACOD) antes de iniciar ibrutinib.',
        drug_inn: 'ibrutinib',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-DDI-05: MTX + AINEs/TMP-SMX/penicilinas → warn
  {
    id: 'R-DDI-05',
    evaluate(input) {
      const hasMTX = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'metotrexato')
      if (!hasMTX) return null
      if (!hasMed(input.concurrent_medications, MTX_INTERACTORS)) return null
      return {
        ruleId: 'R-DDI-05',
        severity: 'warn',
        message_es: 'Metotrexato + AINE/TMP-SMX/penicilina. Riesgo de acumulación de MTX por bloqueo de excreción renal. Suspende el interactor antes de MTX y durante al menos 48 h post-infusión.',
        drug_inn: 'metotrexato',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-DDI-06: MTX ≥ 1 g/m² sin plan de leucovorin → block
  {
    id: 'R-DDI-06',
    evaluate(input) {
      const mtx = input.protocol.drugs.find(d => d.inn.toLowerCase() === 'metotrexato')
      if (!mtx || mtx.dose_per_m2 < 1000) return null
      if (hasMed(input.concurrent_medications, LEUCOVORIN_ALIASES)) return null
      return {
        ruleId: 'R-DDI-06',
        severity: 'block',
        message_es: `Metotrexato ${mtx.dose_per_m2} mg/m² (≥ 1 g/m²) sin plan de rescate con leucovorin documentado. Agrega leucovorin cálcico comenzando 24 h post-infusión de MTX.`,
        drug_inn: 'metotrexato',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-DDI-07: Alopurinol + 6-MP/azatioprina → warn (reducir 75%)
  {
    id: 'R-DDI-07',
    evaluate(input) {
      const hasPurine = input.protocol.drugs.some(d => {
        const inn = d.inn.toLowerCase()
        return inn === '6-mercaptopurina' || inn === 'mercaptopurina' || inn === 'azatioprina'
      })
      if (!hasPurine) return null
      if (!hasMed(input.concurrent_medications, ['alopurinol', 'allopurinol'])) return null
      return {
        ruleId: 'R-DDI-07',
        severity: 'warn',
        message_es: 'Alopurinol + 6-MP/azatioprina. El alopurinol inhibe xantina oxidasa y eleva los niveles de 6-MP → toxicidad grave. Reduce la dosis de 6-MP/azatioprina un 75% o cambia a rasburicasa.',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },
]
