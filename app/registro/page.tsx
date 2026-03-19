'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, MapPin, Stethoscope, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

// ✅ ESPECIALIDADES COMPLETAS (como en el buscador)
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

// ✅ 32 ESTADOS DE MÉXICO (como en el buscador)
const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
  'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas'
]

// ✅ CIUDADES POR ESTADO (como en el buscador)
const CIUDADES_POR_ESTADO: Record<string, string[]> = {
  'Aguascalientes': ['Aguascalientes', 'Calvillo', 'Rincón de Romos'],
  'Baja California': ['Tijuana', 'Mexicali', 'Ensenada', 'Playas de Rosarito', 'Tecate'],
  'Baja California Sur': ['La Paz', 'Los Cabos', 'Loreto', 'Comondú'],
  'Campeche': ['Campeche', 'Ciudad del Carmen', 'Champotón'],
  'Chiapas': ['Tuxtla Gutiérrez', 'Tapachula', 'San Cristóbal de las Casas', 'Comitán'],
  'Chihuahua': ['Chihuahua', 'Ciudad Juárez', 'Delicias', 'Cuauhtémoc', 'Parral'],
  'Ciudad de México': ['Ciudad de México'],
  'Coahuila': ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras', 'Acuña'],
  'Colima': ['Colima', 'Manzanillo', 'Tecomán', 'Villa de Álvarez'],
  'Durango': ['Durango', 'Gómez Palacio', 'Lerdo', 'Santiago Papasquiaro'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato', 'Silao'],
  'Guerrero': ['Acapulco', 'Chilpancingo', 'Iguala', 'Taxco', 'Zihuatanejo'],
  'Hidalgo': ['Pachuca', 'Tulancingo', 'Huejutla', 'Ixmiquilpan'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta', 'Tlajomulco'],
  'México': ['Toluca', 'Ecatepec', 'Nezahualcóyotl', 'Naucalpan', 'Tlalnepantla', 'Cuautitlán Izcalli'],
  'Michoacán': ['Morelia', 'Uruapan', 'Zamora', 'Lázaro Cárdenas', 'Apatzingán'],
  'Morelos': ['Cuernavaca', 'Jiutepec', 'Temixco', 'Cuautla'],
  'Nayarit': ['Tepic', 'Bahía de Banderas', 'Santiago Ixcuintla'],
  'Nuevo León': ['Monterrey', 'Guadalupe', 'San Nicolás de los Garza', 'Apodaca', 'Santa Catarina', 'San Pedro Garza García'],
  'Oaxaca': ['Oaxaca de Juárez', 'Salina Cruz', 'Tuxtepec', 'Juchitán'],
  'Puebla': ['Puebla', 'Tehuacán', 'San Martín Texmelucan', 'Atlixco', 'Cholula'],
  'Querétaro': ['Querétaro', 'San Juan del Río', 'Corregidora', 'El Marqués'],
  'Quintana Roo': ['Cancún', 'Playa del Carmen', 'Chetumal', 'Cozumel', 'Tulum'],
  'San Luis Potosí': ['San Luis Potosí', 'Soledad de Graciano Sánchez', 'Ciudad Valles', 'Matehuala'],
  'Sinaloa': ['Culiacán', 'Mazatlán', 'Los Mochis', 'Guasave', 'Guamúchil'],
  'Sonora': ['Hermosillo', 'Ciudad Obregón', 'Nogales', 'San Luis Río Colorado', 'Navojoa'],
  'Tabasco': ['Villahermosa', 'Cárdenas', 'Comalcalco', 'Huimanguillo'],
  'Tamaulipas': ['Ciudad Victoria', 'Reynosa', 'Matamoros', 'Tampico', 'Nuevo Laredo', 'Madero'],
  'Tlaxcala': ['Tlaxcala', 'Huamantla', 'Apizaco', 'Chiautempan'],
  'Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Poza Rica', 'Córdoba', 'Orizaba', 'Minatitlán'],
  'Yucatán': ['Mérida', 'Valladolid', 'Tizimín', 'Progreso', 'Ticul'],
  'Zacatecas': ['Zacatecas', 'Fresnillo', 'Guadalupe', 'Jerez']
}

export default function RegistroMedico() {
  const router  = useRouter()
  const [step, setStep]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([])
  
  const firstInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    full_name: '', specialty: '', professional_license: '',
    description: '', consultation_price: '',
    phone: '', location_state: '', location_city: '', location_neighborhood: '',
    address: '', terms_accepted: false,
  })

  // Auto-focus al primer campo de cada paso
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [step])

  // Actualizar ciudades disponibles cuando cambia el estado
  useEffect(() => {
    if (form.location_state && CIUDADES_POR_ESTADO[form.location_state]) {
      setCiudadesDisponibles(CIUDADES_POR_ESTADO[form.location_state])
      // Si la ciudad seleccionada no está en las nuevas ciudades, limpiarla
      if (!CIUDADES_POR_ESTADO[form.location_state].includes(form.location_city)) {
        setForm(prev => ({ ...prev, location_city: '' }))
      }
    } else {
      setCiudadesDisponibles([])
    }
  }, [form.location_state, form.location_city])

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    
    // Limpiar error del campo cuando el usuario escribe
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: false }))
    }
    if (error) setError(null)
  }

  const validate = {
    1: () => {
      const errors: Record<string, boolean> = {}
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        errors.email = true
        return { msg: 'Ingresa un email válido', errors }
      }
      if (form.password.length < 8) {
        errors.password = true
        return { msg: 'La contraseña debe tener mínimo 8 caracteres', errors }
      }
      if (form.password !== form.confirmPassword) {
        errors.confirmPassword = true
        return { msg: 'Las contraseñas no coinciden', errors }
      }
      return { msg: null, errors: {} }
    },
    2: () => {
      const errors: Record<string, boolean> = {}
      if (!form.full_name.trim()) {
        errors.full_name = true
        return { msg: 'El nombre completo es obligatorio', errors }
      }
      if (!form.specialty) {
        errors.specialty = true
        return { msg: 'Selecciona tu especialidad', errors }
      }
      if (!/^\d{7,8}$/.test(form.professional_license)) {
        errors.professional_license = true
        return { msg: 'La cédula debe tener 7 u 8 dígitos numéricos', errors }
      }
      return { msg: null, errors: {} }
    },
    3: () => {
      const errors: Record<string, boolean> = {}
      if (!form.phone.replace(/\D/g,'').match(/^\d{10}$/)) {
        errors.phone = true
        return { msg: 'Ingresa un teléfono de 10 dígitos', errors }
      }
      if (!form.location_state) {
        errors.location_state = true
        return { msg: 'Selecciona tu estado', errors }
      }
      if (!form.location_city.trim()) {
        errors.location_city = true
        return { msg: 'Selecciona tu ciudad', errors }
      }
      if (!form.terms_accepted) {
        return { msg: 'Debes aceptar los términos y condiciones', errors: { terms_accepted: true } }
      }
      return { msg: null, errors: {} }
    }
  }

  const nextStep = () => {
    const result = validate[step]()
    if (result.msg) { 
      setError(result.msg)
      setFieldErrors(result.errors)
      return 
    }
    setError(null)
    setFieldErrors({})
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const prevStep = () => {
    setStep(s => s - 1)
    setError(null)
    setFieldErrors({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = validate[3]()
    if (result.msg) { 
      setError(result.msg)
      setFieldErrors(result.errors)
      return 
    }
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
    } catch (err: any) {
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
        .field.error { border-color: #DC2626; }
        .field:disabled { background: #F3F4F6; cursor: not-allowed; }
        .field::placeholder { color: #9CA3AF; font-weight: 300; }

        select.field {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 40px; cursor: pointer;
        }

        .label { display: block; font-size: 13px; font-weight: 500; color: '#374151'; margin-bottom: 6px; }
        .hint  { font-size: 12px; color: '#9CA3AF'; margin-top: 4px; }

        .btn-primary {
          width: 100%; background: #3730A3; color: #fff; border: none;
          border-radius: 50px; padding: 15px 24px;
          font-size: 16px; font-family: 'DM Sans', sans-serif; font-weight: 700;
          cursor: pointer; transition: background 0.18s;
        }
        .btn-primary:hover:not(:disabled) { background: #4F46E5; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-back {
          width: 100%; background: transparent; color: '#6B7280';
          border: 1.5px solid #E5E7EB; border-radius: 50px;
          padding: 13px 24px; font-size: 15px;
          font-family: 'DM Sans', sans-serif; font-weight: 500;
          cursor: pointer; transition: all 0.18s; margin-top: 10px;
        }
        .btn-back:hover { border-color: #3730A3; color: #3730A3; }

        .pass-wrap { position: relative; }
        .pass-eye  {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: '#9CA3AF'; padding: 4px;
        }
        .pass-eye:hover { color: '#3730A3'; }

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
            Tus pacientes te están buscando.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#3730A3', color: '#fff', padding: '8px 20px', borderRadius: 50, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            GRATIS PARA SIEMPRE
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>
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
                  <input 
                    ref={firstInputRef}
                    name="email" 
                    type="email" 
                    className={`field ${fieldErrors.email ? 'error' : ''}`} 
                    value={form.email} 
                    onChange={handle} 
                    placeholder="tu@email.com" 
                    autoComplete="email" 
                  />
                </div>
                <div>
                  <label className="label">Contraseña *</label>
                  <div className="pass-wrap">
                    <input 
                      name="password" 
                      type={showPass ? 'text' : 'password'} 
                      className={`field ${fieldErrors.password ? 'error' : ''}`} 
                      value={form.password} 
                      onChange={handle} 
                      placeholder="Mínimo 8 caracteres" 
                      style={{ paddingRight: 46 }} 
                    />
                    <button 
                      type="button" 
                      className="pass-eye" 
                      onClick={() => setShowPass(p => !p)}
                      aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Confirmar contraseña *</label>
                  <div className="pass-wrap">
                    <input 
                      name="confirmPassword" 
                      type={showPass2 ? 'text' : 'password'} 
                      className={`field ${fieldErrors.confirmPassword ? 'error' : ''}`} 
                      value={form.confirmPassword} 
                      onChange={handle} 
                      placeholder="Repite tu contraseña" 
                      style={{ paddingRight: 46 }} 
                    />
                    <button 
                      type="button" 
                      className="pass-eye" 
                      onClick={() => setShowPass2(p => !p)}
                      aria-label={showPass2 ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
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
      <input 
  ref={firstInputRef}
  name="full_name" 
  type="text" 
  className={`field ${fieldErrors.full_name ? 'error' : ''}`} 
  value={form.full_name} 
  onChange={handle} 
  placeholder="Juan Pérez García" 
  autoComplete="name" 
/>
<p className="hint">Sin abreviaciones</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid2">
                  <div>
                    <label className="label">Especialidad *</label>
                    <select 
                      name="specialty" 
                      className={`field ${fieldErrors.specialty ? 'error' : ''}`} 
                      value={form.specialty} 
                      onChange={handle}
                    >
                      <option value="">Selecciona</option>
                      {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Cédula profesional *</label>
                    <input 
                      name="professional_license" 
                      type="text" 
                      inputMode="numeric" 
                      className={`field ${fieldErrors.professional_license ? 'error' : ''}`} 
                      value={form.professional_license} 
                      onChange={handle} 
                      placeholder="12345678" 
                      maxLength={8} 
                    />
                    <p className="hint">7 u 8 dígitos, sin espacios</p>
                  </div>
                </div>

                <div>
                  <label className="label">Descripción <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span></label>
                  <textarea 
                    name="description" 
                    className="field" 
                    value={form.description} 
                    onChange={handle} 
                    rows={3} 
                    placeholder="Cuéntale a tus pacientes sobre tu experiencia y enfoque..." 
                    style={{ resize: 'vertical', lineHeight: 1.6 }} 
                  />
                </div>

                <div>
                  <label className="label">Costo de consulta <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(MXN, opcional)</span></label>
                  <input 
                    name="consultation_price" 
                    type="number" 
                    inputMode="numeric" 
                    className="field" 
                    value={form.consultation_price} 
                    onChange={handle} 
                    placeholder="800" 
                    min="0" 
                    step="50" 
                  />
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
                    <input 
                      ref={firstInputRef}
                      name="phone" 
                      type="tel" 
                      inputMode="tel" 
                      className={`field ${fieldErrors.phone ? 'error' : ''}`} 
                      value={form.phone} 
                      onChange={handle} 
                      placeholder="55 1234 5678" 
                    />
                    <p className="hint">10 dígitos — los pacientes te contactarán aquí</p>
                  </div>
                  <div>
                    <label className="label">Estado *</label>
                    <select 
                      name="location_state" 
                      className={`field ${fieldErrors.location_state ? 'error' : ''}`} 
                      value={form.location_state} 
                      onChange={handle}
                    >
                      <option value="">Selecciona</option>
                      {ESTADOS_MEXICO.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="grid2">
                  <div>
                    <label className="label">Ciudad *</label>
                    <select 
                      name="location_city" 
                      className={`field ${fieldErrors.location_city ? 'error' : ''}`} 
                      value={form.location_city} 
                      onChange={handle}
                      disabled={!form.location_state}
                    >
                      <option value="">Selecciona</option>
                      {ciudadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {!form.location_state && <p className="hint">Primero selecciona el estado</p>}
                  </div>
                  <div>
                    <label className="label">Colonia <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span></label>
                    <input 
                      name="location_neighborhood" 
                      type="text" 
                      className="field" 
                      value={form.location_neighborhood} 
                      onChange={handle} 
                      placeholder="Polanco" 
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Dirección <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span></label>
                  <input 
                    name="address" 
                    type="text" 
                    className="field" 
                    value={form.address} 
                    onChange={handle} 
                    placeholder="Av. Reforma 123" 
                  />
                </div>

                {/* TÉRMINOS */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '10px 0', marginTop: 4 }}>
                  <input 
                    type="checkbox" 
                    name="terms_accepted" 
                    checked={form.terms_accepted} 
                    onChange={handle}
                    style={{ 
                      width: 18, height: 18, marginTop: 2, 
                      accentColor: '#3730A3', 
                      flexShrink: 0, 
                      cursor: 'pointer',
                      border: fieldErrors.terms_accepted ? '2px solid #DC2626' : 'none',
                      borderRadius: 4
                    }} 
                  />
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