'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPin, Star, ShieldCheck, Shield, ExternalLink, Copy, CheckCircle, X,
  ChevronDown, ChevronUp, Briefcase, GraduationCap, Heart, Share2, ArrowLeft,
  Calendar, MessageCircle, DollarSign, CreditCard, Info
} from 'lucide-react'

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────
interface Medico {
  id: string
  full_name: string
  specialty: string
  sub_specialty: string | null
  location_city: string
  location_neighborhood: string
  address: string
  consultation_price_general: number | null
  consultation_price_first_time: number | null
  consultation_price_followup: number | null
  photo_url: string | null
  about_me: string | null
  rating_avg: number
  rating_count: number
  years_experience: number | null
  years_of_experience: number | null
  hospital_affiliation: string | null
  languages: string[] | string | null
  insurance_names: string[] | null
  accepts_insurance: boolean
  payment_methods: string[] | null
  clinic_name: string | null
  clinic_address: string | null
  clinic_phone: string | null
  whatsapp_available: boolean
  clinic_whatsapp: string | null
  professional_license: string | null
  specialty_council: string | null
  min_patient_age: number | null
  max_patient_age: number | null
}

interface License {
  id: string
  license_number: string
  license_type: string
  institution: string
}

interface EducationItem {
  id: string
  institution: string
  degree: string
  field_of_study: string
  graduation_year: number
}

interface ExperienceItem {
  id: string
  institution_name: string
  position: string
  is_current: boolean
}

interface Condition {
  id: string
  condition_name: string
  category: string
}

interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────
const normalizarTexto = (texto: string): string => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const parseLangs = (raw: string[] | string | null): string[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [raw] }
}

// ─────────────────────────────────────────────
// COMPONENTES PEQUEÑOS
// ─────────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }
  return (
    <button
      onClick={handleCopy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#059669' : '#9CA3AF', padding: 4, display: 'flex', alignItems: 'center' }}
      type="button"
    >
      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
    </button>
  )
}

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 500, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1E3A5F' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MODAL DE CITA - CORREGIDO
// ─────────────────────────────────────────────
function AppointmentModal({ 
  medico, 
  onClose, 
  onSubmit 
}: { 
  medico: Medico
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
}) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    requested_date: new Date().toISOString().split('T')[0],
    requested_time: '',
    patient_name: '',
    patient_email: '',
    patient_phone: '',
    reason: ''
  })

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00']

  if (submitted) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 500, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ width: 64, height: 64, background: '#F0FDF4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} color="#059669" />
          </div>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#1E3A5F', marginBottom: 12 }}>
            ¡Cita agendada con éxito!
          </h3>
          {/* ✅ TEXTO SIN ANSIEDAD */}
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
            Recibirás confirmación por email. Te enviaremos un recordatorio 24hrs antes de tu cita.
          </p>
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 8 }}>{medico.full_name}</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>{medico.specialty}</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>{formData.requested_date} - {formData.requested_time}</p>
            {medico.consultation_price_general && (
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Costo: ${medico.consultation_price_general} MXN</p>
            )}
          </div>
          <button onClick={onClose} style={{ width: '100%', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit(formData)
      setSubmitted(true)
    } catch (error: any) {
      alert('Error al solicitar la cita: ' + (error.message || 'Error desconocido'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1E3A5F' }}>
              Agendar Cita
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Paso {step} de 3</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, background: s <= step ? '#8B5CF6' : '#E5E7EB', borderRadius: 2 }} />
          ))}
        </div>

        {/* STEP 1: Calendario */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1E3A5F' }}>Fecha</label>
              <input
                type="date"
                value={formData.requested_date}
                onChange={e => setFormData({ ...formData, requested_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1E3A5F' }}>Hora disponible</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {timeSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => setFormData({ ...formData, requested_time: time })}
                    style={{
                      padding: '10px 12px',
                      border: formData.requested_time === time ? '2px solid #8B5CF6' : '1px solid #E5E7EB',
                      borderRadius: 8,
                      background: formData.requested_time === time ? '#F5F3FF' : '#fff',
                      color: formData.requested_time === time ? '#8B5CF6' : '#4A5568',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!formData.requested_time}
              style={{ background: !formData.requested_time ? '#9CA3AF' : '#8B5CF6', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: !formData.requested_time ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              Continuar <ChevronDown size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: Datos del Paciente */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Nombre completo *</label>
              <input
                type="text"
                value={formData.patient_name}
                onChange={e => setFormData({ ...formData, patient_name: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14 }}
                placeholder="Tu nombre completo"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Email *</label>
              <input
                type="email"
                value={formData.patient_email}
                onChange={e => setFormData({ ...formData, patient_email: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14 }}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Teléfono *</label>
              <input
                type="tel"
                value={formData.patient_phone}
                onChange={e => setFormData({ ...formData, patient_phone: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14 }}
                placeholder="55 1234 5678"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Motivo de consulta (opcional)</label>
              <textarea
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, resize: 'vertical' }}
                placeholder="Breve descripción..."
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.patient_name || !formData.patient_email || !formData.patient_phone}
                style={{ flex: 1, background: !formData.patient_name || !formData.patient_email || !formData.patient_phone ? '#9CA3AF' : '#8B5CF6', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: !formData.patient_name || !formData.patient_email || !formData.patient_phone ? 'not-allowed' : 'pointer' }}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Resumen */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 }}>Resumen de tu cita</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Médico</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{medico.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Especialidad</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{medico.specialty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Fecha</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{formData.requested_date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Hora</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{formData.requested_time}</span>
                </div>
                {medico.consultation_price_general && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #E5E7EB', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>Costo estimado</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>${medico.consultation_price_general} MXN</span>
                  </div>
                )}
              </div>
            </div>
            {/* ✅ TEXTO SIN ANSIEDAD */}
            <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>
              <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Recibirás confirmación por email. Te enviaremos un recordatorio 24hrs antes de tu cita.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 1, background: submitting ? '#9CA3AF' : '#8B5CF6', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {submitting ? 'Confirmando...' : 'Confirmar Cita'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
export default function DoctorProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const [medico, setMedico] = useState<Medico | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [education, setEducation] = useState<EducationItem[]>([])
  const [experience, setExperience] = useState<ExperienceItem[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showConacemModal, setShowConacemModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [showInsuranceModal, setShowInsuranceModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [acordeonAbierto, setAcordeonAbierto] = useState(false)
  const [isOwner, setIsOwner] = useState(false)

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
setMedico(data)

// ── VERIFICAR SI ES EL DUEÑO DEL PERFIL ──
const { data: { user } } = await supabase.auth.getUser()
if (user?.email === data.email) {
  setIsOwner(true)
}
// ───────────────────────────────────────────

        const [licRes, eduRes, expRes, condRes, revRes] = await Promise.all([
          supabase.from('doctor_licenses').select('*').eq('doctor_id', data.id),
          supabase.from('doctor_education').select('*').eq('doctor_id', data.id).order('graduation_year', { ascending: false }),
          supabase.from('doctor_experience').select('*').eq('doctor_id', data.id).order('is_current', { ascending: false }),
          supabase.from('doctor_conditions').select('*').eq('doctor_id', data.id).order('category'),
          supabase.from('reviews').select('*').eq('doctor_id', data.id).eq('is_visible', true).order('created_at', { ascending: false }).limit(20),
        ])
        setLicenses(licRes.data || [])
        setEducation(eduRes.data || [])
        setExperience(expRes.data || [])
        setConditions(condRes.data || [])
        setReviews((revRes.data || []).map((r: any) => ({
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

  // ✅ handleAppointmentSubmit CON VALIDACIÓN DE HORARIO
  const handleAppointmentSubmit = async (data: any) => {
    // 1. VALIDAR QUE EL HORARIO NO ESTÉ YA RESERVADO
    const { data: existing } = await supabase
      .from('appointment_requests')
      .select('id')
      .eq('doctor_id', id)
      .eq('requested_date', data.requested_date)
      .eq('requested_time', data.requested_time)
      .in('status', ['solicitada', 'confirmada'])
      .single()
    
    if (existing) {
      throw new Error('Este horario ya fue reservado')
    }

    // 2. INSERTAR CON clinic_address OPCIONAL
    const { error } = await supabase.from('appointment_requests').insert({
      doctor_id: id,
      patient_name: data.patient_name,
      patient_email: data.patient_email,
      patient_phone: data.patient_phone,
      requested_date: data.requested_date,
      requested_time: data.requested_time,
      reason: data.reason,
      clinic_address: data.clinic_address || null, // ✅ OPCIONAL
      status: 'solicitada'
    })
    
    if (error) throw error
    
    // TODO: Aquí iría la llamada a Resend para email de confirmación
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Dr. ${medico?.full_name}`,
        text: `Reserva con el Dr. ${medico?.full_name} - ${medico?.specialty}`,
        url: window.location.href
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('URL copiada al portapapeles')
    }
  }

  const yearsExp = medico?.years_experience ?? medico?.years_of_experience ?? null
  const langs = parseLangs(medico?.languages ?? null)
  const precioMostrar = medico?.consultation_price_general || null
  const tieneAcordeon = education.length > 0 || experience.length > 0 || conditions.length > 0

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando perfil...</p>
      </div>
    </div>
  )

  if (error || !medico) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;700&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F', marginBottom: 8 }}>Perfil no encontrado</h2>
        <p style={{ color: '#6B7280', marginBottom: 20, fontSize: 14 }}>Este perfil no existe o no está disponible.</p>
        <Link href="/" style={{ background: '#8B5CF6', color: '#fff', padding: '11px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Ir al inicio</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827', paddingBottom: 100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease-out; }
        @media (max-width: 767px) { .desktop-only { display: none !important; } }
        @media (min-width: 768px) { .mobile-only { display: none !important; } }
      `}</style>

      {/* HEADER */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB', zIndex: 999, padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#1E3A5F' }}>
            <ArrowLeft size={20} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Volver</span>
          </button>
          <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <Share2 size={20} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ paddingTop: 100, maxWidth: 1200, margin: '0 auto', padding: '100px 20px 120px' }}>
        
{/* BOTÓN VOLVER (solo si el médico está viendo su propio perfil) */}
{isOwner && (
  <div style={{ marginBottom: 20 }}>
    <button
      onClick={() => router.push('/dashboard')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#3730A3',
        fontSize: 14,
        fontWeight: 600,
        padding: 0
      }}
    >
      ← Volver
    </button>
  </div>
)}

        {/* HERO SECTION */}
        <section className="fade-up" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 32, alignItems: 'end', marginBottom: 48 }}>
          {/* Foto */}
          <div style={{ position: 'relative', aspectRatio: isMobile ? '1/1' : '3/4', borderRadius: 32, overflow: 'hidden', background: '#EEF2FF', maxWidth: isMobile ? 300 : 400, margin: isMobile ? '0 auto' : '0' }}>
            {medico.photo_url ? (
              <img
                src={medico.photo_url}
                alt={medico.full_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setShowPhotoModal(true)}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)', fontFamily: "'Fraunces', serif", fontSize: 72, fontWeight: 900, color: '#fff' }}>
                {(medico.full_name || '?')[0].toUpperCase()}
              </div>
            )}
            {(medico.professional_license || licenses.length > 0) && (
              <div style={{ position: 'absolute', bottom: 24, left: 24, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(42, 157, 143, 0.95)', backdropFilter: 'blur(8px)', padding: '8px 16px', borderRadius: 50 }}>
                <ShieldCheck size={16} color="#fff" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cédula verificable</span>
              </div>
            )}
          </div>

          {/* Info + Stats */}
          <div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: isMobile ? 32 : 48, fontWeight: 900, color: '#1E3A5F', marginBottom: 8, lineHeight: 1.1 }}>
              {medico.full_name}
            </h1>
            <p style={{ fontSize: 16, color: '#6B7280', marginBottom: 24 }}>{medico.specialty}{medico.sub_specialty && ` · ${medico.sub_specialty}`}</p>
            
            {/* Stats Bento Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 16, textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <p style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#1E3A5F' }}>{(medico.rating_avg || 0).toFixed(1)}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 4 }}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} fill={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : 'none'} color={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : '#E5E7EB'} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Rating</p>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: 16, textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <p style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#1E3A5F' }}>{reviews.length}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600, marginTop: 8 }}>Reseñas</p>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: 16, textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <p style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#1E3A5F' }}>{yearsExp || 'N/A'}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600, marginTop: 8 }}>Años Exp.</p>
              </div>
            </div>

            {/* Precio visible */}
            {precioMostrar && (
              <div style={{ background: '#F5F3FF', borderRadius: 16, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, background: '#8B5CF6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Consulta</p>
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#1E3A5F' }}>${precioMostrar} MXN</p>
                </div>
              </div>
            )}

            {/* Ubicación */}
            {medico.location_city && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 14 }}>
                <MapPin size={16} />
                {medico.location_city}{medico.location_neighborhood && `, ${medico.location_neighborhood}`}
              </div>
            )}
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section className="fade-up" style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#1E3A5F', marginBottom: 16 }}>Sobre el Doctor</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 32 }}>
            <div>
              <p style={{ fontSize: 15, color: '#4A5568', lineHeight: 1.8 }}>
                {medico.about_me || 'Información no disponible. El médico no ha completado su presentación.'}
              </p>
            </div>
          </div>
        </section>

        {/* CONSULTA CREDENCIALES SECTION */}
        <section className="fade-up" style={{ marginBottom: 48 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#1E3A5F', marginBottom: 16 }}>
            Consulta credenciales en portales oficiales
          </h2>
          <div style={{ background: '#F9FAFB', borderRadius: 16, padding: 20, border: '1.5px solid #E5E7EB' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
              ⚠️ Consulta en fuentes oficiales antes de agendar
            </p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
              Tú decides con toda la información.
            </p>
            
            {medico.professional_license && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF2FF', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #C7D2FE' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#1E3A5F' }}>Cédula profesional</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <p style={{ fontSize: 11, color: '#8B5CF6', margin: 0 }}>No. {medico.professional_license}</p>
                      <CopyButton text={medico.professional_license} label="número de cédula" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowVerificationModal(true)} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 6, 
                    background: '#fff', 
                    color: '#1E3A5F', 
                    borderRadius: 10, 
                    padding: '8px 14px', 
                    border: '1px solid #C7D2FE', 
                    fontSize: 12, 
                    fontWeight: 600, 
                    cursor: 'pointer', 
                    width: '100%' 
                  }}
                >
                  <Shield size={14} /> Consultar cédula profesional
                </button>
              </div>
            )}
            
            {medico.specialty_council && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF2FF', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #C7D2FE' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#1E3A5F' }}>Certificación de especialidad</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <p style={{ fontSize: 11, color: '#8B5CF6', margin: 0 }}>{medico.specialty_council}</p>
                      <CopyButton text={medico.full_name} label="nombre del médico" />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConacemModal(true)} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 6, 
                    background: '#fff', 
                    color: '#1E3A5F', 
                    borderRadius: 10, 
                    padding: '8px 14px', 
                    border: '1px solid #C7D2FE', 
                    fontSize: 12, 
                    fontWeight: 600, 
                    cursor: 'pointer', 
                    width: '100%' 
                  }}
                >
                  <Shield size={14} /> Consultar certificación vigente
                </button>
              </div>
            )}
            
            <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 12, lineHeight: 1.5 }}>
              ¿No sabes qué consultar?{' '}
              <Link href="/como-elegir-medico" style={{ color: '#1E3A5F', fontWeight: 500, textDecoration: 'none' }}>
                Ver guía →
              </Link>
            </p>
          </div>
        </section>

        {/* INTERACTIVE CARDS */}
        <section className="fade-up" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 48 }}>
          {/* Seguros Aceptados */}
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, border: '1px solid #E5E7EB', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => setShowInsuranceModal(true)}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, background: '#2A9D8F', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={24} color="#fff" />
              </div>
              <ChevronDown size={20} color="#9CA3AF" style={{ transform: 'rotate(-90deg)' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 8 }}>Seguros aceptados</h3>
            {medico.accepts_insurance && medico.insurance_names && medico.insurance_names.length > 0 ? (
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                {medico.insurance_names.slice(0, 3).join(', ')}{medico.insurance_names.length > 3 && ` +${medico.insurance_names.length - 3} más`}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                No acepta seguros médicos. Pago particular.
              </p>
            )}
          </div>

          {/* Métodos de Pago */}
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, border: '1px solid #E5E7EB', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => setShowPaymentModal(true)}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
              <div style={{ width: 48, height: 48, background: '#1E3A5F', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CreditCard size={24} color="#fff" />
              </div>
              <ChevronDown size={20} color="#9CA3AF" style={{ transform: 'rotate(-90deg)' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 8 }}>Métodos de pago</h3>
            {medico.payment_methods && medico.payment_methods.length > 0 ? (
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                {medico.payment_methods.slice(0, 3).join(', ')}{medico.payment_methods.length > 3 && ` +${medico.payment_methods.length - 3} más`}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                Consulta directa con el médico.
              </p>
            )}
          </div>
        </section>

        {/* REVIEWS */}
        <section className="fade-up" style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 24 }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#1E3A5F' }}>Reseñas de Pacientes</h2>
            {reviews.length > 3 && (
              <button style={{ background: 'none', border: 'none', color: '#8B5CF6', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Ver todas ({reviews.length})
              </button>
            )}
          </div>
          {reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {reviews.slice(0, 3).map(review => (
                <div key={review.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 3fr', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{review.user_name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginTop: 4 }}>{new Date(review.created_at).toLocaleDateString('es-MX')}</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} fill={s <= review.rating ? '#F59E0B' : 'none'} color={s <= review.rating ? '#F59E0B' : '#E5E7EB'} />
                      ))}
                    </div>
                    <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.6, fontStyle: 'italic' }}>"{review.comment}"</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, background: '#F9FAFB', borderRadius: 16 }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📝</p>
              <p style={{ fontSize: 14, color: '#6B7280' }}>Aún no hay reseñas verificadas</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>Las reseñas aparecen después de que los pacientes asisten a sus citas.</p>
            </div>
          )}
        </section>

        {/* MORE INFO ACCORDION */}
        {tieneAcordeon && (
          <section className="fade-up" style={{ marginBottom: 48 }}>
            <button onClick={() => setAcordeonAbierto(!acordeonAbierto)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#1E3A5F', fontSize: 14, fontWeight: 600, padding: 0 }}>
              {acordeonAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {acordeonAbierto ? 'Ocultar información adicional' : 'Ver formación y experiencia →'}
            </button>
            {acordeonAbierto && (
              <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {education.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <GraduationCap size={18} color="#1E3A5F" />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Formación académica</p>
                    </div>
                    {education.map((edu, i) => (
                      <div key={i} style={{ paddingLeft: 26, marginBottom: 12 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{edu.institution}</p>
                        <p style={{ fontSize: 13, color: '#6B7280' }}>{edu.degree} · {edu.field_of_study} · {edu.graduation_year}</p>
                      </div>
                    ))}
                  </div>
                )}
                {experience.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Briefcase size={18} color="#1E3A5F" />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>Experiencia profesional</p>
                    </div>
                    {experience.map((exp, i) => (
                      <div key={i} style={{ paddingLeft: 26, marginBottom: 12 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{exp.institution_name}</p>
                        <p style={{ fontSize: 13, color: '#6B7280' }}>{exp.position}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {/* FIXED CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #fff, rgba(255,255,255,0.9))', padding: '20px 24px', zIndex: 1000, borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {precioMostrar && (
            <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Consulta</p>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1E3A5F' }}>${precioMostrar} MXN</p>
            </div>
          )}
          <button
            onClick={() => setShowAppointmentModal(true)}
            style={{ flex: 1, background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: '#fff', border: 'none', borderRadius: 16, padding: '16px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)' }}
          >
            <Calendar size={18} /> Agendar Cita
          </button>
        </div>
      </div>

      {/* MODALS */}
      {showAppointmentModal && (
        <AppointmentModal
          medico={medico}
          onClose={() => setShowAppointmentModal(false)}
          onSubmit={handleAppointmentSubmit}
        />
      )}

      {showPhotoModal && medico.photo_url && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowPhotoModal(false)}>
          <button onClick={() => setShowPhotoModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10 }}>
            <X size={32} />
          </button>
          <img src={medico.photo_url} alt={medico.full_name} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} />
        </div>
      )}

      {/* MODAL SEP */}
      {showVerificationModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowVerificationModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Shield size={26} color="#1E3A5F" />
              </div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: '#1E3A5F', marginBottom: 8 }}>Consultar cédula profesional</h3>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>Sigue estos 3 pasos sencillos para consultar la cédula en el portal de la SEP:</p>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1E3A5F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 2 }}>Copia el número de cédula</p>
                    {medico.professional_license ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', borderRadius: 8, padding: '6px 10px' }}>
                        <p style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 500, margin: 0, flex: 1 }}>{medico.professional_license}</p>
                        <CopyButton text={medico.professional_license} label="número de cédula" />
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: '#9CA3AF' }}>Este médico aún no ha registrado su cédula profesional</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1E3A5F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>Pega el número en el buscador del portal de la SEP.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1E3A5F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>Revisa que el nombre, título e institución coincidan.</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>

<button 
  onClick={() => setShowVerificationModal(false)} 
  style={{ 
    flex: 1, 
    background: '#F3F4F6', 
    color: '#6B7280',  // ← Complete the color value
    border: 'none', 
    borderRadius: 8, 
    padding: '11px', 
    fontSize: 14, 
    fontWeight: 600, 
    cursor: 'pointer', 
    fontFamily: "'DM Sans', sans-serif" 
  }}
>
  Cancelar
</button>

              <a href="https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action" target="_blank" rel="noopener noreferrer" onClick={() => setShowVerificationModal(false)} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                <ExternalLink size={14} /> Abrir portal SEP
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONACEM */}
      {showConacemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowConacemModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Shield size={26} color="#1E3A5F" />
              </div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: '#1E3A5F', marginBottom: 8 }}>Consultar certificación en CONACEM</h3>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>Sigue estos 3 pasos sencillos para consultar la certificación en el portal de CONACEM:</p>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1E3A5F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 2 }}>Copia el nombre del médico</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', borderRadius: 8, padding: '6px 10px' }}>
                      <p style={{ fontSize: 13, color: '#1E3A5F', fontWeight: 500, margin: 0, flex: 1 }}>{medico.full_name}</p>
                      <CopyButton text={medico.full_name} label="nombre" />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1E3A5F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>Pega el nombre en el buscador del portal de CONACEM.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1E3A5F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                    Busca al médico y revisa que su certificación esté vigente.
                    {medico.specialty_council && (
                      <span style={{ color: '#6B7280' }}> El consejo es: <strong>{medico.specialty_council}</strong>.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowConacemModal(false)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Cancelar</button>
              <a href="https://conacem.org.mx/buscador" target="_blank" rel="noopener noreferrer" onClick={() => setShowConacemModal(false)} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                <ExternalLink size={14} /> Abrir portal CONACEM
              </a>
            </div>
          </div>
        </div>
      )}

      {showInsuranceModal && (
        <InfoModal title="Seguros Aceptados" onClose={() => setShowInsuranceModal(false)}>
          {medico.accepts_insurance && medico.insurance_names && medico.insurance_names.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {medico.insurance_names.map((seguro, i) => (
                <span key={i} style={{ fontSize: 13, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 20, padding: '6px 14px', color: '#065F46', fontWeight: 500 }}>{seguro}</span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Este médico no acepta seguros médicos. El pago es particular directamente en el consultorio.</p>
          )}
        </InfoModal>
      )}

      {showPaymentModal && (
        <InfoModal title="Métodos de Pago" onClose={() => setShowPaymentModal(false)}>
          {medico.payment_methods && medico.payment_methods.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {medico.payment_methods.map((method, i) => (
                <span key={i} style={{ fontSize: 13, background: '#F5F3FF', border: '1px solid #C7D2FE', borderRadius: 20, padding: '6px 14px', color: '#3730A3', fontWeight: 500 }}>{method}</span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>Consulta directa con el médico para conocer los métodos de pago disponibles.</p>
          )}
        </InfoModal>
      )}
    </div>
  )
}