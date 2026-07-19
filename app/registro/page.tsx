'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Mail, MapPin, Stethoscope, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck, Info, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import { Turnstile } from '@marsidev/react-turnstile'
import { useCP } from '@/hooks/useCP'
import TitleSelect from '@/components/TitleSelect'

const ESPECIALIDADES = [
  'Alergología e Inmunología Clínica',
  'Algología',
  'Anatomía Patológica',
  'Anestesiología',
  'Anestesiología Pediátrica',
  'Angiología, Cirugía Vascular y Endovascular',
  'Audiología',
  'Cardiología',
  'Cardiología Intervencionista',
  'Cardiología Pediátrica',
  'Cirugía Bariátrica',
  'Cirugía Cardiaca',
  'Cirugía Cardiaca Pediátrica',
  'Cirugía Cardiotorácica',
  'Cirugía de Cabeza y Cuello',
  'Cirugía de Columna',
  'Cirugía de Tórax',
  'Cirugía Endovascular Neurológica',
  'Cirugía General',
  'Cirugía Maxilofacial',
  'Cirugía Neurológica',
  'Cirugía Oncológica',
  'Cirugía Oral y Maxilofacial',
  'Cirugía Pediátrica',
  'Cirugía Plástica, Estética y Reconstructiva',
  'Cirugía Torácica Pediátrica',
  'Coloproctología',
  'Cuidados Intensivos',
  'Cuidados Paliativos',
  'Dermatología',
  'Dermatología Pediátrica',
  'Dermatopatología',
  'Ecocardiografía',
  'Electrofisiología Cardiaca',
  'Endocrinología',
  'Endocrinología Pediátrica',
  'Endodoncia',
  'Endoscopia Gastrointestinal',
  'Endoscopia del Aparato Digestivo',
  'Epidemiología',
  'Foniatría',
  'Gastroenterología',
  'Gastroenterología Pediátrica',
  'Genética Médica',
  'Genética Molecular',
  'Geriatría',
  'Gerontología',
  'Ginecología Oncológica',
  'Ginecología y Obstetricia',
  'Hematología',
  'Hematología Pediátrica',
  'Imagenología Diagnóstica y Terapéutica',
  'Infectología',
  'Infectología Pediátrica',
  'Inmunología Clínica',
  'Medicina Aeroespacial',
  'Medicina Crítica',
  'Medicina del Deporte',
  'Medicina del Enfermo Pediátrico en Estado Crítico',
  'Medicina Familiar',
  'Medicina Física y Rehabilitación',
  'Medicina Intensiva',
  'Medicina Interna',
  'Medicina Legal y Forense',
  'Medicina Materno Fetal',
  'Medicina Nuclear',
  'Medicina Nuclear e Imagen Molecular',
  'Nefrología',
  'Nefrología Pediátrica',
  'Neonatología',
  'Neumología',
  'Neumología Pediátrica',
  'Neuroanestesiología',
  'Neurocirugía Pediátrica',
  'Neurofisiología Clínica',
  'Neurología',
  'Neurología Pediátrica',
  'Neuropatología',
  'Nutrición Clínica',
  'Nutriología Clínica',
  'Obstetricia Crítica',
  'Odontología Pediátrica',
  'Oftalmología',
  'Oncología Médica',
  'Oncología Pediátrica',
  'Ortodoncia',
  'Ortopedia',
  'Ortopedia Pediátrica',
  'Otoneurología',
  'Otorrinolaringología',
  'Patología Clínica',
  'Patología Pediátrica',
  'Pediatría',
  'Periodoncia',
  'Psiquiatría',
  'Psiquiatría Infantil y de la Adolescencia',
  'Radiología e Imagen',
  'Radiología Intervencionista',
  'Radiooncología',
  'Rehabilitación Cardiaca',
  'Rehabilitación Neurológica',
  'Reumatología',
  'Reumatología Pediátrica',
  'Terapia Endovascular Neurológica',
  'Terapia Intensiva Pediátrica',
  'Traumatología y Ortopedia',
  'Urología',
  'Urología Pediátrica'
]

const CONSEJOS: Record<string, string> = {
 'Alergología e Inmunología Clínica': 'Consejo Nacional de Inmunología Clínica y Alergia',
  'Algología': 'Consejo Mexicano de Anestesiología',
  'Anatomía Patológica': 'Consejo Mexicano de Anatomopatología',
  'Anestesiología': 'Consejo Mexicano de Anestesiología',
  'Anestesiología Pediátrica': 'Consejo Mexicano de Anestesiología',
  'Angiología, Cirugía Vascular y Endovascular': 'Consejo Mexicano de Angiología, Cirugía Vascular y Endovascular',
  'Audiología': 'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello',
  'Cardiología': 'Consejo Mexicano de Cardiología',
  'Cardiología Intervencionista': 'Consejo Mexicano de Cardiología',
  'Cardiología Pediátrica': 'Consejo Mexicano de Cardiología',
  'Cirugía Bariátrica': 'Consejo Mexicano de Cirugía General',
  'Cirugía Cardiaca': 'Consejo Mexicano de Cirugía Cardiotorácica',
  'Cirugía Cardiaca Pediátrica': 'Consejo Mexicano de Cirugía Cardiotorácica',
  'Cirugía Cardiotorácica': 'Consejo Mexicano de Cirugía Cardiotorácica',
  'Cirugía de Cabeza y Cuello': 'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello',
  'Cirugía de Columna': 'Consejo Mexicano de Ortopedia y Traumatología',
  'Cirugía de Tórax': 'Consejo Mexicano de Cirugía Cardiotorácica',
  'Cirugía Endovascular Neurológica': 'Consejo Mexicano de Neurología',
  'Cirugía General': 'Consejo Mexicano de Cirugía General',
  'Cirugía Maxilofacial': 'Consejo Mexicano de Cirugía Oral y Maxilofacial',
  'Cirugía Neurológica': 'Consejo Mexicano de Cirugía Neurológica',
  'Cirugía Oncológica': 'Consejo Mexicano de Oncología',
  'Cirugía Oral y Maxilofacial': 'Consejo Mexicano de Cirugía Oral y Maxilofacial',
  'Cirugía Pediátrica': 'Consejo Mexicano de Cirugía Pediátrica',
  'Cirugía Plástica, Estética y Reconstructiva': 'Consejo Mexicano de Cirugía Plástica, Estética y Reconstructiva',
  'Cirugía Torácica Pediátrica': 'Consejo Mexicano de Cirugía Cardiotorácica',
  'Coloproctología': 'Consejo Mexicano de Coloproctología',
  'Cuidados Intensivos': 'Consejo Mexicano de Medicina Crítica',
  'Cuidados Paliativos': 'Consejo Mexicano de Medicina Paliativa',
  'Dermatología': 'Consejo Mexicano de Dermatología',
  'Dermatología Pediátrica': 'Consejo Mexicano de Dermatología',
  'Dermatopatología': 'Consejo Mexicano de Dermatología',
  'Ecocardiografía': 'Consejo Mexicano de Cardiología',
  'Electrofisiología Cardiaca': 'Consejo Mexicano de Cardiología',
  'Endocrinología': 'Consejo Mexicano de Endocrinología',
  'Endocrinología Pediátrica': 'Consejo Mexicano de Endocrinología',
  'Endodoncia': 'Consejo Mexicano de Endodoncia',
  'Endoscopia Gastrointestinal': 'Consejo Mexicano de Gastroenterología',
  'Endoscopia del Aparato Digestivo': 'Consejo Mexicano de Gastroenterología',
  'Epidemiología': 'Consejo Mexicano de Epidemiología',
  'Foniatría': 'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello',
  'Gastroenterología': 'Consejo Mexicano de Gastroenterología',
  'Gastroenterología Pediátrica': 'Consejo Mexicano de Gastroenterología',
  'Genética Médica': 'Consejo Mexicano de Genética',
  'Genética Molecular': 'Consejo Mexicano de Genética',
  'Geriatría': 'Consejo Mexicano de Geriatría',
  'Gerontología': 'Consejo Mexicano de Geriatría',
  'Ginecología Oncológica': 'Consejo Mexicano de Oncología',
  'Ginecología y Obstetricia': 'Consejo Mexicano de Ginecología y Obstetricia',
  'Hematología': 'Consejo Mexicano de Hematología',
  'Hematología Pediátrica': 'Consejo Mexicano de Hematología',
  'Imagenología Diagnóstica y Terapéutica': 'Consejo Mexicano de Radiología e Imagen',
  'Infectología': 'Consejo Mexicano de Infectología',
  'Infectología Pediátrica': 'Consejo Mexicano de Infectología',
  'Inmunología Clínica': 'Consejo Nacional de Inmunología Clínica y Alergia',
  'Medicina Aeroespacial': 'Consejo Mexicano de Medicina Aeroespacial',
  'Medicina Crítica': 'Consejo Mexicano de Medicina Crítica',
  'Medicina del Deporte': 'Consejo Mexicano de Medicina del Deporte',
  'Medicina del Enfermo Pediátrico en Estado Crítico': 'Consejo Mexicano de Medicina Crítica',
  'Medicina Familiar': 'Consejo Mexicano de Certificación en Medicina Familiar',
  'Medicina Física y Rehabilitación': 'Consejo Mexicano de Medicina de Rehabilitación',
  'Medicina Intensiva': 'Consejo Mexicano de Medicina Crítica',
  'Medicina Interna': 'Consejo Mexicano de Medicina Interna',
  'Medicina Legal y Forense': 'Consejo Mexicano de Medicina Legal y Forense',
  'Medicina Materno Fetal': 'Consejo Mexicano de Ginecología y Obstetricia',
  'Medicina Nuclear': 'Consejo Mexicano de Medicina Nuclear e Imagen Molecular',
  'Medicina Nuclear e Imagen Molecular': 'Consejo Mexicano de Medicina Nuclear e Imagen Molecular',
  'Nefrología': 'Consejo Mexicano de Nefrología',
  'Nefrología Pediátrica': 'Consejo Mexicano de Nefrología',
  'Neonatología': 'Consejo Mexicano de Certificación en Pediatría',
  'Neumología': 'Consejo Nacional de Neumología',
  'Neumología Pediátrica': 'Consejo Nacional de Neumología',
  'Neuroanestesiología': 'Consejo Mexicano de Anestesiología',
  'Neurocirugía Pediátrica': 'Consejo Mexicano de Cirugía Neurológica',
  'Neurofisiología Clínica': 'Consejo Mexicano de Neurología',
  'Neurología': 'Consejo Mexicano de Neurología',
  'Neurología Pediátrica': 'Consejo Mexicano de Neurología',
  'Neuropatología': 'Consejo Mexicano de Anatomopatología',
  'Nutrición Clínica': 'Consejo Mexicano de Nutrición Clínica',
  'Nutriología Clínica': 'Consejo Mexicano de Nutrición Clínica',
  'Obstetricia Crítica': 'Consejo Mexicano de Ginecología y Obstetricia',
  'Odontología Pediátrica': 'Consejo Mexicano de Odontología Pediátrica',
  'Oftalmología': 'Consejo Mexicano de Oftalmología',
  'Oncología Médica': 'Consejo Mexicano de Oncología',
  'Oncología Pediátrica': 'Consejo Mexicano de Oncología',
  'Ortodoncia': 'Consejo Mexicano de Ortodoncia',
  'Ortopedia': 'Consejo Mexicano de Ortopedia y Traumatología',
  'Ortopedia Pediátrica': 'Consejo Mexicano de Ortopedia y Traumatología',
  'Otoneurología': 'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello',
  'Otorrinolaringología': 'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello',
  'Patología Clínica': 'Consejo Mexicano de Patología Clínica',
  'Patología Pediátrica': 'Consejo Mexicano de Anatomopatología',
  'Pediatría': 'Consejo Mexicano de Certificación en Pediatría',
  'Periodoncia': 'Consejo Mexicano de Periodoncia',
  'Psiquiatría': 'Consejo Mexicano de Psiquiatría',
  'Psiquiatría Infantil y de la Adolescencia': 'Consejo Mexicano de Psiquiatría',
  'Radiología e Imagen': 'Consejo Mexicano de Radiología e Imagen',
  'Radiología Intervencionista': 'Consejo Mexicano de Radiología e Imagen',
  'Radiooncología': 'Consejo Mexicano de Certificación en Radioterapia',
  'Rehabilitación Cardiaca': 'Consejo Mexicano de Medicina de Rehabilitación',
  'Rehabilitación Neurológica': 'Consejo Mexicano de Medicina de Rehabilitación',
  'Reumatología': 'Consejo Mexicano de Reumatología',
  'Reumatología Pediátrica': 'Consejo Mexicano de Reumatología',
  'Terapia Endovascular Neurológica': 'Consejo Mexicano de Neurología',
  'Terapia Intensiva Pediátrica': 'Consejo Mexicano de Medicina Crítica',
  'Traumatología y Ortopedia': 'Consejo Mexicano de Ortopedia y Traumatología',
  'Urología': 'Consejo Mexicano de Urología',
  'Urología Pediátrica': 'Consejo Mexicano de Urología'
}

type FormData = {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  professionalTitle: string
  specialty: string
  license: string
  council: string
  licenseNotCurrent: boolean
  cp: string
  estado: string
  ciudad: string
  colonia: string
  direccion: string
  terms: boolean
}

export default function RegistroMedico() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [turnstileToken, setTurnstileToken] = useState('')

  const { loading: loadingCP, error: errorCP, cpData, search, formatCP } = useCP()
  const cpInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormData>({
    email: '', password: '', confirmPassword: '',
    fullName: '', professionalTitle: '', specialty: '', license: '', council: '', licenseNotCurrent: false,
    cp: '', estado: '', ciudad: '', colonia: '', direccion: '', terms: false,
  })

  // Auto-fill council
  useEffect(() => {
    if (form.specialty && CONSEJOS[form.specialty]) {
      setForm(f => ({...f, council: CONSEJOS[form.specialty] }))
    }
  }, [form.specialty])

  // Auto-fill location from CP
  useEffect(() => {
    if (cpData) {
      setForm(f => ({
      ...f,
        estado: cpData.estado,
        ciudad: cpData.municipio,
        colonia: cpData.colonias.length === 1? cpData.colonias[0].nombre : f.colonia
      }))
    }
  }, [cpData])

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const updateField = (field: keyof FormData, value: any) => {
    setForm(f => ({...f, [field]: value }))
    setError('')
  }

  const passwordStrength = useMemo(() => {
    const p = form.password
    if (!p) return { score: 0, label: '', color: '' }
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    const labels = ['', 'Débil', 'Regular', 'Buena', 'Excelente']
    const colors = ['', '#EF4444', '#F59E0B', '#10B981', '#059669']
    return { score, label: labels[score], color: colors[score] }
  }, [form.password])

  const validateStep = (s: number): string => {
    if (s === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Ingresa un email válido'
      if (form.password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres'
      if (form.password!== form.confirmPassword) return 'Las contraseñas no coinciden'
    }
    if (s === 2) {
      if (form.fullName.trim().length < 3) return 'Ingresa tu nombre completo'
      if (!form.professionalTitle) return 'Selecciona tu título (Dr., Dra., Mtro. o Mtra.)'
      if (!form.specialty) return 'Selecciona tu especialidad'
      if (!/^\d{7,8}$/.test(form.license.replace(/\s/g, ''))) return 'La cédula debe tener 7 u 8 dígitos'
    }
    if (s === 3) {
      if (!form.cp || form.cp.length!== 5) return 'Ingresa un código postal válido'
      if (!form.ciudad) return 'Código postal no encontrado'
      if (!form.colonia) return 'Selecciona tu colonia'
      if (!form.terms) return 'Debes aceptar los términos'
    }
    return ''
  }

  const handleNext = () => {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    const err = validateStep(3)
    if (err) { setError(err); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/registro-medico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.toLowerCase().trim(),
          password: form.password,
          full_name: form.fullName.trim(),
          professional_title: form.professionalTitle,
          specialty: form.specialty,
          professional_license: form.license.replace(/\s/g, ''),
          specialty_council: form.council.trim(),
          license_not_current: form.licenseNotCurrent,
          cp: form.cp,
          estado: form.estado,
          ciudad: form.ciudad,
          colonia: form.colonia,
          direccion: form.direccion.trim(),
          turnstileToken,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error en el registro')

      // GEOCODIFICACIÓN AUTOMÁTICA - Si hay dirección, obtener coordenadas
      if (form.direccion && form.direccion.trim() && data.doctorId) {
        try {
          const fullAddress = `${form.direccion}, ${form.colonia}, ${form.ciudad}, ${form.estado}, ${form.cp}, México`

          const geoRes = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: fullAddress })
          })

          if (geoRes.ok) {
            const geoData = await geoRes.json()
            if (geoData.lat && geoData.lng) {
              await fetch('/api/update-doctor-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  doctorId: data.doctorId,
                  lat: geoData.lat,
                  lng: geoData.lng,
                  formattedAddress: geoData.formatted_address || fullAddress
                })
              })
            }
          }
        } catch (geoError) {
          console.error('Geocodificación falló (no crítico):', geoError)
        }
      }

      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

 if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          <div className="w-20 h-20 bg-[#1E3A5F] rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#1E3A5F] mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
            Revisa tu email
          </h1>
          <p className="text-[#374151] mb-2">
            Te enviamos un enlace de confirmación a:
          </p>
          <p className="font-semibold text-[#1E3A5F] mb-6">{form.email}</p>
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-[#166534] font-medium mb-1">¡Ya casi terminas!</p>
            <ol className="text-sm text-[#15803D] space-y-1 list-decimal list-inside">
              <li>Te enviamos un email de confirmación.</li>
              <li>Da clic en el link de confirmación para activar tu perfil</li>
              <li>Completa tu perfil y empieza a recibir pacientes hoy mismo.</li>
            </ol>
          </div>
          <p className="text-xs text-[#9CA3AF] mb-6">
            ¿No ves el email? Revisa tu carpeta de spam
          </p>
          <Link href="/" className="inline-flex items-center justify-center w-full h-12 bg-[#1E3A5F] text-white rounded-full font-semibold hover:bg-[#2A4A70] transition-colors">
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white pt-20">
      <div className="max-w-xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <span className="text-6xl font-black text-[#1E3A5F]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-1px' }}>Salu</span>
            <span className="text-6xl font-semibold text-[#2A9D8F]" style={{ fontFamily: 'Fraunces, serif', letterSpacing: '-1px' }}>rama</span>
          </Link>
          <h1 className="text- font-black text-[#1E3A5F] mb-3" style={{ fontFamily: 'Fraunces, serif' }}>
           Haz visible tu experiencia profesional
          </h1>
          <div className="inline-flex items-center gap-2 bg-[#1E3A5F] text-white px-4 py-1.5 rounded-full text-xs font-bold mb-2">
            <CheckCircle size={14} />
           Aumenta tu consulta gratis
          </div>
          <p className="text-xs text-[#6B7280]">Perfil médico • Configuración en minutos</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > n? 'bg-[#10B981] text-white' :
                  step === n? 'bg-[#1E3A5F] text-white ring-4 ring-[#1E3A5F]/20' :
                  'bg-[#E5E7EB] text-[#9CA3AF]'
                }`}>
                  {step > n? <CheckCircle size={18} /> : n}
                </div>
                <span className={`text- mt-1.5 font-medium ${step >= n? 'text-[#1E3A5F]' : 'text-[#9CA3AF]'}`}>
                  {n === 1? 'Cuenta' : n === 2? 'Perfil' : 'Ubicación'}
                </span>
              </div>
              {n < 3 && (
                <div className={`w-16 h-0.5 mx-2 transition-colors ${step > n? 'bg-[#10B981]' : 'bg-[#E5E7EB]'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 bg-[#FEF2F2] border border-[#FECACA] border-l-4 border-l-[#EF4444] rounded-lg p-3 flex gap-2.5">
            <AlertCircle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
            <p className="text-sm text-[#DC2626]">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6 md:p-8">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                  <Mail size={18} className="text-[#1E3A5F]" />
                </div>
                <h2 className="text-xl font-bold text-[#111827]">Crea tu cuenta</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  onBlur={() => setTouched(t => ({...t, email: true }))}
                  placeholder="tu@ejemplo.com"
                  className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass? 'text' : 'password'}
                    value={form.password}
                    onChange={e => updateField('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full h-12 px-4 pr-11 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#4B5563]">
                    {showPass? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i <= passwordStrength.score? passwordStrength.color : '#E5E7EB' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: passwordStrength.color }}>{passwordStrength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    type={showPass2? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => updateField('confirmPassword', e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full h-12 px-4 pr-11 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all"
                  />
                  <button type="button" onClick={() => setShowPass2(!showPass2)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9CA3AF] hover:text-[#4B5563]">
                    {showPass2? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.confirmPassword && form.password!== form.confirmPassword && (
                  <p className="text-xs text-[#EF4444] mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              <button onClick={handleNext} className="w-full h-12 bg-[#1E3A5F] text-white rounded-full font-semibold hover:bg-[#2A4A70] transition-colors flex items-center justify-center gap-2 mt-2">
                Continuar <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                  <Stethoscope size={18} className="text-[#1E3A5F]" />
                </div>
                <h2 className="text-xl font-bold text-[#111827]">Tu perfil profesional</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Título</label>
                  <TitleSelect
                    value={form.professionalTitle}
                    onChange={v => updateField('professionalTitle', v)}
                    className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Nombre completo</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={e => updateField('fullName', e.target.value)}
                    placeholder="Juan Pérez García"
                    className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Especialidad</label>
                  <select
                    value={form.specialty}
                    onChange={e => updateField('specialty', e.target.value)}
                    className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all bg-white"
                  >
                    <option value="">Selecciona</option>
                    {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1.5">Cédula profesional</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.license}
                    onChange={e => updateField('license', e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="12345678"
                    className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-[#1E3A5F] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111827] mb-1">Consejo de especialidad <span className="text-[#9CA3AF] font-normal">(opcional)</span></p>
                    <p className="text-xs text-[#6B7280] mb-2.5">Los pacientes podrán verificar tu certificación</p>
                    <input
                      type="text"
                      value={form.council}
                      onChange={e => updateField('council', e.target.value)}
                      placeholder="Se autocompleta con tu especialidad"
                      className="w-full h-10 px-3 text-sm border border-[#D1D5DB] rounded-lg focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none"
                    />
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input type="checkbox" checked={form.licenseNotCurrent} onChange={e => updateField('licenseNotCurrent', e.target.checked)} className="w-4 h-4 rounded border-[#D1D5DB] text-[#1E3A5F] focus:ring-[#1E3A5F]" />
                      <span className="text-xs text-[#4B5563]">Mi certificación no está vigente</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="h-12 px-6 border-[#D1D5DB] rounded-full font-medium text-[#4B5563] hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5">
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button onClick={handleNext} className="flex-1 h-12 bg-[#1E3A5F] text-white rounded-full font-semibold hover:bg-[#2A4A70] transition-colors flex items-center justify-center gap-2">
                  Continuar <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                  <MapPin size={18} className="text-[#1E3A5F]" />
                </div>
                <h2 className="text-xl font-bold text-[#111827]">¿Dónde atiendes?</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Código postal</label>
                <div className="relative">
                  <input
                    ref={cpInputRef}
                    type="text"
                    inputMode="numeric"
                    value={form.cp}
                    onChange={e => {
                      const cp = formatCP(e.target.value)
                      updateField('cp', cp)
                      if (cp.length === 5) search(cp)
                    }}
                    placeholder="Ej. 06600"
                    maxLength={5}
                    disabled={!!cpData}
                    className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none transition-all disabled:bg-[#F3F4F6]"
                  />
                  {loadingCP && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#6B7280]" />}
                </div>
                {errorCP && <p className="text-xs text-[#EF4444] mt-1">{errorCP}</p>}
                {cpData && (
                  <button type="button" onClick={() => { updateField('cp', ''); updateField('estado', ''); updateField('ciudad', ''); updateField('colonia', ''); }} className="text-xs text-[#1E3A5F] hover:underline mt-1.5">
                    Cambiar código postal
                  </button>
                )}
              </div>

              {cpData && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-1.5">Estado</label>
                      <input value={form.estado} disabled className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#6B7280]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#374151] mb-1.5">Ciudad</label>
                      <input value={form.ciudad} disabled className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#6B7280]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1.5">Colonia</label>
                    <select value={form.colonia} onChange={e => updateField('colonia', e.target.value)} className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none bg-white">
                      <option value="">Selecciona tu colonia</option>
                      {cpData.colonias.map((c, i) => <option key={i} value={c.nombre}>{c.nombre}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Dirección del consultorio <span className="text-[#9CA3AF] font-normal">(opcional)</span></label>
                <input type="text" value={form.direccion} onChange={e => updateField('direccion', e.target.value)} placeholder="Calle, número, interior" className="w-full h-12 px-4 border border-[#D1D5DB] rounded-xl focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] outline-none" />
              </div>

              <label className="flex items-start gap-3 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl cursor-pointer hover:bg-[#F3F4F6] transition-colors">
                <input type="checkbox" checked={form.terms} onChange={e => updateField('terms', e.target.checked)} className="w-5 h-5 mt-0.5 rounded border-[#D1D5DB] text-[#1E3A5F] focus:ring-[#1E3A5F] shrink-0" />
                <span className="text-sm text-[#4B5563] leading-snug">
                  Acepto los <Link href="/terminos-profesionales" target="_blank" className="text-[#1E3A5F] underline">Términos</Link> y <Link href="/aviso-de-privacidad" target="_blank" className="text-[#1E3A5F] underline">Aviso de Privacidad</Link>
                </span>
              </label>

              <div className="flex justify-center">
                <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} onSuccess={setTurnstileToken} options={{ theme: 'light' }} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} disabled={loading} className="h-12 px-6 border-[#D1D5DB] rounded-full font-medium text-[#4B5563] hover:bg-[#F9FAFB] transition-colors flex items-center gap-1.5 disabled:opacity-50">
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button onClick={handleSubmit} disabled={loading || !turnstileToken} className="flex-1 h-12 bg-[#1E3A5F] text-white rounded-full font-semibold hover:bg-[#2A4A70] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading? <><Loader2 size={18} className="animate-spin" /> Creando cuenta...</> : <>Crear cuenta <CheckCircle size={18} /></>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-6">
          ¿Ya tienes cuenta? <Link href="/login" className="text-[#1E3A5F] font-semibold hover:underline">Inicia sesión</Link>
        </p>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=DM+Sans:wght@400;500;600;700&display=swap');
        body { font-family: 'DM Sans', sans-serif; }
      `}</style>
    </div>
  )
}