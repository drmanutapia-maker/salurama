'use server'

import { createHash } from 'node:crypto'
import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildOrderPdf } from '@salurama/hema-pdf'
import type { OrderPdfInput } from '@salurama/hema-pdf'

// ─── Tipos de la fila cruda de hema_get_order_detail ────────────────────────

interface OrderDetailDrugRow {
  inn: string
  computed_dose_mg: number
  base_dose_mg: number
  reduction_pct: number
  reduction_reason: string | null
  route: string
  infusion_minutes: number | null
  vehicle: string | null
  given_on_day: number
  warnings: unknown
  override_reason: string | null
}

interface OrderDetailSignatureRow {
  signer_name: string | null
  psc_provider: string
  signed_at: string
}

interface OrderDetailRow {
  id: string
  status: string
  cycle_number: number
  day_of_cycle: number
  scheduled_for: string
  next_cycle_date: string | null
  bsa_used: number
  bsa_formula: 'mosteller' | 'dubois'
  ecog: number | null
  disclaimer: string
  tenant_id: string
  tenant_name: string
  tenant_clues: string | null
  tenant_cofepris_license: string | null
  tenant_type: 'independiente' | 'clinica'
  tenant_code: string | null
  patient_curp: string
  patient_display_name: string
  patient_birth_date: string
  patient_sex: 'M' | 'F'
  patient_allergies: string | null
  patient_expediente_sequential: number | null
  patient_weight_kg: number | null
  patient_height_cm: number | null
  diagnosis_code: string
  diagnosis_desc: string | null
  protocol_code: string
  protocol_name: string
  protocol_cycle_length_days: number
  protocol_total_cycles: number | null
  created_by_name: string | null
  created_by_license: string | null
  drugs: OrderDetailDrugRow[]
  signatures: OrderDetailSignatureRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OrderIdSchema = z.string().uuid()

async function getServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    },
  )
}

function extractWarningMessages(warnings: unknown): string[] {
  if (!Array.isArray(warnings)) return []
  return warnings
    .map((w) => (typeof w === 'object' && w !== null && 'message_es' in w ? String((w as { message_es: unknown }).message_es) : null))
    .filter((m): m is string => m !== null)
}

// ─── Action: generar PDF NOM-004 ─────────────────────────────────────────────

export type GenerateOrderPdfResult =
  | { success: true; pdfUrl: string }
  | { success: false; error: string }

export async function generateOrderPdf(orderId: string): Promise<GenerateOrderPdfResult> {
  const parsedId = OrderIdSchema.safeParse(orderId)
  if (!parsedId.success) return { success: false, error: 'ID de orden inválido.' }

  const supabase = await getServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

  const { data, error } = await supabase.rpc('hema_get_order_detail', { p_order_id: orderId })
  if (error) return { success: false, error: `Error al leer la orden: ${error.message}` }

  const row = (data as OrderDetailRow[] | null)?.[0]
  if (!row) return { success: false, error: 'Orden no encontrada.' }

  const verificationUrl = `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/hema/v/${orderId}`

  const pdfInput: OrderPdfInput = {
    orderId: row.id,
    status: row.status,
    cycleNumber: row.cycle_number,
    dayOfCycle: row.day_of_cycle,
    scheduledFor: row.scheduled_for,
    bsaUsed: row.bsa_used,
    bsaFormula: row.bsa_formula,
    ecog: row.ecog,
    disclaimer: row.disclaimer,
    diagnosisCode: row.diagnosis_code,
    diagnosisDesc: row.diagnosis_desc,
    institution: {
      name: row.tenant_name,
      tenantType: row.tenant_type ?? 'independiente',
      cofeprisLicense: row.tenant_cofepris_license,
    },
    patient: {
      displayName: row.patient_display_name,
      expediente: row.tenant_code && row.patient_expediente_sequential != null
        ? `${row.tenant_code}-${String(row.patient_expediente_sequential).padStart(6, '0')}`
        : row.patient_expediente_sequential != null
          ? String(row.patient_expediente_sequential).padStart(6, '0')
          : 'SIN-EXP',
      birthDate: row.patient_birth_date,
      sex: row.patient_sex,
      allergies: row.patient_allergies,
      weightKg: row.patient_weight_kg,
      heightCm: row.patient_height_cm,
    },
    protocol: {
      code: row.protocol_code,
      name: row.protocol_name,
      cycleLengthDays: row.protocol_cycle_length_days,
      totalCycles: row.protocol_total_cycles,
      nextCycleDate: row.next_cycle_date,
    },
    prescriber: { fullName: row.created_by_name, professionalLicense: row.created_by_license },
    drugs: row.drugs.map((d) => ({
      inn: d.inn,
      route: d.route,
      givenOnDay: d.given_on_day,
      computedDoseMg: d.computed_dose_mg,
      baseDoseMg: d.base_dose_mg,
      reductionPct: d.reduction_pct,
      reductionReason: d.reduction_reason,
      infusionMinutes: d.infusion_minutes,
      vehicle: d.vehicle,
      overrideReason: d.override_reason,
      warningMessages: extractWarningMessages(d.warnings),
    })),
    signatures: row.signatures.map((s) => ({
      signerName: s.signer_name,
      pscProvider: s.psc_provider,
      signedAt: s.signed_at,
    })),
    verificationUrl,
    generatedAt: new Date().toISOString(),
  }

  let pdfBytes: Uint8Array
  try {
    const result = await buildOrderPdf(pdfInput)
    pdfBytes = result.bytes
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al construir el PDF.' }
  }

  const pdfSha256 = createHash('sha256').update(Buffer.from(pdfBytes)).digest('hex')
  const path = `${row.tenant_id}/${orderId}.pdf`

  const { error: uploadError } = await supabase.storage
    .from('hema-order-pdfs')
    .upload(path, Buffer.from(pdfBytes), { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    return { success: false, error: `Error al subir el PDF: ${uploadError.message}` }
  }

  const { error: rpcError } = await supabase.rpc('hema_set_order_pdf', {
    p_order_id: orderId,
    p_pdf_path: path,
    p_pdf_sha256: pdfSha256,
    p_qr_payload: verificationUrl,
  })

  if (rpcError) {
    if (rpcError.message?.includes('HEMA-INVALID-STATUS')) {
      return { success: false, error: 'No se puede regenerar el PDF: la orden ya está firmada.' }
    }
    return { success: false, error: `Error al registrar el PDF: ${rpcError.message}` }
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('hema-order-pdfs')
    .createSignedUrl(path, 300)

  if (signedUrlError || !signedUrlData) {
    return { success: false, error: 'PDF generado, pero no se pudo crear el enlace de descarga.' }
  }

  return { success: true, pdfUrl: signedUrlData.signedUrl }
}

// ─── Action: firmar orden (modo dev) ─────────────────────────────────────────

export type SignOrderResult =
  | { success: true; signedAt: string }
  | { success: false; error: string }

export async function signOrder(orderId: string): Promise<SignOrderResult> {
  const parsedId = OrderIdSchema.safeParse(orderId)
  if (!parsedId.success) return { success: false, error: 'ID de orden inválido.' }

  const supabase = await getServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

  const { data, error } = await supabase.rpc('hema_sign_order', { p_order_id: orderId, p_psc_provider: 'dev' })

  if (error) {
    if (error.message?.includes('HEMA-FORBIDDEN')) {
      return { success: false, error: 'Solo médicos pueden firmar indicaciones.' }
    }
    if (error.message?.includes('HEMA-PDF-REQUIRED')) {
      return { success: false, error: 'Genera el PDF de la indicación antes de firmar.' }
    }
    if (error.message?.includes('HEMA-INVALID-STATUS')) {
      return { success: false, error: 'Esta orden ya fue firmada o no puede firmarse en su estado actual.' }
    }
    return { success: false, error: `Error al firmar: ${error.message}` }
  }

  const row = (data as { signed_at: string }[] | null)?.[0]
  if (!row) return { success: false, error: 'No se pudo confirmar la firma.' }

  return { success: true, signedAt: row.signed_at }
}
