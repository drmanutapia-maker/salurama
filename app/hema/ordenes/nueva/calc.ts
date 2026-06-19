import type {
  ClinicalInputs,
  CumulativeDoseEntry,
  DrugDoseAdjustment,
  OrderInput,
  OrderInputDrug,
  Override,
  WizardPatient,
  WizardProtocol,
  WizardProtocolDrug,
} from './types'

// ─── Helpers numéricos ───────────────────────────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcAge(birthDate: string): number {
  const today = new Date()
  const born = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

export function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function parseConcurrentMedications(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((m) => m.trim())
    .filter(Boolean)
}

// ─── Cálculo de dosis por fármaco de protocolo ───────────────────────────────

export function computeBaseDoseMg(drug: WizardProtocolDrug, bsaM2: number, weightKg: number): number {
  let raw: number
  switch (drug.dose_unit) {
    case 'mg/m2':
    case 'U/m2':
      raw = drug.dose_value * bsaM2
      break
    case 'mg/kg':
      raw = drug.dose_value * weightKg
      break
    case 'mg':
    case 'UI':
    case 'MUI':
    default:
      raw = drug.dose_value
      break
  }

  const capApplies = drug.max_dose_mg != null && drug.dose_unit !== 'UI' && drug.dose_unit !== 'MUI'
  const capped = capApplies ? Math.min(raw, drug.max_dose_mg!) : raw
  return round2(capped)
}

export function computeDosePerM2(drug: WizardProtocolDrug, doseMg: number, bsaM2: number): number {
  if (drug.dose_unit === 'mg/m2' || drug.dose_unit === 'U/m2') return drug.dose_value
  if (bsaM2 <= 0) return doseMg
  return round2(doseMg / bsaM2)
}

export function initDoseAdjustments(
  drugs: WizardProtocolDrug[],
  bsaM2: number,
  weightKg: number,
): DrugDoseAdjustment[] {
  return drugs.map((drug) => {
    const baseDoseMg = computeBaseDoseMg(drug, bsaM2, weightKg)
    return {
      protocol_drug_id: drug.id,
      drug_id: drug.drug_id,
      inn: drug.inn,
      route: drug.route,
      infusion_minutes: drug.infusion_minutes,
      vehicle: drug.vehicle,
      given_on_day: drug.days_of_cycle[0] ?? 1,
      base_dose_mg: baseDoseMg,
      computed_dose_mg: baseDoseMg,
      reduction_pct: 0,
      reduction_reason: null,
      override_reason: null,
      test_dose_completed: false,
    }
  })
}

// ─── Construcción del OrderInput para hema-orders-calculate ─────────────────

function buildOrderInputDrug(drug: WizardProtocolDrug, adj: DrugDoseAdjustment, bsaM2: number): OrderInputDrug {
  return {
    inn: drug.inn,
    dose_mg: adj.computed_dose_mg,
    dose_per_m2: computeDosePerM2(drug, adj.computed_dose_mg, bsaM2),
    is_anthracycline: drug.is_anthracycline,
    cyp3a4_substrate: drug.cyp3a4_substrate,
    cumulative_max_mg_m2: drug.cumulative_max_mg_m2 ?? undefined,
    requires_test_dose: drug.requires_test_dose,
    sequence_order: drug.sequence_order ?? undefined,
    test_dose_completed: adj.test_dose_completed,
  }
}

export function buildOrderInput(params: {
  patient: WizardPatient
  protocol: WizardProtocol
  clinicalInputs: ClinicalInputs
  doseAdjustments: DrugDoseAdjustment[]
  cumulativeDoses: CumulativeDoseEntry[]
  overrides: Override[]
}): OrderInput {
  const { patient, protocol, clinicalInputs, doseAdjustments, cumulativeDoses, overrides } = params
  const bsaM2 = patient.bsa_mosteller

  const drugsById = new Map(protocol.drugs.map((d) => [d.id, d]))

  const cumulative_doses: Record<string, number> = {}
  for (const c of cumulativeDoses) cumulative_doses[c.inn] = c.cumulative_mg_m2

  return {
    patient: {
      weight_kg: patient.weight_kg,
      height_cm: patient.height_cm,
      bsa_mosteller: patient.bsa_mosteller,
      bsa_dubois: patient.bsa_dubois,
      age: calcAge(patient.birth_date),
      sex: patient.sex,
      allergies: patient.allergies ?? undefined,
    },
    labs: {
      anc: parseOptionalNumber(clinicalInputs.anc),
      platelets: parseOptionalNumber(clinicalInputs.platelets),
      hemoglobin: parseOptionalNumber(clinicalInputs.hemoglobin),
      creatinine: parseOptionalNumber(clinicalInputs.creatinine),
      crcl: parseOptionalNumber(clinicalInputs.crcl),
      bilirubin_total: parseOptionalNumber(clinicalInputs.bilirubin_total),
      ast: parseOptionalNumber(clinicalInputs.ast),
      alt: parseOptionalNumber(clinicalInputs.alt),
      lvef: parseOptionalNumber(clinicalInputs.lvef),
      wbc: parseOptionalNumber(clinicalInputs.wbc),
      collected_at: clinicalInputs.labs_collected_at
        ? new Date(clinicalInputs.labs_collected_at).toISOString()
        : new Date().toISOString(),
    },
    protocol: {
      code: protocol.code,
      drugs: doseAdjustments.map((adj) => {
        const drug = drugsById.get(adj.protocol_drug_id)
        if (!drug) throw new Error(`Fármaco de protocolo no encontrado: ${adj.protocol_drug_id}`)
        return buildOrderInputDrug(drug, adj, bsaM2)
      }),
    },
    neuropathy_grade: clinicalInputs.neuropathy_grade,
    neuropathy_pain: clinicalInputs.neuropathy_pain,
    ecog: clinicalInputs.ecog ?? undefined,
    concurrent_medications: parseConcurrentMedications(clinicalInputs.concurrent_medications_text),
    cumulative_doses,
    overrides: overrides.length > 0 ? overrides : undefined,
    diagnosis_code: patient.primary_dx_code ?? undefined,
    hbv_screened: clinicalInputs.hbv_screened,
  }
}
