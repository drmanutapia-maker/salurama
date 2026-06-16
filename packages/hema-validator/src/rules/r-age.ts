import type { Rule } from '../types'

export const ageRules: Rule[] = [
  // R-AGE-01: Cap de vincristina — 2 mg cualquier edad, 1.5 mg si ≥ 70 años (no negociable)
  {
    id: 'R-AGE-01',
    evaluate(input) {
      const vcr = input.protocol.drugs.find(d => d.inn.toLowerCase() === 'vincristina')
      if (!vcr) return null

      const cap = input.patient.age >= 70 ? 1.5 : 2.0
      if (vcr.dose_mg <= cap) return null

      const ageNote = input.patient.age >= 70 ? ` (paciente ${input.patient.age} años ≥ 70)` : ''
      return {
        ruleId: 'R-AGE-01',
        severity: 'block',
        message_es: `Vincristina ${vcr.dose_mg.toFixed(1)} mg excede el cap de ${cap} mg/ciclo${ageNote}. Regla no negociable: ajustar a ${cap} mg.`,
        drug_inn: 'vincristina',
        suggested_dose_mg: cap,
        override_allowed: false,
        requires_second_signer: false,
      }
    },
  },

  // R-AGE-02: ≥ 75 años o fragilidad IMWG → warn (considerar esquemas reducidos)
  {
    id: 'R-AGE-02',
    evaluate(input) {
      if (input.patient.age < 75) return null
      return {
        ruleId: 'R-AGE-02',
        severity: 'warn',
        message_es: `Paciente de ${input.patient.age} años (≥ 75). Evalúa fragilidad IMWG. Considera esquema Rd-light o reducción de dosis profiláctica para mejorar tolerancia.`,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-AGE-03: ≥ 60 años + citarabina dosis alta (HiDAC ≥ 2 g/m²) → cap 1.5 g/m²
  {
    id: 'R-AGE-03',
    evaluate(input) {
      if (input.patient.age < 60) return null
      const araC = input.protocol.drugs.find(d => {
        const inn = d.inn.toLowerCase()
        return (inn === 'citarabina' || inn === 'arabinósido de citosina' || inn === 'cytarabine') &&
          d.dose_per_m2 >= 2000
      })
      if (!araC) return null
      if (araC.dose_per_m2 <= 1500) return null
      return {
        ruleId: 'R-AGE-03',
        severity: 'warn',
        message_es: `Citarabina ${araC.dose_per_m2} mg/m² dosis alta en paciente ≥ 60 años. Reducir cap a 1,500 mg/m² c/12 h para disminuir riesgo de neurotoxicidad cerebelosa.`,
        drug_inn: 'citarabina',
        suggested_dose_mg: 1500,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },
]
