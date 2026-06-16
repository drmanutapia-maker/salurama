import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BsaCardProps {
  mosteller: number
  dubois: number
  measuredAt: string   // ISO datetime
  weightKg: number
  heightCm: number
  compact?: boolean    // variante sin fórmula explícita
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(isoDate: string): number {
  const ms = Date.now() - new Date(isoDate).getTime()
  return Math.floor(ms / 86_400_000)
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BsaCard({
  mosteller,
  dubois,
  measuredAt,
  weightKg,
  heightCm,
  compact = false,
}: BsaCardProps) {
  const days = daysSince(measuredAt)
  const isStale = days > 30
  const isVeryStale = days > 60

  const borderColor = isVeryStale ? '#DC2626' : isStale ? '#D97706' : '#16A34A'
  const staleBg    = isVeryStale ? '#FEF2F2' : isStale ? '#FFFBEB' : undefined

  return (
    <div
      style={{
        background: staleBg ?? '#fff',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 16,
        padding: compact ? '14px 16px' : '18px 20px',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: compact ? 8 : 12,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6B7280',
          }}
        >
          Superficie Corporal
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: borderColor,
            background: `${borderColor}18`,
            borderRadius: 6,
            padding: '2px 8px',
          }}
        >
          Mosteller
        </span>
      </div>

      {/* BSA principal */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: compact ? 40 : 52,
            fontWeight: 900,
            color: '#1E3A5F',
            lineHeight: 1,
          }}
        >
          {mosteller.toFixed(2)}
        </span>
        <span style={{ fontSize: 16, color: '#4B5563', fontWeight: 600 }}>m²</span>
      </div>

      {/* Fórmula */}
      {!compact && (
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12, fontFamily: 'monospace' }}>
          √[({weightKg} kg × {heightCm} cm) ÷ 3600]
        </p>
      )}

      {/* DuBois */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: '#F3F4F6',
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <Info size={13} color="#6B7280" />
        <span style={{ fontSize: 12, color: '#6B7280' }}>
          DuBois{' '}
          <strong style={{ color: '#374151' }}>{dubois.toFixed(2)} m²</strong>
          {' '}· solo referencia
        </span>
      </div>

      {/* Fecha medición */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isStale ? (
          <AlertTriangle size={14} color={borderColor} />
        ) : (
          <CheckCircle2 size={14} color="#16A34A" />
        )}
        <span style={{ fontSize: 12, color: isStale ? borderColor : '#6B7280', fontWeight: isStale ? 600 : 400 }}>
          {isStale
            ? `⚠ Medición de hace ${days} días (${formatDate(measuredAt)})`
            : `Medición: ${formatDate(measuredAt)}`}
        </span>
      </div>

      {/* Banner alerta si >30 días */}
      {isStale && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            background: staleBg,
            border: `1px solid ${borderColor}40`,
            borderRadius: 10,
            fontSize: 12,
            color: isVeryStale ? '#991B1B' : '#92400E',
            fontWeight: 600,
          }}
        >
          {isVeryStale
            ? 'Medición desactualizada — requiere nueva medición antes de calcular dosis'
            : 'Medición con más de 30 días — se recomienda actualizar antes de nueva indicación'}
        </div>
      )}
    </div>
  )
}
