'use client'

import { useState, useTransition } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { formatRoute } from '@salurama/hema-shared'
import { createOrder } from './actions'
import type {
  ClinicalInputs,
  DrugDoseAdjustment,
  Override,
  ValidationResponse,
  WizardPatient,
  WizardProtocol,
} from './types'

interface Step4ReviewProps {
  patient: WizardPatient
  protocol: WizardProtocol
  cycleNumber: number
  scheduledFor: string
  ecog: ClinicalInputs['ecog']
  doseAdjustments: DrugDoseAdjustment[]
  validation: ValidationResponse | null
  validating: boolean
  overrides: Override[]
  onCycleNumberChange: (n: number) => void
  onScheduledForChange: (s: string) => void
  nextCycleDate: string
  onNextCycleDateChange: (d: string) => void
  onSubmitted: (orderId: string) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcAge(birthDate: string): number {
  const today = new Date()
  const born = new Date(birthDate)
  let age = today.getFullYear() - born.getFullYear()
  const m = today.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--
  return age
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Step4Review({
  patient, protocol, cycleNumber, scheduledFor, ecog,
  doseAdjustments, validation, validating, overrides,
  onCycleNumberChange, onScheduledForChange, nextCycleDate, onNextCycleDateChange, onSubmitted,
}: Step4ReviewProps) {
  const [dayOfCycle, setDayOfCycle] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const hasBlocks = !validation || validation.hasUnresolvedBlocks
  const canSubmit = confirmed && !hasBlocks && !validating && !isPending

  function handleSubmit() {
    setSubmitError(null)
    startTransition(async () => {
      const drugs = doseAdjustments.map((adj) => {
        const drugResults = (validation?.results ?? []).filter((r) => r.drug_inn?.toLowerCase() === adj.inn.toLowerCase())
        const overrideReason = drugResults
          .map((r) => overrides.find((o) => o.rule_id === r.ruleId))
          .find((o): o is Override => Boolean(o))?.reason ?? null

        return {
          protocol_drug_id: adj.protocol_drug_id,
          drug_id: adj.drug_id,
          computed_dose_mg: adj.computed_dose_mg,
          base_dose_mg: adj.base_dose_mg,
          reduction_pct: adj.reduction_pct,
          reduction_reason: adj.reduction_reason,
          route: adj.route,
          infusion_minutes: adj.infusion_minutes,
          vehicle: adj.vehicle,
          given_on_day: adj.given_on_day,
          warnings: drugResults,
          override_reason: overrideReason,
        }
      })

      const result = await createOrder({
        patient_id: patient.id,
        protocol_id: protocol.id,
        diagnosis_code: patient.primary_dx_code ?? '',
        cycle_number: cycleNumber,
        day_of_cycle: dayOfCycle,
        measurement_id: patient.measurement_id,
        bsa_used: patient.bsa_mosteller,
        bsa_formula: 'mosteller',
        scheduled_for: scheduledFor,
        ecog: ecog ?? null,
        next_cycle_date: nextCycleDate || null,
        drugs,
      })

      if (result.success) {
        onSubmitted(result.orderId)
      } else {
        setSubmitError(result.error)
      }
    })
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 900, color: '#111827', marginBottom: 4 }}>
        Revisión y firma preliminar
      </h2>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
        Verifica todos los datos antes de crear la indicación.
      </p>

      {/* ── Paciente ── */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)', borderRadius: 16, padding: '18px 20px', marginBottom: 16, color: '#fff' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Paciente
        </p>
        <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 900, marginBottom: 4 }}>
          {patient.display_name}
        </h3>
        <p style={{ fontSize: 13, color: '#A0BBCC' }}>
          {calcAge(patient.birth_date)} años · {patient.sex === 'F' ? 'Femenino' : 'Masculino'} ·{' '}
          {patient.primary_dx_code} · {patient.primary_dx_desc}
        </p>
        <p style={{ fontSize: 13, color: '#7EA8C9', marginTop: 8 }}>
          BSA {patient.bsa_mosteller.toFixed(2)} m² (Mosteller) · {patient.weight_kg} kg / {patient.height_cm} cm
        </p>
        {patient.allergies && (
          <p style={{ fontSize: 12, color: '#FEF9C3', marginTop: 8 }}>⚠ Alergias: {patient.allergies}</p>
        )}
      </div>

      {/* ── Protocolo ── */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{protocol.code}</span>
          {protocol.is_preferred && <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED' }}>★ Preferido</span>}
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{protocol.name}</p>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          Ciclo de {protocol.cycle_length_days} días{protocol.total_cycles ? ` · ${protocol.total_cycles} ciclos` : ''}
        </p>

        {!protocol.active && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 10, display: 'flex', gap: 8 }}>
            <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: '#92400E', fontWeight: 700, margin: 0 }}>
              ⚠ Protocolo pendiente de aprobación — solo disponible en modo desarrollo
            </p>
          </div>
        )}
      </div>

      {/* ── Ciclo / fecha ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>Ciclo #</label>
          <input
            type="number" min={1} value={cycleNumber}
            onChange={(e) => onCycleNumberChange(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1.5px solid #E5E7EB', boxSizing: 'border-box', minHeight: 44 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>Día del ciclo</label>
          <input
            type="number" min={1} value={dayOfCycle}
            onChange={(e) => setDayOfCycle(Math.max(1, Number(e.target.value) || 1))}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1.5px solid #E5E7EB', boxSizing: 'border-box', minHeight: 44 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>Fecha</label>
          <input
            type="date" value={scheduledFor}
            onChange={(e) => onScheduledForChange(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1.5px solid #E5E7EB', boxSizing: 'border-box', minHeight: 44 }}
          />
        </div>
      </div>

      {/* ── Próximo ciclo (opcional) ── */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>
          Próximo ciclo <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(opcional)</span>
        </label>
        <input
          type="date"
          value={nextCycleDate}
          onChange={(e) => onNextCycleDateChange(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1.5px solid #E5E7EB', boxSizing: 'border-box', minHeight: 44 }}
        />
      </div>

      {/* ── Fármacos ── */}
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6' }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 15, fontWeight: 900, color: '#111827' }}>Fármacos a indicar</h3>
        </div>
        {doseAdjustments.map((adj, i) => {
          const wasReduced = adj.computed_dose_mg !== adj.base_dose_mg
          return (
            <div key={adj.protocol_drug_id} style={{ padding: '12px 16px', borderBottom: i < doseAdjustments.length - 1 ? '1px solid #F3F4F6' : 'none', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{adj.inn}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{formatRoute(adj.route)} · Día {adj.given_on_day}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: wasReduced ? '#D97706' : '#1E3A5F', margin: 0 }}>
                  {adj.computed_dose_mg} mg
                </p>
                {wasReduced && (
                  <p style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>
                    {adj.reduction_pct > 0 ? `-${adj.reduction_pct}%` : `+${-adj.reduction_pct}%`} vs base
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Estado de validación ── */}
      {hasBlocks ? (
        <div style={{ marginBottom: 16, padding: '14px 16px', background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 14, display: 'flex', gap: 10 }}>
          <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#991B1B', fontWeight: 600, margin: 0 }}>
            {validating ? 'Validando...' : !validation ? 'Vuelve al Paso 3: aún no se ha ejecutado la validación clínica.' : 'Hay reglas clínicas bloqueantes sin resolver. Vuelve al Paso 3 para justificarlas o ajustar la dosis.'}
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: 16, padding: '14px 16px', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 14, display: 'flex', gap: 10 }}>
          <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, color: '#166534', fontWeight: 600, margin: 0 }}>Validación clínica sin bloqueos pendientes.</p>
            {overrides.length > 0 && (
              <p style={{ fontSize: 12, color: '#15803D', marginTop: 4 }}>
                {overrides.length} alerta{overrides.length !== 1 ? 's' : ''} justificada{overrides.length !== 1 ? 's' : ''} por el médico.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmación ── */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 14, cursor: 'pointer', marginBottom: 16, minHeight: 64 }}>
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{ width: 22, height: 22, accentColor: '#1E3A5F', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
        />
        <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
          Confirmo que he revisado los datos clínicos y las dosis calculadas, y asumo la responsabilidad de esta
          indicación conforme a NOM-004-SSA3-2012. Esta herramienta es de soporte a la decisión clínica.
        </span>
      </label>

      {submitError && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 12, display: 'flex', gap: 10 }}>
          <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600, margin: 0 }}>{submitError}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '16px',
          background: !canSubmit ? '#9CA3AF' : '#16A34A',
          color: '#fff', border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 700,
          cursor: !canSubmit ? 'not-allowed' : 'pointer',
          minHeight: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: !canSubmit ? 'none' : '0 2px 8px rgba(22,163,74,0.3)',
        }}
      >
        {isPending ? (
          <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Creando indicación...</>
        ) : (
          <><ShieldCheck size={18} /> Crear indicación</>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
