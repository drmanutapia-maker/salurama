import { getLabParam } from '@salurama/hema-shared'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface LabValueRow {
  analyte: string
  value: number | null
  unit: string | null
  reference_low: number | null
  reference_high: number | null
  flag: 'L' | 'H' | 'LL' | 'HH' | null
}

interface LabsSummaryCardProps {
  collectedAt: string
  values: LabValueRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

function flagColor(flag: LabValueRow['flag']): string {
  if (flag === 'HH' || flag === 'LL') return '#DC2626'
  if (flag === 'H' || flag === 'L') return '#D97706'
  return '#16A34A'
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function LabsSummaryCard({ collectedAt, values }: LabsSummaryCardProps) {
  const days = daysSince(collectedAt)
  const isStale = days > 30

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '16px 16px 14px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        {isStale ? <AlertTriangle size={14} color="#D97706" /> : <CheckCircle2 size={14} color="#16A34A" />}
        <span style={{ fontSize: 12, fontWeight: 700, color: isStale ? '#D97706' : '#374151' }}>
          {isStale ? `Hace ${days} días` : 'Recientes'} · {formatDate(collectedAt)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {values.map((v) => {
          const def = getLabParam(v.analyte)
          const color = flagColor(v.flag)
          return (
            <div
              key={v.analyte}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', background: '#F9FAFB', borderRadius: 10, minHeight: 48,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {def?.label_es ?? v.analyte}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {v.value ?? '—'} <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 400 }}>{v.unit ?? def?.unit ?? ''}</span>
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {isStale && (
        <p style={{ fontSize: 11, color: '#D97706', marginTop: 10 }}>
          Laboratorios con más de 30 días — se recomienda actualizar antes de una nueva indicación.
        </p>
      )}
    </div>
  )
}
