import type { OrderInput, OrderInputDrug, ValidationResult, Override } from '@salurama/hema-shared'

// ─── Paso 1: Paciente ──────────────────────────────────────────────────────

export interface WizardPatient {
  id: string
  curp: string
  display_name: string
  birth_date: string
  sex: 'M' | 'F'
  allergies: string | null
  primary_dx_code: string | null
  primary_dx_desc: string | null
  measurement_id: string
  measured_at: string
  weight_kg: number
  height_cm: number
  bsa_mosteller: number
  bsa_dubois: number
}

// ─── Paso 2: Protocolo ─────────────────────────────────────────────────────

export type ProtocolStatus = 'activo' | 'pendiente' | 'inactivo'

export interface WizardProtocolDrug {
  id: string // protocol_drug_id
  drug_id: string
  inn: string
  dose_value: number
  dose_unit: 'mg/m2' | 'mg/kg' | 'mg' | 'U/m2' | 'UI' | 'MUI'
  route: string
  days_of_cycle: number[]
  max_dose_mg: number | null
  infusion_minutes: number | null
  vehicle: string | null
  premed_required: Record<string, string> | null
  sequence_order: number | null
  is_anthracycline: boolean
  cyp3a4_substrate: boolean
  cumulative_max_mg_m2: number | null
  requires_test_dose: boolean
}

export interface WizardProtocol {
  id: string
  code: string
  name: string
  cycle_length_days: number
  total_cycles: number | null
  line_of_therapy: string | null
  active: boolean
  status: ProtocolStatus
  is_preferred: boolean
  drugs: WizardProtocolDrug[]
}

// ─── Paso 3: Inputs clínicos y ajuste de dosis ──────────────────────────────

export interface ClinicalInputs {
  anc: string
  platelets: string
  hemoglobin: string
  creatinine: string
  crcl: string
  bilirubin_total: string
  ast: string
  alt: string
  lvef: string
  wbc: string
  labs_collected_at: string // datetime-local
  neuropathy_grade: 0 | 1 | 2 | 3 | 4
  neuropathy_pain: boolean
  ecog: 0 | 1 | 2 | 3 | 4 | null
  concurrent_medications_text: string // textarea libre, separado por comas/líneas
  hbv_screened: boolean
}

export interface DrugDoseAdjustment {
  protocol_drug_id: string
  drug_id: string
  inn: string
  route: string
  infusion_minutes: number | null
  vehicle: string | null
  given_on_day: number
  base_dose_mg: number
  computed_dose_mg: number
  reduction_pct: number
  reduction_reason: string | null
  override_reason: string | null
  test_dose_completed: boolean
}

export interface CumulativeDoseEntry {
  inn: string
  cumulative_mg_m2: number
}

export interface ValidationResponse {
  results: ValidationResult[]
  hasUnresolvedBlocks: boolean
}

// ─── Estado completo del wizard ─────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4

export interface WizardState {
  step: WizardStep
  patient: WizardPatient | null
  protocol: WizardProtocol | null
  cycleNumber: number
  scheduledFor: string // YYYY-MM-DD
  clinicalInputs: ClinicalInputs
  doseAdjustments: DrugDoseAdjustment[]
  overrides: Override[]
  validation: ValidationResponse | null
  validating: boolean
}

export const DEFAULT_CLINICAL_INPUTS: ClinicalInputs = {
  anc: '',
  platelets: '',
  hemoglobin: '',
  creatinine: '',
  crcl: '',
  bilirubin_total: '',
  ast: '',
  alt: '',
  lvef: '',
  wbc: '',
  labs_collected_at: '',
  neuropathy_grade: 0,
  neuropathy_pain: false,
  ecog: null,
  concurrent_medications_text: '',
  hbv_screened: false,
}

export type { OrderInput, OrderInputDrug, ValidationResult, Override }
