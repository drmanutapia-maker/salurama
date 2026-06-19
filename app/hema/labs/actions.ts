'use server'

import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Schema Zod (servidor) ───────────────────────────────────────────────────

const LabValueInputSchema = z.object({
  analyte:        z.string().min(1),
  value:          z.coerce.number(),
  unit:           z.string().optional(),
  reference_low:  z.coerce.number().optional(),
  reference_high: z.coerce.number().optional(),
})

const CreateLabPanelSchema = z.object({
  patient_id:   z.string().uuid(),
  collected_at: z.string().optional(),
  values:       z.array(LabValueInputSchema).min(1, 'Captura al menos un valor de laboratorio'),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function firstErrorMsg(err: z.ZodError): string {
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

// ─── Action: crear panel de laboratorio + valores ────────────────────────────

export type CreateLabPanelResult =
  | { success: true; panelId: string }
  | { success: false; error: string }

export async function createLabPanel(formData: FormData): Promise<CreateLabPanelResult> {
  let parsedValues: unknown
  try {
    parsedValues = JSON.parse(String(formData.get('values_json') ?? '[]'))
  } catch {
    return { success: false, error: 'Valores de laboratorio inválidos.' }
  }

  const parsed = CreateLabPanelSchema.safeParse({
    patient_id:   formData.get('patient_id'),
    collected_at: formData.get('collected_at') || undefined,
    values:       parsedValues,
  })

  if (!parsed.success) {
    return { success: false, error: firstErrorMsg(parsed.error) }
  }

  const supabase = await getServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

  const tenantId = extractTenantId(session.access_token)
  if (!tenantId) return { success: false, error: 'Sin tenant configurado. Contacta al administrador.' }

  const { patient_id, collected_at, values } = parsed.data

  const { data: panelId, error: panelError } = await supabase.rpc('hema_create_lab_panel', {
    p_patient_id:   patient_id,
    p_tenant_id:    tenantId,
    p_source:       'manual',
    p_collected_at: collected_at ? new Date(collected_at).toISOString() : new Date().toISOString(),
    p_reviewed_by:  session.user.id,
  })

  if (panelError) {
    return { success: false, error: `Error al crear panel de laboratorio: ${panelError.message}` }
  }

  for (const v of values) {
    const { error: valueError } = await supabase.rpc('hema_add_lab_value', {
      p_panel_id:        panelId as string,
      p_analyte:         v.analyte,
      p_value:           v.value,
      p_unit:            v.unit ?? null,
      p_reference_low:   v.reference_low ?? null,
      p_reference_high:  v.reference_high ?? null,
    })
    if (valueError) {
      return { success: false, error: `Error al guardar ${v.analyte}: ${valueError.message}` }
    }
  }

  return { success: true, panelId: panelId as string }
}
