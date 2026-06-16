import { describe, it, expect } from 'vitest'
import { validateOrder, hasUnresolvedBlocks } from '../engine'
import type { OrderInput } from '@salurama/hema-shared'

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString()
const RECENT = new Date(Date.now() - 5 * 86_400_000).toISOString()   // 5 días atrás
const OLD    = new Date(Date.now() - 40 * 86_400_000).toISOString()  // 40 días atrás
const U1 = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-000000000002'

function base(): OrderInput {
  return {
    patient: { weight_kg: 70, height_cm: 170, bsa_mosteller: 1.83, bsa_dubois: 1.79, age: 50, sex: 'M' },
    labs: { collected_at: RECENT },
    protocol: { code: 'TEST', drugs: [] },
  }
}

function doxoDrug(dose_mg = 91.5, dose_per_m2 = 50): OrderInput['protocol']['drugs'][0] {
  return { inn: 'doxorubicina', dose_mg, dose_per_m2, is_anthracycline: true, cyp3a4_substrate: false, cumulative_max_mg_m2: 450 }
}
function vcrDrug(dose_mg = 1.83, dose_per_m2 = 1.0): OrderInput['protocol']['drugs'][0] {
  return { inn: 'vincristina', dose_mg, dose_per_m2, is_anthracycline: false, cyp3a4_substrate: false }
}
function btzDrug(dose_mg = 2.38, dose_per_m2 = 1.3): OrderInput['protocol']['drugs'][0] {
  return { inn: 'bortezomib', dose_mg, dose_per_m2, is_anthracycline: false, cyp3a4_substrate: true }
}
function bleoDrug(): OrderInput['protocol']['drugs'][0] {
  return { inn: 'bleomicina', dose_mg: 18.3, dose_per_m2: 10, is_anthracycline: false, cyp3a4_substrate: false }
}
function mtxDrug(dose_per_m2 = 1000): OrderInput['protocol']['drugs'][0] {
  return { inn: 'metotrexato', dose_mg: dose_per_m2 * 1.83, dose_per_m2, is_anthracycline: false, cyp3a4_substrate: false }
}

// ─── Casos obligatorios de la Sesión 6 ─────────────────────────────────────────

describe('CASOS OBLIGATORIOS SESIÓN 6', () => {
  it('Caso 1 — ANC 800/µL → R-LAB-01 block', () => {
    const input: OrderInput = {
      ...base(),
      labs: { anc: 800, collected_at: RECENT },
      protocol: { code: 'VRD', drugs: [btzDrug()] },
    }
    const results = validateOrder(input)
    const r = results.find(x => x.ruleId === 'R-LAB-01')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('block')
    expect(hasUnresolvedBlocks(results)).toBe(true)
  })

  it('Caso 2 — Doxorubicina acumulada 460 mg/m² → R-CUM-01 block', () => {
    const input: OrderInput = {
      ...base(),
      labs: { lvef: 62, collected_at: RECENT },
      cumulative_doses: { doxorubicina: 460 },
      protocol: { code: 'R-CHOP', drugs: [doxoDrug()] },
    }
    const results = validateOrder(input)
    const r = results.find(x => x.ruleId === 'R-CUM-01')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('block')
    expect(r!.requires_second_signer).toBe(true)
  })

  it('Caso 3 — Bortezomib + neuropatía G2 con dolor → R-NEU-01 warn + suggested_dose 1.0', () => {
    const input: OrderInput = {
      ...base(),
      neuropathy_grade: 2,
      neuropathy_pain: true,
      protocol: { code: 'VRD', drugs: [btzDrug()] },
    }
    const results = validateOrder(input)
    const r = results.find(x => x.ruleId === 'R-NEU-01')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('warn')
    expect(r!.suggested_dose_mg).toBe(1.0)
  })

  it('Caso 4 — VCR 2.5 mg en paciente 72 años → R-AGE-01 block → cap 1.5 mg', () => {
    const input: OrderInput = {
      ...base(),
      patient: { ...base().patient, age: 72 },
      protocol: { code: 'R-CHOP', drugs: [vcrDrug(2.5, 1.4)] },
    }
    const results = validateOrder(input)
    const r = results.find(x => x.ruleId === 'R-AGE-01')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('block')
    expect(r!.suggested_dose_mg).toBe(1.5)
  })

  it('Caso 5 — Override R-LAB-11 (FEVI 48%) CON co-firma → regla filtrada', () => {
    const input: OrderInput = {
      ...base(),
      labs: { lvef: 48, collected_at: RECENT },
      protocol: { code: 'R-CHOP', drugs: [doxoDrug()] },
      overrides: [{
        rule_id: 'R-LAB-11',
        reason: 'Beneficio clínico documentado supera el riesgo cardíaco según cardiología oncológica',
        override_by: U1,
        co_signed_by: U2,
      }],
    }
    const results = validateOrder(input)
    expect(results.some(x => x.ruleId === 'R-LAB-11')).toBe(false)
  })

  it('Caso 6 — Override R-CUM-01 SIN co-firma → regla NO filtrada', () => {
    const input: OrderInput = {
      ...base(),
      labs: { lvef: 62, collected_at: RECENT },
      cumulative_doses: { doxorubicina: 460 },
      protocol: { code: 'R-CHOP', drugs: [doxoDrug()] },
      overrides: [{
        rule_id: 'R-CUM-01',
        reason: 'Beneficio clínico documentado ampliamente en expediente y aprobado por tumor board',
        override_by: U1,
        // sin co_signed_by
      }],
    }
    const results = validateOrder(input)
    expect(results.some(x => x.ruleId === 'R-CUM-01')).toBe(true)
  })

  it('Caso 7 — Dextrano de hierro sin dosis de prueba → R-HIERRO-01 block', () => {
    const input: OrderInput = {
      ...base(),
      protocol: {
        code: 'HIERRO-IV',
        drugs: [{
          inn: 'dextrano de hierro',
          dose_mg: 200,
          dose_per_m2: 109.3,
          is_anthracycline: false,
          cyp3a4_substrate: false,
          requires_test_dose: true,
          test_dose_completed: false,
        }],
      },
    }
    const results = validateOrder(input)
    const r = results.find(x => x.ruleId === 'R-HIERRO-01')
    expect(r).toBeDefined()
    expect(r!.severity).toBe('block')
    expect(r!.override_allowed).toBe(false)
  })
})

// ─── R-BSA ────────────────────────────────────────────────────────────────────

describe('R-BSA', () => {
  it('R-BSA-01 siempre produce mensaje info con las dos fórmulas', () => {
    const results = validateOrder(base())
    expect(results.some(r => r.ruleId === 'R-BSA-01' && r.severity === 'info')).toBe(true)
  })

  it('R-BSA-02 warn cuando BSA > 2.0', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, bsa_mosteller: 2.1, bsa_dubois: 2.05 } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-BSA-02')).toBe(true)
  })

  it('R-BSA-02 no dispara cuando BSA = 2.0', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, bsa_mosteller: 2.0, bsa_dubois: 1.95 } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-BSA-02')).toBe(false)
  })

  it('R-BSA-03 block cuando peso < 20 kg', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, weight_kg: 18 } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-BSA-03')
    expect(r?.severity).toBe('block')
    expect(r?.override_allowed).toBe(false)
  })

  it('R-BSA-03 block cuando talla > 220 cm', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, height_cm: 225 } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-BSA-03')).toBe(true)
  })

  it('R-BSA-03 no dispara para antropometría normal', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, weight_kg: 65, height_cm: 165 } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-BSA-03')).toBe(false)
  })
})

// ─── R-LAB ────────────────────────────────────────────────────────────────────

describe('R-LAB', () => {
  it('R-LAB-01 block con ANC 500', () => {
    const input: OrderInput = { ...base(), labs: { anc: 500, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-01' && r.severity === 'block')).toBe(true)
  })

  it('R-LAB-01 no dispara con ANC exactamente 1000', () => {
    const input: OrderInput = { ...base(), labs: { anc: 1000, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-01')).toBe(false)
  })

  it('R-LAB-01 NO dispara para HMAs solos (azacitidina en MDS)', () => {
    const input: OrderInput = {
      ...base(),
      labs: { anc: 600, collected_at: RECENT },
      protocol: { code: 'AZA', drugs: [{ inn: 'azacitidina', dose_mg: 137.25, dose_per_m2: 75, is_anthracycline: false, cyp3a4_substrate: false }] },
    }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-01')).toBe(false)
  })

  it('R-LAB-02 block plaquetas 30k + bortezomib', () => {
    const input: OrderInput = { ...base(), labs: { platelets: 30_000, collected_at: RECENT }, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-02' && r.severity === 'block')).toBe(true)
  })

  it('R-LAB-02 NO dispara con plaquetas 30k sin bortezomib ni antraciclina', () => {
    const input: OrderInput = { ...base(), labs: { platelets: 30_000, collected_at: RECENT }, protocol: { code: 'AZA', drugs: [{ inn: 'azacitidina', dose_mg: 137.25, dose_per_m2: 75, is_anthracycline: false, cyp3a4_substrate: false }] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-02')).toBe(false)
  })

  it('R-LAB-02 NO dispara con plaquetas 60k + bortezomib', () => {
    const input: OrderInput = { ...base(), labs: { platelets: 60_000, collected_at: RECENT }, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-02')).toBe(false)
  })

  it('R-LAB-03 warn plaquetas 75k', () => {
    const input: OrderInput = { ...base(), labs: { platelets: 75_000, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-03' && r.severity === 'warn')).toBe(true)
  })

  it('R-LAB-03 no dispara con plaquetas ≥ 100k', () => {
    const input: OrderInput = { ...base(), labs: { platelets: 100_000, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-03')).toBe(false)
  })

  it('R-LAB-03 NO duplica con R-LAB-02 (plaquetas < 50k + bortezomib)', () => {
    const input: OrderInput = { ...base(), labs: { platelets: 30_000, collected_at: RECENT }, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    const results = validateOrder(input)
    expect(results.some(r => r.ruleId === 'R-LAB-02')).toBe(true)
    expect(results.some(r => r.ruleId === 'R-LAB-03')).toBe(false)
  })

  it('R-LAB-04 warn con Hgb 7', () => {
    const input: OrderInput = { ...base(), labs: { hemoglobin: 7, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-04' && r.severity === 'warn')).toBe(true)
  })

  it('R-LAB-04 no dispara con Hgb 8', () => {
    const input: OrderInput = { ...base(), labs: { hemoglobin: 8, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-04')).toBe(false)
  })

  it('R-LAB-04 no dispara sin dato de hemoglobina', () => {
    expect(validateOrder(base()).some(r => r.ruleId === 'R-LAB-04')).toBe(false)
  })

  it('R-LAB-05 block CrCl 20 + bleomicina', () => {
    const input: OrderInput = { ...base(), labs: { crcl: 20, collected_at: RECENT }, protocol: { code: 'ABVD', drugs: [bleoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-05' && r.severity === 'block')).toBe(true)
  })

  it('R-LAB-05 no dispara con CrCl 35 + bleomicina (R-LAB-06 sí lo hace)', () => {
    const input: OrderInput = { ...base(), labs: { crcl: 35, collected_at: RECENT }, protocol: { code: 'ABVD', drugs: [bleoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-05')).toBe(false)
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-06')).toBe(true)
  })

  it('R-LAB-05 no dispara sin bleomicina ni lenalidomida', () => {
    const input: OrderInput = { ...base(), labs: { crcl: 20, collected_at: RECENT }, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-05')).toBe(false)
  })

  it('R-LAB-07 warn bilirrubina 2.0 + doxo → reducción 50%', () => {
    const input: OrderInput = { ...base(), labs: { bilirubin_total: 2.0, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-LAB-07')
    expect(r?.severity).toBe('warn')
    expect(r?.reduction_pct).toBe(50)
  })

  it('R-LAB-07 no dispara sin doxorubicina', () => {
    const input: OrderInput = { ...base(), labs: { bilirubin_total: 2.0, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-07')).toBe(false)
  })

  it('R-LAB-07 no dispara con bilirrubina normal (< 1.2)', () => {
    const input: OrderInput = { ...base(), labs: { bilirubin_total: 0.8, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-07')).toBe(false)
  })

  it('R-LAB-08 warn bilirrubina 4.0 + doxo → reducción 75%', () => {
    const input: OrderInput = { ...base(), labs: { bilirubin_total: 4.0, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-LAB-08')
    expect(r?.reduction_pct).toBe(75)
  })

  it('R-LAB-09 warn AST 150 + vincristina → reducción 50%', () => {
    const input: OrderInput = { ...base(), labs: { ast: 150, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-LAB-09')
    expect(r?.severity).toBe('warn')
    expect(r?.reduction_pct).toBe(50)
  })

  it('R-LAB-09 no dispara con AST normal', () => {
    const input: OrderInput = { ...base(), labs: { ast: 35, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-09')).toBe(false)
  })

  it('R-LAB-10 block AST 250 + vincristina', () => {
    const input: OrderInput = { ...base(), labs: { ast: 250, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-LAB-10')
    expect(r?.severity).toBe('block')
  })

  it('R-LAB-10 no dispara sin vincristina', () => {
    const input: OrderInput = { ...base(), labs: { ast: 250, collected_at: RECENT }, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-10')).toBe(false)
  })

  it('R-LAB-11 block FEVI 45% + antraciclina, requiere co-firma', () => {
    const input: OrderInput = { ...base(), labs: { lvef: 45, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-LAB-11')
    expect(r?.severity).toBe('block')
    expect(r?.requires_second_signer).toBe(true)
  })

  it('R-LAB-11 no dispara con FEVI 50%', () => {
    const input: OrderInput = { ...base(), labs: { lvef: 50, collected_at: RECENT }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-11')).toBe(false)
  })

  it('R-LAB-11 no dispara sin antraciclina (aunque FEVI < 50)', () => {
    const input: OrderInput = { ...base(), labs: { lvef: 40, collected_at: RECENT }, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-11')).toBe(false)
  })

  it('R-LAB-12 warn labs > 30 días', () => {
    const input: OrderInput = { ...base(), labs: { collected_at: OLD } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-12' && r.severity === 'warn')).toBe(true)
  })

  it('R-LAB-12 no dispara con labs recientes', () => {
    expect(validateOrder(base()).some(r => r.ruleId === 'R-LAB-12')).toBe(false)
  })

  it('R-LAB-12 no dispara con labs exactamente 30 días', () => {
    const exactly30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const input: OrderInput = { ...base(), labs: { collected_at: exactly30 } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-12')).toBe(false)
  })
})

// ─── R-CUM ────────────────────────────────────────────────────────────────────

describe('R-CUM', () => {
  it('R-CUM-01 block doxorubicina acumulada 451 mg/m²', () => {
    const input: OrderInput = { ...base(), cumulative_doses: { doxorubicina: 451 }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-CUM-01')
    expect(r?.severity).toBe('block')
    expect(r?.requires_second_signer).toBe(true)
  })

  it('R-CUM-01 no dispara con acumulado igual al límite (450)', () => {
    const input: OrderInput = { ...base(), cumulative_doses: { doxorubicina: 450 }, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-01')).toBe(false)
  })

  it('R-CUM-01 no dispara sin doxorubicina en el protocolo', () => {
    const input: OrderInput = { ...base(), cumulative_doses: { doxorubicina: 460 }, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-01')).toBe(false)
  })

  it('R-CUM-02 block epirrubicina acumulada 901 mg/m²', () => {
    const epirr: OrderInput['protocol']['drugs'][0] = { inn: 'epirrubicina', dose_mg: 100, dose_per_m2: 55, is_anthracycline: true, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), cumulative_doses: { epirrubicina: 901 }, protocol: { code: 'FEC', drugs: [epirr] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-02' && r.severity === 'block')).toBe(true)
  })

  it('R-CUM-03 block daunorrubicina acumulada 551 mg/m²', () => {
    const dauno: OrderInput['protocol']['drugs'][0] = { inn: 'daunorrubicina', dose_mg: 110, dose_per_m2: 60, is_anthracycline: true, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), cumulative_doses: { daunorrubicina: 551 }, protocol: { code: '7+3', drugs: [dauno] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-03' && r.severity === 'block')).toBe(true)
  })

  it('R-CUM-04 block idarrubicina acumulada 151 mg/m²', () => {
    const ida: OrderInput['protocol']['drugs'][0] = { inn: 'idarrubicina', dose_mg: 21.96, dose_per_m2: 12, is_anthracycline: true, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), cumulative_doses: { idarrubicina: 151 }, protocol: { code: '7+3-IDA', drugs: [ida] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-04' && r.severity === 'block')).toBe(true)
  })

  it('R-CUM-05 block mitoxantrona acumulada 141 mg/m²', () => {
    const mito: OrderInput['protocol']['drugs'][0] = { inn: 'mitoxantrona', dose_mg: 21.96, dose_per_m2: 12, is_anthracycline: true, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), cumulative_doses: { mitoxantrona: 141 }, protocol: { code: 'MIF', drugs: [mito] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-05' && r.severity === 'block')).toBe(true)
  })

  it('R-CUM-06 block bleomicina acumulada 401 U', () => {
    const input: OrderInput = { ...base(), cumulative_doses: { bleomicina: 401 }, protocol: { code: 'ABVD', drugs: [bleoDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-CUM-06')
    expect(r?.severity).toBe('block')
    expect(r?.requires_second_signer).toBe(false)
  })

  it('R-CUM-07 warn cisplatino acumulado 350 mg/m²', () => {
    const cis: OrderInput['protocol']['drugs'][0] = { inn: 'cisplatino', dose_mg: 137.25, dose_per_m2: 75, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), cumulative_doses: { cisplatino: 350 }, protocol: { code: 'CDDP', drugs: [cis] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-07' && r.severity === 'warn')).toBe(true)
  })

  it('R-CUM-07 no dispara con cisplatino < 300 mg/m²', () => {
    const cis: OrderInput['protocol']['drugs'][0] = { inn: 'cisplatino', dose_mg: 137.25, dose_per_m2: 75, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), cumulative_doses: { cisplatino: 250 }, protocol: { code: 'CDDP', drugs: [cis] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-07')).toBe(false)
  })

  it('R-CUM-01 respeta límite reducido declarado en el drug (350 mg/m² por RT mediastinal)', () => {
    const doxoRt: OrderInput['protocol']['drugs'][0] = { ...doxoDrug(), cumulative_max_mg_m2: 350 }
    const input: OrderInput = { ...base(), cumulative_doses: { doxorubicina: 360 }, protocol: { code: 'R-CHOP', drugs: [doxoRt] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-CUM-01' && r.severity === 'block')).toBe(true)
  })
})

// ─── R-DDI ────────────────────────────────────────────────────────────────────

describe('R-DDI', () => {
  it('R-DDI-01 warn bortezomib + voriconazol', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['voriconazol 200 mg'], protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-01' && r.severity === 'warn')).toBe(true)
  })

  it('R-DDI-01 no dispara sin bortezomib', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['voriconazol 200 mg'], protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-01')).toBe(false)
  })

  it('R-DDI-01 no dispara sin inhibidor CYP3A4', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['metformina'], protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-01')).toBe(false)
  })

  it('R-DDI-02 block lenalidomida sin profilaxis TEV', () => {
    const len: OrderInput['protocol']['drugs'][0] = { inn: 'lenalidomida', dose_mg: 25, dose_per_m2: 13.7, is_anthracycline: false, cyp3a4_substrate: true }
    const input: OrderInput = { ...base(), protocol: { code: 'VRD', drugs: [len] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-02' && r.severity === 'block')).toBe(true)
  })

  it('R-DDI-02 no dispara con aspirina como profilaxis', () => {
    const len: OrderInput['protocol']['drugs'][0] = { inn: 'lenalidomida', dose_mg: 25, dose_per_m2: 13.7, is_anthracycline: false, cyp3a4_substrate: true }
    const input: OrderInput = { ...base(), concurrent_medications: ['aspirina 100 mg'], protocol: { code: 'VRD', drugs: [len] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-02')).toBe(false)
  })

  it('R-DDI-02 no dispara sin imid', () => {
    const input: OrderInput = { ...base(), protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-02')).toBe(false)
  })

  it('R-DDI-03 block vincristina + claritromicina, requiere co-firma', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['claritromicina 500 mg'], protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-DDI-03')
    expect(r?.severity).toBe('block')
    expect(r?.requires_second_signer).toBe(true)
  })

  it('R-DDI-03 no dispara sin vincristina', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['claritromicina 500 mg'], protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-03')).toBe(false)
  })

  it('R-DDI-04 block ibrutinib + warfarina', () => {
    const ibru: OrderInput['protocol']['drugs'][0] = { inn: 'ibrutinib', dose_mg: 420, dose_per_m2: 229.5, is_anthracycline: false, cyp3a4_substrate: true }
    const input: OrderInput = { ...base(), concurrent_medications: ['warfarina 5 mg'], protocol: { code: 'IBR-R', drugs: [ibru] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-04' && r.severity === 'block')).toBe(true)
  })

  it('R-DDI-04 no dispara sin ibrutinib', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['warfarina 5 mg'], protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-04')).toBe(false)
  })

  it('R-DDI-05 warn MTX + ibuprofeno', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['ibuprofeno 400 mg'], protocol: { code: 'HCVAD-B', drugs: [mtxDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-05' && r.severity === 'warn')).toBe(true)
  })

  it('R-DDI-05 no dispara sin MTX', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['ibuprofeno 400 mg'], protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-05')).toBe(false)
  })

  it('R-DDI-06 block MTX 3500 mg/m² sin leucovorin', () => {
    const input: OrderInput = { ...base(), protocol: { code: 'HCVAD-B', drugs: [mtxDrug(3500)] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-06' && r.severity === 'block')).toBe(true)
  })

  it('R-DDI-06 no dispara con leucovorin en medicaciones', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['leucovorin cálcico 15 mg'], protocol: { code: 'HCVAD-B', drugs: [mtxDrug(3500)] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-06')).toBe(false)
  })

  it('R-DDI-06 no dispara con MTX dosis baja (< 1 g/m²)', () => {
    const input: OrderInput = { ...base(), protocol: { code: 'RCHOP', drugs: [mtxDrug(400)] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-06')).toBe(false)
  })

  it('R-DDI-07 warn 6-MP + alopurinol', () => {
    const mp6: OrderInput['protocol']['drugs'][0] = { inn: '6-mercaptopurina', dose_mg: 100, dose_per_m2: 54.6, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), concurrent_medications: ['alopurinol 300 mg'], protocol: { code: 'MAIN', drugs: [mp6] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-07' && r.severity === 'warn')).toBe(true)
  })

  it('R-DDI-07 no dispara sin alopurinol', () => {
    const mp6: OrderInput['protocol']['drugs'][0] = { inn: '6-mercaptopurina', dose_mg: 100, dose_per_m2: 54.6, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), protocol: { code: 'MAIN', drugs: [mp6] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-DDI-07')).toBe(false)
  })
})

// ─── R-NEU ────────────────────────────────────────────────────────────────────

describe('R-NEU', () => {
  it('R-NEU-01 no dispara con bortezomib y G0', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 0, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-NEU-01')).toBe(false)
  })

  it('R-NEU-01 no dispara con G1 sin dolor', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 1, neuropathy_pain: false, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-NEU-01')).toBe(false)
  })

  it('R-NEU-01 warn + suggested 1.0 con G1 con dolor', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 1, neuropathy_pain: true, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-NEU-01')
    expect(r?.severity).toBe('warn')
    expect(r?.suggested_dose_mg).toBe(1.0)
  })

  it('R-NEU-01 warn + suggested 1.0 con G2 con dolor', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 2, neuropathy_pain: true, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-NEU-01')
    expect(r?.severity).toBe('warn')
    expect(r?.suggested_dose_mg).toBe(1.0)
  })

  it('R-NEU-01 block permanente con G4', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 4, protocol: { code: 'VRD', drugs: [btzDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-NEU-01')
    expect(r?.severity).toBe('block')
    expect(r?.override_allowed).toBe(false)
  })

  it('R-NEU-01 no dispara sin bortezomib aunque haya neuropatía', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 3, protocol: { code: 'R-CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-NEU-01')).toBe(false)
  })

  it('R-NEU-02 warn vincristina G2 → reducción 50%', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 2, protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-NEU-02')
    expect(r?.severity).toBe('warn')
    expect(r?.reduction_pct).toBe(50)
  })

  it('R-NEU-02 block vincristina G3', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 3, protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-NEU-02' && r.severity === 'block')).toBe(true)
  })

  it('R-NEU-02 no dispara con G1', () => {
    const input: OrderInput = { ...base(), neuropathy_grade: 1, protocol: { code: 'R-CHOP', drugs: [vcrDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-NEU-02')).toBe(false)
  })

  it('R-NEU-03 warn talidomida G2', () => {
    const thal: OrderInput['protocol']['drugs'][0] = { inn: 'talidomida', dose_mg: 100, dose_per_m2: 54.6, is_anthracycline: false, cyp3a4_substrate: true }
    const input: OrderInput = { ...base(), neuropathy_grade: 2, protocol: { code: 'VTD', drugs: [thal] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-NEU-03' && r.severity === 'warn')).toBe(true)
  })

  it('R-NEU-03 no dispara con talidomida G1', () => {
    const thal: OrderInput['protocol']['drugs'][0] = { inn: 'talidomida', dose_mg: 100, dose_per_m2: 54.6, is_anthracycline: false, cyp3a4_substrate: true }
    const input: OrderInput = { ...base(), neuropathy_grade: 1, protocol: { code: 'VTD', drugs: [thal] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-NEU-03')).toBe(false)
  })
})

// ─── R-AGE ────────────────────────────────────────────────────────────────────

describe('R-AGE', () => {
  it('R-AGE-01 block VCR 2.5 mg, edad 72 → cap 1.5 mg', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 72 }, protocol: { code: 'R-CHOP', drugs: [vcrDrug(2.5, 1.4)] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-AGE-01')
    expect(r?.severity).toBe('block')
    expect(r?.suggested_dose_mg).toBe(1.5)
    expect(r?.override_allowed).toBe(false)
  })

  it('R-AGE-01 block VCR 2.5 mg, edad 50 → cap 2.0 mg', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 50 }, protocol: { code: 'R-CHOP', drugs: [vcrDrug(2.5, 1.4)] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-AGE-01')
    expect(r?.severity).toBe('block')
    expect(r?.suggested_dose_mg).toBe(2.0)
  })

  it('R-AGE-01 no dispara con VCR 1.3 mg, edad 72', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 72 }, protocol: { code: 'R-CHOP', drugs: [vcrDrug(1.3, 0.7)] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-AGE-01')).toBe(false)
  })

  it('R-AGE-02 warn paciente 76 años', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 76 } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-AGE-02' && r.severity === 'warn')).toBe(true)
  })

  it('R-AGE-02 no dispara con 74 años', () => {
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 74 } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-AGE-02')).toBe(false)
  })

  it('R-AGE-03 warn AraC 3000 mg/m² en paciente 65 años', () => {
    const araC: OrderInput['protocol']['drugs'][0] = { inn: 'citarabina', dose_mg: 5490, dose_per_m2: 3000, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 65 }, protocol: { code: 'HIDAC', drugs: [araC] } }
    const r = validateOrder(input).find(x => x.ruleId === 'R-AGE-03')
    expect(r?.severity).toBe('warn')
    expect(r?.suggested_dose_mg).toBe(1500)
  })

  it('R-AGE-03 no dispara con AraC dosis estándar 200 mg/m²', () => {
    const araC: OrderInput['protocol']['drugs'][0] = { inn: 'citarabina', dose_mg: 366, dose_per_m2: 200, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 65 }, protocol: { code: '7+3', drugs: [araC] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-AGE-03')).toBe(false)
  })

  it('R-AGE-03 no dispara para paciente 55 años (< 60)', () => {
    const araC: OrderInput['protocol']['drugs'][0] = { inn: 'citarabina', dose_mg: 5490, dose_per_m2: 3000, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), patient: { ...base().patient, age: 55 }, protocol: { code: 'HIDAC', drugs: [araC] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-AGE-03')).toBe(false)
  })
})

// ─── R-PRO ────────────────────────────────────────────────────────────────────

describe('R-PRO', () => {
  it('R-PRO-01 block C92.4 con GB 12×10⁹/L sin prednisona', () => {
    const input: OrderInput = { ...base(), diagnosis_code: 'C92.4', labs: { wbc: 12, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-01' && r.severity === 'block')).toBe(true)
  })

  it('R-PRO-01 no dispara con C92.4 y GB ≤ 10', () => {
    const input: OrderInput = { ...base(), diagnosis_code: 'C92.4', labs: { wbc: 8, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-01')).toBe(false)
  })

  it('R-PRO-01 NO dispara para C92.0 (LMA no APL) aunque GB > 10', () => {
    const input: OrderInput = { ...base(), diagnosis_code: 'C92.0', labs: { wbc: 15, collected_at: RECENT } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-01')).toBe(false)
  })

  it('R-PRO-01 no dispara C92.4 + GB 12 cuando prednisona está en medicaciones', () => {
    const input: OrderInput = { ...base(), diagnosis_code: 'C92.4', labs: { wbc: 12, collected_at: RECENT }, concurrent_medications: ['prednisona 0.5 mg/kg'] }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-01')).toBe(false)
  })

  it('R-PRO-02 block Burkitt (C83.7) sin rasburicasa', () => {
    const input: OrderInput = { ...base(), diagnosis_code: 'C83.7' }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-02' && r.severity === 'block')).toBe(true)
  })

  it('R-PRO-02 no dispara con rasburicasa documentada', () => {
    const input: OrderInput = { ...base(), diagnosis_code: 'C83.7', concurrent_medications: ['rasburicasa 1.5 mg/kg'] }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-02')).toBe(false)
  })

  it('R-PRO-02 no dispara para C83.3 (DLBCL)', () => {
    const input: OrderInput = { ...base(), diagnosis_code: 'C83.3' }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-02')).toBe(false)
  })

  it('R-PRO-03 block rituximab sin serología VHB', () => {
    const rtx: OrderInput['protocol']['drugs'][0] = { inn: 'rituximab', dose_mg: 686.25, dose_per_m2: 375, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), protocol: { code: 'R-CHOP', drugs: [rtx] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-03' && r.severity === 'block')).toBe(true)
  })

  it('R-PRO-03 no dispara con hbv_screened = true', () => {
    const rtx: OrderInput['protocol']['drugs'][0] = { inn: 'rituximab', dose_mg: 686.25, dose_per_m2: 375, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), hbv_screened: true, protocol: { code: 'R-CHOP', drugs: [rtx] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-03')).toBe(false)
  })

  it('R-PRO-03 no dispara sin anti-CD20', () => {
    const input: OrderInput = { ...base(), protocol: { code: 'CHOP', drugs: [doxoDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-03')).toBe(false)
  })

  it('R-PRO-04 block dexametasona sin profilaxis PJP', () => {
    const dex: OrderInput['protocol']['drugs'][0] = { inn: 'dexametasona', dose_mg: 40, dose_per_m2: 21.9, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), protocol: { code: 'VRD', drugs: [dex, btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-04' && r.severity === 'block')).toBe(true)
  })

  it('R-PRO-04 no dispara con cotrimoxazol en medicaciones', () => {
    const dex: OrderInput['protocol']['drugs'][0] = { inn: 'dexametasona', dose_mg: 40, dose_per_m2: 21.9, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), concurrent_medications: ['cotrimoxazol 800/160 mg'], protocol: { code: 'VRD', drugs: [dex, btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-04')).toBe(false)
  })

  it('R-PRO-05 warn daratumumab siempre', () => {
    const dara: OrderInput['protocol']['drugs'][0] = { inn: 'daratumumab', dose_mg: 1800, dose_per_m2: 983.6, is_anthracycline: false, cyp3a4_substrate: false }
    const input: OrderInput = { ...base(), protocol: { code: 'D-VRD', drugs: [dara, btzDrug()] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-05' && r.severity === 'warn')).toBe(true)
  })

  it('R-PRO-06 block MTX 1000 mg/m² sin folinato', () => {
    const input: OrderInput = { ...base(), protocol: { code: 'HCVAD-B', drugs: [mtxDrug(1000)] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-06' && r.severity === 'block')).toBe(true)
  })

  it('R-PRO-06 no dispara con folinato en medicaciones', () => {
    const input: OrderInput = { ...base(), concurrent_medications: ['folinato cálcico 15 mg'], protocol: { code: 'HCVAD-B', drugs: [mtxDrug(1000)] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-06')).toBe(false)
  })

  it('R-PRO-06 no dispara con MTX dosis baja', () => {
    const input: OrderInput = { ...base(), protocol: { code: 'RCHOP', drugs: [mtxDrug(400)] } }
    expect(validateOrder(input).some(r => r.ruleId === 'R-PRO-06')).toBe(false)
  })

  it('R-HIERRO-01 block hierro dextrano sin test_dose_completed', () => {
    const input: OrderInput = {
      ...base(),
      protocol: { code: 'HIERRO-IV', drugs: [{ inn: 'dextrano de hierro', dose_mg: 200, dose_per_m2: 109.3, is_anthracycline: false, cyp3a4_substrate: false, requires_test_dose: true, test_dose_completed: false }] },
    }
    const r = validateOrder(input).find(x => x.ruleId === 'R-HIERRO-01')
    expect(r?.severity).toBe('block')
    expect(r?.override_allowed).toBe(false)
  })

  it('R-HIERRO-01 no dispara si test_dose_completed = true', () => {
    const input: OrderInput = {
      ...base(),
      protocol: { code: 'HIERRO-IV', drugs: [{ inn: 'dextrano de hierro', dose_mg: 200, dose_per_m2: 109.3, is_anthracycline: false, cyp3a4_substrate: false, requires_test_dose: true, test_dose_completed: true }] },
    }
    expect(validateOrder(input).some(r => r.ruleId === 'R-HIERRO-01')).toBe(false)
  })

  it('R-HIERRO-01 no dispara si requires_test_dose no está declarado', () => {
    const input: OrderInput = {
      ...base(),
      protocol: { code: 'HIERRO-IV', drugs: [{ inn: 'dextrano de hierro', dose_mg: 200, dose_per_m2: 109.3, is_anthracycline: false, cyp3a4_substrate: false }] },
    }
    expect(validateOrder(input).some(r => r.ruleId === 'R-HIERRO-01')).toBe(false)
  })
})

// ─── Override governance ──────────────────────────────────────────────────────

describe('Override governance', () => {
  it('Override válido sin co-firma en regla no crítica filtra el resultado', () => {
    const input: OrderInput = {
      ...base(),
      labs: { anc: 800, collected_at: RECENT },
      protocol: { code: 'VRD', drugs: [btzDrug()] },
      overrides: [{ rule_id: 'R-LAB-01', reason: 'Paciente con HMA y recuento esperado de neutrófilos al inicio', override_by: U1 }],
    }
    expect(validateOrder(input).some(r => r.ruleId === 'R-LAB-01')).toBe(false)
  })

  it('Regla override_allowed=false (VCR cap) NUNCA se filtra aunque haya override', () => {
    const input: OrderInput = {
      ...base(),
      patient: { ...base().patient, age: 72 },
      protocol: { code: 'R-CHOP', drugs: [vcrDrug(2.5, 1.4)] },
      overrides: [{ rule_id: 'R-AGE-01', reason: 'Peso corporal alto justifica dosis mayor según tumor board oncología', override_by: U1, co_signed_by: U2 }],
    }
    expect(validateOrder(input).some(r => r.ruleId === 'R-AGE-01')).toBe(true)
  })

  it('hasUnresolvedBlocks devuelve false cuando no hay blocks', () => {
    const results = validateOrder(base())
    const blocks = results.filter(r => r.severity === 'block')
    expect(hasUnresolvedBlocks(blocks)).toBe(false)
  })
})
