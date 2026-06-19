'use client'

import { Suspense, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { LAB_PARAMS, calculateCockcroftGault, type LabParamCode } from '@salurama/hema-shared'
import LabValueFields from './LabValueFields'
import OcrDropzone from './OcrDropzone'
import { createLabPanel } from '../actions'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PatientRow {
  id: string
  display_name: string
  birth_date: string
  sex: 'M' | 'F'
  last_weight_kg: number | null
}

type ValuesState = Record<LabParamCode, string>

const CAPTURABLE_CODES = LAB_PARAMS.filter((p) => !p.computed).map((p) => p.code)

function emptyValues(): ValuesState {
  return Object.fromEntries(CAPTURABLE_CODES.map((c) => [c, ''])) as ValuesState
}

function calcAge(birthDate: string): number {
  const today = new Date()
  const born  = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

function nowLocalDatetime(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// ─── Contenido ───────────────────────────────────────────────────────────────

function NuevoLabContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams.get('patient')

  const [patient, setPatient] = useState<PatientRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [values, setValues] = useState<ValuesState>(emptyValues())
  const [collectedAt, setCollectedAt] = useState(nowLocalDatetime())
  const [apiError, setApiError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace(`/login?next=/hema/labs/nuevo${patientId ? `?patient=${patientId}` : ''}`); return }

      if (!patientId) { setLoadError('Falta el paciente. Vuelve al perfil del paciente y usa "Subir labs".'); setLoading(false); return }

      const { data, error } = await supabase.rpc('hema_get_patient', { p_patient_id: patientId })
      if (!mounted) return
      if (error) { setLoadError(error.message); setLoading(false); return }
      const rows = data as PatientRow[]
      if (!rows || rows.length === 0) { setLoadError('Paciente no encontrado.'); setLoading(false); return }
      setPatient(rows[0])
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [patientId, router])

  // ── CrCl calculado en vivo (Cockcroft-Gault) ──────────────────────────────
  const { crcl, crclUnavailableReason } = useMemo(() => {
    const creatinine = parseFloat(values.creatinine)
    if (!patient || isNaN(creatinine) || creatinine <= 0) {
      return { crcl: null as number | null, crclUnavailableReason: null as string | null }
    }
    if (patient.last_weight_kg === null) {
      return { crcl: null, crclUnavailableReason: 'El paciente no tiene peso registrado — registra una medición primero.' }
    }
    try {
      const age = calcAge(patient.birth_date)
      const value = calculateCockcroftGault(creatinine, age, patient.sex, patient.last_weight_kg)
      return { crcl: value, crclUnavailableReason: null }
    } catch (err) {
      return { crcl: null, crclUnavailableReason: err instanceof Error ? err.message : 'No se pudo calcular' }
    }
  }, [values.creatinine, patient])

  function updateValue(code: LabParamCode, v: string) {
    setValues((prev) => ({ ...prev, [code]: v }))
  }

  const hasAnyValue = CAPTURABLE_CODES.some((c) => values[c].trim() !== '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patient) return
    setApiError(null)

    const entries = LAB_PARAMS
      .filter((p) => !p.computed)
      .filter((p) => values[p.code].trim() !== '')
      .map((p) => ({
        analyte: p.code,
        value: Number(values[p.code]),
        unit: p.unit,
        reference_low: p.reference_low ?? undefined,
        reference_high: p.reference_high ?? undefined,
      }))

    if (crcl !== null) {
      const crclParam = LAB_PARAMS.find((p) => p.code === 'crcl')!
      entries.push({
        analyte: 'crcl',
        value: crcl,
        unit: crclParam.unit,
        reference_low: crclParam.reference_low ?? undefined,
        reference_high: crclParam.reference_high ?? undefined,
      })
    }

    if (entries.length === 0) {
      setApiError('Captura al menos un valor de laboratorio.')
      return
    }

    const fd = new FormData()
    fd.set('patient_id', patient.id)
    fd.set('collected_at', collectedAt)
    fd.set('values_json', JSON.stringify(entries))

    startTransition(async () => {
      const result = await createLabPanel(fd)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => router.push(`/hema/pacientes/${patient.id}`), 1600)
      } else {
        setApiError(result.error)
      }
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (loadError || !patient) {
    return (
      <div style={{ padding: 20 }}>
        <Link href="/hema/pacientes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16, minHeight: 44 }}>
          <ArrowLeft size={16} /> Pacientes
        </Link>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12 }}>
          <AlertTriangle size={20} color="#DC2626" />
          <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 600 }}>{loadError ?? 'Paciente no encontrado'}</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
        <CheckCircle2 size={56} color="#16A34A" />
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: '#16A34A' }}>
          Labs guardados
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280' }}>Regresando al perfil de {patient.display_name}...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <Link
        href={`/hema/pacientes/${patient.id}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 20, minHeight: 44 }}
      >
        <ArrowLeft size={16} /> Perfil del paciente
      </Link>

      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
          borderRadius: 16, padding: '20px 20px 24px', marginBottom: 24, color: '#fff',
        }}
      >
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, marginBottom: 4, color: '#fff' }}>
          Nuevo panel de laboratorio
        </h1>
        <p style={{ fontSize: 13, color: '#A0BBCC' }}>{patient.display_name}</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <OcrDropzone />

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
              Fecha de toma
            </label>
            <input
              type="datetime-local"
              value={collectedAt}
              onChange={(e) => setCollectedAt(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10,
                border: '1.5px solid #D1D5DB', boxSizing: 'border-box', minHeight: 48,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          <LabValueFields
            values={values}
            onChange={updateValue}
            crclComputed={crcl}
            crclUnavailableReason={crclUnavailableReason}
          />
        </div>

        {apiError && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: 0 }}>{apiError}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !hasAnyValue}
          style={{
            width: '100%', padding: '16px',
            background: isPending || !hasAnyValue ? '#9CA3AF' : '#16A34A',
            color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            cursor: isPending || !hasAnyValue ? 'not-allowed' : 'pointer',
            minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background 0.15s',
            boxShadow: !hasAnyValue || isPending ? 'none' : '0 2px 8px rgba(22,163,74,0.3)',
          }}
        >
          {isPending ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              Guardando...
            </>
          ) : 'Guardar laboratorios'}
        </button>
      </form>
    </>
  )
}

// ─── Export con Suspense (useSearchParams lo requiere) ──────────────────────

export default function NuevoLabPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <NuevoLabContent />
    </Suspense>
  )
}
