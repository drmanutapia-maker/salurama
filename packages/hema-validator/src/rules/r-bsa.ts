import type { Rule } from '../types'

export const bsaRules: Rule[] = [
  {
    id: 'R-BSA-01',
    evaluate(input) {
      return {
        ruleId: 'R-BSA-01',
        severity: 'info',
        message_es: `BSA calculada: Mosteller ${input.patient.bsa_mosteller.toFixed(2)} m² · DuBois ${input.patient.bsa_dubois.toFixed(2)} m². Fórmula en uso: Mosteller (por defecto ASCO).`,
        override_allowed: false,
        requires_second_signer: false,
      }
    },
  },
  {
    id: 'R-BSA-02',
    evaluate(input) {
      if (input.patient.bsa_mosteller <= 2.0) return null
      return {
        ruleId: 'R-BSA-02',
        severity: 'warn',
        message_es: `BSA ${input.patient.bsa_mosteller.toFixed(2)} m² > 2.0 m². No se aplica cap automático (ASCO 2021). Documenta la decisión clínica.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },
  {
    id: 'R-BSA-03',
    evaluate(input) {
      const { weight_kg, height_cm } = input.patient
      if (weight_kg >= 20 && weight_kg <= 250 && height_cm >= 100 && height_cm <= 220) return null
      return {
        ruleId: 'R-BSA-03',
        severity: 'block',
        message_es: `Peso ${weight_kg} kg o talla ${height_cm} cm fuera del rango fisiológico (20–250 kg / 100–220 cm). Registra nueva medición verificada antes de proceder.`,
        override_allowed: false,
        requires_second_signer: false,
      }
    },
  },
]
