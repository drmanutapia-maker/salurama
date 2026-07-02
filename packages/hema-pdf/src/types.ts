export interface OrderPdfInstitution {
  name: string
  /** 'independiente' = consultorio/médico privado; 'clinica' = hospital/grupo */
  tenantType: 'independiente' | 'clinica'
  cofeprisLicense: string | null
}

export interface OrderPdfPatient {
  displayName: string
  /** Expediente formateado: 'TENANT_CODE-000001' o solo el número si tenant_code es null */
  expediente: string
  birthDate: string // ISO date (YYYY-MM-DD)
  sex: 'M' | 'F'
  allergies: string | null
  weightKg: number | null
  heightCm: number | null
}

export interface OrderPdfProtocol {
  code: string
  name: string
  cycleLengthDays: number
  totalCycles: number | null
  nextCycleDate?: string | null // ISO date; null/undefined = omite la línea en el PDF
}

export interface OrderPdfPrescriber {
  fullName: string | null
  professionalLicense: string | null
}

export interface OrderPdfDrug {
  inn: string
  route: string
  givenOnDay: number
  computedDoseMg: number
  baseDoseMg: number
  reductionPct: number
  reductionReason: string | null
  infusionMinutes: number | null
  vehicle: string | null
  overrideReason: string | null
  /** Mensajes de alertas clínicas que el médico vio/justificó al firmar (auditoría). */
  warningMessages: string[]
}

export interface OrderPdfSignature {
  signerName: string | null
  pscProvider: string
  signedAt: string // ISO datetime
}

export interface OrderPdfInput {
  orderId: string
  status: string
  cycleNumber: number
  dayOfCycle: number
  scheduledFor: string // ISO date
  bsaUsed: number
  bsaFormula: 'mosteller' | 'dubois'
  ecog: number | null
  /** Texto NOM-004-SSA3-2012, leído de hema.orders.disclaimer — no se hardcodea aquí. */
  disclaimer: string
  diagnosisCode: string
  diagnosisDesc: string | null
  institution: OrderPdfInstitution
  patient: OrderPdfPatient
  protocol: OrderPdfProtocol
  prescriber: OrderPdfPrescriber
  drugs: OrderPdfDrug[]
  signatures: OrderPdfSignature[]
  /** URL codificada en el QR. Sin hash — ver nota de diseño en order-template.ts. */
  verificationUrl: string
  /** Timestamp de generación de este PDF (no de la orden ni de la firma). */
  generatedAt: string // ISO datetime
}

export interface OrderPdfResult {
  bytes: Uint8Array
}
