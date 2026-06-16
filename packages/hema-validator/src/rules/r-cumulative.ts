import type { Rule, OrderInput, ValidationResult } from '../types'

function getCumulative(cumDoses: Record<string, number> | undefined, inn: string): number | undefined {
  if (!cumDoses) return undefined
  const key = Object.keys(cumDoses).find(k => k.toLowerCase() === inn.toLowerCase())
  return key !== undefined ? cumDoses[key] : undefined
}

interface CumSpec {
  id: string
  inn: string
  defaultLimitMgM2: number
  requiresCoSign: boolean
  labelEs: string
}

const SPECS: CumSpec[] = [
  { id: 'R-CUM-01', inn: 'doxorubicina',   defaultLimitMgM2: 450, requiresCoSign: true,  labelEs: 'Doxorubicina' },
  { id: 'R-CUM-02', inn: 'epirrubicina',   defaultLimitMgM2: 900, requiresCoSign: true,  labelEs: 'Epirrubicina' },
  { id: 'R-CUM-03', inn: 'daunorrubicina', defaultLimitMgM2: 550, requiresCoSign: true,  labelEs: 'Daunorrubicina' },
  { id: 'R-CUM-04', inn: 'idarrubicina',   defaultLimitMgM2: 150, requiresCoSign: true,  labelEs: 'Idarrubicina' },
  { id: 'R-CUM-05', inn: 'mitoxantrona',   defaultLimitMgM2: 140, requiresCoSign: true,  labelEs: 'Mitoxantrona' },
  { id: 'R-CUM-06', inn: 'bleomicina',     defaultLimitMgM2: 400, requiresCoSign: false, labelEs: 'Bleomicina' },
]

function makeCumRule(spec: CumSpec): Rule {
  return {
    id: spec.id,
    evaluate(input: OrderInput): ValidationResult | null {
      const cumulative = getCumulative(input.cumulative_doses, spec.inn)
      if (cumulative === undefined) return null

      const drug = input.protocol.drugs.find(d => d.inn.toLowerCase() === spec.inn.toLowerCase())
      if (!drug) return null

      // Respeta el límite declarado en el drug si está presente (p.ej. RT mediastinal → 350)
      const limit = drug.cumulative_max_mg_m2 ?? spec.defaultLimitMgM2
      if (cumulative <= limit) return null

      return {
        ruleId: spec.id,
        severity: 'block',
        message_es: `${spec.labelEs} acumulada ${cumulative} mg/m² supera el límite de ${limit} mg/m². Riesgo elevado de toxicidad irreversible.${spec.requiresCoSign ? ' Requiere segunda firma.' : ''}`,
        drug_inn: spec.inn,
        override_allowed: true,
        requires_second_signer: spec.requiresCoSign,
      }
    },
  }
}

export const cumulativeRules: Rule[] = [
  ...SPECS.map(makeCumRule),

  // R-CUM-07: Cisplatino ≥ 300 mg/m² → warn (nefrotoxicidad/ototoxicidad)
  {
    id: 'R-CUM-07',
    evaluate(input) {
      const cumCis = getCumulative(input.cumulative_doses, 'cisplatino')
      if (cumCis === undefined || cumCis < 300) return null
      const hasCis = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'cisplatino')
      if (!hasCis) return null
      return {
        ruleId: 'R-CUM-07',
        severity: 'warn',
        message_es: `Cisplatino acumulado ${cumCis} mg/m² ≥ 300 mg/m². Riesgo elevado de nefrotoxicidad permanente y ototoxicidad. Monitorea función renal y audiometría.`,
        drug_inn: 'cisplatino',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },
]
