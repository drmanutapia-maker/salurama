'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, MapPin, Stethoscope, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

const ESPECIALIDADES = [
  'Anestesiología','Cardiología','Cirugía General','Dermatología',
  'Endocrinología','Gastroenterología','Geriatría','Ginecología y Obstetricia',
  'Hematología','Infectología','Medicina Familiar','Medicina Interna',
  'Nefrología','Neurología','Nutriología','Oftalmología','Oncología',
  'Ortopedia y Traumatología','Otorrinolaringología','Pediatría',
  'Psiquiatría','Reumatología','Urología','Otra especialidad'
]

const CIUDADES = [
  'Ciudad de México','Guadalajara','Monterrey','Puebla','Tijuana',
  'León','Juárez','Zapopan','Mérida','San Luis Potosí',
  'Aguascalientes','Hermosillo','Saltillo','Mexicali','Culiacán',
  'Querétaro','Chihuahua','Morelia','Toluca','Cancún',
  'Veracruz','Acapulco','Cuernavaca','Xalapa','Oaxaca',
  'Tuxtla Gutiérrez','Villahermosa','Durango','Tepic','Zacatecas',
  'Pachuca','Tlaxcala','Colima','Chetumal','La Paz'
]

export default function RegistroMedico() {
  const router  = useRouter()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    full_name: '', specialty: '', professional_license: '',
    description: '', consultation_price: '',
    phone: '', location_city: '', location_neighborhood: '',
    address: '', terms_accepted: false,
  })

  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (error) setError(null)
  }

  const validate = {
    1: () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingresa un email válido'
      if (form.password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres'
      if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden'
      return null
    },
    2: () => {
      if (!form.full_name.trim()) return 'El nombre completo es obligatorio'
      if (!form.specialty) return 'Selecciona tu especialidad'
      if (!/^\d{7,8}$/.test(form.professional_license)) return 'La cédula debe tener 7 u 8 dígitos numéricos'
      return null
    },
    3: () => {
      if (!form.phone.replace(/\D/g,'').match(/^\d{10}$/)) return 'Ingresa un teléfono de 10 dígitos'
      if (!form.location_city.trim()) return 'La ciudad es obligatoria'
      if (!form.terms_accepted) return 'Debes aceptar los términos y condiciones'
      return null
    }
  }

  const nextStep = () => {
    const err = validate[step]()
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setStep(s => s - 1)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate[3]()
    if (err) { setError(err); return }
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authError) throw authError

      const { error: dbError } = await supabase.from('doctors').insert({
        email:                form.email,
        full_name:            form.full_name.trim(),
        specialty:            form.specialty,
        professional_license: form.professional_license,
        description:          form.description.trim() || null,
        consultation_price:   parseFloat(form.consultation_price) || 0,
        phone:                form.phone.replace(/\D/g,''),
        location_city:        form.location_city.trim(),
        location_neighborhood:form.location_neighborhood.trim() || null,
        address:              form.address.trim() || null,
        license_verified:     false,
        is_active:            true,
        verification_status:  'pendiente',
      })
      if (dbError) throw dbError
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── ÉXITO ──────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');`}</style>
        <div style={{ background: '#fff', borderRadius: 24, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px #3730A318' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#3730A3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} color="#fff" />
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 900, color: '#3730A3', marginBottom: 12 }}>
            ¡Ya eres parte de Salurama!
          </h2>
          <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
            Revisaremos tu cédula profesional y activaremos tu perfil en <strong style={{ color: '#1A1A2E' }}>24 a 48 horas</strong>.
          </p>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 32 }}>
            Te avisaremos por email cuando estés visible para los pacientes.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#3730A3', color: '#fff', padding: '13px 32px', borderRadius: 50, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }

  // ── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #EEF2FF 0%, #fff 40%)', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; }

        .field {
          width: 100%; padding: 14px 16px;
          border: 1.5px solid #E5E7EB; border-radius: 10px;
          font-size: 15px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; outline: none; background: #fff;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .field:focus { border-color: #3730A3; box-shadow: 0 0 0 3px #3730A314; }
        .field::placeholder { color: #9CA3AF; font-weight: 300; }

        select.field {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 40px; cursor: pointer;
        }

        .label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
        .hint  { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

        .btn-primary {
          width: 100%; background: #3730A3; color: #fff; border: none;
          border-radius: 50px; padding: 15px 24px;
          font-size: 16px; font-family: 'DM Sans', sans-serif; font-weight: 700;
          cursor: pointer; transition: background 0.18s;
        }
        .btn-primary:hover:not(:disabled) { background: #4F46E5; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-back {
          width: 100%; background: transparent; color: #6B7280;
          border: 1.5px solid #E5E7EB; border-radius: 50px;
          padding: 13px 24px; font-size: 15px;
          font-family: 'DM Sans', sans-serif; font-weight: 500;
          cursor: pointer; transition: all 0.18s; margin-top: 10px;
        }
        .btn-back:hover { border-color: #3730A3; color: #3730A3; }

        .pass-wrap { position: relative; }
        .pass-eye  {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px;
        }

        .step-dot {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 700; transition: all 0.3s;
        }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.25s ease-out; }

        @media (max-width: 600px) { .grid2 { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ maxWidth: 580, margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 42, fontWeight: 900, color: '#3730A3', letterSpacing: '-1px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 42, fontWeight: 600, color: '#F4623A', letterSpacing: '-1px' }}>rama</span>
          </Link>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontStyle: 'italic', fontWeight: 600, color: '#4F46E5', marginBottom: 18 }}>
            Salud en tus manos
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, color: '#3730A3', marginBottom: 8 }}>
            Registro de Médicos
          </h1>
          <p style={{ fontSize: 15, color: '#4F46E5', fontWeight: 500, marginBottom: 14 }}>
            Tus pacientes ya te están buscando.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#3730A3', color: '#fff', padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            ✓ GRATIS PARA SIEMPRE
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 300 }}>
            Sin suscripciones · Sin comisiones · Sin costos ocultos
          </p>
        </div>

        {/* INDICADOR DE PASOS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          {[
            { n: 1, label: 'Cuenta' },
            { n: 2, label: 'Perfil' },
            { n: 3, label: 'Ubicación' },
          ].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div className="step-dot" style={{
                  background: step > s.n ? '#10B981' : step === s.n ? '#3730A3' : '#E5E7EB',
                  color: step >= s.n ? '#fff' : '#9CA3AF',
                }}>
                  {step > s.n ? <CheckCircle size={18} /> : s.n}
                </div>
                <span style={{ fontSize: 11, fontWeight: step === s.n ? 600 : 400, color: step >= s.n ? '#3730A3' : '#9CA3AF' }}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div style={{ width: 64, height: 2, background: step > s.n ? '#10B981' : '#E5E7EB', margin: '0 6px 18px', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={17} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 14, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* CARD */}
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px #3730A30D', padding: 'clamp(24px, 6vw, 40px)' }}>

          {/* ── PASO 1 — Cuenta ── */}
          {step === 1 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={17} color="#3730A3" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Crea tu cuenta</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Email profesional *</label>
                  <input name="email" type="email" className="field" value={form.email} onChange={handle} placeholder="tu@email.com" autoComplete="email" />
                </div>
                <div>
                  <label className="label">Contraseña *</label>
                  <div className="pass-wrap">
                    <input name="password" type={showPass ? 'text' : 'password'} className="field" value={form.password} onChange={handle} placeholder="Mínimo 8 caracteres" style={{ paddingRight: 46 }} />
                    <button type="button" className="pass-eye" onClick={() => setShowPass(p => !p)}>
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirmar contraseña *</label>
                  <div className="pass-wrap">
                    <input name="confirmPassword" type={showPass2 ? 'text' : 'password'} className="field" value={form.confirmPassword} onChange={handle} placeholder="Repite tu contraseña" style={{ paddingRight: 46 }} />
                    <button type="button" className="pass-eye" onClick={() => setShowPass2(p => !p)}>
                      {showPass2 ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <button className="btn-primary" onClick={nextStep}>Continuar →</button>
              </div>
            </div>
          )}

          {/* ── PASO 2 — Perfil profesional ── */}
          {step === 2 && (
            <div className="fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Stethoscope size={17} color="#3730A3" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Tu perfil profesional</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Nombre completo *</label>
                  <input name="full_name" type="text" className="field" value={form.full_name} onChange={handle} placeholder="Dr. Juan Pérez García" autoComplete="name" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid2">
                  <div>
                    <label className="label">Especialidad *</label>
                    <select name="specialty" className="field" value={form.specialty} onChange={handle}>
                      <option value="">Selecciona</option>
                      {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Cédula profesional *</label>
                    <input name="professional_license" type="text" inputMode="numeric" className="field" value={form.professional_license} onChange={handle} placeholder="12345678" maxLength={8} />
                    <p className="hint">7 u 8 dígitos, sin espacios</p>
                  </div>
                </div>

                <div>
                  <label className="label">Descripción <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span></label>
                  <textarea name="description" className="field" value={form.description} onChange={handle} rows={3} placeholder="Cuéntale a tus pacientes sobre tu experiencia y enfoque..." style={{ resize: 'vertical', lineHeight: 1.6 }} />
                </div>

                <div>
                  <label className="label">Costo de consulta <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(MXN, opcional)</span></label>
                  <input name="consultation_price" type="number" inputMode="numeric" className="field" value={form.consultation_price} onChange={handle} placeholder="800" min="0" step="50" />
                  <p className="hint">Deja vacío si el costo varía según el servicio</p>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
                <button className="btn-primary" onClick={nextStep}>Continuar →</button>
                <button className="btn-back" onClick={prevStep}>← Atrás</button>
              </div>
            </div>
          )}

          {/* ── PASO 3 — Ubicación ── */}
          {step === 3 && (
            <form className="fade-in" onSubmit={handleSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={17} color="#3730A3" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Ubicación y contacto</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid2">
                  <div>
                    <label className="label">Teléfono *</label>
                    <input name="phone" type="tel" inputMode="tel" className="field" value={form.phone} onChange={handle} placeholder="55 1234 5678" />
                    <p className="hint">10 dígitos — los pacientes te contactarán aquí</p>
                  </div>
                  <div>
                    <label className="label">Ciudad *</label>
                    <input name="location_city" type="text" className="field" value={form.location_city} onChange={handle} placeholder="Ciudad de México" list="ciudades" />
                    <datalist id="ciudades">
                      {CIUDADES.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid2">
                  <div>
                    <label className="label">Colonia <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span></label>
                    <input name="location_neighborhood" type="text" className="field" value={form.location_neighborhood} onChange={handle} placeholder="Polanco" />
                  </div>
                  <div>
                    <label className="label">Dirección <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span></label>
                    <input name="address" type="text" className="field" value={form.address} onChange={handle} placeholder="Av. Reforma 123" />
                  </div>
                </div>

                {/* TÉRMINOS */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '10px 0', marginTop: 4 }}>
                  <input type="checkbox" name="terms_accepted" checked={form.terms_accepted} onChange={handle}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: '#3730A3', flexShrink: 0, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                    Acepto los{' '}
                    <a href="/terminos-y-condiciones" target="_blank" style={{ color: '#3730A3', fontWeight: 500 }}>Términos y Condiciones</a>
                    {' '}y el{' '}
                    <a href="/aviso-de-privacidad" target="_blank" style={{ color: '#3730A3', fontWeight: 500 }}>Aviso de Privacidad</a>
                    {' '}de Salurama *
                  </span>
                </label>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <span style={{ width: 18, height: 18, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Registrando...
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <CheckCircle size={18} /> Completar registro
                    </span>
                  )}
                </button>
                <button type="button" className="btn-back" onClick={prevStep}>← Atrás</button>
              </div>
            </form>
          )}

        </div>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: '#3730A3', fontWeight: 600, textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}