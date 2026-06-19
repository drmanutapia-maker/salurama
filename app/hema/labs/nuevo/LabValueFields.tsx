'use client'

import { LAB_PARAMS, type LabParamCode } from '@salurama/hema-shared'
import { Calculator } from 'lucide-react'

// ─── Campo numérico ───────────────────────────────────────────────────────────

function NumberField({
  label, unit, value, onChange, placeholder,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
        {label} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>{unit}</span>
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10,
          border: '1.5px solid #D1D5DB', boxSizing: 'border-box', minHeight: 48,
          fontFamily: "'DM Sans', sans-serif", background: '#fff',
        }}
      />
    </div>
  )
}

// ─── Componente ──────────────────────────────────────────────────────────────

interface LabValueFieldsProps {
  values: Record<LabParamCode, string>
  onChange: (code: LabParamCode, value: string) => void
  crclComputed: number | null
  crclUnavailableReason: string | null
}

export default function LabValueFields({ values, onChange, crclComputed, crclUnavailableReason }: LabValueFieldsProps) {
  const capturable = LAB_PARAMS.filter((p) => !p.computed)
  const crclParam = LAB_PARAMS.find((p) => p.code === 'crcl')!

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
        Valores de laboratorio
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {capturable.map((p) => (
          <NumberField
            key={p.code}
            label={p.label_es}
            unit={p.unit}
            value={values[p.code]}
            onChange={(v) => onChange(p.code, v)}
          />
        ))}
      </div>

      {/* CrCl calculado — Cockcroft-Gault */}
      <div
        style={{
          marginTop: 14, padding: '14px 16px', borderRadius: 12,
          background: crclComputed !== null ? 'rgba(30,58,95,0.05)' : '#F9FAFB',
          border: `1.5px solid ${crclComputed !== null ? 'rgba(30,58,95,0.2)' : '#E5E7EB'}`,
          display: 'flex', alignItems: 'center', gap: 12, minHeight: 48,
        }}
      >
        <Calculator size={18} color={crclComputed !== null ? '#1E3A5F' : '#9CA3AF'} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 2 }}>
            {crclParam.label_es}{' '}
            <span style={{ fontWeight: 400, color: '#9CA3AF' }}>{crclParam.unit}</span>
          </p>
          {crclComputed !== null ? (
            <p style={{ fontFamily: 'Fraunces, serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F', margin: 0 }}>
              {crclComputed.toFixed(1)}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
              {crclUnavailableReason ?? 'Captura la creatinina para calcular'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
