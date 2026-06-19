'use client'

import type { ClinicalInputs } from './types'

interface Step3ClinicalInputsProps {
  value: ClinicalInputs
  onChange: (next: ClinicalInputs) => void
}

// ─── Campo numérico reutilizable ─────────────────────────────────────────────

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
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>
        {label} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>{unit}</span>
      </label>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10,
          border: '1.5px solid #E5E7EB', boxSizing: 'border-box', minHeight: 44,
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
    </div>
  )
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Step3ClinicalInputs({ value, onChange }: Step3ClinicalInputsProps) {
  function update<K extends keyof ClinicalInputs>(key: K, val: ClinicalInputs[K]) {
    onChange({ ...value, [key]: val })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
        Datos clínicos
      </h3>
      <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>
        Captura manual — el módulo de Labs con OCR llega en una sesión futura.
      </p>

      {/* ── Laboratorios ── */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
        Laboratorios
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        <NumberField label="ANC" unit="/µL" value={value.anc} onChange={(v) => update('anc', v)} placeholder="1500" />
        <NumberField label="Plaquetas" unit="/µL" value={value.platelets} onChange={(v) => update('platelets', v)} placeholder="150000" />
        <NumberField label="Hemoglobina" unit="g/dL" value={value.hemoglobin} onChange={(v) => update('hemoglobin', v)} placeholder="12" />
        <NumberField label="Creatinina" unit="mg/dL" value={value.creatinine} onChange={(v) => update('creatinine', v)} placeholder="0.9" />
        <NumberField label="CrCl" unit="mL/min" value={value.crcl} onChange={(v) => update('crcl', v)} placeholder="90" />
        <NumberField label="Bilirrubina total" unit="mg/dL" value={value.bilirubin_total} onChange={(v) => update('bilirubin_total', v)} placeholder="0.8" />
        <NumberField label="AST" unit="U/L" value={value.ast} onChange={(v) => update('ast', v)} placeholder="25" />
        <NumberField label="ALT" unit="U/L" value={value.alt} onChange={(v) => update('alt', v)} placeholder="25" />
        <NumberField label="FEVI" unit="%" value={value.lvef} onChange={(v) => update('lvef', v)} placeholder="60" />
        <NumberField label="WBC" unit="×10⁹/L" value={value.wbc} onChange={(v) => update('wbc', v)} placeholder="6" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>
          Fecha de toma de labs
        </label>
        <input
          type="datetime-local"
          value={value.labs_collected_at}
          onChange={(e) => update('labs_collected_at', e.target.value)}
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10,
            border: '1.5px solid #E5E7EB', boxSizing: 'border-box', minHeight: 44,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
          Vacío = se usa la hora actual. Labs con más de 30 días generan advertencia (R-LAB-12).
        </p>
      </div>

      {/* ── Neuropatía ── */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '20px 0 10px' }}>
        Neuropatía periférica
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {([0, 1, 2, 3, 4] as const).map((g) => {
          const active = value.neuropathy_grade === g
          return (
            <button
              key={g}
              onClick={() => update('neuropathy_grade', g)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1.5px solid',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, minWidth: 48,
                background: active ? '#1E3A5F' : '#fff',
                color: active ? '#fff' : '#6B7280',
                borderColor: active ? '#1E3A5F' : '#E5E7EB',
              }}
            >
              G{g}
            </button>
          )
        })}
      </div>
      {value.neuropathy_grade >= 1 && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, cursor: 'pointer', minHeight: 44 }}>
          <input
            type="checkbox"
            checked={value.neuropathy_pain}
            onChange={(e) => update('neuropathy_pain', e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#1E3A5F', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#374151' }}>Neuropatía con dolor</span>
        </label>
      )}

      {/* ── ECOG ── */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '20px 0 10px' }}>
        ECOG
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => update('ecog', null)}
          style={{
            padding: '8px 16px', borderRadius: 20, border: '1.5px solid',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40,
            background: value.ecog === null ? '#1E3A5F' : '#fff',
            color: value.ecog === null ? '#fff' : '#6B7280',
            borderColor: value.ecog === null ? '#1E3A5F' : '#E5E7EB',
          }}
        >
          N/D
        </button>
        {([0, 1, 2, 3, 4] as const).map((e) => {
          const active = value.ecog === e
          return (
            <button
              key={e}
              onClick={() => update('ecog', e)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1.5px solid',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', minHeight: 40, minWidth: 48,
                background: active ? '#1E3A5F' : '#fff',
                color: active ? '#fff' : '#6B7280',
                borderColor: active ? '#1E3A5F' : '#E5E7EB',
              }}
            >
              {e}
            </button>
          )
        })}
      </div>

      {/* ── Medicamentos concurrentes ── */}
      <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '20px 0 10px' }}>
        Medicamentos concurrentes
      </p>
      <textarea
        value={value.concurrent_medications_text}
        onChange={(e) => update('concurrent_medications_text', e.target.value)}
        placeholder="Uno por línea o separados por coma: enoxaparina, omeprazol..."
        rows={3}
        style={{
          width: '100%', padding: '10px 12px', fontSize: 13, borderRadius: 10,
          border: '1.5px solid #E5E7EB', boxSizing: 'border-box', resize: 'vertical',
          fontFamily: "'DM Sans', sans-serif",
        }}
      />

      {/* ── Serología VHB ── */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, cursor: 'pointer', minHeight: 44, marginTop: 16 }}>
        <input
          type="checkbox"
          checked={value.hbv_screened}
          onChange={(e) => update('hbv_screened', e.target.checked)}
          style={{ width: 18, height: 18, accentColor: '#1E3A5F', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 13, color: '#374151' }}>
          Serología VHB confirmada (HBsAg + anti-HBc, &lt;90 días) — solo aplica si el protocolo incluye anti-CD20
        </span>
      </label>
    </div>
  )
}
