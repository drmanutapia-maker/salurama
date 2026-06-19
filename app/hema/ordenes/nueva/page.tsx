'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, AlertTriangle, Check, ShieldAlert } from 'lucide-react'
import { initDoseAdjustments } from './calc'
import Step1Patient from './Step1Patient'
import Step2Protocol from './Step2Protocol'
import Step3Dose from './Step3Dose'
import Step4Review from './Step4Review'
import {
  DEFAULT_CLINICAL_INPUTS,
  type WizardPatient,
  type WizardProtocol,
  type WizardState,
  type WizardStep,
} from './types'

const ALLOWED_ROLES = ['medico', 'director_medico']

const STEPS: { n: WizardStep; label: string }[] = [
  { n: 1, label: 'Paciente' },
  { n: 2, label: 'Protocolo' },
  { n: 3, label: 'Dosis' },
  { n: 4, label: 'Revisión' },
]

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

const INITIAL_STATE: WizardState = {
  step: 1,
  patient: null,
  protocol: null,
  cycleNumber: 1,
  scheduledFor: todayIso(),
  clinicalInputs: DEFAULT_CLINICAL_INPUTS,
  doseAdjustments: [],
  overrides: [],
  validation: null,
  validating: false,
}

// ─── Tipos auxiliares para el fetch del deep-link ───────────────────────────

interface PatientDetailRow {
  id: string
  curp: string
  display_name: string
  birth_date: string
  sex: 'M' | 'F'
  allergies: string | null
}
interface MeasurementRow {
  id: string
  measured_at: string
  weight_kg: number
  height_cm: number
  bsa_mosteller: number
  bsa_dubois: number
}
interface PrimaryDxRow {
  diagnosis_code: string
  diagnoses: { description_es: string }[] | { description_es: string } | null
}

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: WizardStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {STEPS.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#16A34A' : active ? '#1E3A5F' : '#F3F4F6',
                  color: done || active ? '#fff' : '#9CA3AF',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}
              >
                {done ? <Check size={15} /> : s.n}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#1E3A5F' : '#9CA3AF', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#16A34A' : '#F3F4F6', margin: '0 6px 16px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

function NuevaIndicacionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [role, setRole] = useState<string | null>(null)
  const [roleChecked, setRoleChecked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)

  const [state, setState] = useState<WizardState>(INITIAL_STATE)

  function handleSelectPatient(patient: WizardPatient) {
    setState((s) => {
      const samePatient = s.patient?.id === patient.id
      return {
        ...s,
        patient,
        protocol: samePatient ? s.protocol : null,
        doseAdjustments: samePatient ? s.doseAdjustments : [],
        overrides: samePatient ? s.overrides : [],
        validation: samePatient ? s.validation : null,
        step: 2,
      }
    })
  }

  useEffect(() => {
    let mounted = true

    async function fetchAndSelectPatient(patientId: string) {
      const [patRes, measRes, dxRes] = await Promise.all([
        supabase.rpc('hema_get_patient', { p_patient_id: patientId }),
        supabase.schema('hema').from('patient_measurements')
          .select('id, measured_at, weight_kg, height_cm, bsa_mosteller, bsa_dubois')
          .eq('patient_id', patientId)
          .order('measured_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.schema('hema').from('patient_diagnoses')
          .select('diagnosis_code, diagnoses(description_es)')
          .eq('patient_id', patientId)
          .eq('is_primary', true)
          .maybeSingle(),
      ])

      if (!mounted) return

      if (patRes.error) { setDeepLinkError(patRes.error.message); return }
      const rows = patRes.data as PatientDetailRow[]
      if (!rows || rows.length === 0) { setDeepLinkError('Paciente no encontrado.'); return }
      const p = rows[0]

      const measurement = measRes.data as MeasurementRow | null
      if (!measurement) {
        setDeepLinkError('Este paciente no tiene mediciones de peso/talla registradas. Selecciónalo manualmente abajo.')
        return
      }

      const dxRow = dxRes.data as PrimaryDxRow | null
      if (!dxRow) {
        setDeepLinkError('Este paciente no tiene un diagnóstico primario registrado. Selecciónalo manualmente abajo.')
        return
      }
      const dxInfo = Array.isArray(dxRow.diagnoses) ? dxRow.diagnoses[0] : dxRow.diagnoses

      handleSelectPatient({
        id: p.id,
        curp: p.curp,
        display_name: p.display_name,
        birth_date: p.birth_date,
        sex: p.sex,
        allergies: p.allergies,
        primary_dx_code: dxRow.diagnosis_code,
        primary_dx_desc: dxInfo?.description_es ?? null,
        measurement_id: measurement.id,
        measured_at: measurement.measured_at,
        weight_kg: measurement.weight_kg,
        height_cm: measurement.height_cm,
        bsa_mosteller: measurement.bsa_mosteller,
        bsa_dubois: measurement.bsa_dubois,
      })
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/hema/ordenes/nueva'); return }

      const { data, error } = await supabase.rpc('hema_get_my_role')
      if (!mounted) return

      if (error) { setInitError(error.message); setRoleChecked(true); return }

      const userRole = (data as string) ?? null
      setRole(userRole)
      setCurrentUserId(session.user.id)
      setRoleChecked(true)

      const patientId = searchParams.get('patient')
      if (patientId && userRole && ALLOWED_ROLES.includes(userRole)) {
        await fetchAndSelectPatient(patientId)
      }
    }

    init()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams])

  function handleSelectProtocol(protocol: WizardProtocol, suggestedCycleNumber: number) {
    setState((s) => {
      if (!s.patient) return s
      const doseAdjustments = initDoseAdjustments(protocol.drugs, s.patient.bsa_mosteller, s.patient.weight_kg)
      return {
        ...s,
        protocol,
        cycleNumber: suggestedCycleNumber,
        doseAdjustments,
        overrides: [],
        validation: null,
        step: 3,
      }
    })
  }

  function handleSubmitted(orderId: string) {
    router.push(`/hema/pacientes/${state.patient?.id}?order=${orderId}`)
  }

  function goBack() { setState((s) => ({ ...s, step: Math.max(1, s.step - 1) as WizardStep })) }
  function goNext() { setState((s) => ({ ...s, step: Math.min(4, s.step + 1) as WizardStep })) }

  // ── Acceso restringido ───────────────────────────────────────────────────
  if (roleChecked && (!role || !ALLOWED_ROLES.includes(role))) {
    return (
      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 24 }}>
        <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>Acceso restringido</p>
          <p style={{ fontSize: 13, color: '#DC2626' }}>
            Crear indicaciones es exclusivo para médicos y director médico.
          </p>
        </div>
      </div>
    )
  }

  if (!roleChecked || !currentUserId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (initError) {
    return (
      <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20 }}>
        <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{initError}</p>
      </div>
    )
  }

  const canContinue =
    state.step === 1 ? state.patient !== null :
    state.step === 2 ? state.protocol !== null :
    state.step === 3 ? state.validation !== null && !state.validation.hasUnresolvedBlocks && !state.validating :
    false

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      <Link
        href="/hema/pacientes"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16, minHeight: 44 }}
      >
        <ArrowLeft size={16} /> Pacientes
      </Link>

      <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: '#1E3A5F', marginBottom: 16 }}>
        Nueva indicación
      </h1>

      {state.step === 1 && deepLinkError && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, display: 'flex', gap: 10 }}>
          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#92400E', fontWeight: 600, margin: 0 }}>{deepLinkError}</p>
        </div>
      )}

      <Stepper current={state.step} />

      {state.step === 1 && (
        <Step1Patient selectedPatientId={state.patient?.id ?? null} onSelect={handleSelectPatient} />
      )}

      {state.step === 2 && state.patient && (
        <Step2Protocol patient={state.patient} selectedProtocolId={state.protocol?.id ?? null} onSelect={handleSelectProtocol} />
      )}

      {state.step === 3 && state.patient && state.protocol && (
        <Step3Dose
          patient={state.patient}
          protocol={state.protocol}
          currentUserId={currentUserId}
          clinicalInputs={state.clinicalInputs}
          doseAdjustments={state.doseAdjustments}
          overrides={state.overrides}
          validation={state.validation}
          validating={state.validating}
          onClinicalInputsChange={(v) => setState((s) => ({ ...s, clinicalInputs: v }))}
          onDoseAdjustmentsChange={(v) => setState((s) => ({ ...s, doseAdjustments: v }))}
          onOverridesChange={(v) => setState((s) => ({ ...s, overrides: v }))}
          onValidationChange={(v) => setState((s) => ({ ...s, validation: v }))}
          onValidatingChange={(v) => setState((s) => ({ ...s, validating: v }))}
        />
      )}

      {state.step === 4 && state.patient && state.protocol && (
        <Step4Review
          patient={state.patient}
          protocol={state.protocol}
          cycleNumber={state.cycleNumber}
          scheduledFor={state.scheduledFor}
          ecog={state.clinicalInputs.ecog}
          doseAdjustments={state.doseAdjustments}
          validation={state.validation}
          validating={state.validating}
          overrides={state.overrides}
          onCycleNumberChange={(n) => setState((s) => ({ ...s, cycleNumber: n }))}
          onScheduledForChange={(d) => setState((s) => ({ ...s, scheduledFor: d }))}
          onSubmitted={handleSubmitted}
        />
      )}

      {/* ── Navegación inferior (pasos 1–3; el paso 4 tiene su propio botón) ── */}
      {state.step < 4 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          {state.step > 1 && (
            <button
              onClick={goBack}
              style={{
                flex: 1, padding: '14px', background: '#fff', border: '1.5px solid #E5E7EB',
                color: '#374151', borderRadius: 14, fontSize: 15, fontWeight: 700,
                cursor: 'pointer', minHeight: 52,
              }}
            >
              Atrás
            </button>
          )}
          <button
            onClick={goNext}
            disabled={!canContinue}
            style={{
              flex: 2, padding: '14px',
              background: !canContinue ? '#9CA3AF' : '#1E3A5F',
              color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700,
              cursor: !canContinue ? 'not-allowed' : 'pointer', minHeight: 52,
            }}
          >
            Continuar
          </button>
        </div>
      )}

      {state.step === 4 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={goBack}
            style={{
              width: '100%', padding: '12px', background: 'none', border: 'none',
              color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 44,
            }}
          >
            ← Volver a ajustar dosis
          </button>
        </div>
      )}
    </>
  )
}

// ─── Export con Suspense (useSearchParams lo requiere) ──────────────────────

export default function NuevaIndicacionPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <NuevaIndicacionContent />
    </Suspense>
  )
}
