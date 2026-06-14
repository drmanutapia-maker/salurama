import { describe, it, expect } from 'vitest'
import {
  PatientSchema,
  DrugSchema,
  ProtocolDrugSchema,
  OrderInputSchema,
  ValidationResultSchema,
  OverrideSchema,
  OrderSchema,
} from '../types'

// UUIDs válidos para Zod v4: versión [1-8] en 3er grupo, variante [89abAB] en 4to grupo
const U1 = '00000000-0000-4000-8000-000000000001'
const U2 = '00000000-0000-4000-8000-000000000002'
const U3 = '00000000-0000-4000-8000-000000000003'
const U4 = '00000000-0000-4000-8000-000000000004'
const U5 = '00000000-0000-4000-8000-000000000005'
const U6 = '00000000-0000-4000-8000-000000000006'
const U7 = '00000000-0000-4000-8000-000000000007'
const U8 = '00000000-0000-4000-8000-000000000008'
const U9 = '00000000-0000-4000-8000-000000000009'

// ─────────────────────────────────────────────────────────────────────────────
// PatientSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('PatientSchema', () => {
  const valid = {
    id: U1,
    tenant_id: U2,
    curp: 'TAPM600101HDFLRN09',
    birth_date: '1960-01-01',
    sex: 'M',
  }

  it('acepta un paciente válido', () => {
    expect(() => PatientSchema.parse(valid)).not.toThrow()
  })

  it('rechaza CURP con formato incorrecto', () => {
    const result = PatientSchema.safeParse({ ...valid, curp: 'INVALIDO123' })
    expect(result.success).toBe(false)
  })

  it('rechaza CURP vacío', () => {
    const result = PatientSchema.safeParse({ ...valid, curp: '' })
    expect(result.success).toBe(false)
  })

  it('acepta campos opcionales null / undefined', () => {
    const parsed = PatientSchema.parse({ ...valid, nss: null, allergies: undefined })
    expect(parsed.nss).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DrugSchema — incluye requires_test_dose
// ─────────────────────────────────────────────────────────────────────────────

describe('DrugSchema', () => {
  const validDrug = {
    id: U1,
    inn: 'doxorubicina',
    is_anthracycline: true,
    cumulative_max_mg_m2: 450,
  }

  it('acepta fármaco de quimioterapia estándar', () => {
    const d = DrugSchema.parse(validDrug)
    expect(d.inn).toBe('doxorubicina')
    expect(d.requires_test_dose).toBe(false) // default
  })

  it('acepta dextrano de hierro con requires_test_dose=true', () => {
    const ironDrug = {
      ...validDrug,
      inn: 'dextrano de hierro',
      is_anthracycline: false,
      cumulative_max_mg_m2: null,
      requires_test_dose: true,
    }
    const d = DrugSchema.parse(ironDrug)
    expect(d.requires_test_dose).toBe(true)
  })

  it('rechaza inn vacío', () => {
    const result = DrugSchema.safeParse({ ...validDrug, inn: '' })
    expect(result.success).toBe(false)
  })

  it('cumulative_max_mg_m2 puede ser null (hierro IV no tiene límite acumulado)', () => {
    const d = DrugSchema.parse({ ...validDrug, cumulative_max_mg_m2: null })
    expect(d.cumulative_max_mg_m2).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ProtocolDrugSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('ProtocolDrugSchema', () => {
  const valid = {
    id: U1,
    protocol_id: U2,
    drug_id: U3,
    dose_value: 1.3,
    dose_unit: 'mg/m2',
    route: 'SC',
    days_of_cycle: [1, 4, 8, 11],
  }

  it('acepta bortezomib SC en protocolo VRD', () => {
    const pd = ProtocolDrugSchema.parse(valid)
    expect(pd.days_of_cycle).toHaveLength(4)
    expect(pd.dose_unit).toBe('mg/m2')
  })

  it('rechaza dose_unit inválida', () => {
    const result = ProtocolDrugSchema.safeParse({ ...valid, dose_unit: 'mcg' })
    expect(result.success).toBe(false)
  })

  it('rechaza days_of_cycle vacío', () => {
    const result = ProtocolDrugSchema.safeParse({ ...valid, days_of_cycle: [] })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OrderInputSchema — incluye soporte R-HIERRO-01
// ─────────────────────────────────────────────────────────────────────────────

describe('OrderInputSchema', () => {
  const validInput = {
    patient: {
      weight_kg: 66,
      height_cm: 160,
      bsa_mosteller: 1.71,
      bsa_dubois: 1.68,
      age: 55,
      sex: 'M',
    },
    labs: { collected_at: '2026-06-01T08:00:00Z', anc: 2500, platelets: 180000 },
    protocol: {
      code: 'VRD',
      drugs: [
        {
          inn: 'bortezomib',
          dose_mg: 2.22,
          dose_per_m2: 1.3,
          is_anthracycline: false,
          cyp3a4_substrate: false,
        },
      ],
    },
  }

  it('acepta OrderInput válido para VRD', () => {
    expect(() => OrderInputSchema.parse(validInput)).not.toThrow()
  })

  it('rechaza peso fuera de rango (< 20 kg)', () => {
    const result = OrderInputSchema.safeParse({
      ...validInput,
      patient: { ...validInput.patient, weight_kg: 15 },
    })
    expect(result.success).toBe(false)
  })

  it('acepta fármaco de hierro IV con requires_test_dose y sequence_order (R-HIERRO-01)', () => {
    const ironInput = {
      ...validInput,
      protocol: {
        code: 'HIERRO-DEXT',
        drugs: [
          {
            inn: 'dextrano de hierro',
            dose_mg: 25,
            dose_per_m2: 25,
            is_anthracycline: false,
            cyp3a4_substrate: false,
            requires_test_dose: true,
            sequence_order: 1,
            test_dose_completed: false,
          },
        ],
      },
    }
    expect(() => OrderInputSchema.parse(ironInput)).not.toThrow()
  })

  it('rechaza override sin justificación suficiente (< 30 chars)', () => {
    const result = OrderInputSchema.safeParse({
      ...validInput,
      overrides: [{ rule_id: 'R-LAB-01', reason: 'corto', override_by: U9 }],
    })
    expect(result.success).toBe(false)
  })

  it('acepta override con justificación válida y co-firma', () => {
    const input = OrderInputSchema.parse({
      ...validInput,
      overrides: [
        {
          rule_id: 'R-LAB-11',
          reason: 'FEVI 48% con indicación clínica urgente documentada en expediente',
          override_by: U8,
          co_signed_by: U9,
        },
      ],
    })
    expect(input.overrides).toHaveLength(1)
    expect(input.overrides?.[0]?.co_signed_by).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ValidationResultSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('ValidationResultSchema', () => {
  const validResult = {
    ruleId: 'R-LAB-01',
    severity: 'block',
    message_es: 'ANC < 1000/µL — contraindicación para quimioterapia mielosupresora',
    override_allowed: false,
    requires_second_signer: false,
  }

  it('acepta un resultado de bloqueo clínico', () => {
    const r = ValidationResultSchema.parse(validResult)
    expect(r.severity).toBe('block')
    expect(r.override_allowed).toBe(false)
  })

  it('acepta un warn con dosis sugerida', () => {
    const warn = {
      ruleId: 'R-NEU-01',
      severity: 'warn',
      message_es: 'Neuropatía G2 con dolor — reducir bortezomib a 1.0 mg/m²',
      drug_inn: 'bortezomib',
      suggested_dose_mg: 1.71,
      reduction_pct: 23,
      override_allowed: true,
      requires_second_signer: false,
    }
    const r = ValidationResultSchema.parse(warn)
    expect(r.suggested_dose_mg).toBe(1.71)
  })

  it('rechaza severity inválida', () => {
    const result = ValidationResultSchema.safeParse({ ...validResult, severity: 'critical' })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OverrideSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('OverrideSchema', () => {
  it('acepta override con justificación suficiente', () => {
    const o = OverrideSchema.parse({
      rule_id: 'R-CUM-01',
      reason: 'Decisión clínica documentada: beneficio supera riesgo cardíaco',
      override_by: U8,
    })
    expect(o.rule_id).toBe('R-CUM-01')
  })

  it('rechaza justificación < 30 caracteres', () => {
    const result = OverrideSchema.safeParse({
      rule_id: 'R-CUM-01',
      reason: 'muy corto',
      override_by: U8,
    })
    expect(result.success).toBe(false)
  })

  it('acepta override con co_signed_by (clases críticas)', () => {
    const o = OverrideSchema.parse({
      rule_id: 'R-LAB-11',
      reason: 'FEVI 48% con cardiopatía de base documentada; beneficio oncológico supera riesgo',
      override_by: U8,
      co_signed_by: U9,
    })
    expect(o.co_signed_by).toBe(U9)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OrderSchema
// ─────────────────────────────────────────────────────────────────────────────

describe('OrderSchema', () => {
  const validOrder = {
    id: U1,
    tenant_id: U2,
    patient_id: U3,
    protocol_id: U4,
    diagnosis_code: 'C90.0',
    cycle_number: 1,
    day_of_cycle: 1,
    measurement_id: U5,
    bsa_used: 1.71,
    bsa_formula: 'mosteller',
    scheduled_for: '2026-07-01',
    created_by: U9,
  }

  it('acepta orden en estado draft con valores mínimos', () => {
    const o = OrderSchema.parse(validOrder)
    expect(o.status).toBe('draft')
    expect(o.disclaimer).toContain('médico tratante')
  })

  it('rechaza pdf_sha256 con formato incorrecto (no hex-64)', () => {
    const result = OrderSchema.safeParse({ ...validOrder, pdf_sha256: 'abc123' })
    expect(result.success).toBe(false)
  })

  it('acepta todos los estados de ciclo de vida de la orden', () => {
    for (const status of ['draft', 'validated', 'signed', 'dispensed', 'administered', 'cancelled']) {
      expect(() => OrderSchema.parse({ ...validOrder, status })).not.toThrow()
    }
  })

  it('acepta pdf_sha256 válido (64 chars hex)', () => {
    const sha = 'a'.repeat(64)
    expect(() => OrderSchema.parse({ ...validOrder, pdf_sha256: sha })).not.toThrow()
  })
})
