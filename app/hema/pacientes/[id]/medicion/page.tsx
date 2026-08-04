'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react'
import BsaCard from '@/components/hema/BsaCard'

// Inline para no depender del workspace link en dev
function calcMosteller(w: number, h: number) {
  return Math.round(Math.sqrt((w * h) / 3600) * 100) / 100
}
function calcDuBois(w: number, h: number) {
  return Math.round(0.007184 * Math.pow(w, 0.425) * Math.pow(h, 0.725) * 100) / 100
}
import { supabase } from '@/lib/supabaseClient'
import { addMeasurement } from '../../actions'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeCalcBSA(weight: number, height: number): { mosteller: number; dubois: number } | null {
  if (weight < 20 || weight > 250 || height < 100 || height > 220) return null
  try {
    return { mosteller: calcMosteller(weight, height), dubois: calcDuBois(weight, height) }
  } catch {
    return null
  }
}

function variancePct(a: number, b: number): number {
  if (b === 0) return 0
  return Math.abs((a - b) / b) * 100
}

// ─── Numeric input ────────────────────────────────────────────────────────────

function NumericInput({
  label,
  name,
  unit,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  hint,
  error,
}: {
  label: string
  name: string
  unit: string
  value: string
  onChange: (v: string) => void
  min: number
  max: number
  step?: number
  hint?: string
  error?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={name} style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
        {label} <span style={{ color: '#DC2626' }}>*</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        <input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '14px 16px',
            fontSize: 22,
            fontFamily: 'Fraunces, serif',
            fontWeight: 700,
            border: `1.5px solid ${error ? '#DC2626' : '#D1D5DB'}`,
            borderRight: 'none',
            borderRadius: '12px 0 0 12px',
            background: '#fff',
            outline: 'none',
            minHeight: 56,
            width: '100%',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = error ? '#DC2626' : '#1E3A5F' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? '#DC2626' : '#D1D5DB' }}
        />
        <span
          style={{
            padding: '14px 16px',
            background: '#F3F4F6',
            border: `1.5px solid ${error ? '#DC2626' : '#D1D5DB'}`,
            borderRadius: '0 12px 12px 0',
            fontSize: 16,
            fontWeight: 700,
            color: '#6B7280',
            whiteSpace: 'nowrap',
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          {unit}
        </span>
      </div>
      {error && (
        <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500, display: 'flex', gap: 4, alignItems: 'center' }}>
          <AlertTriangle size={12} /> {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>{hint}</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NuevaMedicionPage() {
  const router        = useRouter()
  const params        = useParams()
  const searchParams  = useSearchParams()
  const patientId     = params.id as string
  const isFirst       = searchParams.get('first') === 'true'
  const [isPending, startTransition] = useTransition()

  const [weightStr, setWeightStr] = useState('')
  const [heightStr, setHeightStr] = useState('')
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [apiError, setApiError]   = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)

  // Previous measurement for variance alert
  const [prevBsa, setPrevBsa] = useState<number | null>(null)
  const [prevDate, setPrevDate] = useState<string | null>(null)

  // Load last measurement for variance check
  useEffect(() => {
    supabase.schema('hema').from('patient_measurements')
      .select('bsa_mosteller, measured_at')
      .eq('patient_id', patientId)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrevBsa(Number(data.bsa_mosteller))
          setPrevDate(data.measured_at as string)
        }
      })
  }, [patientId])

  const weight = parseFloat(weightStr)
  const height = parseFloat(heightStr)
  const bsa    = safeCalcBSA(weight, height)

  const variance = bsa && prevBsa ? variancePct(bsa.mosteller, prevBsa) : null
  const hasVarianceAlert = variance !== null && variance > 10

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!weightStr || isNaN(weight)) next.weight = 'Ingresa el peso'
    else if (weight < 20 || weight > 250) next.weight = 'Peso fuera de rango (20–250 kg)'
    if (!heightStr || isNaN(height)) next.height = 'Ingresa la talla'
    else if (height < 100 || height > 220) next.height = 'Talla fuera de rango (100–220 cm)'
    setErrors(next)
    return Object.keys(next).length === 0
  }, [weightStr, heightStr, weight, height])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setApiError(null)

    const fd = new FormData()
    fd.set('patient_id', patientId)
    fd.set('weight_kg',  String(weight))
    fd.set('height_cm',  String(height))

    startTransition(async () => {
      const result = await addMeasurement(fd)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/hema/pacientes/${patientId}`)
        }, 1800)
      } else {
        setApiError(result.error)
      }
    })
  }

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, textAlign: 'center' }}>
        <CheckCircle2 size={56} color="#16A34A" />
        <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, color: '#16A34A' }}>
          Medición registrada
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280' }}>BSA: {bsa?.mosteller.toFixed(2)} m² (Mosteller)</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ─── Back ───────────────────────────────────────────────────────── */}
      <Link
        href={isFirst ? `/hema/pacientes` : `/hema/pacientes/${patientId}`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 20, minHeight: 44 }}
      >
        <ArrowLeft size={16} />
        {isFirst ? 'Pacientes' : 'Perfil del paciente'}
      </Link>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
          borderRadius: 16, padding: '20px 20px 24px', marginBottom: 24, color: '#fff',
        }}
      >
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 900, marginBottom: 4, color: '#fff' }}>
          {isFirst ? 'Medición inicial' : 'Nueva medición'}
        </h1>
        <p style={{ fontSize: 13, color: '#fff' }}>
          El BSA se calcula automáticamente con la fórmula de Mosteller.
          {prevBsa && ` BSA anterior: ${prevBsa.toFixed(2)} m²`}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 16, padding: '20px',
            display: 'flex', flexDirection: 'column', gap: 24,
          }}
        >
          {/* Peso */}
          <NumericInput
            label="Peso"
            name="weight_kg"
            unit="kg"
            value={weightStr}
            onChange={(v) => { setWeightStr(v); setErrors((p) => { const n = {...p}; delete n.weight; return n }) }}
            min={20}
            max={250}
            step={0.1}
            hint="Rango: 20–250 kg"
            error={errors.weight}
          />

          {/* Talla */}
          <NumericInput
            label="Talla"
            name="height_cm"
            unit="cm"
            value={heightStr}
            onChange={(v) => { setHeightStr(v); setErrors((p) => { const n = {...p}; delete n.height; return n }) }}
            min={100}
            max={220}
            step={0.5}
            hint="Rango: 100–220 cm"
            error={errors.height}
          />

          {/* BSA en tiempo real */}
          {bsa ? (
            <div>
              <BsaCard
                mosteller={bsa.mosteller}
                dubois={bsa.dubois}
                measuredAt={new Date().toISOString()}
                weightKg={weight}
                heightCm={height}
              />

              {/* Alerta variación >10% */}
              {hasVarianceAlert && (
                <div
                  style={{
                    marginTop: 12, padding: '12px 16px',
                    background: '#FFFBEB', border: '1.5px solid #D97706',
                    borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}
                >
                  <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>
                      Variación de BSA significativa ({variance!.toFixed(1)}%)
                    </p>
                    <p style={{ fontSize: 12, color: '#B45309' }}>
                      BSA anterior: {prevBsa?.toFixed(2)} m²
                      {prevDate ? ` (${new Date(prevDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })})` : ''}.
                      Variación mayor al 10%. Verifica peso y talla antes de continuar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '20px', background: '#F9FAFB', borderRadius: 14,
                textAlign: 'center', border: '1.5px dashed #E5E7EB',
              }}
            >
              <Info size={28} color="#D1D5DB" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>
                Ingresa peso y talla para calcular la superficie corporal en tiempo real
              </p>
            </div>
          )}
        </div>

        {/* API error */}
        {apiError && (
          <div
            style={{
              marginTop: 16, padding: '12px 16px',
              background: '#FEF2F2', border: '1px solid #FCA5A5',
              borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{apiError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !bsa}
          style={{
            width: '100%', marginTop: 20, padding: '16px',
            background: isPending || !bsa ? '#9CA3AF' : '#16A34A',
            color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
            cursor: isPending || !bsa ? 'not-allowed' : 'pointer',
            minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background 0.15s',
            boxShadow: !bsa || isPending ? 'none' : '0 2px 8px rgba(22,163,74,0.3)',
          }}
        >
          {isPending ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              Guardando medición...
            </>
          ) : bsa ? (
            `Guardar: BSA ${bsa.mosteller.toFixed(2)} m²`
          ) : (
            'Ingresa peso y talla'
          )}
        </button>
      </form>
    </>
  )
}
