'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPin, MessageCircle, Star, Camera, Clock,
  Building2, GraduationCap, FileText, Languages, ShieldCheck,
  ExternalLink, AlertTriangle, Copy, CheckCircle, Info,
  Calendar, Check, X
} from 'lucide-react'

// URLs oficiales de verificación
const SEP_URL = 'https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action'
const CONACEM_URL = 'https://conacem.org.mx/buscador'

interface Medico {
  id: string
  full_name: string
  specialty: string
  sub_specialty: string | null
  email: string
  location_city: string
  location_neighborhood: string
  address: string
  consultation_price: number
  phone: string
  whatsapp: string | null
  license_verified: boolean
  photo_url: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  rating_avg: number
  rating_count: number
  years_experience: number | null
  years_of_experience: number | null
  education: string | null
  hospital_affiliation: string | null
  schedule: string | null
  languages: string | null
  professional_license: string | null
  specialty_council: string | null
  specialty_council_url: string | null
  license_issue_date: string | null
  insurance_accepted: string | null
  clinic_name: string | null
  clinic_address: string | null
  whatsapp_available: boolean
  availability_schedule: any
  clinic_addresses: any[]
}

interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

interface AppointmentForm {
  clinic_address: string
  requested_date: string
  requested_time: string
  reason: string
  patient_name: string
  patient_email: string
  patient_phone: string
}

type TabId = 'info' | 'disponibilidad' | 'reviews' | 'ubicacion'

// Componente Tooltip
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5, maxWidth: 240, textAlign: 'center', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'none', animation: 'fadeUp 0.2s ease-out' }}>
          {text}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1A1A2E' }} />
        </div>
      )}
    </div>
  )
}

// Componente Botón de Copiar
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const tooltipText = copied ? '¡Copiado!' : `Copiar ${label} para pegar en el buscador oficial`
  return (
    <Tooltip text={tooltipText}>
      <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#059669' : '#9CA3AF', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} type="button">
        {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
      </button>
    </Tooltip>
  )
}

// Modal de Google Maps (Desktop)
function MapsModal({ address, city, onClose }: { address: string; city: string; onClose: () => void }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + city)}`
  
  return (
    <div 
      className="fade-in" 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.7)', 
        zIndex: 3000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 20 
      }}
      onClick={onClose}
    >
      <div 
        style={{ 
          background: '#fff', 
          borderRadius: 16, 
          padding: 0, 
          maxWidth: 800, 
          width: '100%', 
          maxHeight: '90vh', 
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: 12, 
            right: 12, 
            background: 'rgba(255,255,255,0.95)', 
            border: 'none', 
            borderRadius: '50%', 
            width: 36, 
            height: 36, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}
        >
          <X size={18} color="#1A1A2E" />
        </button>
        <iframe
          width="100%"
          height="500"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address + ', ' + city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        />
        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{address}, {city}</p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6, 
              background: '#3730A3', 
              color: '#fff', 
              borderRadius: 8, 
              padding: '8px 16px', 
              fontSize: 13, 
              fontWeight: 600, 
              textDecoration: 'none' 
            }}
          >
            <ExternalLink size={14} /> Abrir en Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}

export default function PerfilMedico() {
  const { id } = useParams()
  const router = useRouter()
  const [medico, setMedico] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [tab, setTab] = useState('info')
  const [reviews, setReviews] = useState<Review[]>([])
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [appointmentSubmitted, setAppointmentSubmitted] = useState(false)
  const [appointmentData, setAppointmentData] = useState<AppointmentForm | null>(null)
  
  const fileInputRef = useRef(null)

  // 🔄 RESET SCROLL AL CARGAR
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
    }
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('doctors').select('*').eq('id', id as string).single()
        if (error || !data) { setError(true); return }
        setMedico(data)
        
        const { data: sess } = await supabase.auth.getSession()
        if (sess?.session?.user?.email === data.email) setIsOwner(true)
        
       const { data: rev } = await supabase.from('reviews').select('*').eq('doctor_id', id as string).eq('is_visible', true).eq('email_verified', true).order('created_at', { ascending: false }).limit(20)
        setReviews((rev || []).map((r: any) => ({
          id: r.id,
          user_name: r.user_name || 'Paciente',
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at
        })))
      } catch { setError(true) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  // Actualizar rating cuando cambian las reseñas
  useEffect(() => {
    if (reviews.length > 0 && medico) {
      const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      if (avg !== medico.rating_avg || reviews.length !== medico.rating_count) {
        supabase.from('doctors').update({ rating_avg: avg, rating_count: reviews.length }).eq('id', id as string)
      }
    }
  }, [reviews, medico, id])

  async function handleFoto(e: React.ChangeEvent) {
    const file = e.target.files?.[0]
    if (!file || !medico) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const name = id + '-' + Date.now() + '.' + ext
      const { error: ue } = await supabase.storage.from('doctor-photos').upload(name, file, { upsert: true })
      if (ue) throw ue
      const { data: urlData } = supabase.storage.from('doctor-photos').getPublicUrl(name)
      await supabase.from('doctors').update({ photo_url: urlData.publicUrl }).eq('id', id as string)
      setMedico(p => p ? { ...p, photo_url: urlData.publicUrl } : null)
    } catch { alert('Error al subir la foto.') }
    finally { setUploading(false) }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!newReview.comment.trim()) return
    setSubmitting(true)
    try {
      await supabase.from('reviews').insert({
        doctor_id: medico!.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        is_visible: true
      })
      setNewReview({ rating: 5, comment: '' })
      const { data } = await supabase.from('reviews').select('*').eq('doctor_id', id as string).eq('is_visible', true).order('created_at', { ascending: false }).limit(20)
      setReviews((data || []).map((r: any) => ({ id: r.id, user_name: r.user_name || 'Paciente', rating: r.rating, comment: r.comment, created_at: r.created_at })))
    } catch { alert('Error al enviar.') }
    finally { setSubmitting(false) }
  }

 async function submitAppointment(e: React.FormEvent) {
  e.preventDefault()
  if (!appointmentData || !medico) return
  setSubmitting(true)
  try {
    // ✅ SIN .select() - Solo INSERT
    const { error } = await supabase
      .from('appointment_requests')
      .insert({
        doctor_id: medico.id,
        patient_name: appointmentData.patient_name,
        patient_email: appointmentData.patient_email,
        patient_phone: appointmentData.patient_phone,
        requested_date: appointmentData.requested_date,
        requested_time: appointmentData.requested_time,
        reason: appointmentData.reason,
        clinic_address: appointmentData.clinic_address,
        status: 'solicitada'
      })

    if (error) {
      console.error('Error de Supabase:', error)
      throw error
    }

    setAppointmentSubmitted(true)
  } catch (err) {
    console.error('Error:', err)
    alert('Error al solicitar la cita: ' + (err instanceof Error ? err.message : 'Error desconocido'))
  } finally {
    setSubmitting(false)
  }
}

  const yearsExp = (medico?.years_of_experience ?? medico?.years_experience) ?? null

  // Generar horas disponibles
  const generateTimeSlots = () => {
    if (!medico?.availability_schedule) return []
    const today = new Date().toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
    const schedule = medico.availability_schedule[today]
    if (!schedule) return []
    const slots: string[] = []
    schedule.forEach((range: string) => {
      const [start, end] = range.split('-')
      const startHour = parseInt(start.split(':')[0])
      const endHour = parseInt(end.split(':')[0])
      for (let h = startHour; h < endHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`)
        slots.push(`${h.toString().padStart(2, '0')}:30`)
      }
    })
    return slots.slice(0, 6)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando perfil...</p>
      </div>
    </div>
  )

  if (error || !medico) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;700&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', marginBottom: 8 }}>Perfil no encontrado</h2>
        <p style={{ color: '#6B7280', marginBottom: 20, fontSize: 14 }}>Este perfil no existe o no está disponible.</p>
        <Link href="/" style={{ background: '#3730A3', color: '#fff', padding: '11px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Ir al inicio</Link>
      </div>
    </div>
  )

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info', label: 'Información' },
    { id: 'disponibilidad', label: 'Disponibilidad' },
    { id: 'reviews', label: `Reseñas (${reviews.length})` },
    { id: 'ubicacion', label: 'Ubicación' },
  ]

  function ContactoCard() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Precio */}
        {medico.consultation_price > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Costo de consulta</p>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 900, color: '#3730A3', lineHeight: 1, margin: 0 }}>
              ${medico.consultation_price.toLocaleString('es-MX')}
              <span style={{ fontSize: 13, fontWeight: 400, color: '#9CA3AF' }}> MXN</span>
            </p>
          </div>
        )}

        {/* VERIFICACIÓN - MENSAJE CORTO */}
        <div style={{ background: '#F9FAFB', borderRadius: 16, padding: '16px 18px', border: '1.5px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <ShieldCheck size={15} color="#3730A3" />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#3730A3', margin: 0 }}>Verifica en fuentes oficiales. Tú decides.</p>
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.65, marginBottom: 12 }}>Consulta credenciales antes de agendar tu cita.</p>

          {/* Botón SEP */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF2FF', color: '#3730A3', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #C7D2FE' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#3730A3' }}>Cédula profesional</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 11, color: '#6366F1', margin: 0 }}>{medico.professional_license ? `No. ${medico.professional_license}` : 'Consultar en portal SEP'}</p>
                {medico.professional_license && <CopyButton text={medico.professional_license} label="cédula" />}
              </div>
            </div>
            <Tooltip text="Copia el número y pégalo en el buscador de la SEP">
              <Info size={16} color="#9CA3AF" style={{ cursor: 'help', flexShrink: 0, marginLeft: 8 }} />
            </Tooltip>
          </div>
          <a href={SEP_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#3730A3', borderRadius: 10, padding: '8px 14px', textDecoration: 'none', marginBottom: 12, border: '1px solid #C7D2FE', fontSize: 12, fontWeight: 600 }}>
            <ExternalLink size={14} /> Ir a verificar en SEP
          </a>

          {/* Botón CONACEM */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF2FF', color: '#3730A3', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #C7D2FE' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#3730A3' }}>Certificación de especialidad</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 11, color: '#6366F1', margin: 0 }}>{medico.specialty_council || 'CONACEM'}</p>
                {medico.full_name && <CopyButton text={medico.full_name} label="nombre del médico" />}
              </div>
            </div>
            <Tooltip text="Copia el nombre y pégalo en el buscador de CONACEM">
              <Info size={16} color="#9CA3AF" style={{ cursor: 'help', flexShrink: 0, marginLeft: 8 }} />
            </Tooltip>
          </div>
          <a href={CONACEM_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#3730A3', borderRadius: 10, padding: '8px 14px', textDecoration: 'none', marginBottom: 12, border: '1px solid #C7D2FE', fontSize: 12, fontWeight: 600 }}>
            <ExternalLink size={14} /> Ir a verificar en CONACEM
          </a>

          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10, lineHeight: 1.5 }}>
            ¿No sabes qué verificar? <Link href="/como-elegir-medico" style={{ color: '#3730A3', fontWeight: 500, textDecoration: 'none' }}>Ver guía paso a paso →</Link>
          </p>
        </div>

        {/* CONTACTO - SOLO WHATSAPP (SIN LLAMAR) */}
        {medico.whatsapp && medico.whatsapp_available && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', textAlign: 'center', margin: 0 }}>Contactar directamente</p>
            <a
              href={`https://wa.me/52${medico.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 50, padding: '13px', fontSize: 15, fontWeight: 700, textDecoration: 'none', width: '100%', fontFamily: "'DM Sans', sans-serif" }}
            >
              <MessageCircle size={17} /> WhatsApp
            </a>
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>Contacto directo · Sin intermediarios · Sin costo</p>
          </div>
        )}

        {/* Deslinde legal */}
        <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '12px 14px', border: '1px solid #FCD34D' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <AlertTriangle size={13} color="#92400E" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.6, margin: 0 }}>
              Salurama facilita acceso a fuentes oficiales, pero no verifica ni avala credenciales. La decisión de consultar a este médico es exclusivamente tuya. <Link href="/deslinde-responsabilidad" style={{ color: '#92400E', fontWeight: 600 }}>Saber más</Link>
            </p>
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'center' }}>
          ¿Información incorrecta? <a href="mailto:reportes@salurama.com" style={{ color: '#9CA3AF', textDecoration: 'underline' }}>Reportar</a>
        </p>
      </div>
    )
  }

function AppointmentForm() {
  const [formData, setFormData] = useState({
    clinic_address: medico?.clinic_addresses?.[0]?.address || medico?.clinic_address || '',
    requested_date: new Date().toISOString().split('T')[0],
    requested_time: '',
    reason: '',
    patient_name: '',
    patient_email: '',
    patient_phone: ''
  })

  const timeSlots = generateTimeSlots()

  if (appointmentSubmitted) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 20px', background: '#F0FDF4', borderRadius: 12, border: '1px solid #86EFAC' }}>
        <CheckCircle size={48} color="#059669" style={{ marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#059669', marginBottom: 8 }}>✅ Cita solicitada exitosamente</h3>
        <p style={{ fontSize: 14, color: '#059669', marginBottom: 16 }}>
          Tu cita del <strong>{new Date(formData.requested_date).toLocaleDateString('es-MX')}</strong> a las <strong>{formData.requested_time}</strong> ha sido registrada.
        </p>
        {medico?.whatsapp_available && medico?.whatsapp && (
          <a
            href={`https://wa.me/52${medico.whatsapp.replace(/\D/g, '')}?text=Hola,%20acabo%20de%20solicitar%20una%20cita%20para%20el%20${formData.requested_date}%20a%20las%20${formData.requested_time}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 50, padding: '12px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            <MessageCircle size={16} /> Contactar al médico por WhatsApp
          </a>
        )}
        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 16 }}>El médico revisará tu solicitud y te contactará para confirmar.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    console.log('📋 Enviando cita:', formData) // 👈 DEBUG
    
    try {
      const { error } = await supabase
        .from('appointment_requests')
        .insert({
          doctor_id: medico.id,
          patient_name: formData.patient_name,
          patient_email: formData.patient_email,
          patient_phone: formData.patient_phone,
          requested_date: formData.requested_date,
          requested_time: formData.requested_time,
          reason: formData.reason,
          clinic_address: formData.clinic_address,
          status: 'solicitada'
        })

      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }

      console.log('✅ Cita guardada exitosamente')
      setAppointmentSubmitted(true)
    } catch (err: any) {
      console.error('Error completo:', err)
      alert('Error al solicitar la cita: ' + (err.message || 'Error desconocido'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Consultorio */}
      {medico?.clinic_addresses && medico.clinic_addresses.length > 1 ? (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Selecciona el consultorio *</label>
          <select
            value={formData.clinic_address}
            onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            required
          >
            {medico.clinic_addresses.map((clinic: any, i: number) => (
              <option key={i} value={clinic.address}>{clinic.name || 'Consultorio'} - {clinic.address}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Consultorio</label>
          <p style={{ fontSize: 14, color: '#1A1A2E', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8 }}>
            {medico?.clinic_name || 'Consultorio'} - {medico?.clinic_address || 'No especificada'}
          </p>
        </div>
      )}

      {/* Fecha */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fecha *</label>
        <input
          type="date"
          value={formData.requested_date}
          onChange={(e) => setFormData({ ...formData, requested_date: e.target.value })}
          min={new Date().toISOString().split('T')[0]}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          required
        />
      </div>

      {/* Hora */}
      {timeSlots.length > 0 ? (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hora disponible *</label>
          <select
            value={formData.requested_time}
            onChange={(e) => setFormData({ ...formData, requested_time: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            required
          >
            <option value="">Selecciona una hora</option>
            {timeSlots.map((slot: string) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hora *</label>
          <select
            value={formData.requested_time}
            onChange={(e) => setFormData({ ...formData, requested_time: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            required
          >
            <option value="">Selecciona una hora</option>
            {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00'].map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        </div>
      )}

      {/* Motivo */}
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Motivo de consulta (opcional)</label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows={2}
          placeholder="Breve descripción del motivo..."
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
        />
      </div>

      {/* Datos del paciente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nombre completo *</label>
          <input
            type="text"
            value={formData.patient_name}
            onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email *</label>
          <input
            type="email"
            value={formData.patient_email}
            onChange={(e) => setFormData({ ...formData, patient_email: e.target.value })}
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Teléfono *</label>
          <input
            type="tel"
            value={formData.patient_phone}
            onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
            placeholder="55 1234 5678"
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            required
          />
        </div>
      </div>

      {/* Botón enviar */}
      <button
        type="submit"
        disabled={submitting}
        style={{ background: submitting ? '#9CA3AF' : 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 24px', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
      >
        {submitting ? 'Solicitando...' : '📅 Solicitar cita'}
      </button>

      <p style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
        Al solicitar esta cita, aceptas que el médico te contacte para confirmar. Sin costos de intermediación.
      </p>
    </form>
  )
}

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .tab-btn { padding:11px 14px; border:none; background:none; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600; color:#6B7280; cursor:pointer; border-bottom:2.5px solid transparent; transition:all 0.18s; white-space:nowrap; }
        .tab-btn.on { color:#3730A3; border-bottom-color:#3730A3; }
        .irow { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid #F3F4F6; }
        .irow:last-child { border-bottom:none; }
        .foto-ov { position:absolute; inset:0; border-radius:50%; background:rgba(55,48,163,0.75); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; cursor:pointer; }
        .foto-wr:hover .foto-ov { opacity:1; }
        .tabs-wrap { display:flex; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .tabs-wrap::-webkit-scrollbar { display:none; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.3s ease-out; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-in { animation:fadeIn 0.2s ease-out; }
      `}</style>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '18px 16px 60px' }}>
        {isMobile && (
          <div style={{ marginBottom: 16 }}>
            <ContactoCard />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 18, alignItems: 'start' }}>
          {/* COLUMNA PRINCIPAL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header */}
            <div style={{ background: '#fff', borderRadius: 18, padding: 'clamp(18px, 4vw, 24px)', border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Foto */}
                <div style={{ position: 'relative', flexShrink: 0 }} className="foto-wr">
                  {medico.photo_url
                    ? <img src={medico.photo_url} alt={medico.full_name} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #EEF2FF' }} />
                    : <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 900, color: '#3730A3' }}>{(medico.full_name || '?')[0].toUpperCase()}</div>
                  }
                  {isOwner && (
                    <div>
                      <div className="foto-ov" onClick={() => fileInputRef.current?.click()}>
                        {uploading ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Camera size={19} color="#fff" />}
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
                    </div>
                  )}
                </div>

                {/* Datos */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(19px, 5vw, 25px)', fontWeight: 900, color: '#1A1A2E' }}>{medico.full_name}</h1>
                    {medico.professional_license && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', color: '#3730A3', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>
                        <ShieldCheck size={12} /> Cédula verificable
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 15, color: '#4F46E5', fontWeight: 600, marginBottom: 4 }}>
                    {medico.specialty}
                    {medico.sub_specialty && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> · {medico.sub_specialty}</span>}
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#6B7280' }}>
                    {medico.location_city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={12} />
                        {medico.location_city}{medico.location_neighborhood ? `, ${medico.location_neighborhood}` : ''}
                      </span>
                    )}
                    {yearsExp != null && yearsExp > 0 && (<span>· {yearsExp} años de experiencia</span>)}
                  </div>
                  {reviews.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={13} fill={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : 'none'} color={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : '#E5E7EB'} />
                      ))}
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{(medico.rating_avg || 0).toFixed(1)} ({reviews.length} reseñas)</span>
                    </div>
                  )}
                </div>
              </div>

              {medico.description && (
                <p style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6', fontSize: 14, color: '#374151', lineHeight: 1.7, fontWeight: 300 }}>{medico.description}</p>
              )}
            </div>

            {/* Tabs */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div className="tabs-wrap" style={{ borderBottom: '1px solid #F3F4F6', padding: '0 6px' }}>
                {TABS.map(t => (
                  <button key={t.id} className={`tab-btn${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>

              <div style={{ padding: 'clamp(16px, 4vw, 22px)' }}>
                {/* TAB: INFO */}
                {tab === 'info' && (
                  <div>
                    {[
                      { icon: GraduationCap, label: 'Formación', val: medico.education },
                      { icon: Building2, label: 'Institución', val: medico.hospital_affiliation },
                      { icon: FileText, label: 'Cédula profesional', val: medico.professional_license },
                      { icon: GraduationCap, label: 'Consejo de especialidad', val: medico.specialty_council },
                      { icon: Languages, label: 'Idiomas', val: medico.languages },
                      { icon: Clock, label: 'Horarios', val: medico.schedule },
                      { icon: MapPin, label: 'Dirección', val: medico.address },
                    ].filter(r => r.val).map((r, i) => (
                      <div key={i} className="irow">
                        <r.icon size={17} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>{r.label}</p>
                          <p style={{ fontSize: 14, color: '#1A1A2E' }}>{r.val}</p>
                        </div>
                      </div>
                    ))}
                    {!medico.education && !medico.hospital_affiliation && !medico.languages && !medico.schedule && !medico.address && (
                      <p style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: 24 }}>El médico completará su información próximamente.</p>
                    )}
                  </div>
                )}

                {/* TAB: DISPONIBILIDAD */}
                {tab === 'disponibilidad' && <AppointmentForm />}

{/* TAB: RESEÑAS - SOLO VERIFICADAS POR EMAIL */}
{tab === 'reviews' && (
  <div>
    <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#3730A3', lineHeight: 1.6 }}>
      ✓ Todas las reseñas son de pacientes verificados que agendaron cita a través de Salurama.
    </div>
    
    {reviews.length > 0 ? (
      reviews.map(r => (
        <div key={r.id} style={{ padding: 14, background: '#F9FAFB', borderRadius: 10, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{r.user_name}</p>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(r.created_at).toLocaleDateString('es-MX')}</span>
          </div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 5 }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={12} fill={s <= r.rating ? '#F59E0B' : 'none'} color={s <= r.rating ? '#F59E0B' : '#E5E7EB'} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{r.comment}</p>
        </div>
      ))
    ) : (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>📝</p>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>Aún no hay reseñas verificadas</p>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>Las reseñas aparecerán después de que los pacientes agenden y asistan a sus citas.</p>
      </div>
    )}
  </div>
)}

{/* TAB: UBICACIÓN - CON MODAL GOOGLE MAPS */}
{tab === 'ubicacion' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {medico.address && (
      <div>
        <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Dirección</p>
        <p style={{ fontSize: 14, color: '#1A1A2E' }}>{medico.address}{medico.location_neighborhood ? `, ${medico.location_neighborhood}` : ''}{`, ${medico.location_city}`}</p>
      </div>
    )}
    <button
      onClick={() => setShowMapModal(true)}
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: 12,
        padding: '16px 24px',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
      }}
    >
      <MapPin size={18} /> Ver ubicación en Google Maps
    </button>
  </div>
)}
              </div>
            </div>
          </div>

          {/* COLUMNA LATERAL - desktop */}
          {!isMobile && (
            <div style={{ position: 'sticky', top: 72 }}>
              <ContactoCard />
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE GOOGLE MAPS (Desktop) */}
      {!isMobile && showMapModal && medico?.address && (
        <MapsModal
          address={medico.address}
          city={medico.location_city}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  )
}