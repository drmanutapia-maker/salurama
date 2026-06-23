'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import BsaCard from '@/components/hema/BsaCard'
import LabsSummaryCard, { type LabValueRow } from '@/components/hema/LabsSummaryCard'
import {
  ArrowLeft,
  Plus,
  FlaskConical,
  FileText,
  Ruler,
  AlertCircle,
  AlertTriangle,
  Activity,
  ChevronRight,
  Stethoscope,
  X,
  Search,
  Loader2,
} from 'lucide-react'
import { searchDiagnosis, CIE10_CATALOG } from '@salurama/hema-shared'
import type { Diagnosis, DiagnosisCategory } from '@salurama/hema-shared'
import { addDiagnosis } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientDetail {
  id: string
  curp: string
  display_name: string
  birth_date: string
  sex: 'M' | 'F'
  allergies: string | null
  nss: string | null
  tenant_id: string
  created_at: string
  last_measured_at: string | null
  last_weight_kg: number | null
  last_height_cm: number | null
  last_bsa_mosteller: number | null
  last_bsa_dubois: number | null
}

interface Measurement {
  id: string
  measured_at: string
  weight_kg: number
  height_cm: number
  bsa_mosteller: number
  bsa_dubois: number
}

interface PatientDiagnosis {
  id: string
  diagnosis_code: string
  diagnosed_at: string
  staging: string | null
  is_primary: boolean
  // Relación muchos-a-uno (patient_diagnoses.diagnosis_code → diagnoses.code):
  // PostgREST embebe el lado "uno" como objeto singular, no como arreglo.
  diagnoses: {
    code: string
    description_es: string
    category: string | null
  } | null
}

interface RecentOrder {
  id: string
  status: string
  cycle_number: number
  scheduled_for: string
  // Relación muchos-a-uno (orders.protocol_id → protocols.id):
  // PostgREST embebe el lado "uno" como objeto singular, no como arreglo.
  protocols: { code: string; name: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcAge(birthDate: string): number {
  const today = new Date()
  const born  = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function maskCurp(curp: string): string {
  if (curp.length !== 18) return curp
  return `${curp.slice(0, 4)}••••••••••${curp.slice(14)}`
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#9CA3AF', validated: '#D97706', signed: '#16A34A',
  dispensed: '#1E3A5F', administered: '#2A9D8F', cancelled: '#DC2626',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', validated: 'Por firmar', signed: 'Firmada',
  dispensed: 'Dispensada', administered: 'Administrada', cancelled: 'Cancelada',
}

const DX_CATEGORY_COLOR: Record<string, string> = {
  mieloma: '#7C3AED', linfoma: '#0369A1', leucemia: '#DC2626',
  mds: '#B45309', mpn: '#047857', otro: '#6B7280',
}

const CATEGORY_LABELS: Record<string, string> = {
  mieloma: 'Mieloma', linfoma: 'Linfoma', leucemia: 'Leucemia',
  mds: 'MDS', mpn: 'MPN', otro: 'Otro',
}

const CATEGORIES = ['mieloma', 'linfoma', 'leucemia', 'mds', 'mpn', 'otro'] as const

// ─── BSA Mini-chart ──────────────────────────────────────────────────────────

function BsaChart({ measurements }: { measurements: Measurement[] }) {
  if (measurements.length === 0) return null
  const values = measurements.map((m) => m.bsa_mosteller)
  const maxVal = Math.max(...values, 2.5)
  const minVal = Math.min(...values, 1.0)
  const range  = maxVal - minVal || 1

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        Historial BSA (Mosteller)
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64 }}>
        {measurements.slice(0, 10).reverse().map((m, i) => {
          const pct = ((m.bsa_mosteller - minVal) / range) * 0.75 + 0.25
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
              <span style={{ fontSize: 9, color: '#6B7280', textAlign: 'center' }}>
                {m.bsa_mosteller.toFixed(2)}
              </span>
              <div
                title={`${formatDate(m.measured_at)} — ${m.bsa_mosteller} m²`}
                style={{
                  width: '100%',
                  height: `${Math.round(pct * 40)}px`,
                  background: i === measurements.slice(0, 10).length - 1 ? '#1E3A5F' : '#93C5FD',
                  borderRadius: 4,
                  minHeight: 6,
                }}
              />
              {i === 0 && (
                <span style={{ fontSize: 9, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {formatDate(m.measured_at).split(' ').slice(0, 2).join(' ')}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
        {measurements.length} medición{measurements.length !== 1 ? 'es' : ''} registrada{measurements.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

// ─── Diagnosis Modal ──────────────────────────────────────────────────────────

function DiagnosisModal({
  open,
  patientId,
  onClose,
  onSaved,
}: {
  open: boolean
  patientId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [mode, setMode]                     = useState<'search' | 'detail'>('search')
  const [query, setQuery]                   = useState('')
  const [activeCategory, setActiveCategory] = useState<DiagnosisCategory | null>(null)
  const [selected, setSelected]             = useState<Diagnosis | null>(null)
  const [stagingText, setStagingText]       = useState('')
  const [isPrimary, setIsPrimary]           = useState(true)
  const [isPending, startTransition]        = useTransition()
  const [apiError, setApiError]             = useState<string | null>(null)

  const results = useMemo(() => {
    if (query.trim().length > 0) return searchDiagnosis(query, activeCategory ?? undefined)
    if (activeCategory) return CIE10_CATALOG.filter(d => d.category === activeCategory)
    return []
  }, [query, activeCategory])

  function reset() {
    setMode('search')
    setQuery('')
    setActiveCategory(null)
    setSelected(null)
    setStagingText('')
    setIsPrimary(true)
    setApiError(null)
  }

  function handleClose() { reset(); onClose() }
  function handleBack()  { setMode('search'); setSelected(null); setApiError(null) }

  function handleSelect(dx: Diagnosis) {
    setSelected(dx)
    setMode('detail')
    setApiError(null)
  }

  function handleSubmit() {
    if (!selected) return
    setApiError(null)
    const fd = new FormData()
    fd.set('patient_id',     patientId)
    fd.set('diagnosis_code', selected.code)
    fd.set('staging',        stagingText)
    fd.set('is_primary',     String(isPrimary))

    startTransition(async () => {
      const result = await addDiagnosis(fd)
      if (result.success) {
        reset()
        onSaved()
        onClose()
      } else {
        setApiError(result.error)
      }
    })
  }

  if (!open) return null

  const catColor = selected
    ? (DX_CATEGORY_COLOR[selected.category ?? 'otro'] ?? '#6B7280')
    : '#6B7280'

  return (
    <>
      <style>{`@keyframes dx-slide { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }}
      />

      {/* Bottom sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
          background: '#fff', borderRadius: '20px 20px 0 0',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
          animation: 'dx-slide 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
            borderRadius: '20px 20px 0 0',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}
        >
          {mode === 'detail' && (
            <button
              onClick={handleBack}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <ArrowLeft size={18} color="#fff" />
            </button>
          )}
          <h2 style={{ flex: 1, fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: '#fff', margin: 0 }}>
            {mode === 'search' ? 'Buscar diagnóstico' : 'Agregar diagnóstico'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
              width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} color="#fff" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ─── Search mode ─── */}
          {mode === 'search' && (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Search input */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={16} color="#9CA3AF"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                />
                <input
                  autoFocus
                  type="text"
                  placeholder="Mieloma, linfoma, C90.0..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '13px 14px 13px 40px',
                    fontSize: 16, border: '1.5px solid #E5E7EB',
                    borderRadius: 12, background: '#F9FAFB', outline: 'none',
                    boxSizing: 'border-box', minHeight: 48,
                  }}
                />
              </div>

              {/* Category filter chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveCategory(null)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 36,
                    background: !activeCategory ? '#1E3A5F' : '#fff',
                    color:      !activeCategory ? '#fff' : '#6B7280',
                    borderColor: !activeCategory ? '#1E3A5F' : '#E5E7EB',
                  }}
                >
                  Todos
                </button>
                {CATEGORIES.map((cat) => {
                  const active = activeCategory === cat
                  const col    = DX_CATEGORY_COLOR[cat] ?? '#6B7280'
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(active ? null : cat)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 36,
                        background:  active ? `${col}15` : '#fff',
                        color:       active ? col : '#6B7280',
                        borderColor: active ? col : '#E5E7EB',
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  )
                })}
              </div>

              {/* Results */}
              {query.trim().length === 0 && !activeCategory ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <Search size={32} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
                    Escribe o selecciona una categoría
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
                    Sin resultados para &ldquo;{query}&rdquo;
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {results.map((dx) => {
                    const col = DX_CATEGORY_COLOR[dx.category ?? 'otro'] ?? '#6B7280'
                    return (
                      <button
                        key={dx.code}
                        onClick={() => handleSelect(dx)}
                        style={{
                          display: 'flex', gap: 12, alignItems: 'flex-start',
                          padding: '12px 14px', borderRadius: 12,
                          border: '1px solid #F3F4F6', background: '#fff',
                          textAlign: 'left', cursor: 'pointer', width: '100%', minHeight: 56,
                        }}
                      >
                        <span style={{
                          fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                          color: col, flexShrink: 0, paddingTop: 2,
                        }}>
                          {dx.code}
                        </span>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>
                            {dx.description_es}
                          </p>
                          <span style={{
                            fontSize: 10, fontWeight: 700, background: `${col}18`, color: col,
                            borderRadius: 6, padding: '1px 6px',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {CATEGORY_LABELS[dx.category ?? 'otro'] ?? dx.category}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── Detail mode ─── */}
          {mode === 'detail' && selected && (
            <div style={{ padding: '20px' }}>

              {/* Selected dx card */}
              <div style={{
                background: `${catColor}0D`, border: `1.5px solid ${catColor}30`,
                borderRadius: 14, padding: '16px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 900, color: catColor }}>
                    {selected.code}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: `${catColor}20`, color: catColor,
                    borderRadius: 6, padding: '2px 8px',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    {CATEGORY_LABELS[selected.category ?? 'otro'] ?? selected.category}
                  </span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>
                  {selected.description_es}
                </p>
              </div>

              {/* Estadificación */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                  Estadificación{' '}
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="ISS III, Ann Arbor IVB, IPSS-R Alto..."
                  value={stagingText}
                  onChange={(e) => setStagingText(e.target.value)}
                  maxLength={100}
                  style={{
                    width: '100%', padding: '14px 16px',
                    fontSize: 15, border: '1.5px solid #D1D5DB',
                    borderRadius: 12, outline: 'none',
                    boxSizing: 'border-box', minHeight: 52, background: '#fff',
                  }}
                />
              </div>

              {/* isPrimary checkbox */}
              <label
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: isPrimary ? 'rgba(30,58,95,0.05)' : '#F9FAFB',
                  border: `1.5px solid ${isPrimary ? 'rgba(30,58,95,0.25)' : '#E5E7EB'}`,
                  borderRadius: 14, cursor: 'pointer', marginBottom: 20,
                  minHeight: 64,
                }}
              >
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  style={{ width: 22, height: 22, accentColor: '#1E3A5F', cursor: 'pointer', flexShrink: 0 }}
                />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
                    Diagnóstico primario
                  </p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                    Define los protocolos disponibles en la indicación
                  </p>
                </div>
              </label>

              {/* API Error */}
              {apiError && (
                <div style={{
                  marginBottom: 16, padding: '12px 16px',
                  background: '#FEF2F2', border: '1px solid #FCA5A5',
                  borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                  <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: 0 }}>{apiError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit footer — solo en modo detail */}
        {mode === 'detail' && (
          <div style={{ padding: '12px 20px 24px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              style={{
                width: '100%', padding: '16px',
                background: isPending ? '#9CA3AF' : '#16A34A',
                color: '#fff', border: 'none', borderRadius: 14,
                fontSize: 16, fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
                minHeight: 56,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'background 0.15s',
                boxShadow: isPending ? 'none' : '0 2px 8px rgba(22,163,74,0.3)',
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                  Guardando...
                </>
              ) : 'Guardar diagnóstico'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const router    = useRouter()
  const params    = useParams()
  const patientId = params.id as string

  const [patient, setPatient]           = useState<PatientDetail | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [diagnoses, setDiagnoses]       = useState<PatientDiagnosis[]>([])
  const [orders, setOrders]             = useState<RecentOrder[]>([])
  const [labPanel, setLabPanel]         = useState<{ collected_at: string; values: LabValueRow[] } | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [modalOpen, setModalOpen]       = useState(false)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/hema/pacientes'); return }

      const [patRes, measRes, dxRes, ordRes, labRes] = await Promise.all([
        supabase.rpc('hema_get_patient', { p_patient_id: patientId }),
        supabase.schema('hema').from('patient_measurements')
          .select('id, measured_at, weight_kg, height_cm, bsa_mosteller, bsa_dubois')
          .eq('patient_id', patientId)
          .order('measured_at', { ascending: false })
          .limit(20),
        supabase.schema('hema').from('patient_diagnoses')
          .select('id, diagnosis_code, diagnosed_at, staging, is_primary, diagnoses(code, description_es, category)')
          .eq('patient_id', patientId)
          .order('is_primary', { ascending: false }),
        supabase.schema('hema').from('orders')
          .select('id, status, cycle_number, scheduled_for, protocols(code, name)')
          .eq('patient_id', patientId)
          .order('scheduled_for', { ascending: false })
          .limit(5),
        supabase.rpc('hema_get_lab_panels', { p_patient_id: patientId, p_limit: 1 }),
      ])

      if (!mounted) return

      if (patRes.error) { setError(patRes.error.message); setLoading(false); return }

      const rows = patRes.data as PatientDetail[]
      if (!rows || rows.length === 0) { setError('Paciente no encontrado'); setLoading(false); return }

      setPatient(rows[0])
      setMeasurements((measRes.data as Measurement[]) ?? [])
      setDiagnoses(((dxRes.data as unknown) as PatientDiagnosis[]) ?? [])
      setOrders(((ordRes.data as unknown) as RecentOrder[]) ?? [])
      if (labRes.error) console.error('hema_get_lab_panels:', labRes.error.message)
      const labRows = (labRes.data as { collected_at: string; lab_values: LabValueRow[] }[]) ?? []
      setLabPanel(labRows[0] ? { collected_at: labRows[0].collected_at, values: labRows[0].lab_values } : null)
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [patientId, router])

  async function reloadDiagnoses() {
    const { data } = await supabase
      .schema('hema')
      .from('patient_diagnoses')
      .select('id, diagnosis_code, diagnosed_at, staging, is_primary, diagnoses(code, description_es, category)')
      .eq('patient_id', patientId)
      .order('is_primary', { ascending: false })
    if (data) setDiagnoses((data as unknown) as PatientDiagnosis[])
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div style={{ padding: 20 }}>
        <Link href="/hema/pacientes" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={16} /> Pacientes
        </Link>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12 }}>
          <AlertCircle size={20} color="#DC2626" />
          <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 600 }}>{error ?? 'Paciente no encontrado'}</p>
        </div>
      </div>
    )
  }

  const age = calcAge(patient.birth_date)
  const hasRecentMeasurement = patient.last_measured_at !== null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* ─── Back ──────────────────────────────────────────────────────── */}
      <Link
        href="/hema/pacientes"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16, minHeight: 44 }}
      >
        <ArrowLeft size={16} /> Pacientes
      </Link>

      {/* ─── Patient header card ────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
          borderRadius: 16,
          padding: '20px 20px 24px',
          marginBottom: 16,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: patient.sex === 'F' ? '#FCE7F3' : '#DBEAFE',
              color: patient.sex === 'F' ? '#BE185D' : '#1E40AF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 20,
              fontFamily: 'Fraunces, serif', flexShrink: 0,
            }}
          >
            {(patient.display_name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 2, lineHeight: 1.2 }}>
              {patient.display_name}
            </h1>
            <p style={{ fontSize: 12, color: '#7EA8C9', fontFamily: 'monospace', marginBottom: 4 }}>
              {maskCurp(patient.curp)}
            </p>
            <p style={{ fontSize: 13, color: '#A0BBCC' }}>
              {age} años · {patient.sex === 'F' ? 'Femenino' : 'Masculino'}
              {patient.nss ? ` · NSS: ${patient.nss}` : ''}
            </p>
          </div>
        </div>

        {patient.allergies && (
          <div
            style={{
              marginTop: 14, padding: '8px 12px',
              background: 'rgba(220,38,38,0.18)',
              borderRadius: 10, border: '1px solid rgba(220,38,38,0.3)',
            }}
          >
            <p style={{ fontSize: 12, color: '#fff', fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={13} color="#fff" />
              Alergias
            </p>
            <p style={{ fontSize: 13, color: '#FEF9C3' }}>{patient.allergies}</p>
          </div>
        )}
      </div>

      {/* ─── Quick actions ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Nueva medición',   href: `/hema/pacientes/${patientId}/medicion`, icon: Ruler,       color: '#1E3A5F' },
          { label: 'Nueva indicación', href: `/hema/ordenes/nueva?patient=${patientId}`, icon: FileText, color: '#16A34A' },
          { label: 'Subir labs',       href: `/hema/labs/nuevo?patient=${patientId}`,    icon: FlaskConical, color: '#7C3AED' },
        ].map(({ label, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '14px 8px',
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
              textDecoration: 'none', textAlign: 'center', minHeight: 72,
              fontSize: 12, fontWeight: 700, color: '#374151',
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            {label}
          </Link>
        ))}
      </div>

      {/* ─── BSA / medición ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Superficie corporal
          </h2>
          <Link
            href={`/hema/pacientes/${patientId}/medicion`}
            style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, minHeight: 44 }}
          >
            <Plus size={14} /> Nueva
          </Link>
        </div>

        {hasRecentMeasurement ? (
          <div>
            <BsaCard
              mosteller={patient.last_bsa_mosteller!}
              dubois={patient.last_bsa_dubois!}
              measuredAt={patient.last_measured_at!}
              weightKg={patient.last_weight_kg!}
              heightCm={patient.last_height_cm!}
            />
            <BsaChart measurements={measurements} />
          </div>
        ) : (
          <div
            style={{
              background: '#FFFBEB', border: '1.5px dashed #D97706',
              borderRadius: 14, padding: '24px 20px', textAlign: 'center',
            }}
          >
            <Activity size={32} color="#D97706" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
              Sin mediciones registradas
            </p>
            <p style={{ fontSize: 13, color: '#B45309', marginBottom: 16 }}>
              Registra peso y talla para calcular la superficie corporal
            </p>
            <Link
              href={`/hema/pacientes/${patientId}/medicion`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#D97706', color: '#fff',
                borderRadius: 12, padding: '10px 20px',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}
            >
              <Ruler size={15} /> Registrar medición
            </Link>
          </div>
        )}
      </div>

      {/* ─── Labs recientes ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Labs recientes
          </h2>
          <Link
            href={`/hema/labs/nuevo?patient=${patientId}`}
            style={{ fontSize: 13, color: '#7C3AED', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, minHeight: 44 }}
          >
            <Plus size={14} /> Subir labs
          </Link>
        </div>

        {labPanel && labPanel.values.length > 0 ? (
          <LabsSummaryCard collectedAt={labPanel.collected_at} values={labPanel.values} />
        ) : (
          <div
            style={{
              background: '#F9FAFB', border: '1.5px dashed #D1D5DB',
              borderRadius: 14, padding: '24px 20px', textAlign: 'center',
            }}
          >
            <FlaskConical size={32} color="#D1D5DB" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>
              Sin laboratorios registrados
            </p>
            <Link
              href={`/hema/labs/nuevo?patient=${patientId}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#7C3AED', color: '#fff',
                borderRadius: 12, padding: '10px 20px', marginTop: 12,
                fontSize: 14, fontWeight: 700, textDecoration: 'none', minHeight: 48,
              }}
            >
              <FlaskConical size={15} /> Subir labs
            </Link>
          </div>
        )}
      </div>

      {/* ─── Diagnósticos ───────────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Diagnósticos
          </h2>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: '#1E3A5F', fontSize: 13, fontWeight: 700,
              padding: '8px 4px', minHeight: 44,
            }}
          >
            <Plus size={14} /> Agregar
          </button>
        </div>

        {diagnoses.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Stethoscope size={28} color="#D1D5DB" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>Sin diagnósticos registrados</p>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#1E3A5F', color: '#fff',
                borderRadius: 10, padding: '8px 16px',
                fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
              }}
            >
              <Plus size={13} /> Agregar diagnóstico
            </button>
          </div>
        ) : (
          diagnoses.map((dx, i) => {
            const dxInfo   = dx.diagnoses
            const cat      = dxInfo?.category ?? 'otro'
            const catColor = DX_CATEGORY_COLOR[cat] ?? '#6B7280'
            return (
              <div
                key={dx.id}
                style={{
                  padding: '14px 16px',
                  borderBottom: i < diagnoses.length - 1 ? '1px solid #F3F4F6' : 'none',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${catColor}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                    fontFamily: 'Fraunces, serif', fontSize: 11, fontWeight: 900, color: catColor,
                  }}
                >
                  {cat.slice(0, 3).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: catColor }}>
                      {dxInfo?.code ?? dx.diagnosis_code}
                    </span>
                    {/* Badge primario/secundario */}
                    <span style={{
                      fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '1px 6px',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: dx.is_primary ? '#DCFCE7' : '#F3F4F6',
                      color:      dx.is_primary ? '#16A34A' : '#9CA3AF',
                    }}>
                      {dx.is_primary ? 'Principal' : 'Secundario'}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#111827', fontWeight: 600, marginBottom: 2 }}>
                    {dxInfo?.description_es ?? ''}
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                    Diagnóstico: {formatDate(dx.diagnosed_at)}
                    {dx.staging ? ` · ${dx.staging}` : ''}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ─── Últimas indicaciones ────────────────────────────────────────── */}
      <div
        style={{
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Indicaciones recientes
          </h2>
          <Link
            href={`/hema/ordenes/nueva?patient=${patientId}`}
            style={{ fontSize: 13, color: '#16A34A', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, minHeight: 44 }}
          >
            <Plus size={14} /> Nueva
          </Link>
        </div>

        {orders.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <FileText size={28} color="#D1D5DB" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin indicaciones para este paciente</p>
          </div>
        ) : (
          orders.map((o, i) => (
            <Link
              key={o.id}
              href={`/hema/ordenes/${o.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: i < orders.length - 1 ? '1px solid #F3F4F6' : 'none',
                textDecoration: 'none', minHeight: 60,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[o.status] ?? '#9CA3AF', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                  {(o.protocols?.code) ?? '—'} · Ciclo {o.cycle_number}
                </p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {formatDate(o.scheduled_for)} ·{' '}
                  <span style={{ color: STATUS_COLOR[o.status], fontWeight: 600 }}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </p>
              </div>
              <ChevronRight size={16} color="#D1D5DB" />
            </Link>
          ))
        )}
      </div>

      {/* ─── Fecha registro ─────────────────────────────────────────────── */}
      <p style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'center', marginTop: 8 }}>
        Paciente registrado el {formatDate(patient.created_at)}
      </p>

      {/* ─── Diagnosis Modal ─────────────────────────────────────────────── */}
      <DiagnosisModal
        open={modalOpen}
        patientId={patientId}
        onClose={() => setModalOpen(false)}
        onSaved={reloadDiagnoses}
      />
    </>
  )
}
