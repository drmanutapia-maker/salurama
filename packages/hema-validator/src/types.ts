// Re-exports del paquete compartido para que las reglas solo importen desde aquí.
export type { OrderInput, ValidationResult, Override } from '@salurama/hema-shared'

export interface Rule {
  id: string
  evaluate(input: import('@salurama/hema-shared').OrderInput): import('@salurama/hema-shared').ValidationResult | null
}
