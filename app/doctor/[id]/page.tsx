'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeft, MapPin, Stethoscope, DollarSign, Phone, 
  MessageCircle, Mail, CheckCircle, FileText, Share2 
} from 'lucide-react'

export default function DoctorProfile() {
  const router = useRouter()
  const params = useParams()
  const doctorId = params?.id as string
  
  const [doctor, setDoctor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', doctorId)
          .eq('is_active', true)
          .eq('license_verified', true)
          .single()
        
        if (error) throw error
        if (!data) throw new Error('Médico no encontrado')
        
        setDoctor(data)
      } catch (err: any) {
        console.error('Error:', err)
        setError(err.message || 'No se pudo cargar el perfil')
      } finally {
        setLoading(false)
      }
    }
    
    if (doctorId) {
      fetchDoctor()
    }
  }, [doctorId])

  const handleWhatsApp = () => {
    if (!doctor?.phone) return
    const phone = doctor.phone.replace(/\D/g, '')
    const url = `https://wa.me/52${phone}?text=Hola%20Dr.%20${encodeURIComponent(doctor.full_name)}`
    window.open(url, '_blank')
  }

  const handlePhone = () => {
    if (!doctor?.phone) return
    window.location.href = `tel:${doctor.phone.replace(/\D/g, '')}`
  }

  const handleEmail = () => {
    if (!doctor?.email) return
    window.location.href = `mailto:${doctor.email}`
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E8F5F1] border-t-[#F4A225] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#475569]">Cargando perfil...</p>
        </div>
      </main>
    )
  }

  if (error || !doctor) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-4">Perfil no encontrado</h2>
          <button
            onClick={() => router.push('/')}
            className="bg-[#0D5C4A] text-white px-6 py-3 rounded-lg hover:bg-[#1A7A62] transition"
          >
            ← Volver al inicio
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#E8F5F1] to-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#E8F5F1] rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6 text-[#0D5C4A]" />
          </button>
          <h1 className="text-lg font-semibold text-[#1A1A2E] truncate">
            {doctor.full_name}
          </h1>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
          
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-[#0D5C4A] to-[#1A7A62]"></div>
          
          <div className="px-6 pb-6">
            {/* Foto y nombre */}
            <div className="relative -mt-16 mb-4">
              <div className="w-32 h-32 bg-[#E8F5F1] rounded-full border-4 border-white shadow-lg flex items-center justify-center mx-auto">
                <span className="text-4xl font-bold text-[#0D5C4A]">
                  {doctor.full_name?.charAt(0) || 'M'}
                </span>
              </div>
              {doctor.license_verified && (
                <div className="absolute bottom-2 right-1/2 translate-x-16 bg-[#10B981] text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verificado
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold text-[#1A1A2E] text-center mb-1">
              {doctor.full_name}
            </h2>
            <p className="text-[#0D5C4A] font-medium text-center mb-6">
              {doctor.specialty}
            </p>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#E8F5F1] rounded-xl p-4 text-center">
                <MapPin className="w-5 h-5 text-[#0D5C4A] mx-auto mb-2" />
                <p className="text-sm text-[#475569]">{doctor.location_city}</p>
                <p className="text-xs text-[#475569]">{doctor.location_neighborhood}</p>
              </div>
              <div className="bg-[#E8F5F1] rounded-xl p-4 text-center">
                <DollarSign className="w-5 h-5 text-[#F4A225] mx-auto mb-2" />
                <p className="text-sm text-[#475569]">Consulta desde</p>
                <p className="font-bold text-[#1A1A2E]">${doctor.consultation_price} MXN</p>
              </div>
            </div>

            {/* Botones de contacto */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={handleWhatsApp}
                className="flex flex-col items-center gap-2 p-4 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition"
              >
                <MessageCircle className="w-6 h-6" />
                <span className="text-sm font-medium">WhatsApp</span>
              </button>
              
              <button
                onClick={handlePhone}
                className="flex flex-col items-center gap-2 p-4 bg-[#0D5C4A] text-white rounded-xl hover:bg-[#1A7A62] transition"
              >
                <Phone className="w-6 h-6" />
                <span className="text-sm font-medium">Llamar</span>
              </button>
              
              <button
                onClick={handleEmail}
                className="flex flex-col items-center gap-2 p-4 bg-[#3B82F6] text-white rounded-xl hover:bg-[#2563EB] transition"
              >
                <Mail className="w-6 h-6" />
                <span className="text-sm font-medium">Email</span>
              </button>
            </div>

            {/* Descripción */}
            {doctor.description && (
              <section className="mb-6">
                <h3 className="text-lg font-bold text-[#1A1A2E] mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0D5C4A]" />
                  Sobre el doctor
                </h3>
                <p className="text-[#475569] leading-relaxed">
                  {doctor.description}
                </p>
              </section>
            )}

            {/* Info profesional */}
            <section className="border-t border-[#CBD5E1] pt-6">
              <h3 className="text-lg font-bold text-[#1A1A2E] mb-4">Información profesional</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[#475569]">
                  <Stethoscope className="w-5 h-5 text-[#0D5C4A] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">Especialidad</p>
                    <p>{doctor.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[#475569]">
                  <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#1A1A2E]">Cédula profesional</p>
                    <p>{doctor.professional_license}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </article>

        {/* Footer */}
        <footer className="text-center py-8 text-[#475569]">
          <p className="text-sm">
            Perfil verificado en <span className="font-semibold text-[#0D5C4A]">Salurama</span>
          </p>
        </footer>
      </div>
    </main>
  )
}