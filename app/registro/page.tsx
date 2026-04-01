'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, MapPin, Stethoscope, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const ESPECIALIDADES = [
  'Alergología','Anestesiología','Angiología','Cardiología',
  'Cirugía Cardiovascular','Cirugía General','Cirugía Plástica','Dermatología',
  'Endocrinología','Gastroenterología','Geriatría','Ginecología y Obstetricia',
  'Hematología','Infectología','Medicina Familiar','Medicina Física y Rehabilitación',
  'Medicina Interna','Nefrología','Neumología','Neurología',
  'Neurocirugía','Nutriología','Oftalmología','Oncología',
  'Ortopedia y Traumatología','Otorrinolaringología','Pediatría','Psiquiatría',
  'Radiología','Reumatología','Urología','Otra especialidad'
]

// Consejos de especialidad más frecuentes en México
const CONSEJOS_ESPECIALIDAD: Record<string, string> = {
  'Cardiología':                  'Consejo Mexicano de Cardiología',
  'Dermatología':                 'Consejo Mexicano de Dermatología',
  'Ginecología y Obstetricia':    'Consejo Mexicano de Ginecología y Obstetricia',
  'Hematología':                  'Consejo Mexicano de Hematología',
  'Medicina Interna':             'Consejo Mexicano de Medicina Interna',
  'Neurología':                   'Consejo Mexicano de Neurología',
  'Oftalmología':                 'Consejo Mexicano de Oftalmología',
  'Oncología':                    'Consejo Mexicano de Oncología',
  'Ortopedia y Traumatología':    'Consejo Mexicano de Ortopedia y Traumatología',
  'Pediatría':                    'Consejo Mexicano de Certificación en Pediatría',
  'Psiquiatría':                  'Consejo Mexicano de Psiquiatría',
  'Urología':                     'Consejo Mexicano de Urología',
  'Cirugía General':              'Consejo Mexicano de Cirugía General',
  'Endocrinología':               'Consejo Mexicano de Endocrinología',
  'Gastroenterología':            'Consejo Mexicano de Gastroenterología',
  'Neumología':                   'Consejo Mexicano de Neumología',
  'Reumatología':                 'Consejo Mexicano de Reumatología',
  'Radiología':                   'Consejo Mexicano de Radiología e Imagen',
}

const ESTADOS_MEXICO = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche',
  'Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima',
  'Durango','Guanajuato','Guerrero','Hidalgo','Jalisco',
  'México','Michoacán','Morelos','Nayarit','Nuevo León',
  'Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí',
  'Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas'
]

const CIUDADES_POR_ESTADO: Record<string, string[]> = {
  'Aguascalientes':    ['Aguascalientes','Calvillo','Rincón de Romos'],
  'Baja California':   ['Tijuana','Mexicali','Ensenada','Playas de Rosarito','Tecate'],
  'Baja California Sur':['La Paz','Los Cabos','Loreto','Comondú'],
  'Campeche':          ['Campeche','Ciudad del Carmen','Champotón'],
  'Chiapas':           ['Tuxtla Gutiérrez','Tapachula','San Cristóbal de las Casas','Comitán'],
  'Chihuahua':         ['Chihuahua','Ciudad Juárez','Delicias','Cuauhtémoc','Parral'],
  'Ciudad de México':  ['Ciudad de México'],
  'Coahuila':          ['Saltillo','Torreón','Monclova','Piedras Negras','Acuña'],
  'Colima':            ['Colima','Manzanillo','Tecomán','Villa de Álvarez'],
  'Durango':           ['Durango','Gómez Palacio','Lerdo','Santiago Papasquiaro'],
  'Guanajuato':        ['León','Irapuato','Celaya','Salamanca','Guanajuato','Silao'],
  'Guerrero':          ['Acapulco','Chilpancingo','Iguala','Taxco','Zihuatanejo'],
  'Hidalgo':           ['Pachuca','Tulancingo','Huejutla','Ixmiquilpan'],
  'Jalisco':           ['Guadalajara','Zapopan','Tlaquepaque','Tonalá','Puerto Vallarta','Tlajomulco'],
  'México':            ['Toluca','Ecatepec','Nezahualcóyotl','Naucalpan','Tlalnepantla','Cuautitlán Izcalli'],
  'Michoacán':         ['Morelia','Uruapan','Zamora','Lázaro Cárdenas','Apatzingán'],
  'Morelos':           ['Cuernavaca','Jiutepec','Temixco','Cuautla'],
  'Nayarit':           ['Tepic','Bahía de Banderas','Santiago Ixcuintla'],
  'Nuevo León':        ['Monterrey','Guadalupe','San Nicolás de los Garza','Apodaca','Santa Catarina','San Pedro Garza García'],
  'Oaxaca':            ['Oaxaca de Juárez','Salina Cruz','Tuxtepec','Juchitán'],
  'Puebla':            ['Puebla','Tehuacán','San Martín Texmelucan','Atlixco','Cholula'],
  'Querétaro':         ['Querétaro','San Juan del Río','Corregidora','El Marqués'],
  'Quintana Roo':      ['Cancún','Playa del Carmen','Chetumal','Cozumel','Tulum'],
  'San Luis Potosí':   ['San Luis Potosí','Soledad de Graciano Sánchez','Ciudad Valles','Matehuala'],
  'Sinaloa':           ['Culiacán','Mazatlán','Los Mochis','Guasave','Guamúchil'],
  'Sonora':            ['Hermosillo','Ciudad Obregón','Nogales','San Luis Río Colorado','Navojoa'],
  'Tabasco':           ['Villahermosa','Cárdenas','Comalcalco','Huimanguillo'],
  'Tamaulipas':        ['Ciudad Victoria','Reynosa','Matamoros','Tampico','Nuevo Laredo','Madero'],
  'Tlaxcala':          ['Tlaxcala','Huamantla','Apizaco','Chiautempan'],
  'Veracruz':          ['Veracruz','Xalapa','Coatzacoalcos','Poza Rica','Córdoba','Orizaba','Minatitlán'],
  'Yucatán':           ['Mérida','Valladolid','Tizimín','Progreso','Ticul'],
  'Zacatecas':         ['Zacatecas','Fresnillo','Guadalupe','Jerez']
}

interface FormData {
  email: string; password: string; confirmPassword: string
  full_name: string; specialty: string; professional_license: string
  specialty_council: string; specialty_council_url: string
  description: string; consultation_price: string
  phone: string; location_state: string; location_city: string
  location_neighborhood: string; address: string; terms_accepted: boolean
}

export default function RegistroMedico() {
  const router = useRouter()
  const [step, setStep]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [showPass, setShowPass]   = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})
  const [ciudades, setCiudades]   = useState<string[]>([])

  const refPaso1 = useRef<HTMLInputElement>(null)
  const refPaso2 = useRef<HTMLInputElement>(null)
  const refPaso3 = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    email: '', password: '', confirmPassword: '',
    full_name: '', specialty: '', professional_license: '',
    specialty_council: '', specialty_council_url: '',
    description: '', consultation_price: '',
    phone: '', location_state: '', location_city: '',
    location_neighborhood: '', address: '', terms_accepted: false,
  })

  // Autocompletar consejo cuando cambia especialidad
  useEffect(() => {
    if (form.specialty && CONSEJOS_ESPECIALIDAD[form.specialty]) {
      setForm(p => ({ ...p, specialty_council: CONSEJOS_ESPECIALIDAD[form.specialty] }))
    }
  }, [form.specialty])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 1) refPaso1.current?.focus()
      if (step === 2) refPaso2.current?.focus()
      if (step === 3) refPaso3.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [step])

  useEffect(() => {
    if (form.location_state && CIUDADES_POR_ESTADO[form.location_state]) {
      setCiudades(CIUDADES_POR_ESTADO[form.location_state])
      if (!CIUDADES_POR_ESTADO[form.location_state].includes(form.location_city)) {
        setForm(p => ({ ...p, location_city: '' }))
      }
    } else {
      setCiudades([])
    }
  }, [form.location_state])

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    if (fieldErrors[name]) setFieldErrors(p => ({ ...p, [name]: false }))
    if (error) setError(null)
  }

  const validate: Record<number, () => { msg: string | null; errors: Record<string, boolean> }> = {
    1: () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return { msg: 'Ingresa un email válido', errors: { email: true } }
      if (form.password.length < 8)
        return { msg: 'La contraseña debe tener mínimo 8 caracteres', errors: { password: true } }
      if (form.password !== form.confirmPassword)
        return { msg: 'Las contraseñas no coinciden', errors: { confirmPassword: true } }
      return { msg: null, errors: {} }
    },
    2: () => {
      if (!form.full_name.trim())
        return { msg: 'El nombre completo es obligatorio', errors: { full_name: true } }
      if (!form.specialty)
        return { msg: 'Selecciona tu especialidad', errors: { specialty: true } }
      if (!/^\d{7,8}$/.test(form.professional_license))
        return { msg: 'La cédula debe tener 7 u 8 dígitos', errors: { professional_license: true } }
      return { msg: null, errors: {} }
    },
    3: () => {
      if (!form.phone.replace(/\D/g, '').match(/^\d{10}$/))
        return { msg: 'Ingresa un teléfono de 10 dígitos', errors: { phone: true } }
      if (!form.location_state)
        return { msg: 'Selecciona tu estado', errors: { location_state: true } }
      if (!form.location_city.trim())
        return { msg: 'Selecciona tu ciudad', errors: { location_city: true } }
      if (!form.terms_accepted)
        return { msg: 'Debes aceptar los términos y el aviso de privacidad', errors: { terms_accepted: true } }
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
      const { error: ae } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (ae) throw ae
      const { error: de } = await supabase.from('doctors').insert({
        email:                 form.email,
        full_name:             form.full_name.trim(),
        specialty:             form.specialty,
        professional_license:  form.professional_license,
        specialty_council:     form.specialty_council.trim() || null,
        specialty_council_url: form.specialty_council_url.trim() || null,
        description:           form.description.trim() || null,
        consultation_price:    parseFloat(form.consultation_price) || 0,
        phone:                 form.phone.replace(/\D/g, ''),
        location_city:         form.location_city.trim(),
        location_neighborhood: form.location_neighborhood.trim() || null,
        address:               form.address.trim() || null,
        license_verified:      false,
        is_active:             true,
        review_status:         'pendiente',
        license_visible:       false,
      })
      if (de) throw de
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error. Intenta de nuevo.')
    } finally { setLoading(false) }
  }

  const fs = (name: string): React.CSSProperties => ({
    width: '100%', padding: '13px 15px',
    border: `1.5px solid ${fieldErrors[name] ? '#DC2626' : '#E5E7EB'}`,
    borderRadius: 10, fontSize: 15,
    fontFamily: "'DM Sans', sans-serif",
    color: '#1A1A2E', outline: 'none', background: '#fff',
  })

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) return (
    <div style={{ minHeight: '100vh', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;700&display=swap');`}</style>
      <div style={{ background: '#fff', borderRadius: 22, padding: 'clamp(32px, 8vw, 48px)', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 16px 48px rgba(55,48,163,0.1)' }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#3730A3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={38} color="#fff" />
        </div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#3730A3', marginBottom: 10 }}>
          ¡Bienvenido a Salurama!
        </h2>
        <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.75, marginBottom: 6 }}>
          Revisaremos tu perfil y lo activaremos en{' '}
          <strong style={{ color: '#1A1A2E' }}>24 a 48 horas</strong>.
        </p>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 28 }}>
          Te avisaremos por email cuando estés visible para los pacientes.
        </p>
        <Link href="/" style={{ display: 'inline-block', background: '#3730A3', color: '#fff', padding: '12px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
          Ir al inicio
        </Link>
      </div>
    </div>
  )

  // ── Formulario ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #EEF2FF 0%, #fff 40%)', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        input:focus, select:focus, textarea:focus { border-color: #3730A3 !important; box-shadow: 0 0 0 3px rgba(55,48,163,0.08) !important; outline: none; }
        input::placeholder, textarea::placeholder { color: #9CA3AF; font-weight: 300; }
        select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 13px center; padding-right: 38px !important; cursor: pointer; }
        .btn-p { width:100%; background:#3730A3; color:#fff; border:none; border-radius:50px; padding:14px 24px; font-size:16px; font-family:'DM Sans',sans-serif; font-weight:700; cursor:pointer; transition:background 0.18s; }
        .btn-p:hover:not(:disabled) { background:#4F46E5; }
        .btn-p:disabled { opacity:0.5; cursor:not-allowed; }
        .btn-b { width:100%; background:transparent; color:#6B7280; border:1.5px solid #E5E7EB; border-radius:50px; padding:12px 24px; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:500; cursor:pointer; transition:all 0.18s; margin-top:10px; }
        .btn-b:hover { border-color:#3730A3; color:#3730A3; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fi { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fi { animation: fi 0.22s ease-out; }
        @media (max-width: 560px) { .g2 { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: 'clamp(28px, 6vw, 44px) 16px 56px' }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(34px, 8vw, 42px)', fontWeight: 900, color: '#3730A3', letterSpacing: '-1px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(34px, 8vw, 42px)', fontWeight: 600, color: '#F4623A', letterSpacing: '-1px' }}>rama</span>
          </Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: '#3730A3', marginBottom: 6 }}>
            Registro de Médicos
          </h1>
          <p style={{ fontSize: 14, color: '#4F46E5', fontWeight: 500, marginBottom: 12 }}>
            Tus pacientes te están buscando.
          </p>
          {/* Badge corregido — sin "para siempre" */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#3730A3', color: '#fff', padding: '7px 18px', borderRadius: 50, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
            REGISTRO GRATUITO PARA MÉDICOS
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>Sin suscripciones · Sin comisiones por paciente · Sin costos ocultos</p>
        </div>

        {/* INDICADOR DE PASOS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {[{ n: 1, label: 'Cuenta' }, { n: 2, label: 'Perfil' }, { n: 3, label: 'Ubicación' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, transition: 'all 0.3s', background: step > s.n ? '#10B981' : step === s.n ? '#3730A3' : '#E5E7EB', color: step >= s.n ? '#fff' : '#9CA3AF' }}>
                  {step > s.n ? <CheckCircle size={16} /> : s.n}
                </div>
                <span style={{ fontSize: 10, fontWeight: step === s.n ? 600 : 400, color: step >= s.n ? '#3730A3' : '#9CA3AF' }}>{s.label}</span>
              </div>
              {i < 2 && <div style={{ width: 56, height: 2, background: step > s.n ? '#10B981' : '#E5E7EB', margin: '0 6px 16px', transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderLeft: '4px solid #DC2626', borderRadius: 10, padding: '11px 14px', marginBottom: 16, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* CARD */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 4px 20px rgba(55,48,163,0.06)', padding: 'clamp(20px, 5vw, 36px)' }}>

          {/* ── PASO 1: Cuenta ── */}
          {step === 1 && (
            <div className="fi">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={16} color="#3730A3" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Crea tu cuenta</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email profesional *</label>
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
                  <Stethoscope size={16} color="#3730A3" />
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
                    <input name="professional_license" type="text" inputMode="numeric" style={fs('professional_license')} value={form.professional_license} onChange={handle} placeholder="12345678" maxLength={8} />
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>7 u 8 dígitos (SEP)</p>
                  </div>
                </div>

                {/* Consejo de especialidad — nuevo campo */}
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <ShieldCheck size={14} color="#3730A3" />
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#3730A3', margin: 0 }}>
                      Verificación de especialidad
                      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}> (opcional pero recomendado)</span>
                    </p>
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, marginBottom: 12 }}>
                    Si estás certificado por un consejo de especialidad, los pacientes podrán verificarlo directamente desde tu perfil.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                        Nombre del consejo
                      </label>
                      <input
                        name="specialty_council"
                        type="text"
                        style={{ ...fs('specialty_council'), fontSize: 14 }}
                        value={form.specialty_council}
                        onChange={handle}
                        placeholder="Ej: Consejo Mexicano de Hematología"
                      />
                      {form.specialty && CONSEJOS_ESPECIALIDAD[form.specialty] && (
                        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                          Autocompletado según tu especialidad. Puedes editarlo.
                        </p>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>
                        URL del consejo para verificación
                      </label>
                      <input
                        name="specialty_council_url"
                        type="url"
                        style={{ ...fs('specialty_council_url'), fontSize: 14 }}
                        value={form.specialty_council_url}
                        onChange={handle}
                        placeholder="https://www.consejomexicanodehematologia.org.mx"
                      />
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                        El paciente podrá verificar tu certificación directamente en esa URL.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Descripción <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span>
                  </label>
                  <textarea name="description" style={{ ...fs('description'), resize: 'vertical', lineHeight: 1.6 }} value={form.description} onChange={handle} rows={3} placeholder="Cuéntale a tus pacientes sobre tu experiencia..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Costo de consulta <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(MXN, opcional)</span>
                  </label>
                  <input name="consultation_price" type="number" inputMode="numeric" style={fs('consultation_price')} value={form.consultation_price} onChange={handle} placeholder="800" min="0" step="50" />
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Deja vacío si varía</p>
                </div>
              </div>
              <div style={{ marginTop: 22 }}>
                <button className="btn-p" onClick={nextStep}>Continuar →</button>
                <button className="btn-b" onClick={prevStep}>← Atrás</button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Ubicación y contacto ── */}
          {step === 3 && (
            <form className="fi" onSubmit={handleSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={16} color="#3730A3" />
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 900, color: '#1A1A2E', margin: 0 }}>Ubicación y contacto</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="g2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Teléfono *</label>
                    <input ref={refPaso3} name="phone" type="tel" inputMode="tel" style={fs('phone')} value={form.phone} onChange={handle} placeholder="55 1234 5678" />
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>10 dígitos</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Estado *</label>
                    <select name="location_state" style={fs('location_state')} value={form.location_state} onChange={handle}>
                      <option value="">Selecciona</option>
                      {ESTADOS_MEXICO.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="g2">
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Ciudad *</label>
                    <select name="location_city" style={{ ...fs('location_city'), opacity: !form.location_state ? 0.6 : 1 }} value={form.location_city} onChange={handle} disabled={!form.location_state}>
                      <option value="">Selecciona</option>
                      {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {!form.location_state && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Primero selecciona el estado</p>}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                      Colonia <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span>
                    </label>
                    <input name="location_neighborhood" type="text" style={fs('location_neighborhood')} value={form.location_neighborhood} onChange={handle} placeholder="Polanco" />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                    Dirección <span style={{ color: '#9CA3AF', fontWeight: 300 }}>(opcional)</span>
                  </label>
                  <input name="address" type="text" style={fs('address')} value={form.address} onChange={handle} placeholder="Av. Reforma 123" />
                </div>

                {/* Consentimiento — vinculado a los documentos legales actualizados */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 11, cursor: 'pointer', padding: '8px 0' }}>
                  <input
                    type="checkbox" name="terms_accepted"
                    checked={form.terms_accepted} onChange={handle}
                    style={{ width: 17, height: 17, marginTop: 2, accentColor: '#3730A3', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                    Acepto los{' '}
                    <a href="/terminos-profesionales" target="_blank" style={{ color: '#3730A3', fontWeight: 500 }}>Términos para Profesionales</a>
                    {', los '}
                    <a href="/terminos-y-condiciones" target="_blank" style={{ color: '#3730A3', fontWeight: 500 }}>Términos y Condiciones</a>
                    {' y el '}
                    <a href="/aviso-de-privacidad" target="_blank" style={{ color: '#3730A3', fontWeight: 500 }}>Aviso de Privacidad</a>
                    {'. Entiendo que los pacientes podrán verificar mi cédula directamente en la SEP. *'}
                  </span>
                </label>

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
            <Link href="/login" style={{ color: '#3730A3', fontWeight: 600, textDecoration: 'none' }}>
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}