'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, MapPin, Stethoscope, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck, Info } from 'lucide-react'
import { useCP } from '@/hooks/useCP'

// Especialidades médicas - TODAS incluidas
const ESPECIALIDADES = [
  'Alergología', 'Anestesiología', 'Angiología', 'Cardiología',
  'Cirugía Cardiovascular', 'Cirugía General', 'Cirugía Plástica', 'Dermatología',
  'Endocrinología', 'Gastroenterología', 'Geriatría', 'Ginecología y Obstetricia',
  'Hematología', 'Infectología', 'Medicina Familiar', 'Medicina Física y Rehabilitación',
  'Medicina Interna', 'Nefrología', 'Neumología', 'Neurología',
  'Neurocirugía', 'Nutriología', 'Oftalmología', 'Oncología',
  'Ortopedia y Traumatología', 'Otorrinolaringología', 'Pediatría', 'Psiquiatría',
  'Radiología', 'Reumatología', 'Urología', 'Otra especialidad'
]

// Consejos de especialidad - TODAS las especialidades incluidas
const CONSEJOS_ESPECIALIDAD: Record<string, string> = {
  'Alergología': 'Consejo Mexicano de Alergología e Inmunología',
  'Anestesiología': 'Consejo Mexicano de Anestesiología',
  'Angiología': 'Consejo Mexicano de Angiología y Cirugía Vascular',
  'Cardiología': 'Consejo Mexicano de Cardiología',
  'Cirugía Cardiovascular': 'Consejo Mexicano de Cirugía Cardiovascular',
  'Cirugía General': 'Consejo Mexicano de Cirugía General',
  'Cirugía Plástica': 'Consejo Mexicano de Cirugía Plástica, Estética y Reconstructiva',
  'Dermatología': 'Consejo Mexicano de Dermatología',
  'Endocrinología': 'Consejo Mexicano de Endocrinología',
  'Gastroenterología': 'Consejo Mexicano de Gastroenterología',
  'Geriatría': 'Consejo Mexicano de Geriatría',
  'Ginecología y Obstetricia': 'Consejo Mexicano de Ginecología y Obstetricia',
  'Hematología': 'Consejo Mexicano de Hematología',
  'Infectología': 'Consejo Mexicano de Infectología',
  'Medicina Familiar': 'Consejo Mexicano de Medicina Familiar',
  'Medicina Física y Rehabilitación': 'Consejo Mexicano de Medicina Física y Rehabilitación',
  'Medicina Interna': 'Consejo Mexicano de Medicina Interna',
  'Nefrología': 'Consejo Mexicano de Nefrología',
  'Neumología': 'Consejo Mexicano de Neumología',
  'Neurología': 'Consejo Mexicano de Neurología',
  'Neurocirugía': 'Consejo Mexicano de Neurocirugía',
  'Nutriología': 'Consejo Mexicano de Nutriología',
  'Oftalmología': 'Consejo Mexicano de Oftalmología',
  'Oncología': 'Consejo Mexicano de Oncología',
  'Ortopedia y Traumatología': 'Consejo Mexicano de Ortopedia y Traumatología',
  'Otorrinolaringología': 'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello',
  'Pediatría': 'Consejo Mexicano de Pediatría',
  'Psiquiatría': 'Consejo Mexicano de Psiquiatría',
  'Radiología': 'Consejo Mexicano de Radiología e Imagen',
  'Reumatología': 'Consejo Mexicano de Reumatología',
  'Urología': 'Consejo Mexicano de Urología',
  'Otra especialidad': '',
}

interface FormData {
  email: string
  password: string
  confirmPassword: string
  full_name: string
  specialty: string
  professional_license: string
  specialty_council: string
  license_not_current: boolean
  location_state: string
  location_city: string
  location_neighborhood: string
  address: string
  terms_accepted: boolean
}

export default function RegistroMedico() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [showCouncilTooltip, setShowCouncilTooltip] = useState(false)
  const [coloniasManuales, setColoniasManuales] = useState(false)
  
  const refPaso1 = useRef<HTMLInputElement>(null)
  const refPaso2 = useRef<HTMLInputElement>(null)
  const refPaso3 = useRef<HTMLInputElement>(null)
  
  // Hook para CP
  const { loading: loadingCP, error: errorCP, cpData, search, formatCP } = useCP()
  
  const [form, setForm] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    specialty: '',
    professional_license: '',
    specialty_council: '',
    license_not_current: false,
    location_state: '',
    location_city: '',
    location_neighborhood: '',
    address: '',
    terms_accepted: false,
  })

  // ✅ SCROLL AL TOP - Al montar el componente (primera carga)
  useEffect(() => {
    window.scrollTo(0, 0)
    if (document.body) document.body.scrollTop = 0
    if (document.documentElement) document.documentElement.scrollTop = 0
  }, [])

  // ✅ SCROLL AL TOP - Cuando cambia el paso
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => window.scrollTo(0, 0), 100)
  }, [step])

  // Auto-fill consejo cuando cambia especialidad
  useEffect(() => {
    if (form.specialty && CONSEJOS_ESPECIALIDAD[form.specialty]) {
      setForm(p => ({ ...p, specialty_council: CONSEJOS_ESPECIALIDAD[form.specialty] }))
    }
  }, [form.specialty])

  // Auto-fill estado y municipio cuando cambia CP
  useEffect(() => {
    if (cpData) {
      setForm(p => ({
        ...p,
        location_state: cpData.estado,
        location_city: cpData.municipio,
      }))
      if (cpData.colonias.length === 1) {
        setForm(p => ({ ...p, location_neighborhood: cpData.colonias[0].nombre }))
      }
    }
  }, [cpData])

  // Focus al cambiar de paso
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 1) refPaso1.current?.focus()
      if (step === 2) refPaso2.current?.focus()
      if (step === 3) refPaso3.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [step])

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    if (fieldErrors[name]) setFieldErrors(p => ({ ...p, [name]: false }))
    if (error) setError(null)
  }

  // Validaciones por paso
  const validate: Record<number, () => { msg: string | null; errors: Record<string, boolean> }> = {
    1: () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return { msg: 'El email no es válido. Ejemplo: tu@nombre.com', errors: { email: true } }
      if (form.password.length < 8)
        return { msg: 'Mínimo 8 caracteres. Ejemplo: TuPassword2026!', errors: { password: true } }
      if (form.password !== form.confirmPassword)
        return { msg: 'Las contraseñas no coinciden', errors: { confirmPassword: true } }
      return { msg: null, errors: {} }
    },
    2: () => {
      if (!form.full_name.trim())
        return { msg: 'Tu nombre completo es necesario', errors: { full_name: true } }
      if (!form.specialty)
        return { msg: 'Selecciona tu especialidad', errors: { specialty: true } }
      if (!/^\d{6,9}$/.test(form.professional_license.replace(/\s/g, '')))
        return { msg: 'Cédula de 6 a 9 dígitos (sin espacios)', errors: { professional_license: true } }
      return { msg: null, errors: {} }
    },
    3: () => {
      if (!form.location_state)
        return { msg: 'Ingresa un código postal válido', errors: { location_state: true } }
      if (!form.location_city.trim())
        return { msg: 'Selecciona tu ciudad', errors: { location_city: true } }
      if (!form.location_neighborhood.trim())
        return { msg: 'Selecciona o escribe tu colonia', errors: { location_neighborhood: true } }
      if (!form.terms_accepted)
        return { msg: 'Necesitas aceptar los términos para continuar', errors: { terms_accepted: true } }
      return { msg: null, errors: {} }
    }
  }

  const nextStep = () => {
    const { msg, errors } = validate[step]()
    if (msg) { setError(msg); setFieldErrors(errors); return }
    setError(null); setFieldErrors({})
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setStep(s => s - 1)
    setError(null); setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { msg, errors } = validate[3]()
    if (msg) { setError(msg); setFieldErrors(errors); return }

    setLoading(true); setError(null)
    try {
      const { error: ae } = await supabase.auth.signUp({
        email: form.email,
        password: form.password
      })
      if (ae) throw ae

      const { error: de } = await supabase.from('doctors').insert({
        email: form.email,
        full_name: form.full_name.trim(),
        specialty: form.specialty,
        professional_license: form.professional_license.replace(/\s/g, ''),
        specialty_council: form.specialty_council.trim() || null,
        license_not_current: form.license_not_current,
        location_state: form.location_state.trim(),
        location_city: form.location_city.trim(),
        location_neighborhood: form.location_neighborhood.trim() || null,
        address: form.address.trim() || null,
        license_verified: false,
        is_active: true,
        review_status: 'pendiente',
        license_visible: false,
      })
      if (de) throw de

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const fs = (name: string): React.CSSProperties => ({
    width: '100%',
    padding: '13px 15px',
    border: `1.5px solid ${fieldErrors[name] ? '#EF4444' : '#E5E7EB'}`,
    borderRadius: 10,
    fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    color: '#1A1A2E',
    outline: 'none',
    background: '#fff',
  })

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) return (
    <div style={{ minHeight: '100vh', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;700&display=swap'); *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ background: '#fff', borderRadius: 22, padding: 'clamp(32px, 8vw, 48px)', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(30,58,95,0.1)' }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={38} color="#fff" />
        </div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#1E3A5F', marginBottom: 10 }}>
          ¡Bienvenido a Salurama!
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.75, marginBottom: 6 }}>
          Revisaremos tu perfil y lo activaremos en{' '}
          <strong style={{ color: '#1A1A2E' }}>24 a 48 horas</strong>.
        </p>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 28 }}>
          Te avisaremos por email cuando estés visible para los pacientes.
        </p>
        <Link href="/" style={{ display: 'inline-block', background: '#1E3A5F', color: '#fff', padding: '12px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
          Ir al inicio
        </Link>
      </div>
    </div>
  )

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #EEF2FF 0%, #fff 40%)', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', paddingTop: 80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: #1E3A5F !important; box-shadow: 0 0 0 3px rgba(30,58,95,0.08) !important; outline: none; }
        input::placeholder, textarea::placeholder { color: '#9CA3AF'; font-weight: 300; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 13px center; padding-right: 38px !important; cursor: pointer; }
        .btn-p { width:100%; background:#1E3A5F; color:#fff; border:none; border-radius:50px; padding:14px 24px; font-size:16px; font-family:'DM Sans',sans-serif; font-weight:700; cursor:pointer; transition:background 0.18s; }
        .btn-p:hover:not(:disabled) { background:#2A9D8F; }
        .btn-p:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-b { width:100%; background:transparent; color:#6B7280; border:1.5px solid #E5E7EB; border-radius:50px; padding:12px 24px; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:500; cursor:pointer; transition:all 0.18s; margin-top:10px; }
        .btn-b:hover { border-color:#1E3A5F; color:#1E3A5F; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fi { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fi { animation: fi 0.22s ease-out; }
        @media (max-width: 560px) { .g2 { grid-template-columns: 1fr !important; } }
      `}</style>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(28px, 6vw, 44px) 16px 56px' }}>
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(34px, 8vw, 42px)', fontWeight: 900, color: '#1E3A5F', letterSpacing: '-1px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(34px, 8vw, 42px)', fontWeight: 600, color: '#2A9D8F', letterSpacing: '-1px' }}>rama</span>
          </Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: '#1E3A5F', marginBottom: 6 }}>
            Registro para Médicos
          </h1>
          {/* CTA CON IMPACTO */}
          <div style={{
            background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)',
            border: '1px solid #C7D2FE',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 8,
          }}>
            <p style={{
              fontSize: 'clamp(15px, 4vw, 17px)',
              color: '#1E3A5F',
              fontWeight: 700,
              margin: 0,
              fontFamily: "'Fraunces', serif"
            }}>
              Tus pacientes te están buscando
            </p>
          </div>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#1E3A5F', color: '#fff', padding: '7px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            REGISTRO GRATUITO
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>Sin suscripciones · Sin comisiones por paciente · Sin costos ocultos</p>
        </div>

        {/* INDICADOR DE PASOS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {[{ n: 1, label: 'Cuenta' }, { n: 2, label: 'Perfil' }, { n: 3, label: 'Ubicación' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, transition: 'all 0.3s', background: step > s.n ? '#10B981' : step === s.n ? '#1E3A5F' : '#E5E7EB', color: step >= s.n ? '#fff' : '#9CA3AF' }}>
                  {step > s.n ? <CheckCircle size={16} /> : s.n}
                </div>
                <span style={{ fontSize: 10, fontWeight: step === s.n ? 600 : 400, color: step >= s.n ? '#1E3A5F' : '#9CA3AF' }}>{s.label}</span>
              </div>
              {i < 2 && <div style={{ width: 56, height: 2, background: step > s.n ? '#10B981' : '#E5E7EB', margin: '0 6px 16px', transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444', borderRadius: 10, padding: '11px 14px', marginBottom: 16, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <AlertCircle size={16} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* CARD */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 20px rgba(30,58,95,0.06)', padding: 'clamp(20px, 5vw, 36px)' }}>
          {/* ── PASO 1: Cuenta ── */}
          {step === 1 && (
            <div className="fi">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={16} color="#1E3A5F" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Crea tu cuenta</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email *</label>
                  <input ref={refPaso1} name="email" type="email" style={fs('email')} value={form.email} onChange={handle} placeholder="tu@email.com" autoComplete="email" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input name="password" type={showPass ? 'text' : 'password'} style={{ ...fs('password'), paddingRight: 44 }} value={form.password} onChange={handle} placeholder="Mínimo 8 caracteres" />
                    <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Confirmar contraseña *</label>
                  <div style={{ position: 'relative' }}>
                    <input name="confirmPassword" type={showPass2 ? 'text' : 'password'} style={{ ...fs('confirmPassword'), paddingRight: 44 }} value={form.confirmPassword} onChange={handle} placeholder="Repite tu contraseña" />
                    <button type="button" onClick={() => setShowPass2(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                      {showPass2 ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 22 }}>
                <button className="btn-p" onClick={nextStep}>Continuar →</button>
              </div>
            </div>
          )}

          {/* ── PASO 2: Perfil profesional ── */}
          {step === 2 && (
            <div className="fi">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Stethoscope size={16} color="#1E3A5F" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Tu perfil profesional</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Nombre completo *</label>
                  <input ref={refPaso2} name="full_name" type="text" style={fs('full_name')} value={form.full_name} onChange={handle} placeholder="Juan Pérez García" autoComplete="name" />
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Sin abreviaciones</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="g2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Especialidad *</label>
                    <select name="specialty" style={fs('specialty')} value={form.specialty} onChange={handle}>
                      <option value="">Selecciona</option>
                      {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Cédula profesional *</label>
                    <input name="professional_license" type="text" inputMode="numeric" style={fs('professional_license')} value={form.professional_license} onChange={handle} placeholder="12345678" maxLength={9} />
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>6-9 dígitos (SEP)</p>
                  </div>
                </div>
                {/* Consejo de especialidad — EDITABLE con tooltip */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <ShieldCheck size={14} color="#1E3A5F" />
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', margin: 0 }}>
                      Consejo de especialidad
                      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}> (opcional)</span>
                    </p>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <Info
                        size={14}
                        color="#9CA3AF"
                        style={{ cursor: 'help' }}
                        onMouseEnter={() => setShowCouncilTooltip(true)}
                        onMouseLeave={() => setShowCouncilTooltip(false)}
                      />
                      {showCouncilTooltip && (
                        <div style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 8px)',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#1A1A2E',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 11,
                          lineHeight: 1.4,
                          maxWidth: 200,
                          textAlign: 'center',
                          zIndex: 1000,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }}>
                          Se autocompleta según tu especialidad. Puedes editarlo si es necesario.
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, marginBottom: 12 }}>
                    Si estás certificado, los pacientes podrán verificarlo desde tu perfil.
                  </p>
                  <div>
                    <input
                      name="specialty_council"
                      type="text"
                      style={{ ...fs('specialty_council'), fontSize: 14 }}
                      value={form.specialty_council}
                      onChange={handle}
                      placeholder="Ej: Consejo Mexicano de Hematología"
                    />
                    {form.specialty && CONSEJOS_ESPECIALIDAD[form.specialty] && (
                      <p style={{ fontSize: 11, color: '#059669', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={10} /> Autocompletado. Puedes editarlo.
                      </p>
                    )}
                  </div>
                  {/* Checkbox Certificación no vigente */}
                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="license_not_current"
                        checked={form.license_not_current}
                        onChange={handle}
                        style={{ width: 16, height: 16, accentColor: '#1E3A5F', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13, color: '#6B7280' }}>
                        Mi certificación <strong>no está vigente</strong> actualmente
                      </span>
                    </label>
                    {form.license_not_current && (
                      <p style={{ fontSize: 11, color: '#F59E0B', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertCircle size={10} /> Los pacientes verán que tu certificación requiere actualización
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 22 }}>
                <button className="btn-p" onClick={nextStep}>Continuar →</button>
                <button className="btn-b" onClick={prevStep}>← Atrás</button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Ubicación ── */}
          {step === 3 && (
            <form className="fi" onSubmit={handleSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={16} color="#1E3A5F" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Ubicación</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Código Postal */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Código Postal *</label>
                  <input
                    ref={refPaso3}
                    type="text"
                    inputMode="numeric"
                    style={fs('location_state')}
                    value={cpData ? '' : form.location_state}
                    onChange={e => {
                      const cp = formatCP(e.target.value)
                      setForm(p => ({ ...p, location_state: cp }))
                      if (cp.length === 5) {
                        search(cp)
                      }
                    }}
                    placeholder="06600"
                    maxLength={5}
                    disabled={!!cpData}
                  />
                  {loadingCP && <p style={{ fontSize: 12, color: '#1E3A5F', marginTop: 4 }}>Buscando...</p>}
                  {errorCP && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errorCP}</p>}
                  {cpData && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(p => ({ ...p, location_state: '', location_city: '', location_neighborhood: '' }))
                      }}
                      style={{ fontSize: 12, color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, textDecoration: 'underline' }}
                    >
                      Cambiar CP
                    </button>
                  )}
                </div>

                {/* Estado y Municipio (auto-fill, disabled) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="g2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Estado *</label>
                    <input
                      type="text"
                      value={form.location_state || ''}
                      disabled
                      style={{ ...fs('location_state'), background: '#F3F4F6', cursor: 'not-allowed' }}
                      placeholder="Auto-completado"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Municipio/Alcaldía *</label>
                    <input
                      type="text"
                      value={form.location_city || ''}
                      disabled
                      style={{ ...fs('location_city'), background: '#F3F4F6', cursor: 'not-allowed' }}
                      placeholder="Auto-completado"
                    />
                  </div>
                </div>

                {/* Colonia (dropdown o editable) */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Colonia *</label>
                  {!coloniasManuales && cpData && cpData.colonias.length > 0 ? (
                    <>
                      <select
                        name="location_neighborhood"
                        style={fs('location_neighborhood')}
                        value={form.location_neighborhood}
                        onChange={handle}
                      >
                        <option value="">Selecciona tu colonia</option>
                        {cpData.colonias.slice(0, 5).map((colonia, index) => (
                          <option key={index} value={colonia.nombre}>{colonia.nombre}</option>
                        ))}
                        {cpData.colonias.length > 5 && (
                          <option value="otra">Otra colonia (no aparece en la lista)</option>
                        )}
                      </select>
                      {form.location_neighborhood === 'otra' && (
                        <input
                          type="text"
                          placeholder="Escribe tu colonia"
                          style={{ ...fs('location_neighborhood'), marginTop: 8 }}
                          value={form.location_neighborhood === 'otra' ? '' : form.location_neighborhood}
                          onChange={e => {
                            setForm(p => ({ ...p, location_neighborhood: e.target.value }))
                            setColoniasManuales(true)
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <input
                      name="location_neighborhood"
                      type="text"
                      style={fs('location_neighborhood')}
                      value={form.location_neighborhood}
                      onChange={handle}
                      placeholder="Ej: Polanco, Juárez, etc."
                    />
                  )}
                </div>

                {/* Dirección completa (opcional) */}
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Dirección <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span>
                  </label>
                  <input
                    name="address"
                    type="text"
                    style={fs('address')}
                    value={form.address}
                    onChange={handle}
                    placeholder="Calle, número, piso, etc."
                  />
                </div>

                {/* Consentimiento legal */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      name="terms_accepted"
                      checked={form.terms_accepted}
                      onChange={handle}
                      style={{ width: 17, height: 17, marginTop: 2, accentColor: '#1E3A5F', flexShrink: 0, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                      Acepto los{' '}
                      <a href="/terminos-profesionales" target="_blank" style={{ color: '#1E3A5F', fontWeight: 500 }}>Términos para Profesionales</a>
                      {', los '}
                      <a href="/terminos-y-condiciones" target="_blank" style={{ color: '#1E3A5F', fontWeight: 500 }}>Términos y Condiciones</a>
                      {' y el '}
                      <a href="/aviso-de-privacidad" target="_blank" style={{ color: '#1E3A5F', fontWeight: 500 }}>Aviso de Privacidad</a>
                      {' *'}
                    </span>
                  </label>
                </div>

                {/* Info de verificación */}
                <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, marginBottom: 16 }}>
                  📋 Los pacientes podrán verificar tu cédula directamente en la SEP desde tu perfil público.
                </p>

                <button type="submit" className="btn-p" disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                      <span style={{ width: 17, height: 17, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Registrando...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      <CheckCircle size={17} /> Completar registro
                    </span>
                  )}
                </button>
                <button type="button" className="btn-b" onClick={prevStep}>← Atrás</button>
              </div>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: '#1E3A5F', fontWeight: 600, textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}