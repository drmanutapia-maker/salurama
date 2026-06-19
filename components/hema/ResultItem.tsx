'use client'

import { useState } from 'react'
import { AlertCircle, AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import type { Override, ValidationResult } from '@salurama/hema-shared'

const SEVERITY_BG: Record<ValidationResult['severity'], string> = {
  block: '#FEF2F2', warn: '#FFFBEB', info: '#EFF6FF',
}
const SEVERITY_BORDER: Record<ValidationResult['severity'], string> = {
  block: '#FCA5A5', warn: '#FDE68A', info: '#BFDBFE',
}
const SEVERITY_FG: Record<ValidationResult['severity'], string> = {
  block: '#DC2626', warn: '#D97706', info: '#1D4ED8',
}

interface ResultItemProps {
  result: ValidationResult
  override: Override | undefined
  onAddOverride: (reason: string) => void
  onRemoveOverride: () => void
}

export function ResultItem({ result, override, onAddOverride, onRemoveOverride }: ResultItemProps) {
  const [reasonDraft, setReasonDraft] = useState('')
  const [editing, setEditing] = useState(false)

  const Icon = result.severity === 'block' ? AlertCircle : result.severity === 'warn' ? AlertTriangle : Info
  const canOverride = result.override_allowed && !result.requires_second_signer

  return (
    <div
      style={{
        background: SEVERITY_BG[result.severity],
        border: `1.5px solid ${SEVERITY_BORDER[result.severity]}`,
        borderRadius: 12, padding: '12px 14px', marginBottom: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Icon size={16} color={SEVERITY_FG[result.severity]} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: SEVERITY_FG[result.severity], fontWeight: 600, margin: 0 }}>
            {result.message_es}
          </p>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, fontFamily: 'monospace' }}>
            {result.ruleId}{result.drug_inn ? ` · ${result.drug_inn}` : ''}
          </p>

          {result.requires_second_signer && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#991B1B', fontWeight: 600, marginTop: 8 }}>
              <ShieldAlert size={13} /> Requiere segunda firma — no disponible en este flujo. No se puede continuar.
            </p>
          )}

          {canOverride && override && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.6)', borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: '#374151', margin: 0 }}>
                <strong>Justificación:</strong> {override.reason}
              </p>
              <button
                onClick={onRemoveOverride}
                style={{ marginTop: 6, background: 'none', border: 'none', color: '#DC2626', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Quitar justificación
              </button>
            </div>
          )}

          {canOverride && !override && !editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                marginTop: 8, background: '#fff', border: `1.5px solid ${SEVERITY_FG[result.severity]}`,
                color: SEVERITY_FG[result.severity], borderRadius: 8, padding: '6px 12px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 32,
              }}
            >
              Justificar y continuar
            </button>
          )}

          {canOverride && !override && editing && (
            <div style={{ marginTop: 8 }}>
              <textarea
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder="Justificación clínica (mínimo 30 caracteres)..."
                rows={2}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8,
                  border: '1.5px solid #D1D5DB', boxSizing: 'border-box', resize: 'vertical',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <button
                  onClick={() => { onAddOverride(reasonDraft.trim()); setEditing(false); setReasonDraft('') }}
                  disabled={reasonDraft.trim().length < 30}
                  style={{
                    background: reasonDraft.trim().length < 30 ? '#D1D5DB' : '#16A34A',
                    color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px',
                    fontSize: 12, fontWeight: 700, cursor: reasonDraft.trim().length < 30 ? 'not-allowed' : 'pointer', minHeight: 32,
                  }}
                >
                  Guardar
                </button>
                <button
                  onClick={() => { setEditing(false); setReasonDraft('') }}
                  style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>{reasonDraft.trim().length}/30</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
