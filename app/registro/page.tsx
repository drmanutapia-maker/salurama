'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Phone, MapPin, DollarSign, FileText, Stethoscope, CreditCard, ArrowLeft } from 'lucide-react'

export default function RegistroMedico() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    specialty: '',
    professional_license: '',
    phone: '',
    location_city: 'Ciudad de México',
    location_neighborhood: '',
    address: '',
    consultation_price: '',
    description: ''
  })

  const handleSocialLogin = async (provider: string) => {
    alert(`Configuración de ${provider} pendiente. Por ahora usa el formulario tradicional.`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)

      const {  authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      })

      if (authError) throw authError

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
          license_verified: false,
          is_active: true
        })

      if (doctorError) throw doctorError

      setSuccess(true)
      
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A2E] mb-2">¡Registro Exitoso!</h2>
          <p className="text-[#475569] mb-4">
            Tu solicitud ha sido enviada. Revisaremos tu cédula profesional y te contactaremos en 24-48 horas.
          </p>
          <p className="text-sm text-[#475569]">Redirigiendo al inicio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Botón regresar */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#0D5C4A] hover:text-[#1A7A62] mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver al inicio
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1A1A2E] mb-2">Registro de Médicos</h1>
          <p className="text-[#475569]">Únete a Salurama y llega a más pacientes</p>
        </div>

        {/* Social Login */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4 text-center">Regístrate con</h2>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>

            <button
              onClick={() => handleSocialLogin('facebook')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>

            <button
              onClick={() => handleSocialLogin('apple')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] transition disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </button>
          </div>
          <p className="text-xs text-[#475569] text-center mt-3">* Configuración pendiente</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[#CBD5E1]"></div>
          <span className="text-[#475569] text-sm">o regístrate con email</span>
          <div className="flex-1 h-px bg-[#CBD5E1]"></div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  Contraseña *
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Nombre completo *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                placeholder="Dr. Juan Pérez García"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  <Stethoscope className="inline w-4 h-4 mr-1" />
                  Especialidad *
                </label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                  placeholder="Ej: Cardiología"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  <CreditCard className="inline w-4 h-4 mr-1" />
                  Cédula profesional *
                </label>
                <input
                  type="text"
                  name="professional_license"
                  value={formData.professional_license}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                  placeholder="12345678"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                placeholder="55 1234 5678"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  Ciudad
                </label>
                <input
                  type="text"
                  name="location_city"
                  value={formData.location_city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
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
                  className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                  placeholder="Ej: Polanco"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                Dirección del consultorio
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                placeholder="Calle y número"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Costo de consulta (MXN)
              </label>
              <input
                type="number"
                name="consultation_price"
                value={formData.consultation_price}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                placeholder="800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A2E] mb-2">
                <FileText className="inline w-4 h-4 mr-1" />
                Descripción de tu trabajo
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-[#CBD5E1] rounded-lg focus:ring-2 focus:ring-[#0D5C4A] focus:border-transparent transition"
                placeholder="Describe tu experiencia, especialidades, enfoques de tratamiento..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0D5C4A] text-white py-3 rounded-lg font-semibold hover:bg-[#1A7A62] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Enviar registro'}
            </button>

            <p className="text-xs text-[#475569] text-center">
              * Campos obligatorios. Tu registro será revisado antes de publicarse.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}