'use client'

import { useState } from 'react'
import { FlaskConical, Sparkles } from 'lucide-react'
import { ResultItem } from '@/components/hema/ResultItem'
import { round2 } from './calc'
import type { DrugDoseAdjustment, Override, ValidationResult, WizardPatient, WizardProtocol, WizardProtocolDrug } from './types'

interface Step3DrugListProps {
  protocol: WizardProtocol
  patient: WizardPatient
  doseAdjustments: DrugDoseAdjustment[]
  onChange: (next: DrugDoseAdjustment[]) => void
  results: ValidationResult[]
  findOverride: (ruleId: string) => Override | undefined
  onAddOverride: (ruleId: string, reason: string) => void
  onRemoveOverride: (ruleId: string) => void
}

export default function Step3DrugList({
  protocol, doseAdjustments, onChange, results, findOverride, onAddOverride, onRemoveOverride,
}: Step3DrugListProps) {
  function updateAdj(protocolDrugId: string, patch: Partial<DrugDoseAdjustment>) {
    onChange(doseAdjustments.map((a) => (a.protocol_drug_id === protocolDrugId ? { ...a, ...patch } : a)))
  }

  function applySuggestion(adj: DrugDoseAdjustment, result: ValidationResult) {
    let newDose: number
    let pct: number
    if (result.suggested_dose_mg != null) {
      newDose = result.suggested_dose_mg
      pct = adj.base_dose_mg > 0 ? round2((1 - newDose / adj.base_dose_mg) * 100) : 0
    } else if (result.reduction_pct != null) {
      pct = result.reduction_pct
      newDose = round2(adj.base_dose_mg * (1 - pct / 100))
    } else {
      return
    }
    updateAdj(adj.protocol_drug_id, { computed_dose_mg: newDose, reduction_pct: pct, reduction_reason: result.message_es })
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 900, color: '#111827', marginBottom: 10 }}>
        Fármacos del protocolo
      </h3>

      {protocol.drugs.map((drug) => {
        const adj = doseAdjustments.find((a) => a.protocol_drug_id === drug.id)
        if (!adj) return null

        const drugResults = results.filter((r) => r.drug_inn?.toLowerCase() === drug.inn.toLowerCase())
        const suggestion = drugResults.find((r) => r.suggested_dose_mg != null || r.reduction_pct != null)
        const wasReduced = adj.computed_dose_mg !== adj.base_dose_mg
        const premedEntries = drug.premed_required ? Object.entries(drug.premed_required) : []

        return (
          <DrugCard
            key={drug.id}
            drug={drug}
            adj={adj}
            wasReduced={wasReduced}
            premedEntries={premedEntries}
            suggestion={suggestion}
            onApplySuggestion={() => suggestion && applySuggestion(adj, suggestion)}
            onUpdate={(patch) => updateAdj(drug.id, patch)}
            results={drugResults}
            findOverride={findOverride}
            onAddOverride={onAddOverride}
            onRemoveOverride={onRemoveOverride}
          />
        )
      })}
    </div>
  )
}

// ─── Tarjeta de un fármaco ────────────────────────────────────────────────────

function DrugCard({
  drug, adj, wasReduced, premedEntries, suggestion, onApplySuggestion, onUpdate,
  results, findOverride, onAddOverride, onRemoveOverride,
}: {
  drug: WizardProtocolDrug
  adj: DrugDoseAdjustment
  wasReduced: boolean
  premedEntries: [string, string][]
  suggestion: ValidationResult | undefined
  onApplySuggestion: () => void
  onUpdate: (patch: Partial<DrugDoseAdjustment>) => void
  results: ValidationResult[]
  findOverride: (ruleId: string) => Override | undefined
  onAddOverride: (ruleId: string, reason: string) => void
  onRemoveOverride: (ruleId: string) => void
}) {
  const [doseInput, setDoseInput] = useState(String(adj.computed_dose_mg))

  function commitDose(raw: string) {
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) { setDoseInput(String(adj.computed_dose_mg)); return }
    const pct = adj.base_dose_mg > 0 ? round2((1 - n / adj.base_dose_mg) * 100) : 0
    onUpdate({ computed_dose_mg: round2(n), reduction_pct: pct })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{drug.inn}</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {drug.route} · Día{drug.days_of_cycle.length !== 1 ? 's' : ''} {drug.days_of_cycle.join(', ')}
            {drug.infusion_minutes ? ` · ${drug.infusion_minutes} min` : ''}
          </p>
          {drug.vehicle && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>Vehículo: {drug.vehicle}</p>}
          {premedEntries.length > 0 && (
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
              Premedicación: {premedEntries.map(([k, v]) => `${k} ${v}`).join(', ')}
            </p>
          )}
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          Base: {adj.base_dose_mg} mg
        </p>
      </div>

      {/* Dosis editable */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>
            Dosis final (mg)
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={doseInput}
            onChange={(e) => setDoseInput(e.target.value)}
            onBlur={(e) => commitDose(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', fontSize: 15, fontWeight: 700, borderRadius: 10,
              border: `1.5px solid ${wasReduced ? '#D97706' : '#E5E7EB'}`, boxSizing: 'border-box', minHeight: 44,
              fontFamily: "'DM Sans', sans-serif", color: wasReduced ? '#D97706' : '#111827',
            }}
          />
        </div>
        {wasReduced && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', paddingBottom: 12, whiteSpace: 'nowrap' }}>
            {adj.reduction_pct > 0 ? `-${adj.reduction_pct}%` : `+${-adj.reduction_pct}%`}
          </span>
        )}
      </div>

      {wasReduced && (
        <input
          type="text"
          value={adj.reduction_reason ?? ''}
          onChange={(e) => onUpdate({ reduction_reason: e.target.value })}
          placeholder="Motivo del ajuste de dosis (requerido)"
          style={{
            width: '100%', padding: '8px 10px', fontSize: 12, borderRadius: 8,
            border: '1.5px solid #FDE68A', background: '#FFFBEB', boxSizing: 'border-box', marginBottom: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
      )}

      {suggestion && (
        <button
          onClick={onApplySuggestion}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
            background: '#EFF6FF', border: '1.5px solid #BFDBFE', color: '#1D4ED8',
            borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 36,
          }}
        >
          <Sparkles size={13} />
          Aplicar sugerencia: {suggestion.suggested_dose_mg != null ? `${suggestion.suggested_dose_mg} mg` : `-${suggestion.reduction_pct}%`}
        </button>
      )}

      {drug.requires_test_dose && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10, cursor: 'pointer', minHeight: 44, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={adj.test_dose_completed}
            onChange={(e) => onUpdate({ test_dose_completed: e.target.checked })}
            style={{ width: 18, height: 18, accentColor: '#1E3A5F', cursor: 'pointer' }}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151' }}>
            <FlaskConical size={13} /> Dosis de prueba completada (25 mg IV × 15 min + observación)
          </span>
        </label>
      )}

      {results.map((r) => (
        <ResultItem
          key={r.ruleId}
          result={r}
          override={findOverride(r.ruleId)}
          onAddOverride={(reason) => onAddOverride(r.ruleId, reason)}
          onRemoveOverride={() => onRemoveOverride(r.ruleId)}
        />
      ))}
    </div>
  )
}
