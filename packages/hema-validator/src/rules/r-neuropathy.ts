import type { Rule } from '../types'

export const neuropathyRules: Rule[] = [
  // R-NEU-01: Bortezomib + neuropatía periférica (CTCAE v5)
  {
    id: 'R-NEU-01',
    evaluate(input) {
      const hasBtz = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'bortezomib')
      if (!hasBtz) return null

      const grade = input.neuropathy_grade ?? 0
      const hasPain = input.neuropathy_pain ?? false

      if (grade === 0) return null
      // G1 sin dolor: sin cambio clínico
      if (grade === 1 && !hasPain) return null

      if (grade === 4) {
        return {
          ruleId: 'R-NEU-01',
          severity: 'block',
          message_es: 'Bortezomib + neuropatía grado 4. Discontinuación permanente. No reiniciar bajo ninguna circunstancia.',
          drug_inn: 'bortezomib',
          override_allowed: false,
          requires_second_signer: false,
        }
      }

      // G1 con dolor, G2 (con o sin dolor), G2 con dolor — reducir a 1.0 mg/m²
      return {
        ruleId: 'R-NEU-01',
        severity: 'warn',
        message_es: `Bortezomib + neuropatía grado ${grade}${hasPain ? ' con dolor' : ''}. Reducir dosis de 1.3 mg/m² a 1.0 mg/m² o cambiar a administración semanal SC.`,
        drug_inn: 'bortezomib',
        suggested_dose_mg: 1.0,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-NEU-02: Vincristina + neuropatía G2+
  {
    id: 'R-NEU-02',
    evaluate(input) {
      const hasVCR = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'vincristina')
      if (!hasVCR) return null

      const grade = input.neuropathy_grade ?? 0
      if (grade < 2) return null

      if (grade === 4) {
        return {
          ruleId: 'R-NEU-02',
          severity: 'block',
          message_es: 'Vincristina + neuropatía grado 4. Descontinuar vincristina de forma permanente.',
          drug_inn: 'vincristina',
          override_allowed: false,
          requires_second_signer: false,
        }
      }
      if (grade === 3) {
        return {
          ruleId: 'R-NEU-02',
          severity: 'block',
          message_es: 'Vincristina + neuropatía grado 3. Suspender vincristina hasta resolución a G ≤ 1, luego reiniciar a 50% de la dosis.',
          drug_inn: 'vincristina',
          override_allowed: true,
          requires_second_signer: false,
        }
      }
      // G2
      return {
        ruleId: 'R-NEU-02',
        severity: 'warn',
        message_es: 'Vincristina + neuropatía grado 2. Reducir dosis 50%.',
        drug_inn: 'vincristina',
        reduction_pct: 50,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },

  // R-NEU-03: Talidomida + neuropatía G2+
  {
    id: 'R-NEU-03',
    evaluate(input) {
      const hasThal = input.protocol.drugs.some(d => d.inn.toLowerCase() === 'talidomida')
      if (!hasThal) return null

      const grade = input.neuropathy_grade ?? 0
      if (grade < 2) return null

      return {
        ruleId: 'R-NEU-03',
        severity: 'warn',
        message_es: `Talidomida + neuropatía grado ${grade}. Reducir dosis 50 mg/día o suspender si es G3+.`,
        drug_inn: 'talidomida',
        reduction_pct: grade >= 3 ? 100 : 50,
        override_allowed: true,
        requires_second_signer: false,
      }
    },
  },
]
