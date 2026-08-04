'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Star, Pill, ChevronRight, AlertCircle, AlertTriangle, Loader2, CheckCircle2, ClipboardList } from 'lucide-react'
import type { WizardPatient, WizardProtocol, WizardProtocolDrug, ProtocolStatus } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProtocolListRow {
  id: string
  code: string
  name: string
  cycle_length_days: number
  total_cycles: number | null
  line_of_therapy: string | null
  specialty: string
  active: boolean
  approved_at: string | null
  status: ProtocolStatus
  diagnosis_codes: string[]
  drug_count: number
}

interface ProtocolDetailDrugRow {
  id: string
  drug_id: string
  inn: string
  dose_value: number
  dose_unit: WizardProtocolDrug['dose_unit']
  route: string
  days_of_cycle: number[]
  max_dose_mg: number | null
  infusion_minutes: number | null
  vehicle: string | null
  premed_required: Record<string, string> | null
  sequence_order: number | null
  is_anthracycline: boolean
  cyp3a4_substrate: boolean
  cumulative_max_mg_m2: number | null
  requires_test_dose: boolean
}

interface ProtocolDetailRow {
  id: string
  code: string
  name: string
  cycle_length_days: number
  total_cycles: number | null
  line_of_therapy: string | null
  active: boolean
  status: ProtocolStatus
  drugs: ProtocolDetailDrugRow[]
}

interface Step2ProtocolProps {
  patient: WizardPatient
  selectedProtocolId: string | null
  onSelect: (protocol: WizardProtocol, suggestedCycleNumber: number) => void
}

const STATUS_LABEL: Record<ProtocolStatus, string> = { activo: 'ACTIVO', pendiente: 'PENDIENTE', inactivo: 'INACTIVO' }
const STATUS_BG: Record<ProtocolStatus, string> = { activo: '#DCFCE7', pendiente: '#FEF3C7', inactivo: '#F3F4F6' }
const STATUS_FG: Record<ProtocolStatus, string> = { activo: '#16A34A', pendiente: '#D97706', inactivo: '#6B7280' }

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Step2Protocol({ patient, selectedProtocolId, onSelect }: Step2ProtocolProps) {
  const [protocols, setProtocols] = useState<ProtocolListRow[]>([])
  const [preferredIds, setPreferredIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!patient.primary_dx_code) { setError('El paciente no tiene diagnóstico primario.'); setLoading(false); return }

      const [protoRes, prefRes] = await Promise.all([
        supabase.rpc('hema_list_protocols', {
          p_diagnosis_code: patient.primary_dx_code,
          p_active: null,
        }),
        supabase.schema('hema').from('protocol_diagnoses')
          .select('protocol_id, is_preferred')
          .eq('diagnosis_code', patient.primary_dx_code)
          .eq('is_preferred', true),
      ])

      if (!mounted) return
      if (protoRes.error) { setError(protoRes.error.message); setLoading(false); return }

      const prefSet = new Set(
        ((prefRes.data as { protocol_id: string; is_preferred: boolean }[]) ?? []).map((r) => r.protocol_id)
      )

      const rows = (protoRes.data as ProtocolListRow[]) ?? []
      rows.sort((a, b) => {
        const ap = prefSet.has(a.id) ? 0 : 1
        const bp = prefSet.has(b.id) ? 0 : 1
        if (ap !== bp) return ap - bp
        return a.code.localeCompare(b.code)
      })

      setProtocols(rows)
      setPreferredIds(prefSet)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [patient.primary_dx_code])

  async function handlePick(row: ProtocolListRow) {
    setPickError(null)
    setLoadingId(row.id)

    const { data, error: rpcError } = await supabase.rpc('hema_get_protocol', { p_protocol_id: row.id })
    setLoadingId(null)

    if (rpcError) { setPickError(rpcError.message); return }
    const rows = data as ProtocolDetailRow[]
    if (!rows || rows.length === 0) { setPickError('Protocolo no encontrado.'); return }
    const detail = rows[0]

    if (detail.drugs.length === 0) {
      setPickError('Este protocolo no tiene fármacos configurados. Elige otro.')
      return
    }

    const protocol: WizardProtocol = {
      id: detail.id,
      code: detail.code,
      name: detail.name,
      cycle_length_days: detail.cycle_length_days,
      total_cycles: detail.total_cycles,
      line_of_therapy: detail.line_of_therapy,
      active: detail.active,
      status: detail.status,
      is_preferred: preferredIds.has(detail.id),
      drugs: detail.drugs.map((d) => ({
        id: d.id,
        drug_id: d.drug_id,
        inn: d.inn,
        dose_value: d.dose_value,
        dose_unit: d.dose_unit,
        route: d.route,
        days_of_cycle: d.days_of_cycle,
        max_dose_mg: d.max_dose_mg,
        infusion_minutes: d.infusion_minutes,
        vehicle: d.vehicle,
        premed_required: d.premed_required,
        sequence_order: d.sequence_order,
        is_anthracycline: d.is_anthracycline,
        cyp3a4_substrate: d.cyp3a4_substrate,
        cumulative_max_mg_m2: d.cumulative_max_mg_m2,
        requires_test_dose: d.requires_test_dose,
      })),
    }

    // Sugerir número de ciclo siguiente para este paciente + protocolo
    const { data: prevOrders } = await supabase.schema('hema').from('orders')
      .select('cycle_number')
      .eq('patient_id', patient.id)
      .eq('protocol_id', protocol.id)
      .order('cycle_number', { ascending: false })
      .limit(1)

    const prevRows = prevOrders as { cycle_number: number }[] | null
    const suggestedCycleNumber = prevRows && prevRows.length > 0 ? prevRows[0].cycle_number + 1 : 1

    onSelect(protocol, suggestedCycleNumber)
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
        Selecciona el protocolo
      </h2>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
        Filtrado por el diagnóstico primario del paciente:{' '}
        <strong style={{ color: '#1E3A5F' }}>{patient.primary_dx_code} · {patient.primary_dx_desc}</strong>
      </p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, height: 76 }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12 }}>
          <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{error}</p>
        </div>
      ) : protocols.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '40px 24px', textAlign: 'center' }}>
          <ClipboardList size={36} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#9CA3AF' }}>
            No hay protocolos vinculados a {patient.primary_dx_code}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {protocols.map((p) => {
            const isSelected = selectedProtocolId === p.id
            const isLoading = loadingId === p.id
            const isPreferred = preferredIds.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => handlePick(p)}
                disabled={isLoading}
                style={{
                  width: '100%', textAlign: 'left',
                  background: isSelected ? 'rgba(22,163,74,0.06)' : '#fff',
                  border: `1.5px solid ${isSelected ? '#16A34A' : isPreferred ? 'rgba(124,58,237,0.35)' : '#E5E7EB'}`,
                  borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12,
                  minHeight: 76, cursor: isLoading ? 'wait' : 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
                      {p.code}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: STATUS_BG[p.status], color: STATUS_FG[p.status],
                    }}>
                      {STATUS_LABEL[p.status]}
                    </span>
                    {isPreferred && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>
                        <Star size={11} color="#7C3AED" fill="#7C3AED" /> Preferido
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Ciclo de {p.cycle_length_days} días
                    {p.total_cycles ? ` · ${p.total_cycles} ciclos` : ''}
                    {' · '}<Pill size={11} /> {p.drug_count} fármaco{p.drug_count !== 1 ? 's' : ''}
                  </p>
                </div>
                {isLoading ? (
                  <Loader2 size={18} color="#9CA3AF" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                ) : isSelected ? (
                  <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0 }} />
                ) : (
                  <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      {pickError && (
        <div style={{ marginTop: 12, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, display: 'flex', gap: 10 }}>
          <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: 0 }}>{pickError}</p>
        </div>
      )}

      {selectedProtocolId && protocols.find((p) => p.id === selectedProtocolId && !p.active) && (
        <div style={{ marginTop: 12, padding: '12px 16px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, display: 'flex', gap: 10 }}>
          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#92400E', fontWeight: 700, margin: 0 }}>
            ⚠ Protocolo pendiente de aprobación: solo disponible en modo desarrollo
          </p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
