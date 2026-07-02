'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  ShieldAlert,
  AlertCircle,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditEntry {
  log_type: 'dml' | 'access'
  id: number
  occurred_at: string
  user_id: string | null
  user_name: string | null
  action: string
  entity: string
  entity_id: string | null
  before_json: Record<string, unknown> | null
  after_json: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_ROLES = ['admin', 'director_medico']
const PAGE_SIZE = 50

const ENTITY_LABEL: Record<string, string> = {
  orders: 'Orden',
  patients: 'Paciente',
  protocols: 'Protocolo',
  signatures: 'Firma',
  order_drugs: 'Fármaco/Orden',
  lab_panels: 'Panel Labs',
  lab_values: 'Valor Lab',
  patient_measurements: 'Medición',
  patient_diagnoses: 'Diagnóstico',
  cumulative_doses: 'Dosis Acum.',
}

const ACTION_BG: Record<string, string> = {
  INSERT: '#DCFCE7',
  UPDATE: '#FEF3C7',
  DELETE: '#FEE2E2',
  SELECT: '#DBEAFE',
}
const ACTION_FG: Record<string, string> = {
  INSERT: '#16A34A',
  UPDATE: '#D97706',
  DELETE: '#DC2626',
  SELECT: '#2563EB',
}

const ENTITY_OPTIONS = [
  { value: '', label: 'Todas las entidades' },
  { value: 'orders', label: 'Órdenes' },
  { value: 'patients', label: 'Pacientes' },
  { value: 'protocols', label: 'Protocolos' },
  { value: 'signatures', label: 'Firmas' },
  { value: 'lab_panels', label: 'Paneles de Labs' },
  { value: 'patient_measurements', label: 'Mediciones' },
]

const TAB_FILTERS = [
  { value: 'todos',  label: 'Todos' },
  { value: 'dml',    label: 'Cambios' },
  { value: 'access', label: 'Accesos' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function shortId(id: string): string {
  return id.slice(0, 8) + '...'
}

// ─── ActionBadge ──────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 6,
        padding: '3px 7px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        background: ACTION_BG[action] ?? '#F3F4F6',
        color: ACTION_FG[action] ?? '#6B7280',
        flexShrink: 0,
        fontFamily: 'monospace',
      }}
    >
      {action}
    </span>
  )
}

// ─── EntryRow ─────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditEntry
  expanded: boolean
  onToggle: () => void
}) {
  const canExpand = entry.log_type === 'dml' && (entry.before_json || entry.after_json)

  return (
    <>
      <tr
        style={{
          borderBottom: expanded ? 'none' : '1px solid #F3F4F6',
          background: expanded ? '#F8F9FA' : '#fff',
        }}
      >
        <td style={{ padding: '11px 12px 11px 16px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' as const }}>
          {formatDateTime(entry.occurred_at)}
        </td>
        <td className="audit-col-user" style={{ padding: '11px 8px', fontSize: 13, color: '#374151' }}>
          {entry.user_name ?? <span style={{ color: '#9CA3AF' }}>Sistema</span>}
        </td>
        <td style={{ padding: '11px 8px' }}>
          <ActionBadge action={entry.action} />
        </td>
        <td style={{ padding: '11px 8px', fontSize: 13, color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>
            {ENTITY_LABEL[entry.entity] ?? entry.entity}
          </span>
          {entry.entity_id && (
            <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'monospace' }}>
              {shortId(entry.entity_id)}
            </div>
          )}
        </td>
        <td style={{ padding: '11px 16px 11px 8px', textAlign: 'right' as const }}>
          {canExpand && (
            <button
              onClick={onToggle}
              aria-label={expanded ? 'Cerrar detalle' : 'Ver cambios'}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#6B7280',
                fontSize: 12,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              {expanded ? 'Cerrar' : 'Ver'}
            </button>
          )}
        </td>
      </tr>

      {expanded && canExpand && (
        <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#F8F9FA' }}>
          <td colSpan={5} style={{ padding: '0 16px 16px' }}>
            <div
              className="audit-json-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
            >
              {(['before_json', 'after_json'] as const).map((key) => (
                <div key={key}>
                  <p style={{
                    fontSize: 11, fontWeight: 700, color: '#9CA3AF',
                    marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                  }}>
                    {key === 'before_json' ? 'Antes' : 'Después'}
                  </p>
                  <pre style={{
                    fontSize: 11, background: '#fff',
                    border: '1px solid #E5E7EB', borderRadius: 8,
                    padding: 10, margin: 0, overflow: 'auto',
                    maxHeight: 200, color: '#374151',
                    whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const,
                  }}>
                    {entry[key] ? JSON.stringify(entry[key], null, 2) : '—'}
                  </pre>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const router = useRouter()

  // Role guard — mismo patrón que admin/protocolos/page.tsx
  const [role, setRole]               = useState<string | null>(null)
  const [roleChecked, setRoleChecked] = useState(false)

  // Filters
  const [tab, setTab]                 = useState<'todos' | 'dml' | 'access'>('todos')
  const [filterEntity, setFilterEntity] = useState('')
  const [filterFrom, setFilterFrom]   = useState('')
  const [filterTo, setFilterTo]       = useState('')
  const [offset, setOffset]           = useState(0)

  // Data
  const [entries, setEntries]         = useState<AuditEntry[]>([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [hasMore, setHasMore]         = useState(false)

  // expandedKey: string compuesto "${log_type}-${id}" para evitar colisión
  // entre audit_log y access_log que tienen secuencias bigserial independientes
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  // ── Role check ────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function checkRole() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/hema/admin/auditoria'); return }
      const { data, error: roleError } = await supabase.rpc('hema_get_my_role')
      if (!mounted) return
      if (roleError) { setError(roleError.message); setRoleChecked(true); return }
      setRole((data as string) ?? null)
      setRoleChecked(true)
    }
    checkRole()
    return () => { mounted = false }
  }, [router])

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchEntries(newOffset: number) {
    setLoading(true)
    setError(null)
    setExpandedKey(null)

    const params: Record<string, unknown> = {
      p_limit:  PAGE_SIZE,
      p_offset: newOffset,
    }
    if (filterEntity) params.p_entity = filterEntity
    if (filterFrom)   params.p_from   = new Date(filterFrom).toISOString()
    if (filterTo) {
      const to = new Date(filterTo)
      to.setHours(23, 59, 59, 999)
      params.p_to = to.toISOString()
    }

    const { data, error: rpcError } = await supabase.rpc('hema_get_audit_log', params)
    if (rpcError) { setError(rpcError.message); setLoading(false); return }
    const rows = (data as AuditEntry[]) ?? []
    setEntries(rows)
    setHasMore(rows.length === PAGE_SIZE)
    setOffset(newOffset)
    setLoading(false)
  }

  // ── Tab filter (client-side) ──────────────────────────────────────────────
  const filtered = tab === 'todos'
    ? entries
    : entries.filter((e) => e.log_type === tab)

  // ── Acceso restringido ────────────────────────────────────────────────────
  if (roleChecked && (!role || !ALLOWED_ROLES.includes(role))) {
    return (
      <div style={{
        background: '#FEF2F2', border: '1px solid #FCA5A5',
        borderRadius: 14, padding: 20,
        display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 24,
      }}>
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
        .hema-input:focus { outline: none; border-color: #1E3A5F; box-shadow: 0 0 0 3px rgba(30,58,95,0.15); }
        @media (max-width: 640px) {
          .audit-col-user  { display: none !important; }
          .audit-json-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: 'Fraunces, serif', fontSize: 24,
          fontWeight: 900, color: '#1E3A5F', marginBottom: 2,
        }}>
          Bitácora de Auditoría
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280' }}>
          Registro inmutable de cambios y accesos clínicos · NOM-004
        </p>
      </div>

      {/* ─── Panel de filtros ────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB',
        borderRadius: 14, padding: 16, marginBottom: 16,
        display: 'flex', flexDirection: 'column' as const, gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
          <select
            className="hema-input"
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            style={{
              flex: '1 1 160px', padding: '10px 12px', fontSize: 14,
              borderRadius: 10, border: '1.5px solid #E5E7EB',
              background: '#fff', fontFamily: "'DM Sans', sans-serif", minHeight: 44,
            }}
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            className="hema-input"
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            style={{
              flex: '1 1 140px', padding: '10px 12px', fontSize: 14,
              borderRadius: 10, border: '1.5px solid #E5E7EB',
              background: '#fff', fontFamily: "'DM Sans', sans-serif", minHeight: 44,
            }}
          />

          <input
            className="hema-input"
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            style={{
              flex: '1 1 140px', padding: '10px 12px', fontSize: 14,
              borderRadius: 10, border: '1.5px solid #E5E7EB',
              background: '#fff', fontFamily: "'DM Sans', sans-serif", minHeight: 44,
            }}
          />

          <button
            onClick={() => { setOffset(0); fetchEntries(0) }}
            disabled={!roleChecked || !ALLOWED_ROLES.includes(role ?? '') || loading}
            style={{
              flex: '0 0 auto', padding: '10px 20px', borderRadius: 10,
              border: 'none', background: '#1E3A5F', color: '#fff',
              fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              minHeight: 44, opacity: loading ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Search size={15} />
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {TAB_FILTERS.map(({ value, label }) => {
            const active = tab === value
            return (
              <button
                key={value}
                onClick={() => setTab(value as typeof tab)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 34,
                  background: active ? '#1E3A5F' : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  borderColor: active ? '#1E3A5F' : '#E5E7EB',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#FEF2F2', border: '1px solid #FCA5A5',
          borderRadius: 14, padding: 16,
          display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16,
        }}>
          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
        </div>
      )}

      {/* ─── Tabla / Estado vacío ────────────────────────────────────────── */}
      {!loading && entries.length === 0 && !error ? (
        <div style={{
          background: '#fff', border: '1px solid #E5E7EB',
          borderRadius: 14, padding: '48px 24px', textAlign: 'center' as const,
        }}>
          <ClipboardList size={40} color="#D1D5DB" style={{ margin: '0 auto 14px' }} />
          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>
            Sin registros
          </p>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>
            Aplica los filtros y presiona Consultar para ver la bitácora
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 1 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  height: 52,
                  background: i % 2 === 0 ? '#F9FAFB' : '#fff',
                  borderRadius: 4,
                }} />
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {[
                      { label: 'Fecha/hora', cls: '',               extra: { padding: '10px 12px 10px 16px' } },
                      { label: 'Usuario',    cls: 'audit-col-user', extra: { padding: '10px 8px' } },
                      { label: 'Acción',     cls: '',               extra: { padding: '10px 8px' } },
                      { label: 'Entidad',    cls: '',               extra: { padding: '10px 8px' } },
                      { label: 'Detalle',    cls: '',               extra: { padding: '10px 16px 10px 8px', textAlign: 'right' as const } },
                    ].map(({ label, cls, extra }) => (
                      <th
                        key={label}
                        className={cls}
                        style={{
                          ...extra,
                          fontSize: 11, fontWeight: 700, color: '#6B7280',
                          textAlign: 'left' as const, textTransform: 'uppercase' as const,
                          letterSpacing: '0.05em', whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => {
                    const entryKey = `${entry.log_type}-${entry.id}`
                    return (
                      <EntryRow
                        key={entryKey}
                        entry={entry}
                        expanded={expandedKey === entryKey}
                        onToggle={() =>
                          setExpandedKey(expandedKey === entryKey ? null : entryKey)
                        }
                      />
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{
                        padding: '32px 16px', textAlign: 'center' as const,
                        fontSize: 13, color: '#9CA3AF',
                      }}>
                        No hay registros del tipo seleccionado en esta página
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          {!loading && entries.length > 0 && (
            <div style={{
              borderTop: '1px solid #F3F4F6', padding: '12px 16px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 12,
            }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {filtered.length} de {entries.length} registros
                {offset > 0 && ` · pág. ${Math.floor(offset / PAGE_SIZE) + 1}`}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Anterior',  disabled: offset === 0, onClick: () => fetchEntries(offset - PAGE_SIZE) },
                  { label: 'Siguiente', disabled: !hasMore,     onClick: () => fetchEntries(offset + PAGE_SIZE) },
                ].map(({ label, disabled, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    disabled={disabled}
                    style={{
                      padding: '6px 14px', borderRadius: 8,
                      border: '1.5px solid #E5E7EB', background: '#fff',
                      fontSize: 13, fontWeight: 600,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      color: disabled ? '#D1D5DB' : '#374151',
                      minHeight: 34, fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
