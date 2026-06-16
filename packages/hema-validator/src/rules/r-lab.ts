import type { Rule } from '../types'

const ULN = 40 // U/L — límite superior normal de AST/ALT

// Agentes hipometilantes: excepción a R-LAB-01 en contexto MDS
const HMA_INNS = new Set(['azacitidina', 'decitabina'])

export const labRules: Rule[] = [
  // R-LAB-01: ANC < 1,000/µL → block (excepto HMAs en MDS)
  {
    id: 'R-LAB-01',
    evaluate(input) {
      const { anc } = input.labs
      if (anc === undefined || anc >= 1000) return null
      const allHma = input.protocol.drugs.every(d => HMA_INNS.has(d.inn.toLowerCase()))
      if (allHma) return null
      return {
        ruleId: 'R-LAB-01',
        severity: 'block',
        message_es: `ANC ${anc.toLocaleString('es-MX')}/µL < 1,000/µL. Quimioterapia contraindicada. Considera G-CSF y re-biometría antes de proceder.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-02: Plaquetas < 50,000/µL + bortezomib/antraciclinas → block
  {
    id: 'R-LAB-02',
    evaluate(input) {
      const { platelets } = input.labs
      if (platelets === undefined || platelets >= 50_000) return null
      const hasRisk = input.protocol.drugs.some(
        d => d.inn.toLowerCase() === 'bortezomib' || d.is_anthracycline,
      )
      if (!hasRisk) return null
      return {
        ruleId: 'R-LAB-02',
        severity: 'block',
        message_es: `Plaquetas ${platelets.toLocaleString('es-MX')}/µL < 50,000/µL. Contraindicado con bortezomib/antraciclinas. Espera recuperación plaquetaria ≥ 50,000/µL.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-03: Plaquetas < 100,000/µL → warn general
  {
    id: 'R-LAB-03',
    evaluate(input) {
      const { platelets } = input.labs
      if (platelets === undefined || platelets >= 100_000) return null
      // Si R-LAB-02 ya aplica, no duplicar la alerta
      if (platelets < 50_000) {
        const hasRisk = input.protocol.drugs.some(
          d => d.inn.toLowerCase() === 'bortezomib' || d.is_anthracycline,
        )
        if (hasRisk) return null
      }
      return {
        ruleId: 'R-LAB-03',
        severity: 'warn',
        message_es: `Plaquetas ${platelets.toLocaleString('es-MX')}/µL < 100,000/µL. Vigila riesgo hemorrágico y evalúa soporte transfusional si es necesario.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-04: Hgb < 8 g/dL → warn
  {
    id: 'R-LAB-04',
    evaluate(input) {
      const { hemoglobin } = input.labs
      if (hemoglobin === undefined || hemoglobin >= 8) return null
      return {
        ruleId: 'R-LAB-04',
        severity: 'warn',
        message_es: `Hemoglobina ${hemoglobin} g/dL < 8 g/dL. Evalúa transfusión de concentrado eritrocitario antes de proceder con quimioterapia.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-05: CrCl < 30 mL/min + bleomicina/lenalidomida → block
  {
    id: 'R-LAB-05',
    evaluate(input) {
      const { crcl } = input.labs
      if (crcl === undefined || crcl >= 30) return null
      const hasRisk = input.protocol.drugs.some(d => {
        const inn = d.inn.toLowerCase()
        return inn === 'bleomicina' || inn === 'lenalidomida'
      })
      if (!hasRisk) return null
      return {
        ruleId: 'R-LAB-05',
        severity: 'block',
        message_es: `CrCl ${crcl.toFixed(0)} mL/min < 30 mL/min. Bleomicina contraindicada. Lenalidomida requiere ajuste a 5 mg/día. Verifica TFG antes de proceder.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-06: CrCl 30–49 mL/min + bleomicina → warn
  {
    id: 'R-LAB-06',
    evaluate(input) {
      const { crcl } = input.labs
      if (crcl === undefined || crcl < 30 || crcl >= 50) return null
      const hasBleo = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'bleomicina')
      if (!hasBleo) return null
      return {
        ruleId: 'R-LAB-06',
        severity: 'warn',
        message_es: `CrCl ${crcl.toFixed(0)} mL/min (30–49 mL/min) + bleomicina. Monitorea función pulmonar estrechamente.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-07: Bilirrubina 1.2–3.0 mg/dL + doxorubicina → –50%
  {
    id: 'R-LAB-07',
    evaluate(input) {
      const { bilirubin_total } = input.labs
      if (bilirubin_total === undefined || bilirubin_total < 1.2 || bilirubin_total > 3.0) return null
      const hasDoxo = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'doxorubicina')
      if (!hasDoxo) return null
      return {
        ruleId: 'R-LAB-07',
        severity: 'warn',
        message_es: `Bilirrubina ${bilirubin_total.toFixed(1)} mg/dL (1.2–3.0 mg/dL). Reducir doxorubicina 50%.`,
        drug_inn: 'doxorubicina',
        reduction_pct: 50,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-08: Bilirrubina 3.1–5.0 mg/dL + doxorubicina → –75%
  {
    id: 'R-LAB-08',
    evaluate(input) {
      const { bilirubin_total } = input.labs
      if (bilirubin_total === undefined || bilirubin_total <= 3.0 || bilirubin_total > 5.0) return null
      const hasDoxo = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'doxorubicina')
      if (!hasDoxo) return null
      return {
        ruleId: 'R-LAB-08',
        severity: 'warn',
        message_es: `Bilirrubina ${bilirubin_total.toFixed(1)} mg/dL (3.1–5.0 mg/dL). Reducir doxorubicina 75%.`,
        drug_inn: 'doxorubicina',
        reduction_pct: 75,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-09: AST/ALT > 3×LSN → vincristina –50%
  {
    id: 'R-LAB-09',
    evaluate(input) {
      const { ast, alt } = input.labs
      if (ast === undefined && alt === undefined) return null
      const max = Math.max(ast ?? 0, alt ?? 0)
      if (max <= 3 * ULN || max > 5 * ULN) return null
      const hasVCR = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'vincristina')
      if (!hasVCR) return null
      return {
        ruleId: 'R-LAB-09',
        severity: 'warn',
        message_es: `AST/ALT ${max} U/L (> 3× LSN). Reducir vincristina 50%.`,
        drug_inn: 'vincristina',
        reduction_pct: 50,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-10: AST/ALT > 5×LSN → block vincristina
  {
    id: 'R-LAB-10',
    evaluate(input) {
      const { ast, alt } = input.labs
      if (ast === undefined && alt === undefined) return null
      const max = Math.max(ast ?? 0, alt ?? 0)
      if (max <= 5 * ULN) return null
      const hasVCR = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'vincristina')
      if (!hasVCR) return null
      return {
        ruleId: 'R-LAB-10',
        severity: 'block',
        message_es: `AST/ALT ${max} U/L (> 5× LSN). Vincristina contraindicada hasta normalización de transaminasas.`,
        drug_inn: 'vincristina',
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-LAB-11: FEVI < 50% + antraciclinas → block (clase crítica — requiere co-firma)
  {
    id: 'R-LAB-11',
    evaluate(input) {
      const { lvef } = input.labs
      if (lvef === undefined || lvef >= 50) return null
      const hasAnthracycline = input.protocol.drugs.some(d => d.is_anthracycline)
      if (!hasAnthracycline) return null
      return {
        ruleId: 'R-LAB-11',
        severity: 'block',
        message_es: `FEVI ${lvef}% < 50%. Antraciclinas contraindicadas por riesgo de cardiotoxicidad grave. Requiere evaluación por cardiología oncológica y segunda firma del director médico.`,
        override_allowed: true,
        requires_second_signer: true,
      }
    },
  },

  // R-LAB-12: Labs > 30 días → warn
  {
    id: 'R-LAB-12',
    evaluate(input) {
      const collectedAt = new Date(input.labs.collected_at)
      const daysDiff = (Date.now() - collectedAt.getTime()) / 86_400_000
      if (daysDiff <= 30) return null
      return {
        ruleId: 'R-LAB-12',
        severity: 'warn',
        message_es: `Laboratorios con ${Math.floor(daysDiff)} días de antigüedad (> 30 días). Solicita biometría hemática y química sanguínea recientes antes de proceder.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },
]
