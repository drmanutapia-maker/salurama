// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de parámetros de laboratorio requeridos por el motor de validación
// (packages/hema-validator/src/rules/r-lab.ts). El campo `code` coincide
// exactamente con las claves de OrderInputLabs en types.ts para que el wizard
// pueda prellenar sin remapeo. crcl es calculado (Cockcroft-Gault), no se
// captura como dato crudo de laboratorio.
// Rangos de referencia: adulto general, sin distinción por sexo/edad — son
// solo para el semáforo visual; las reglas clínicas usan sus propios umbrales.
// ─────────────────────────────────────────────────────────────────────────────

export type LabParamCode =
  | 'anc'
  | 'platelets'
  | 'hemoglobin'
  | 'creatinine'
  | 'crcl'
  | 'bilirubin_total'
  | 'ast'
  | 'alt'
  | 'lvef'
  | 'wbc'

export interface LabParamDef {
  code: LabParamCode
  label_es: string
  unit: string
  reference_low: number | null
  reference_high: number | null
  computed?: boolean // true = no se captura directo, se calcula (CrCl)
}

export const LAB_PARAMS: LabParamDef[] = [
  { code: 'anc',             label_es: 'Neutrófilos absolutos (ANC)', unit: '/µL',    reference_low: 1500,   reference_high: 8000 },
  { code: 'platelets',       label_es: 'Plaquetas',                   unit: '/µL',    reference_low: 150000, reference_high: 450000 },
  { code: 'hemoglobin',      label_es: 'Hemoglobina',                 unit: 'g/dL',   reference_low: 12,     reference_high: 16 },
  { code: 'creatinine',      label_es: 'Creatinina',                  unit: 'mg/dL',  reference_low: 0.6,    reference_high: 1.2 },
  { code: 'crcl',            label_es: 'CrCl (Cockcroft-Gault)',      unit: 'mL/min', reference_low: 90,     reference_high: null, computed: true },
  { code: 'bilirubin_total', label_es: 'Bilirrubina total',           unit: 'mg/dL',  reference_low: 0.2,    reference_high: 1.2 },
  { code: 'ast',             label_es: 'AST (TGO)',                   unit: 'U/L',    reference_low: 5,      reference_high: 40 },
  { code: 'alt',             label_es: 'ALT (TGP)',                   unit: 'U/L',    reference_low: 7,      reference_high: 56 },
  { code: 'lvef',            label_es: 'FEVI',                        unit: '%',      reference_low: 50,     reference_high: 70 },
  { code: 'wbc',             label_es: 'Leucocitos (WBC)',            unit: '×10⁹/L', reference_low: 4,      reference_high: 11 },
]

export function getLabParam(code: string): LabParamDef | undefined {
  return LAB_PARAMS.find((p) => p.code === code)
}
