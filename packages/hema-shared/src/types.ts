import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Primitivos reutilizables
// ─────────────────────────────────────────────────────────────────────────────

export const UuidSchema = z.string().uuid()
export const IsoDateSchema = z.string().date()           // YYYY-MM-DD
export const IsoDateTimeSchema = z.string().datetime()   // ISO-8601 con tz

// ─────────────────────────────────────────────────────────────────────────────
// Diagnóstico CIE-10
// ─────────────────────────────────────────────────────────────────────────────

export const DiagnosisCategorySchema = z.enum([
  'mieloma', 'linfoma', 'leucemia', 'mds', 'mpn', 'otro',
])
export type DiagnosisCategory = z.infer<typeof DiagnosisCategorySchema>

export const DiagnosisSchema = z.object({
  code: z.string().min(1),
  description_es: z.string().min(1),
  description_en: z.string().nullish(),
  category: DiagnosisCategorySchema.nullish(),
})
export type Diagnosis = z.infer<typeof DiagnosisSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Paciente
// ─────────────────────────────────────────────────────────────────────────────

export const PatientSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema,
  // CURP oficial México: 4 letras + 6 dígitos fecha + H/M + 5 letras estado/consonantes + 1 alfanumeral + 1 dígito verificador
  curp: z.string().regex(
    /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$/,
    'CURP inválido: debe tener 18 caracteres en formato oficial',
  ),
  nss: z.string().nullish(),
  birth_date: IsoDateSchema,
  sex: z.enum(['M', 'F']),
  allergies: z.string().nullish(),
  created_at: IsoDateTimeSchema.nullish(),
})
export type Patient = z.infer<typeof PatientSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Medición del paciente (peso / talla → BSA)
// ─────────────────────────────────────────────────────────────────────────────

export const PatientMeasurementSchema = z.object({
  id: UuidSchema,
  patient_id: UuidSchema,
  measured_at: IsoDateTimeSchema,
  weight_kg: z.number().min(20).max(250),
  height_cm: z.number().min(100).max(220),
  // Columnas generadas en Postgres; pueden llegar como null si aún no están computadas
  bsa_mosteller: z.number().positive().nullish(),
  bsa_dubois: z.number().positive().nullish(),
  recorded_by: UuidSchema,
})
export type PatientMeasurement = z.infer<typeof PatientMeasurementSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Fármaco
// ─────────────────────────────────────────────────────────────────────────────

export const DrugSchema = z.object({
  id: UuidSchema,
  inn: z.string().min(1),
  trade_names: z.array(z.string()).default([]),
  atc_code: z.string().nullish(),
  is_anthracycline: z.boolean().default(false),
  is_vesicant: z.boolean().default(false),
  // Dosis acumulada máxima: doxo 450, epirr 900, dauno 550, ida 150, mito 140 mg/m²
  // Bleomicina usa unidades totales (400 U) — campo separado si se necesita
  cumulative_max_mg_m2: z.number().positive().nullish(),
  cyp3a4_substrate: z.boolean().default(false),
  cyp3a4_strong_inhibitor: z.boolean().default(false),
  requires_hbv_screen: z.boolean().default(false),   // anti-CD20
  requires_pft: z.boolean().default(false),          // bleomicina
  // Agregado en migración 016: dextrano de hierro requiere dosis de prueba 25 mg → 15 min → observar
  requires_test_dose: z.boolean().default(false),
})
export type Drug = z.infer<typeof DrugSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Protocolo
// ─────────────────────────────────────────────────────────────────────────────

export const LineOfTherapySchema = z.enum([
  '1L', '2L', 'mantenimiento', 'hierro_iv',
])
export type LineOfTherapy = z.infer<typeof LineOfTherapySchema>

export const ProtocolSchema = z.object({
  id: UuidSchema,
  code: z.string().min(1),
  name: z.string().min(1),
  cycle_length_days: z.number().int().positive(),
  total_cycles: z.number().int().positive().nullish(),
  line_of_therapy: z.string().nullish(),
  protocol_references: z.record(z.string(), z.unknown()).nullish(),
  active: z.boolean().default(false),
  approved_by_medical_director: UuidSchema.nullish(),
  approved_at: IsoDateTimeSchema.nullish(),
  specialty: z.string().default('hematologia'),
})
export type Protocol = z.infer<typeof ProtocolSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Fármaco dentro de un protocolo
// ─────────────────────────────────────────────────────────────────────────────

export const DoseUnitSchema = z.enum(['mg/m2', 'mg/kg', 'mg', 'U/m2', 'UI', 'MUI'])
export type DoseUnit = z.infer<typeof DoseUnitSchema>

export const RouteSchema = z.enum(['IV', 'SC', 'PO', 'IT', 'IM', 'CIV', 'IVP'])
export type Route = z.infer<typeof RouteSchema>

export const ProtocolDrugSchema = z.object({
  id: UuidSchema,
  protocol_id: UuidSchema,
  drug_id: UuidSchema,
  dose_value: z.number().positive(),
  dose_unit: DoseUnitSchema,
  route: RouteSchema,
  days_of_cycle: z.array(z.number().int().positive()).min(1),
  max_dose_mg: z.number().positive().nullish(),
  infusion_minutes: z.number().int().positive().nullish(),
  vehicle: z.string().nullish(),
  premed_required: z.record(z.string(), z.unknown()).nullish(),
  sequence_order: z.number().int().positive().nullish(),
})
export type ProtocolDrug = z.infer<typeof ProtocolDrugSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Laboratorios
// ─────────────────────────────────────────────────────────────────────────────

export const LabFlagSchema = z.enum(['L', 'H', 'LL', 'HH'])
export type LabFlag = z.infer<typeof LabFlagSchema>

export const LabValueSchema = z.object({
  id: UuidSchema,
  panel_id: UuidSchema,
  loinc: z.string().nullish(),
  analyte: z.string().min(1),
  value: z.number().nullish(),
  unit: z.string().nullish(),
  reference_low: z.number().nullish(),
  reference_high: z.number().nullish(),
  flag: LabFlagSchema.nullish(),
  // <0.85 = requiere revisión visual antes de vincular a una orden
  ocr_confidence: z.number().min(0).max(1).nullish(),
  manually_edited: z.boolean().default(false),
})
export type LabValue = z.infer<typeof LabValueSchema>

export const LabSourceSchema = z.enum(['manual', 'ocr', 'fhir'])
export type LabSource = z.infer<typeof LabSourceSchema>

export const LabPanelSchema = z.object({
  id: UuidSchema,
  patient_id: UuidSchema,
  tenant_id: UuidSchema,
  collected_at: IsoDateTimeSchema,
  source: LabSourceSchema.nullish(),
  ocr_image_path: z.string().nullish(),
  ocr_raw_json: z.record(z.string(), z.unknown()).nullish(),
  ocr_confidence: z.number().min(0).max(1).nullish(),
  // NULL hasta confirmación explícita del médico (regla de negocio en Sección II)
  reviewed_by: UuidSchema.nullish(),
  reviewed_at: IsoDateTimeSchema.nullish(),
  fhir_diagnostic_report_id: z.string().nullish(),
  values: z.array(LabValueSchema).optional(),
})
export type LabPanel = z.infer<typeof LabPanelSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Motor de validación — tipos de entrada y salida
// ─────────────────────────────────────────────────────────────────────────────

export const SeveritySchema = z.enum(['block', 'warn', 'info'])
export type Severity = z.infer<typeof SeveritySchema>

export const ValidationResultSchema = z.object({
  ruleId: z.string().min(1),
  severity: SeveritySchema,
  message_es: z.string().min(1),
  drug_inn: z.string().optional(),
  suggested_dose_mg: z.number().positive().optional(),
  reduction_pct: z.number().min(0).max(100).optional(),
  override_allowed: z.boolean(),
  // Las 5 clases críticas requieren co-firma (ver Sección VII del plan)
  requires_second_signer: z.boolean(),
})
export type ValidationResult = z.infer<typeof ValidationResultSchema>

export const OverrideSchema = z.object({
  rule_id: z.string().min(1),
  reason: z.string().min(30, 'La justificación debe tener al menos 30 caracteres'),
  override_by: UuidSchema,
  co_signed_by: UuidSchema.optional(),
})
export type Override = z.infer<typeof OverrideSchema>

// Fármaco dentro de OrderInput — superset de lo que el validador necesita
export const OrderInputDrugSchema = z.object({
  inn: z.string().min(1),
  dose_mg: z.number().positive(),
  dose_per_m2: z.number().positive(),
  is_anthracycline: z.boolean(),
  cyp3a4_substrate: z.boolean(),
  cumulative_max_mg_m2: z.number().positive().optional(),
  // R-HIERRO-01: dextrano de hierro exige dosis de prueba antes de la dosis completa
  requires_test_dose: z.boolean().optional(),
  sequence_order: z.number().int().positive().optional(),
  test_dose_completed: z.boolean().optional(), // true = dosis de prueba ya administrada
})
export type OrderInputDrug = z.infer<typeof OrderInputDrugSchema>

export const OrderInputLabsSchema = z.object({
  anc: z.number().min(0).optional(),             // neutrófilos absolutos /µL
  platelets: z.number().min(0).optional(),       // plaquetas /µL
  hemoglobin: z.number().min(0).optional(),      // g/dL
  creatinine: z.number().min(0).optional(),      // mg/dL
  crcl: z.number().min(0).optional(),            // Cockcroft-Gault mL/min
  bilirubin_total: z.number().min(0).optional(), // mg/dL
  ast: z.number().min(0).optional(),             // U/L
  alt: z.number().min(0).optional(),             // U/L
  lvef: z.number().min(0).max(100).optional(),   // %
  collected_at: IsoDateTimeSchema,               // labs con fecha >30 días → R-LAB-12 warn
})
export type OrderInputLabs = z.infer<typeof OrderInputLabsSchema>

export const NeuropathyGradeSchema = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4),
])
export type NeuropathyGrade = z.infer<typeof NeuropathyGradeSchema>

export const EcogSchema = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4),
])
export type Ecog = z.infer<typeof EcogSchema>

export const OrderInputSchema = z.object({
  patient: z.object({
    weight_kg: z.number().min(20, 'Peso mínimo 20 kg').max(250, 'Peso máximo 250 kg'),
    height_cm: z.number().min(100, 'Talla mínima 100 cm').max(220, 'Talla máxima 220 cm'),
    bsa_mosteller: z.number().positive(),
    bsa_dubois: z.number().positive(),
    age: z.number().int().min(0).max(120),
    sex: z.enum(['M', 'F']),
    allergies: z.string().optional(),
  }),
  labs: OrderInputLabsSchema,
  protocol: z.object({
    code: z.string().min(1),
    drugs: z.array(OrderInputDrugSchema).min(1, 'El protocolo debe tener al menos un fármaco'),
  }),
  neuropathy_grade: NeuropathyGradeSchema.optional(),
  ecog: EcogSchema.optional(),
  concurrent_medications: z.array(z.string()).optional(),
  // inn → mg/m² acumulado histórico del paciente
  cumulative_doses: z.record(z.string(), z.number().nonnegative()).optional(),
  overrides: z.array(OverrideSchema).optional(),
})
export type OrderInput = z.infer<typeof OrderInputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Orden de quimioterapia
// ─────────────────────────────────────────────────────────────────────────────

export const OrderStatusSchema = z.enum([
  'draft', 'validated', 'signed', 'dispensed', 'administered', 'cancelled',
])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

export const BsaFormulaSchema = z.enum(['mosteller', 'dubois'])
export type BsaFormula = z.infer<typeof BsaFormulaSchema>

export const OrderDrugSchema = z.object({
  id: UuidSchema,
  order_id: UuidSchema,
  protocol_drug_id: UuidSchema.nullish(),
  drug_id: UuidSchema,
  computed_dose_mg: z.number().nonnegative(),
  base_dose_mg: z.number().nonnegative(),
  reduction_pct: z.number().min(0).max(100).default(0),
  reduction_reason: z.string().nullish(),
  route: z.string().min(1),
  infusion_minutes: z.number().int().positive().nullish(),
  vehicle: z.string().nullish(),
  given_on_day: z.number().int().positive(),
  warnings: z.array(ValidationResultSchema).default([]),
  override_reason: z.string().nullish(),
  pharmacy_verified: z.boolean().default(false),
})
export type OrderDrug = z.infer<typeof OrderDrugSchema>

export const OrderSchema = z.object({
  id: UuidSchema,
  tenant_id: UuidSchema,
  patient_id: UuidSchema,
  protocol_id: UuidSchema,
  diagnosis_code: z.string().min(1),
  cycle_number: z.number().int().positive(),
  day_of_cycle: z.number().int().positive(),
  measurement_id: UuidSchema,
  lab_panel_id: UuidSchema.nullish(),
  bsa_used: z.number().positive(),
  bsa_formula: BsaFormulaSchema,
  ecog: EcogSchema.nullish(),
  scheduled_for: IsoDateSchema,
  status: OrderStatusSchema.default('draft'),
  cancel_reason: z.string().nullish(),
  signed_at: IsoDateTimeSchema.nullish(),
  signed_by: UuidSchema.nullish(),
  co_signed_by: UuidSchema.nullish(),       // co-firma para overrides críticos
  nom151_constancia_id: z.string().nullish(),
  nom151_constancia_url: z.string().nullish(),
  pdf_path: z.string().nullish(),
  pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/).nullish(),
  qr_payload: z.string().nullish(),
  created_at: IsoDateTimeSchema.nullish(),
  created_by: UuidSchema,
  disclaimer: z.string().default(
    'Herramienta de soporte a la decisión clínica. El médico tratante es el único responsable de la prescripción.',
  ),
  order_drugs: z.array(OrderDrugSchema).optional(),
})
export type Order = z.infer<typeof OrderSchema>
