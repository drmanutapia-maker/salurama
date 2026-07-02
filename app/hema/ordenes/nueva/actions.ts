'use server'

import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Schema Zod (servidor) ───────────────────────────────────────────────────

const OrderDrugInputSchema = z.object({
  protocol_drug_id: z.string().uuid(),
  drug_id: z.string().uuid(),
  computed_dose_mg: z.number().nonnegative(),
  base_dose_mg: z.number().nonnegative(),
  reduction_pct: z.number().min(0).max(100).default(0),
  reduction_reason: z.string().nullable().optional(),
  route: z.string().min(1),
  infusion_minutes: z.number().int().positive().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  given_on_day: z.number().int().positive(),
  warnings: z.array(z.unknown()).default([]),
  override_reason: z.string().nullable().optional(),
})

const CreateOrderSchema = z.object({
  patient_id: z.string().uuid(),
  protocol_id: z.string().uuid(),
  diagnosis_code: z.string().min(1, 'El paciente no tiene diagnóstico primario registrado'),
  cycle_number: z.number().int().positive(),
  day_of_cycle: z.number().int().positive(),
  measurement_id: z.string().uuid(),
  bsa_used: z.number().positive(),
  bsa_formula: z.enum(['mosteller', 'dubois']),
  scheduled_for: z.string().date(),
  ecog: z.number().int().min(0).max(4).nullable().optional(),
  next_cycle_date: z.string().date().nullable().optional(),
  drugs: z.array(OrderDrugInputSchema).min(1, 'La orden debe tener al menos un fármaco'),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function firstErrorMsg(err: z.ZodError): string {
  // Compatible con Zod v3 (.errors) y v4 (.issues)
  const raw = err as unknown as { issues?: { message: string }[]; errors?: { message: string }[] }
  return raw.issues?.[0]?.message ?? raw.errors?.[0]?.message ?? err.message ?? 'Datos inválidos'
}

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

function extractTenantId(accessToken: string): string | null {
  try {
    const payload = JSON.parse(
      atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as Record<string, unknown>
    return (payload.tenant_id as string) ?? null
  } catch {
    return null
  }
}

// ─── Action: crear indicación ────────────────────────────────────────────────

export type CreateOrderResult =
  | { success: true; orderId: string }
  | { success: false; error: string }

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const parsed = CreateOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: firstErrorMsg(parsed.error) }
  }

  const supabase = await getServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

  const tenantId = extractTenantId(session.access_token)
  if (!tenantId) return { success: false, error: 'Sin tenant configurado. Contacta al administrador.' }

  const d = parsed.data

  const { data, error } = await supabase.rpc('hema_create_order', {
    p_tenant_id: tenantId,
    p_patient_id: d.patient_id,
    p_protocol_id: d.protocol_id,
    p_diagnosis_code: d.diagnosis_code,
    p_cycle_number: d.cycle_number,
    p_day_of_cycle: d.day_of_cycle,
    p_measurement_id: d.measurement_id,
    p_bsa_used: d.bsa_used,
    p_bsa_formula: d.bsa_formula,
    p_scheduled_for: d.scheduled_for,
    p_created_by: session.user.id,
    p_drugs: d.drugs,
    p_ecog: d.ecog ?? null,
    p_next_cycle_date: d.next_cycle_date ?? null,
  })

  if (error) {
    if (error.message?.includes('HEMA-BLOCK')) {
      return { success: false, error: 'La orden tiene reglas clínicas no resueltas. Revisa el Paso 3.' }
    }
    return { success: false, error: `Error al crear la indicación: ${error.message}` }
  }

  return { success: true, orderId: data as string }
}
