'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { ResultItem } from '@/components/hema/ResultItem'
import { buildOrderInput } from './calc'
import Step3ClinicalInputs from './Step3ClinicalInputs'
import Step3DrugList from './Step3DrugList'
import type {
  ClinicalInputs,
  CumulativeDoseEntry,
  DrugDoseAdjustment,
  Override,
  ValidationResponse,
  WizardPatient,
  WizardProtocol,
} from './types'

// ─── Props ───────────────────────────────────────────────────────────────────

interface Step3DoseProps {
  patient: WizardPatient
  protocol: WizardProtocol
  currentUserId: string
  clinicalInputs: ClinicalInputs
  doseAdjustments: DrugDoseAdjustment[]
  overrides: Override[]
  validation: ValidationResponse | null
  validating: boolean
  onClinicalInputsChange: (next: ClinicalInputs) => void
  onDoseAdjustmentsChange: (next: DrugDoseAdjustment[]) => void
  onOverridesChange: (next: Override[]) => void
  onValidationChange: (next: ValidationResponse | null) => void
  onValidatingChange: (next: boolean) => void
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Step3Dose({
  patient, protocol, currentUserId,
  clinicalInputs, doseAdjustments, overrides, validation, validating,
  onClinicalInputsChange, onDoseAdjustmentsChange, onOverridesChange,
  onValidationChange, onValidatingChange,
}: Step3DoseProps) {
  const [cumulativeDoses, setCumulativeDoses] = useState<CumulativeDoseEntry[]>([])
  const [validateError, setValidateError] = useState<string | null>(null)

  // ── Dosis acumuladas históricas (R-CUM-*) ────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function loadCumulative() {
      const { data } = await supabase.schema('hema').from('cumulative_doses')
        .select('cumulative_mg_m2, drugs(inn)')
        .eq('patient_id', patient.id)
      if (!mounted) return
      const rows = (data as { cumulative_mg_m2: number; drugs: { inn: string }[] | { inn: string } | null }[]) ?? []
      setCumulativeDoses(
        rows
          .map((r) => ({
            inn: Array.isArray(r.drugs) ? (r.drugs[0]?.inn ?? '') : (r.drugs?.inn ?? ''),
            cumulative_mg_m2: r.cumulative_mg_m2,
          }))
          .filter((c) => c.inn),
      )
    }
    loadCumulative()
    return () => { mounted = false }
  }, [patient.id])

  // ── Validación en vivo (debounced) contra hema-orders-calculate ─────────
  useEffect(() => {
    let cancelled = false
    onValidatingChange(true)

    const timer = setTimeout(async () => {
      try {
        const orderInput = buildOrderInput({ patient, protocol, clinicalInputs, doseAdjustments, cumulativeDoses, overrides })
        const { data, error } = await supabase.functions.invoke('hema-orders-calculate', { body: orderInput })
        if (cancelled) return
        if (error) {
          setValidateError(error.message)
          onValidationChange(null)
        } else {
          setValidateError(null)
          onValidationChange(data as ValidationResponse)
        }
      } catch (err) {
        if (!cancelled) setValidateError(err instanceof Error ? err.message : 'Error al validar')
      } finally {
        if (!cancelled) onValidatingChange(false)
      }
    }, 600)

    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, protocol, clinicalInputs, doseAdjustments, overrides, cumulativeDoses])

  function addOverride(ruleId: string, reason: string) {
    onOverridesChange([...overrides.filter((o) => o.rule_id !== ruleId), { rule_id: ruleId, reason, override_by: currentUserId }])
  }
  function removeOverride(ruleId: string) {
    onOverridesChange(overrides.filter((o) => o.rule_id !== ruleId))
  }
  function findOverride(ruleId: string): Override | undefined {
    return overrides.find((o) => o.rule_id === ruleId)
  }

  const generalResults = (validation?.results ?? []).filter((r) => !r.drug_inn)

  return (
    <div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
        Ajuste de dosis y validación
      </h2>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
        {protocol.code} · BSA {patient.bsa_mosteller.toFixed(2)} m² (Mosteller) · {patient.weight_kg} kg / {patient.height_cm} cm
      </p>

      {!protocol.active && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, display: 'flex', gap: 10 }}>
          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#92400E', fontWeight: 700, margin: 0 }}>
            ⚠ Protocolo pendiente de aprobación — solo disponible en modo desarrollo
          </p>
        </div>
      )}

      <Step3ClinicalInputs value={clinicalInputs} onChange={onClinicalInputsChange} />

      <Step3DrugList
        protocol={protocol}
        patient={patient}
        doseAdjustments={doseAdjustments}
        onChange={onDoseAdjustmentsChange}
        results={validation?.results ?? []}
        findOverride={findOverride}
        onAddOverride={addOverride}
        onRemoveOverride={removeOverride}
      />

      {generalResults.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 900, color: '#111827', marginBottom: 8 }}>
            Otras alertas clínicas
          </h3>
          {generalResults.map((r) => (
            <ResultItem
              key={r.ruleId}
              result={r}
              override={findOverride(r.ruleId)}
              onAddOverride={(reason) => addOverride(r.ruleId, reason)}
              onRemoveOverride={() => removeOverride(r.ruleId)}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9CA3AF' }}>
        {validating ? (
          <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Validando reglas clínicas...</>
        ) : validation?.hasUnresolvedBlocks ? (
          <><AlertCircle size={14} color="#DC2626" /> <span style={{ color: '#DC2626', fontWeight: 600 }}>Hay reglas bloqueantes sin resolver. No puedes continuar.</span></>
        ) : validation ? (
          <><CheckCircle2 size={14} color="#16A34A" /> <span style={{ color: '#16A34A', fontWeight: 600 }}>Sin bloqueos pendientes.</span></>
        ) : null}
      </div>

      {validateError && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10 }}>
          <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>Error al validar: {validateError}</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
