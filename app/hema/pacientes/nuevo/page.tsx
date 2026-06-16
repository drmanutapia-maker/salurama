'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertCircle, User, Loader2 } from 'lucide-react'
import { createPatient } from '../actions'

// ─── CURP regex (oficial RENAPO) ─────────────────────────────────────────────

const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$/

// ─── Helpers ─────────────────────────────────────────────────────────────────

function curpStatus(value: string): 'empty' | 'invalid' | 'valid' {
  if (!value) return 'empty'
  return CURP_REGEX.test(value.toUpperCase()) ? 'valid' : 'invalid'
}

// ─── Input component ──────────────────────────────────────────────────────────

function Field({
  label,
  name,
  type = 'text',
  required = false,
  value,
  onChange,
  placeholder,
  maxLength,
  hint,
  error,
  inputMode,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  hint?: string
  error?: string
  inputMode?: 'text' | 'numeric' | 'email'
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={name}
        style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
      >
        {label}
        {required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        style={{
          padding: '12px 14px',
          fontSize: 15,
          border: `1.5px solid ${error ? '#DC2626' : '#D1D5DB'}`,
          borderRadius: 12,
          background: '#fff',
          fontFamily: "'DM Sans', sans-serif",
          minHeight: 48,
          boxSizing: 'border-box',
          width: '100%',
          transition: 'border-color 0.15s',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? '#DC2626' : '#1E3A5F'
          e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? 'rgba(220,38,38,0.12)' : 'rgba(30,58,95,0.12)'}`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#DC2626' : '#D1D5DB'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {error && (
        <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 500, display: 'flex', gap: 4, alignItems: 'center' }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
      {hint && !error && (
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>{hint}</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NuevoPacientePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [curp, setCurp]         = useState('')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirth]   = useState('')
  const [sex, setSex]           = useState<'M' | 'F' | ''>('')
  const [nss, setNss]           = useState('')
  const [allergies, setAllergies] = useState('')

  // UI state
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  const curpVal = curp.toUpperCase().trim()
  const status  = curpStatus(curpVal)

  const handleCurpChange = useCallback((v: string) => {
    setCurp(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    setErrors((prev) => { const n = { ...prev }; delete n.curp; return n })
  }, [])

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!CURP_REGEX.test(curpVal)) next.curp = 'CURP inválido: verifica los 18 caracteres'
    if (!fullName.trim()) next.fullName = 'Nombre requerido'
    if (!birthDate) next.birthDate = 'Fecha de nacimiento requerida'
    if (!sex) next.sex = 'Selecciona el sexo biológico'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setApiError(null)

    const fd = new FormData()
    fd.set('curp',       curpVal)
    fd.set('full_name',  fullName.trim())
    fd.set('birth_date', birthDate)
    fd.set('sex',        sex)
    fd.set('nss',        nss.trim())
    fd.set('allergies',  allergies.trim())

    startTransition(async () => {
      const result = await createPatient(fd)
      if (result.success) {
        router.push(`/hema/pacientes/${result.patientId}/medicion?first=true`)
      } else {
        setApiError(result.error)
      }
    })
  }

  // Sex selector
  const SexButton = ({ value, label }: { value: 'M' | 'F'; label: string }) => (
    <button
      type="button"
      onClick={() => { setSex(value); setErrors((p) => { const n = { ...p }; delete n.sex; return n }) }}
      style={{
        flex: 1,
        padding: '12px 16px',
        border: `2px solid ${sex === value ? '#1E3A5F' : '#D1D5DB'}`,
        borderRadius: 12,
        background: sex === value ? '#EFF4FB' : '#fff',
        color: sex === value ? '#1E3A5F' : '#6B7280',
        fontWeight: sex === value ? 700 : 500,
        fontSize: 14,
        cursor: 'pointer',
        minHeight: 48,
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>

      {/* ─── Back ───────────────────────────────────────────────────────── */}
      <Link
        href="/hema/pacientes"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#1E3A5F',
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
          marginBottom: 20,
          minHeight: 44,
        }}
      >
        <ArrowLeft size={16} /> Pacientes
      </Link>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #152D4A 100%)',
          borderRadius: 16,
          padding: '20px 20px 24px',
          marginBottom: 24,
          color: '#fff',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <User size={22} color="#fff" />
        </div>
        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 4,
          }}
        >
          Nuevo paciente
        </h1>
        <p style={{ fontSize: 13, color: '#7EA8C9' }}>
          Después de guardar podrás registrar peso y talla para calcular la superficie corporal.
        </p>
      </div>

      {/* ─── Form ───────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 16,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* CURP */}
          <div>
            <label htmlFor="curp" style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              CURP <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="curp"
                name="curp"
                type="text"
                value={curpVal}
                onChange={(e) => handleCurpChange(e.target.value)}
                placeholder="GARJ840312HMCRCS09"
                maxLength={18}
                autoCapitalize="characters"
                style={{
                  padding: '12px 48px 12px 14px',
                  fontSize: 15,
                  fontFamily: 'monospace',
                  border: `1.5px solid ${
                    errors.curp ? '#DC2626'
                    : status === 'valid' ? '#16A34A'
                    : '#D1D5DB'
                  }`,
                  borderRadius: 12,
                  background: '#fff',
                  width: '100%',
                  minHeight: 48,
                  boxSizing: 'border-box',
                  letterSpacing: '0.08em',
                  outline: 'none',
                }}
              />
              {/* Indicador */}
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
                {status === 'valid' && <CheckCircle2 size={18} color="#16A34A" />}
                {status === 'invalid' && <AlertCircle size={18} color="#DC2626" />}
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 3, background: '#F3F4F6', borderRadius: 2, marginTop: 6 }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  width: `${Math.min(100, (curpVal.length / 18) * 100)}%`,
                  background: status === 'valid' ? '#16A34A' : status === 'invalid' ? '#D97706' : '#1E3A5F',
                  transition: 'width 0.2s, background 0.2s',
                }}
              />
            </div>
            {errors.curp ? (
              <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>
                {errors.curp}
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                {curpVal.length}/18 caracteres · formato: 4 letras + 6 dígitos + H/M + 5 letras + 2 caracteres
              </p>
            )}
          </div>

          {/* Nombre completo */}
          <Field
            label="Nombre completo"
            name="full_name"
            required
            value={fullName}
            onChange={setFullName}
            placeholder="García Ramírez José"
            error={errors.fullName}
            hint="Apellidos primero (como en ID oficial)"
          />

          {/* Fecha nacimiento */}
          <Field
            label="Fecha de nacimiento"
            name="birth_date"
            type="date"
            required
            value={birthDate}
            onChange={setBirth}
            error={errors.birthDate}
          />

          {/* Sexo biológico */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
              Sexo biológico <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <SexButton value="M" label="Masculino" />
              <SexButton value="F" label="Femenino" />
            </div>
            {errors.sex && (
              <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>
                {errors.sex}
              </p>
            )}
          </div>

          {/* NSS (opcional) */}
          <Field
            label="NSS (Número de Seguridad Social)"
            name="nss"
            value={nss}
            onChange={setNss}
            placeholder="Opcional"
            maxLength={11}
            inputMode="numeric"
            hint="11 dígitos IMSS"
          />

          {/* Alergias */}
          <div>
            <label htmlFor="allergies" style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Alergias conocidas
            </label>
            <textarea
              id="allergies"
              name="allergies"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Penicilina, sulfonamidas... (campo libre)"
              rows={3}
              maxLength={500}
              style={{
                padding: '12px 14px',
                fontSize: 14,
                border: '1.5px solid #D1D5DB',
                borderRadius: 12,
                background: '#fff',
                fontFamily: "'DM Sans', sans-serif",
                width: '100%',
                resize: 'vertical',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              Visible en cada indicación impresa (NOM-004)
            </p>
          </div>
        </div>

        {/* API error */}
        {apiError && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 12,
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>{apiError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          style={{
            width: '100%',
            marginTop: 20,
            padding: '16px',
            background: isPending ? '#6B7280' : '#1E3A5F',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            cursor: isPending ? 'not-allowed' : 'pointer',
            minHeight: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            transition: 'background 0.15s',
            boxShadow: isPending ? 'none' : '0 2px 8px rgba(30,58,95,0.25)',
          }}
        >
          {isPending ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
              Registrando paciente...
            </>
          ) : (
            'Guardar y registrar medición'
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </form>
    </>
  )
}
