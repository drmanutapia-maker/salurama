import type { OrderInput, ValidationResult } from '@salurama/hema-shared'
import { bsaRules }        from './rules/r-bsa'
import { labRules }        from './rules/r-lab'
import { cumulativeRules } from './rules/r-cumulative'
import { ddiRules }        from './rules/r-ddi'
import { neuropathyRules } from './rules/r-neuropathy'
import { ageRules }        from './rules/r-age'
import { protocolRules }   from './rules/r-protocol'

const ALL_RULES = [
  ...bsaRules,
  ...labRules,
  ...cumulativeRules,
  ...ddiRules,
  ...neuropathyRules,
  ...ageRules,
  ...protocolRules,
]

export function validateOrder(input: OrderInput): ValidationResult[] {
  const raw: ValidationResult[] = []

  for (const rule of ALL_RULES) {
    const result = rule.evaluate(input)
    if (result) raw.push(result)
  }

  return raw.filter(r => {
    // Reglas no overrideables siempre aparecen (e.g. VCR cap, dosis prueba hierro, G4 bortezomib)
    if (!r.override_allowed) return true

    const override = input.overrides?.find(o => o.rule_id === r.ruleId)
    if (!override) return true

    // Clases críticas requieren co-firma — sin ella el override no es válido
    if (r.requires_second_signer && !override.co_signed_by) return true

    return false
  })
}

export function hasUnresolvedBlocks(results: ValidationResult[]): boolean {
  return results.some(r => r.severity === 'block')
}
