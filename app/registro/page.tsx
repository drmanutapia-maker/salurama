'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import imageCompression from 'browser-image-compression'
import Link from 'next/link'
import { 
  Mail, Lock, User, Phone, MapPin, DollarSign, 
  FileText, Stethoscope, CreditCard, Camera, X,
  CheckCircle, AlertCircle, Heart
} from 'lucide-react'

export default function RegistroMedico() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    specialty: '',
    professional_license: '',
    phone: '',
    location_city: '',
    location_neighborhood: '',
    address: '',
    consultation_price: '',
    description: '',
    terms_accepted: false,
    photo: null as File | null,
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const validateLicense = (license: string) => /^\d{7,8}$/.test(license)
  const validatePhone = (phone: string) => /^[\d\s\-\(\)]+$/.test(phone)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe pesar más de 5MB')
      return
    }

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      }
      const compressedFile = await imageCompression(file, options)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(compressedFile)
      
      setFormData({ ...formData, photo: compressedFile })
      setError(null)
    } catch (err) {
      setError('Error al procesar la imagen')
    }
  }

  const removePhoto = () => {
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateEmail(formData.email)) {
      setError('Ingresa un email válido')
      return
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!validateLicense(formData.professional_license)) {
      setError('La cédula profesional debe tener 7 u 8 dígitos')
      return
    }
    if (!formData.terms_accepted) {
      setError('Debes aceptar los términos y condiciones')
      return
    }

    try {
      setLoading(true)

      const {  authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

      let photoUrl = null
      if (formData.photo && authData.user) {
        const fileExt = formData.photo.name.split('.').pop()
        const fileName = `${authData.user.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('doctor-photos')
          .upload(fileName, formData.photo, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError
        
        const {  urlData } = supabase.storage
          .from('doctor-photos')
          .getPublicUrl(fileName)
        
        photoUrl = urlData.publicUrl
      }

      const { error: doctorError } = await supabase
        .from('doctors')
        .insert({
          email: formData.email,
          full_name: formData.full_name,
          specialty: formData.specialty,
          professional_license: formData.professional_license,
          phone: formData.phone,
          location_city: formData.location_city,
          location_neighborhood: formData.location_neighborhood,
          address: formData.address,
          consultation_price: parseFloat(formData.consultation_price) || 0,
          description: formData.description,
          photo_url: photoUrl,
          license_verified: false,
          is_active: true
        })

      if (doctorError) throw doctorError

      setSuccess(true)
      
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'Error al registrar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-['Fraunces'] text-3xl font-black text-[#0D5C4A] mb-4">
            ¡Registro Exitoso!
          </h2>
          <p className="text-[#475569] mb-6 text-lg">
            Tu solicitud ha sido enviada. Revisaremos tu cédula profesional y te contactaremos en 24-48 horas.
          </p>
          <div className="animate-pulse text-[#0D5C4A] font-medium">
            Redirigiendo al inicio...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header con LOGO */}
        <div className="text-center mb-8">
          {/* Logo Salurama */}
          <Link href="/" className="inline-block mb-4">
            <div className="flex items-center justify-center gap-0">
              <span className="font-['Fraunces'] text-[40px] sm:text-[48px] font-black text-[#0D5C4A] tracking-tight">Salu</span>
              <span className="font-['Fraunces'] text-[40px] sm:text-[48px] font-semibold text-[#F59E0B] tracking-tight">rama</span>
            </div>
          </Link>
          
          <h1 className="font-['Fraunces'] text-3xl sm:text-4xl font-black text-[#0D5C4A] mb-3">
            Registro de Médicos
          </h1>
          <p className="text-[#1A7A62] text-lg font-['Fraunces'] italic font-semibold mb-4">
            Salud en tus manos
          </p>
          
          {/* Badge GRATIS PARA SIEMPRE */}
          <div className="inline-flex items-center bg-gradient-to-r from-[#10B981] to-[#0D5C4A] text-white px-6 py-3 rounded-full font-bold text-sm sm:text-base shadow-lg mb-4">
            <span>GRATIS PARA SIEMPRE</span>
          </div>
          
          <p className="text-[#475569] text-sm sm:text-base font-medium">
            Sin suscripciones • Sin comisiones • Sin costos ocultos
          </p>
          <p className="text-[#6B7280] mt-2 text-xs sm:text-sm">
            Únete al directorio médico que cree en la salud accesible
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 sm:p-10">
          
          {/* Foto de perfil */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-[#1A1A2E] mb-3">
              Foto de perfil <span className="text-[#9CA3AF] font-normal">(opcional pero recomendado)</span>
            </label>
            <div className="flex items-center gap-6">
              {photoPreview ? (
                <div className="relative w-24 h-24">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-full h-full rounded-full object-cover border-2 border-[#0D5C4A]"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#E8F5F1] flex items-center justify-center">
                  <Camera className="w-8 h-8 text-[#0D5C4A]" />
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0D5C4A] text-white rounded-lg cursor-pointer hover:bg-[#1A7A62] transition-colors text-sm font-medium"
                >
                  <Camera className="w-4 h-4" />
                  {photoPreview ? 'Cambiar foto' : 'Subir foto'}
                </label>
                <p className="text-xs text-[#6B7280] mt-2">
                  JPG, PNG o WebP. Máximo 5MB. Se comprime automáticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Cuenta */}
          <div className="mb-8 pb-8 border-b border-[#E5EAE8]">
            <h3 className="font-['Fraunces'] text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#0D5C4A]" />
              Cuenta
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Email profesional *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Contraseña *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Confirmar contraseña *
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Escribe la misma contraseña"
                />
              </div>
            </div>
          </div>

          {/* Información Profesional */}
          <div className="mb-8 pb-8 border-b border-[#E5EAE8]">
            <h3 className="font-['Fraunces'] text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-[#0D5C4A]" />
              Información Profesional
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Dr. Juan Pérez García"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Especialidad *
                </label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Ej: Cardiología"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Cédula profesional *
                </label>
                <input
                  type="text"
                  name="professional_license"
                  value={formData.professional_license}
                  onChange={handleChange}
                  required
                  pattern="\d{7,8}"
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="7 u 8 dígitos"
                />
                <p className="text-xs text-[#6B7280] mt-1">Sin espacios ni guiones</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Descripción de tu trabajo
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Describe tu experiencia, especialidades, enfoques de tratamiento..."
                />
              </div>
            </div>
          </div>

          {/* Ubicación y Contacto */}
          <div className="mb-8 pb-8 border-b border-[#E5EAE8]">
            <h3 className="font-['Fraunces'] text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#0D5C4A]" />
              Ubicación y Contacto
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Teléfono de contacto
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="55 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Ciudad *
                </label>
                <input
                  type="text"
                  name="location_city"
                  value={formData.location_city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Ciudad de México"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Colonia
                </label>
                <input
                  type="text"
                  name="location_neighborhood"
                  value={formData.location_neighborhood}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Ej: Polanco"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  Dirección del consultorio
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                  placeholder="Calle y número"
                />
              </div>
            </div>
          </div>

          {/* Costo */}
          <div className="mb-8">
            <h3 className="font-['Fraunces'] text-xl font-bold text-[#1A1A2E] mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#0D5C4A]" />
              Costo de Consulta
            </h3>
            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Precio en pesos mexicanos (MXN)
              </label>
              <input
                type="number"
                name="consultation_price"
                value={formData.consultation_price}
                onChange={handleChange}
                min="0"
                step="50"
                className="w-full px-4 py-3 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition text-sm"
                placeholder="800"
              />
              <p className="text-xs text-[#6B7280] mt-1">
                Deja en 0 si es gratis o sin costo fijo
              </p>
            </div>
          </div>

          {/* Términos */}
          <div className="mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="terms_accepted"
                checked={formData.terms_accepted}
                onChange={handleChange}
                className="w-5 h-5 mt-0.5 rounded border-[#CBD5E1] text-[#0D5C4A] focus:ring-[#0D5C4A]"
              />
              <span className="text-sm text-[#475569]">
                Acepto los{' '}
                <a href="/terminos" target="_blank" className="text-[#0D5C4A] hover:underline font-medium">
                  Términos y Condiciones
                </a>
                {' '}y el{' '}
                <a href="/privacidad" target="_blank" className="text-[#0D5C4A] hover:underline font-medium">
                  Aviso de Privacidad
                </a>
                {' '}de Salurama *
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#0D5C4A] to-[#1A7A62] text-white py-4 rounded-lg font-bold text-lg hover:from-[#1A7A62] hover:to-[#0D5C4A] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Registrarme
              </>
            )}
          </button>

          <p className="text-xs text-[#6B7280] text-center mt-4">
            * Campos obligatorios · Tu información está protegida
          </p>
        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-[#475569] mb-2">
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-[#0D5C4A] font-bold hover:underline">
              Inicia sesión
            </a>
          </p>
          <p className="text-xs text-[#6B7280] italic">
            "Creemos en la salud accesible para todos"
          </p>
        </div>
      </div>
    </div>
  )
}