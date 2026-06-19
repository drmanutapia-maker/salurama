'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Search, User, ChevronRight, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import type { WizardPatient } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientListRow {
  id: string
  curp: string
  display_name: string
  birth_date: string
  sex: 'M' | 'F'
  primary_dx_code: string | null
  primary_dx_desc: string | null
}

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

interface Step1PatientProps {
  selectedPatientId: string | null
  onSelect: (patient: WizardPatient) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskCurp(curp: string): string {
  if (curp.length !== 18) return curp
  return `${curp.slice(0, 4)}••••••••••${curp.slice(14)}`
}

function calcAge(birthDate: string): number {
  const today = new Date()
  const born = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Step1Patient({ selectedPatientId, onSelect }: Step1PatientProps) {
  const [patients, setPatients] = useState<PatientListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [issueId, setIssueId] = useState<string | null>(null)
  const [issueMsg, setIssueMsg] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data, error: rpcError } = await supabase.rpc('hema_list_patients', {
        p_limit: 200,
        p_offset: 0,
      })
      if (!mounted) return
      if (rpcError) { setError(rpcError.message); setLoading(false); return }
      setPatients((data as PatientListRow[]) ?? [])
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return patients
    const q = query.toUpperCase().trim()
    return patients.filter(
      (p) =>
        p.curp.includes(q) ||
        p.display_name.toUpperCase().includes(q) ||
        (p.primary_dx_code ?? '').includes(q),
    )
  }, [patients, query])

  async function handlePick(patientId: string) {
    setIssueId(null)
    setIssueMsg(null)
    setLoadingId(patientId)

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

    setLoadingId(null)

    if (patRes.error) { setIssueId(patientId); setIssueMsg(patRes.error.message); return }
    const rows = patRes.data as PatientDetailRow[]
    if (!rows || rows.length === 0) { setIssueId(patientId); setIssueMsg('Paciente no encontrado.'); return }
    const p = rows[0]

    const measurement = measRes.data as MeasurementRow | null
    if (!measurement) {
      setIssueId(patientId)
      setIssueMsg('Este paciente no tiene mediciones de peso/talla registradas. Regístralas antes de continuar.')
      return
    }

    const dxRow = dxRes.data as PrimaryDxRow | null
    if (!dxRow) {
      setIssueId(patientId)
      setIssueMsg('Este paciente no tiene un diagnóstico primario registrado. Agrégalo antes de continuar.')
      return
    }
    const dxInfo = Array.isArray(dxRow.diagnoses) ? dxRow.diagnoses[0] : dxRow.diagnoses

    onSelect({
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

  return (
    <div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
        Selecciona el paciente
      </h2>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
        Busca por nombre o CURP. El paciente debe tener medición de BSA y diagnóstico primario registrados.
      </p>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Buscar por CURP o nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 14px 12px 42px', fontSize: 14, borderRadius: 12,
            border: '1.5px solid #E5E7EB', background: '#fff', fontFamily: "'DM Sans', sans-serif",
            boxSizing: 'border-box', minHeight: 48,
          }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, height: 76 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12 }}>
          <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
          <User size={36} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>
            {query ? `Sin resultados para "${query}"` : 'Sin pacientes registrados'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((p) => {
            const isSelected = selectedPatientId === p.id
            const isLoading = loadingId === p.id
            const hasIssue = issueId === p.id
            return (
              <div key={p.id}>
                <button
                  onClick={() => handlePick(p.id)}
                  disabled={isLoading}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: isSelected ? 'rgba(22,163,74,0.06)' : '#fff',
                    border: `1.5px solid ${isSelected ? '#16A34A' : '#E5E7EB'}`,
                    borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12,
                    minHeight: 76, cursor: isLoading ? 'wait' : 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: p.sex === 'F' ? '#FCE7F3' : '#DBEAFE',
                      color: p.sex === 'F' ? '#BE185D' : '#1E40AF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, fontFamily: 'Fraunces, serif', flexShrink: 0,
                    }}
                  >
                    {(p.display_name || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.display_name || '—'}
                    </p>
                    <p style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>
                      {maskCurp(p.curp)}
                      <span style={{ fontFamily: "'DM Sans', sans-serif" }}> · {calcAge(p.birth_date)} años</span>
                    </p>
                    {p.primary_dx_desc && (
                      <p style={{ fontSize: 11, color: '#1E3A5F', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.primary_dx_code} · {p.primary_dx_desc}
                      </p>
                    )}
                  </div>
                  {isLoading ? (
                    <Loader2 size={18} color="#9CA3AF" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  ) : isSelected ? (
                    <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0 }} />
                  ) : (
                    <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                  )}
                </button>

                {hasIssue && issueMsg && (
                  <div style={{ marginTop: 6, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <AlertTriangle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>{issueMsg}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
