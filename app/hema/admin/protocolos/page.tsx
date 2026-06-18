'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { searchDiagnosis } from '@salurama/hema-shared'
import type { Diagnosis } from '@salurama/hema-shared'
import {
  Search,
  ChevronRight,
  ClipboardList,
  AlertCircle,
  ShieldAlert,
  X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProtocolStatus = 'activo' | 'pendiente' | 'inactivo'

interface ProtocolRow {
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

const STATUS_FILTERS: { value: ProtocolStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'activo', label: 'Activo' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'inactivo', label: 'Inactivo' },
]

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProtocolStatus }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 6,
        padding: '3px 8px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        background: STATUS_BG[status],
        color: STATUS_FG[status],
        flexShrink: 0,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

// ─── Protocol card ────────────────────────────────────────────────────────────

function ProtocolCard({ p }: { p: ProtocolRow }) {
  return (
    <Link
      href={`/hema/admin/protocolos/${p.id}`}
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textDecoration: 'none',
        minHeight: 76,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
            {p.code}
          </span>
          <StatusBadge status={p.status} />
        </div>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#111827',
            marginBottom: 4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {p.name}
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          {p.diagnosis_codes.length > 0 ? p.diagnosis_codes.join(', ') : 'Sin diagnóstico vinculado'}
          {' · '}
          {p.drug_count} fármaco{p.drug_count !== 1 ? 's' : ''}
        </p>
      </div>
      <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProtocolosPage() {
  const router = useRouter()

  const [role, setRole] = useState<string | null>(null)
  const [roleChecked, setRoleChecked] = useState(false)

  const [protocols, setProtocols] = useState<ProtocolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dxQuery, setDxQuery] = useState('')
  const [selectedDx, setSelectedDx] = useState<Diagnosis | null>(null)
  const [statusFilter, setStatusFilter] = useState<ProtocolStatus | 'todos'>('todos')

  const dxSuggestions = useMemo(
    () => (selectedDx ? [] : searchDiagnosis(dxQuery).slice(0, 8)),
    [dxQuery, selectedDx],
  )

  // ── Verificar sesión y rol ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function checkRole() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/hema/admin/protocolos'); return }

      const { data, error: roleError } = await supabase.rpc('hema_get_my_role')
      if (!mounted) return

      if (roleError) { setError(roleError.message); setRoleChecked(true); setLoading(false); return }
      setRole((data as string) ?? null)
      setRoleChecked(true)
    }

    checkRole()
    return () => { mounted = false }
  }, [router])

  // ── Cargar protocolos (filtrado por diagnóstico vía RPC) ────────────────
  useEffect(() => {
    if (!roleChecked || !role || !ALLOWED_ROLES.includes(role)) return
    let mounted = true

    async function load() {
      setLoading(true)
      const { data, error: rpcError } = await supabase.rpc('hema_list_protocols', {
        p_diagnosis_code: selectedDx?.code ?? null,
        p_active: null,
      })

      if (!mounted) return
      if (rpcError) { setError(rpcError.message); setLoading(false); return }
      setProtocols((data as ProtocolRow[]) ?? [])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [roleChecked, role, selectedDx])

  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return protocols
    return protocols.filter((p) => p.status === statusFilter)
  }, [protocols, statusFilter])

  // ── Acceso restringido ───────────────────────────────────────────────────
  if (roleChecked && (!role || !ALLOWED_ROLES.includes(role))) {
    return (
      <div
        style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: 14,
          padding: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          marginTop: 24,
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        .hema-search:focus { outline: none; border-color: #1E3A5F; box-shadow: 0 0 0 3px rgba(30,58,95,0.15); }
      `}</style>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 24,
            fontWeight: 900,
            color: '#1E3A5F',
            marginBottom: 2,
          }}
        >
          Protocolos
        </h1>
        {!loading && (
          <p style={{ fontSize: 13, color: '#6B7280' }}>
            {filtered.length} protocolo{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ─── Filtro por diagnóstico CIE-10 ──────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search
          size={16}
          color="#9CA3AF"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          className="hema-search"
          type="text"
          placeholder="Filtrar por diagnóstico CIE-10..."
          value={selectedDx ? `${selectedDx.code} · ${selectedDx.description_es}` : dxQuery}
          onChange={(e) => { setDxQuery(e.target.value); setSelectedDx(null) }}
          style={{
            width: '100%',
            padding: '12px 40px 12px 42px',
            fontSize: 14,
            borderRadius: 12,
            border: '1.5px solid #E5E7EB',
            background: '#fff',
            fontFamily: "'DM Sans', sans-serif",
            boxSizing: 'border-box',
            minHeight: 48,
          }}
        />
        {(selectedDx || dxQuery) && (
          <button
            onClick={() => { setSelectedDx(null); setDxQuery('') }}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Limpiar filtro"
          >
            <X size={16} color="#9CA3AF" />
          </button>
        )}

        {dxSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 10, overflow: 'hidden',
            }}
          >
            {dxSuggestions.map((dx) => (
              <button
                key={dx.code}
                onClick={() => { setSelectedDx(dx); setDxQuery('') }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', border: 'none', background: '#fff',
                  cursor: 'pointer', borderBottom: '1px solid #F3F4F6', minHeight: 44,
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>
                  {dx.code}
                </span>
                <span style={{ fontSize: 13, color: '#374151' }}> · {dx.description_es}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Filtro por estado ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUS_FILTERS.map(({ value, label }) => {
          const active = statusFilter === value
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: '1.5px solid',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 36,
                background: active ? '#1E3A5F' : '#fff',
                color: active ? '#fff' : '#6B7280',
                borderColor: active ? '#1E3A5F' : '#E5E7EB',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ─── Contenido ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 16, height: 76 }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          style={{
            background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 14,
            padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>
              Error al cargar protocolos
            </p>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}
        >
          <ClipboardList size={40} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
            Sin protocolos
          </p>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>
            No hay protocolos que coincidan con los filtros seleccionados
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((p) => <ProtocolCard key={p.id} p={p} />)}
        </div>
      )}
    </>
  )
}
