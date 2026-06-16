'use server'

import { z } from 'zod'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─── Schema Zod (servidor) ───────────────────────────────────────────────────

const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$/

const NuevoPacienteSchema = z.object({
  curp:       z.string().regex(CURP_REGEX, 'CURP inválido: 18 caracteres en formato oficial RENAPO'),
  full_name:  z.string().min(2, 'Nombre requerido').max(200, 'Nombre demasiado largo'),
  birth_date: z.string().date('Fecha de nacimiento inválida'),
  sex:        z.enum(['M', 'F'], { message: 'Selecciona sexo' }),
  nss:        z.string().max(11).optional().or(z.literal('')),
  allergies:  z.string().max(500).optional().or(z.literal('')),
})

const MedicionSchema = z.object({
  patient_id: z.string().uuid(),
  weight_kg:  z.coerce.number().min(20, 'Peso mínimo 20 kg').max(250, 'Peso máximo 250 kg'),
  height_cm:  z.coerce.number().min(100, 'Talla mínima 100 cm').max(220, 'Talla máxima 220 cm'),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function firstErrorMsg(err: z.ZodError): string {
  // Compatible with Zod v3 (.errors) and v4 (.issues)
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

// ─── Action: crear paciente ───────────────────────────────────────────────────

export type CreatePatientResult =
  | { success: true; patientId: string }
  | { success: false; error: string }

export async function createPatient(formData: FormData): Promise<CreatePatientResult> {
  const raw = {
    curp:       String(formData.get('curp') ?? '').toUpperCase().trim(),
    full_name:  String(formData.get('full_name') ?? '').trim(),
    birth_date: String(formData.get('birth_date') ?? ''),
    sex:        String(formData.get('sex') ?? ''),
    nss:        String(formData.get('nss') ?? '').trim() || undefined,
    allergies:  String(formData.get('allergies') ?? '').trim() || undefined,
  }

  const parsed = NuevoPacienteSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: firstErrorMsg(parsed.error) }
  }

  const supabase = await getServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

  const tenantId = extractTenantId(session.access_token)
  if (!tenantId) return { success: false, error: 'Sin tenant configurado. Contacta al administrador.' }

  const { data, error } = await supabase.rpc('hema_create_patient', {
    p_tenant_id:  tenantId,
    p_curp:       parsed.data.curp,
    p_full_name:  parsed.data.full_name,
    p_birth_date: parsed.data.birth_date,
    p_sex:        parsed.data.sex,
    p_nss:        parsed.data.nss ?? null,
    p_allergies:  parsed.data.allergies ?? null,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Este CURP ya está registrado en tu institución.' }
    }
    if (error.code === '23514') {
      return { success: false, error: 'CURP con formato inválido.' }
    }
    return { success: false, error: `Error al registrar paciente: ${error.message}` }
  }

  return { success: true, patientId: data as string }
}

// ─── Action: agregar medición ────────────────────────────────────────────────

export type AddMeasurementResult =
  | { success: true; measurementId: string; bsaMosteller: number; bsaDubois: number }
  | { success: false; error: string }

export async function addMeasurement(formData: FormData): Promise<AddMeasurementResult> {
  const parsed = MedicionSchema.safeParse({
    patient_id: formData.get('patient_id'),
    weight_kg:  formData.get('weight_kg'),
    height_cm:  formData.get('height_cm'),
  })

  if (!parsed.success) {
    return { success: false, error: firstErrorMsg(parsed.error) }
  }

  const supabase = await getServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

  const { data, error } = await supabase.rpc('hema_add_measurement', {
    p_patient_id:  parsed.data.patient_id,
    p_weight_kg:   parsed.data.weight_kg,
    p_height_cm:   parsed.data.height_cm,
    p_recorded_by: session.user.id,
  })

  if (error) {
    if (error.code === '23503') {
      return {
        success: false,
        error: 'Tu usuario no está registrado en el módulo HEMA. Contacta al administrador.',
      }
    }
    return { success: false, error: `Error al guardar medición: ${error.message}` }
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    success:       true,
    measurementId: (row as { id: string }).id,
    bsaMosteller:  Number((row as { bsa_mosteller: number }).bsa_mosteller),
    bsaDubois:     Number((row as { bsa_dubois: number }).bsa_dubois),
  }
}

// ─── Action: agregar diagnóstico ─────────────────────────────────────────────

const AddDiagnosisSchema = z.object({
  patient_id:     z.string().uuid(),
  diagnosis_code: z.string().min(1, 'Selecciona un diagnóstico'),
  staging:        z.string().max(100).optional().or(z.literal('')),
  is_primary:     z.coerce.boolean(),
})

export type AddDiagnosisResult =
  | { success: true; diagnosisId: string }
  | { success: false; error: string }

export async function addDiagnosis(formData: FormData): Promise<AddDiagnosisResult> {
  const parsed = AddDiagnosisSchema.safeParse({
    patient_id:     formData.get('patient_id'),
    diagnosis_code: formData.get('diagnosis_code'),
    staging:        formData.get('staging'),
    is_primary:     formData.get('is_primary'),
  })

  if (!parsed.success) {
    return { success: false, error: firstErrorMsg(parsed.error) }
  }

  const supabase = await getServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { success: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

  const { patient_id, diagnosis_code, staging, is_primary } = parsed.data

  // Desactivar primario anterior antes de insertar el nuevo
  if (is_primary) {
    const { error: updateErr } = await supabase
      .schema('hema')
      .from('patient_diagnoses')
      .update({ is_primary: false })
      .eq('patient_id', patient_id)
      .eq('is_primary', true)

    if (updateErr) {
      return { success: false, error: `Error al actualizar diagnóstico primario: ${updateErr.message}` }
    }
  }

  const { data, error } = await supabase
    .schema('hema')
    .from('patient_diagnoses')
    .insert({
      patient_id,
      diagnosis_code,
      staging:      staging || null,
      is_primary,
      diagnosed_at: new Date().toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23503') {
      return { success: false, error: 'Código de diagnóstico inválido o no encontrado en el catálogo.' }
    }
    if (error.code === '23505') {
      return { success: false, error: 'Este diagnóstico ya está registrado para este paciente.' }
    }
    return { success: false, error: `Error al guardar diagnóstico: ${error.message}` }
  }

  return { success: true, diagnosisId: (data as { id: string }).id }
}
