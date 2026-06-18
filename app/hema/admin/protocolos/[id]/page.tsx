'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  ArrowLeft,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Star,
  Pill,
  BookOpen,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProtocolStatus = 'activo' | 'pendiente' | 'inactivo'

interface ProtocolDiagnosis {
  code: string
  description_es: string
  is_preferred: boolean
}

interface ProtocolDrug {
  id: string
  drug_id: string
  inn: string
  dose_value: number
  dose_unit: string
  route: string
  days_of_cycle: number[]
  max_dose_mg: number | null
  infusion_minutes: number | null
  vehicle: string | null
  premed_required: Record<string, string> | null
  sequence_order: number | null
}

interface ProtocolReferences {
  doi?: string
  pubmed_id?: string
  guideline?: string
  trial_name?: string
}

interface ProtocolDetail {
  id: string
  code: string
  name: string
  cycle_length_days: number
  total_cycles: number | null
  line_of_therapy: string | null
  specialty: string
  active: boolean
  approved_at: string | null
  approved_by_name: string | null
  status: ProtocolStatus
  protocol_references: ProtocolReferences | null
  diagnoses: ProtocolDiagnosis[]
  drugs: ProtocolDrug[]
}

const ALLOWED_ROLES = ['admin', 'director_medico']

const STATUS_LABEL: Record<ProtocolStatus, string> = {
  activo: 'ACTIVO',
  pendiente: 'PENDIENTE',
  inactivo: 'INACTIVO',
}

const STATUS_BG: Record<ProtocolStatus, string> = {
  activo: '#DCFCE7',
  pendiente: '#FEF3C7',
  inactivo: '#F3F4F6',
}

const STATUS_FG: Record<ProtocolStatus, string> = {
  activo: '#16A34A',
  pendiente: '#D97706',
  inactivo: '#6B7280',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProtocolDetailPage() {
  const router = useRouter()
  const params = useParams()
  const protocolId = params.id as string

  const [role, setRole] = useState<string | null>(null)
  const [roleChecked, setRoleChecked] = useState(false)

  const [protocol, setProtocol] = useState<ProtocolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()
  const [approveError, setApproveError] = useState<string | null>(null)

  async function load() {
    const { data, error: rpcError } = await supabase.rpc('hema_get_protocol', {
      p_protocol_id: protocolId,
    })
    if (rpcError) { setError(rpcError.message); setLoading(false); return }

    const rows = data as ProtocolDetail[]
    if (!rows || rows.length === 0) { setError('Protocolo no encontrado'); setLoading(false); return }

    setProtocol(rows[0])
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace(`/login?next=/hema/admin/protocolos/${protocolId}`); return }

      const { data, error: roleError } = await supabase.rpc('hema_get_my_role')
      if (!mounted) return

      if (roleError) { setError(roleError.message); setRoleChecked(true); setLoading(false); return }
      setRole((data as string) ?? null)
      setRoleChecked(true)

      if (data && ALLOWED_ROLES.includes(data as string)) {
        await load()
      } else {
        setLoading(false)
      }
    }

    init()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolId, router])

  function handleApprove() {
    setApproveError(null)
    startTransition(async () => {
      const { error: approveErr } = await supabase.rpc('hema_approve_protocol', {
        p_protocol_id: protocolId,
      })
      if (approveErr) { setApproveError(approveErr.message); return }
      await load()
    })
  }

  // ── Acceso restringido ───────────────────────────────────────────────────
  if (roleChecked && (!role || !ALLOWED_ROLES.includes(role))) {
    return (
      <div
        style={{
          background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14,
          padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 24,
        }}
      >
        <ShieldAlert size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>
            Acceso restringido
          </p>
          <p style={{ fontSize: 13, color: '#DC2626' }}>
            Esta sección es exclusiva para administradores y director médico.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (error || !protocol) {
    return (
      <div style={{ padding: 20 }}>
        <Link href="/hema/admin/protocolos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16, minHeight: 44 }}>
          <ArrowLeft size={16} /> Protocolos
        </Link>
        <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14, padding: 20, display: 'flex', gap: 12 }}>
          <AlertCircle size={20} color="#DC2626" />
          <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 600 }}>{error ?? 'Protocolo no encontrado'}</p>
        </div>
      </div>
    )
  }

  const canApprove = role === 'director_medico' && protocol.status !== 'activo'
  const refs = protocol.protocol_references

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      {/* ─── Back ──────────────────────────────────────────────────────── */}
      <Link
        href="/hema/admin/protocolos"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 16, minHeight: 44 }}
      >
        <ArrowLeft size={16} /> Protocolos
      </Link>

      {/* ─── Header card ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
          borderRadius: 16, padding: '20px 20px 24px', marginBottom: 16, color: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#7EA8C9' }}>
            {protocol.code}
          </span>
          <span
            style={{
              fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: STATUS_BG[protocol.status], color: STATUS_FG[protocol.status],
            }}
          >
            {STATUS_LABEL[protocol.status]}
          </span>
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6, lineHeight: 1.2 }}>
          {protocol.name}
        </h1>
        <p style={{ fontSize: 13, color: '#A0BBCC' }}>
          Ciclo de {protocol.cycle_length_days} días
          {protocol.total_cycles ? ` · ${protocol.total_cycles} ciclos` : ''}
          {protocol.line_of_therapy ? ` · ${protocol.line_of_therapy}` : ''}
        </p>
        {protocol.approved_at && (
          <p style={{ fontSize: 12, color: '#7EA8C9', marginTop: 8 }}>
            Aprobado por {protocol.approved_by_name ?? '—'} el {formatDate(protocol.approved_at)}
          </p>
        )}
      </div>

      {/* ─── Diagnósticos ───────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Diagnósticos vinculados
          </h2>
        </div>
        {protocol.diagnoses.length === 0 ? (
          <p style={{ padding: '20px 16px', fontSize: 13, color: '#9CA3AF' }}>Sin diagnósticos vinculados</p>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {protocol.diagnoses.map((dx) => (
              <div
                key={dx.code}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: dx.is_preferred ? 'rgba(22,163,74,0.08)' : '#F9FAFB',
                  border: `1px solid ${dx.is_preferred ? 'rgba(22,163,74,0.3)' : '#E5E7EB'}`,
                  borderRadius: 10, padding: '6px 12px', minHeight: 36,
                }}
              >
                {dx.is_preferred && <Star size={12} color="#16A34A" fill="#16A34A" />}
                <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>
                  {dx.code}
                </span>
                <span style={{ fontSize: 12, color: '#374151' }}>{dx.description_es}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Fármacos ───────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill size={16} color="#1E3A5F" />
          <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
            Fármacos
          </h2>
        </div>
        {protocol.drugs.length === 0 ? (
          <p style={{ padding: '20px 16px', fontSize: 13, color: '#9CA3AF' }}>Sin fármacos registrados</p>
        ) : (
          protocol.drugs.map((d, i) => (
            <div
              key={d.id}
              style={{
                padding: '14px 16px',
                borderBottom: i < protocol.drugs.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{d.inn}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', whiteSpace: 'nowrap' }}>
                  {d.dose_value} {d.dose_unit}
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280' }}>
                {d.route} · Día{d.days_of_cycle.length !== 1 ? 's' : ''} {d.days_of_cycle.join(', ')}
                {d.max_dose_mg ? ` · Cap ${d.max_dose_mg} mg` : ''}
                {d.infusion_minutes ? ` · ${d.infusion_minutes} min` : ''}
              </p>
              {d.vehicle && (
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Vehículo: {d.vehicle}</p>
              )}
              {d.premed_required && Object.keys(d.premed_required).length > 0 && (
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  Premedicación: {Object.entries(d.premed_required).map(([k, v]) => `${k} ${v}`).join(', ')}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* ─── Referencias ────────────────────────────────────────────────── */}
      {refs && (refs.doi || refs.pubmed_id || refs.guideline || refs.trial_name) && (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BookOpen size={16} color="#1E3A5F" />
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 900, color: '#111827' }}>
              Referencias
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {refs.trial_name && <p style={{ fontSize: 13, color: '#374151' }}>Ensayo: {refs.trial_name}</p>}
            {refs.guideline && <p style={{ fontSize: 13, color: '#374151' }}>Guía: {refs.guideline}</p>}
            {refs.doi && <p style={{ fontSize: 13, color: '#374151' }}>DOI: {refs.doi}</p>}
            {refs.pubmed_id && <p style={{ fontSize: 13, color: '#374151' }}>PubMed: {refs.pubmed_id}</p>}
          </div>
        </div>
      )}

      {/* ─── Aprobar ────────────────────────────────────────────────────── */}
      {canApprove && (
        <div style={{ marginBottom: 16 }}>
          {approveError && (
            <div style={{ marginBottom: 12, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: 0 }}>{approveError}</p>
            </div>
          )}
          <button
            onClick={handleApprove}
            disabled={isPending}
            style={{
              width: '100%', padding: '16px',
              background: isPending ? '#9CA3AF' : '#16A34A',
              color: '#fff', border: 'none', borderRadius: 14,
              fontSize: 16, fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              minHeight: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: isPending ? 'none' : '0 2px 8px rgba(22,163,74,0.3)',
            }}
          >
            {isPending ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                Aprobando...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Aprobar protocolo
              </>
            )}
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {protocol.status === 'activo' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', fontSize: 13, fontWeight: 600, justifyContent: 'center', marginBottom: 16 }}>
          <CheckCircle2 size={16} /> Protocolo activo
        </div>
      )}
    </>
  )
}
