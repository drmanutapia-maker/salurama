'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPin, MessageCircle, Star, Camera, Clock,
  Building2, GraduationCap, FileText, ShieldCheck, Shield,
  ExternalLink, AlertTriangle, Copy, CheckCircle, X,
  ChevronDown, ChevronUp, Globe, Briefcase, Heart,
  Languages, CreditCard, DollarSign, Phone
} from 'lucide-react'

// ─────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────

interface Medico {
  id: string
  full_name: string
  specialty: string
  sub_specialty: string | null
  email: string
  location_city: string
  location_neighborhood: string
  address: string
  consultation_price: number | null
  consultation_price_general: number | null
  consultation_price_first_time: number | null
  consultation_price_followup: number | null
  whatsapp: string | null
  professional_license: string | null
  specialty_council: string | null
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
  availability_schedule: any
  clinic_addresses: any[]
  website_url: string | null
  wheelchair_accessible: boolean
  has_parking: boolean
  cancellation_policy: string | null
  best_contact_time: string | null
}

interface License {
  id: string
  license_number: string
  license_type: string
  institution: string
  issue_date: string
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
  location: string
  start_date: string
  end_date: string
  is_current: boolean
}

interface SocialMediaItem {
  id: string
  platform: string
  url: string
  username: string
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

type TabId = 'disponibilidad' | 'reviews' | 'ubicacion'

// ─────────────────────────────────────────────
// COMPONENTES PEQUEÑOS
// ─────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff',
          padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
          maxWidth: 240, textAlign: 'center', zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'none'
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)', width: 0, height: 0,
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '6px solid #1A1A2E'
          }} />
        </div>
      )}
    </div>
  )
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }
  return (
    <Tooltip text={copied ? '¡Copiado!' : `Copiar ${label}`}>
      <button
        onClick={handleCopy}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#059669' : '#9CA3AF', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
        type="button"
      >
        {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
      </button>
    </Tooltip>
  )
}

function MapsModal({ address, city, onClose }: { address: string; city: string; onClose: () => void }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', ' + city)}`
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 800, width: '100%', maxHeight: '90vh', position: 'relative', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <X size={18} color="#1A1A2E" />
        </button>
        <iframe
          width="100%" height="500"
          style={{ border: 0 }} loading="lazy" allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address + ', ' + city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
        />
        <div style={{ padding: '16px 20px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{address}, {city}</p>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#3730A3', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <ExternalLink size={14} /> Abrir en Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// HELPER: parsear idiomas (puede ser array o string JSON)
// ─────────────────────────────────────────────
function parseLangs(raw: string[] | string | null): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [raw] }
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────

export default function PerfilMedico() {
  const { id } = useParams()
  const router = useRouter()

  const [medico, setMedico] = useState<Medico | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [education, setEducation] = useState<EducationItem[]>([])
  const [experience, setExperience] = useState<ExperienceItem[]>([])
  const [socialMedia, setSocialMedia] = useState<SocialMediaItem[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [tab, setTab] = useState<TabId>('disponibilidad')
  const [showMapModal, setShowMapModal] = useState(false)
  const [appointmentSubmitted, setAppointmentSubmitted] = useState(false)

  // Acordeón "Más sobre este médico"
  const [acordeonAbierto, setAcordeonAbierto] = useState(false)

  // Verificación SEP
  const [verifyingLicense, setVerifyingLicense] = useState(false)
  const [verificationData, setVerificationData] = useState<any>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  // Verificación CONACEM — modal informativo intencional
  const [showConacemModal, setShowConacemModal] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
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

        // Cargar tablas relacionales en paralelo
        const [licRes, eduRes, expRes, smRes, condRes, revRes] = await Promise.all([
          supabase.from('doctor_licenses').select('*').eq('doctor_id', data.id),
          supabase.from('doctor_education').select('*').eq('doctor_id', data.id).order('graduation_year', { ascending: false }),
          supabase.from('doctor_experience').select('*').eq('doctor_id', data.id).order('is_current', { ascending: false }),
          supabase.from('doctor_social_media').select('*').eq('doctor_id', data.id),
          supabase.from('doctor_conditions').select('*').eq('doctor_id', data.id).order('category'),
          supabase.from('reviews').select('*').eq('doctor_id', data.id).eq('is_visible', true).order('created_at', { ascending: false }).limit(20),
        ])

        setLicenses(licRes.data || [])
        setEducation(eduRes.data || [])
        setExperience(expRes.data || [])
        setSocialMedia(smRes.data || [])
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

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !medico) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const name = `${id}-${Date.now()}.${ext}`
      const { error: ue } = await supabase.storage.from('doctor-photos').upload(name, file, { upsert: true })
      if (ue) throw ue
      const { data: urlData } = supabase.storage.from('doctor-photos').getPublicUrl(name)
      await supabase.from('doctors').update({ photo_url: urlData.publicUrl }).eq('id', id as string)
      setMedico(p => p ? { ...p, photo_url: urlData.publicUrl } : null)
    } catch { alert('Error al subir la foto.') }
    finally { setUploading(false) }
  }

  // ── Generador de horarios ──────────────────────────────────────────────────
  function generateTimeSlots(): string[] {
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
    return slots.slice(0, 8)
  }

  const yearsExp = (medico?.years_of_experience ?? medico?.years_experience) ?? null
  const langs = parseLangs(medico?.languages ?? null)

  // Precio a mostrar: tomar el primero disponible
  const precioMostrar =
    medico?.consultation_price_general ||
    medico?.consultation_price ||
    null

  // Tiene acordeón con contenido
  const tieneAcordeon =
    education.length > 0 ||
    experience.length > 0 ||
    conditions.length > 0 ||
    socialMedia.length > 0

  // ── Loading / Error ────────────────────────────────────────────────────────
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
    { id: 'disponibilidad', label: 'Agendar cita' },
    { id: 'reviews', label: `Reseñas (${reviews.length})` },
    { id: 'ubicacion', label: 'Ubicación' },
  ]

  // ─────────────────────────────────────────────
  // SUB-COMPONENTE: Tarjeta de contacto (columna derecha)
  // ─────────────────────────────────────────────
  function ContactoCard() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Precio */}
        {precioMostrar && precioMostrar > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Costo de consulta</p>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 900, color: '#3730A3', lineHeight: 1, margin: 0 }}>
              ${precioMostrar.toLocaleString('es-MX')}
              <span style={{ fontSize: 13, fontWeight: 400, color: '#9CA3AF' }}> MXN</span>
            </p>
            {medico.consultation_price_first_time && medico.consultation_price_first_time !== precioMostrar && (
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                Primera vez: ${medico.consultation_price_first_time.toLocaleString('es-MX')} MXN
              </p>
            )}
          </div>
        )}

        {/* Verificación de credenciales */}
        <div style={{ background: '#F9FAFB', borderRadius: 16, padding: '16px 18px', border: '1.5px solid #E5E7EB' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 4, lineHeight: 1.3 }}>
            ⚠️ Verifica credenciales antes de agendar.
          </p>
          <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
            Consulta en fuentes oficiales. Tú decides.
          </p>

          {/* ── Cédula SEP ── */}
          {medico.professional_license ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF2FF', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #C7D2FE' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#3730A3' }}>Cédula profesional</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <p style={{ fontSize: 11, color: '#6366F1', margin: 0 }}>No. {medico.professional_license}</p>
                    <CopyButton text={medico.professional_license} label="número de cédula" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowVerificationModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#fff', color: '#3730A3',
                  borderRadius: 10, padding: '8px 14px', marginBottom: 12,
                  border: '1px solid #C7D2FE', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', width: '100%'
                }}
              >
                <Shield size={14} />Verificar cédula en SEP
              </button>
            </>
          ) : (
            <div style={{ background: '#FEF3C7', borderRadius: 10, padding: '10px 14px', marginBottom: 12, border: '1px solid #FCD34D' }}>
              <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>⚠️ Este médico aún no ha registrado su cédula profesional en Salurama.</p>
            </div>
          )}

          {/* ── Certificación CONACEM ── */}
          {medico.specialty_council && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#EEF2FF', borderRadius: 10, padding: '10px 14px', marginBottom: 8, border: '1px solid #C7D2FE' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: '#3730A3' }}>Certificación de especialidad</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <p style={{ fontSize: 11, color: '#6366F1', margin: 0 }}>{medico.specialty_council} (CONACEM)</p>
                    <CopyButton text={medico.full_name} label="nombre del médico para buscar en CONACEM" />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowConacemModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#fff', color: '#3730A3',
                  borderRadius: 10, padding: '8px 14px', marginBottom: 12,
                  border: '1px solid #C7D2FE', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', width: '100%'
                }}
              >
                <Shield size={14} />Verificar certificación en CONACEM
              </button>
            </>
          )}

          {/* Disclaimer pequeño */}
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4, lineHeight: 1.5 }}>
            ⚠️ Los portales oficiales son externos a Salurama y pueden presentar lentitud.
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8, lineHeight: 1.5 }}>
            ¿No sabes qué verificar?{' '}
            <Link href="/como-elegir-medico" style={{ color: '#3730A3', fontWeight: 500, textDecoration: 'none' }}>
              Ver guía →
            </Link>
          </p>
        </div>

        {/* WhatsApp */}
        {medico.whatsapp && medico.whatsapp_available && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', textAlign: 'center', marginBottom: 10 }}>Contacto directo</p>
            <a
              href={`https://wa.me/52${medico.whatsapp.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 50, padding: '13px', fontSize: 15, fontWeight: 700, textDecoration: 'none', width: '100%', fontFamily: "'DM Sans', sans-serif" }}
            >
              <MessageCircle size={17} /> WhatsApp
            </a>
            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 }}>Sin intermediarios · Sin costo</p>
          </div>
        )}

        {/* Métodos de pago */}
        {Array.isArray(medico.payment_methods) && medico.payment_methods.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Métodos de pago</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {medico.payment_methods.map((m, i) => (
                <span key={i} style={{ fontSize: 11, background: '#F3F4F6', borderRadius: 20, padding: '3px 10px', color: '#374151' }}>{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* Seguros */}
        {medico.accepts_insurance && Array.isArray(medico.insurance_names) && medico.insurance_names.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acepta seguros</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {medico.insurance_names.map((s, i) => (
                <span key={i} style={{ fontSize: 11, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 20, padding: '3px 10px', color: '#065F46' }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer legal */}
        <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '12px 14px', border: '1px solid #FCD34D' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <AlertTriangle size={13} color="#92400E" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11, color: '#92400E', lineHeight: 1.6, margin: 0 }}>
              Salurama facilita acceso a fuentes oficiales, pero no verifica ni avala credenciales. La decisión de consultar a este médico es exclusivamente tuya.{' '}
              <Link href="/deslinde-responsabilidad" style={{ color: '#92400E', fontWeight: 600 }}>Saber más</Link>
            </p>
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#D1D5DB', textAlign: 'center' }}>
          ¿Información incorrecta?{' '}
          <a href="mailto:reportes@salurama.com" style={{ color: '#9CA3AF', textDecoration: 'underline' }}>Reportar</a>
        </p>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // SUB-COMPONENTE: Formulario de cita
  // ─────────────────────────────────────────────
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
    const [submitting, setSubmitting] = useState(false)
    const timeSlots = generateTimeSlots()

    if (appointmentSubmitted) {
      return (
        <div style={{ textAlign: 'center', padding: '32px 20px', background: '#F0FDF4', borderRadius: 12, border: '1px solid #86EFAC' }}>
          <CheckCircle size={48} color="#059669" style={{ marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#059669', marginBottom: 8 }}>Cita solicitada</h3>
          <p style={{ fontSize: 14, color: '#059669', marginBottom: 16 }}>Tu solicitud ha sido registrada. El médico te contactará para confirmar.</p>
          {medico?.whatsapp_available && medico?.whatsapp && (
            <a
              href={`https://wa.me/52${medico.whatsapp.replace(/\D/g, '')}?text=Hola%2C%20acabo%20de%20solicitar%20una%20cita`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 50, padding: '12px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
            >
              <MessageCircle size={16} /> Contactar por WhatsApp
            </a>
          )}
        </div>
      )
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitting(true)
      try {
        const { error } = await supabase.from('appointment_requests').insert({
          doctor_id: medico!.id,
          patient_name: formData.patient_name,
          patient_email: formData.patient_email,
          patient_phone: formData.patient_phone,
          requested_date: formData.requested_date,
          requested_time: formData.requested_time,
          reason: formData.reason,
          clinic_address: formData.clinic_address,
          status: 'solicitada'
        })
        if (error) throw error
        setAppointmentSubmitted(true)
      } catch (err: any) {
        alert('Error al solicitar la cita: ' + (err.message || 'Error desconocido'))
      } finally {
        setSubmitting(false)
      }
    }

    const horasDefault = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','16:00','16:30','17:00','17:30','18:00']

    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Consultorio */}
        {medico?.clinic_addresses && medico.clinic_addresses.length > 1 ? (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Consultorio *</label>
            <select
              value={formData.clinic_address}
              onChange={e => setFormData({ ...formData, clinic_address: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              required
            >
              {medico.clinic_addresses.map((c: any, i: number) => (
                <option key={i} value={c.address}>{c.name || 'Consultorio'} — {c.address}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Consultorio</label>
            <p style={{ fontSize: 14, color: '#1A1A2E', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, margin: 0 }}>
              {medico?.clinic_name || 'Consultorio'} — {medico?.clinic_address || 'Dirección no especificada'}
            </p>
          </div>
        )}

        {/* Fecha y hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fecha *</label>
            <input
              type="date"
              value={formData.requested_date}
              onChange={e => setFormData({ ...formData, requested_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hora *</label>
            <select
              value={formData.requested_time}
              onChange={e => setFormData({ ...formData, requested_time: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              required
            >
              <option value="">Selecciona</option>
              {(timeSlots.length > 0 ? timeSlots : horasDefault).map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Motivo */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Motivo de consulta (opcional)</label>
          <textarea
            value={formData.reason}
            onChange={e => setFormData({ ...formData, reason: e.target.value })}
            rows={2}
            placeholder="Breve descripción..."
            style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
          />
        </div>

        {/* Datos del paciente */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nombre completo *</label>
            <input type="text" value={formData.patient_name} onChange={e => setFormData({ ...formData, patient_name: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email *</label>
            <input type="email" value={formData.patient_email} onChange={e => setFormData({ ...formData, patient_email: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Teléfono *</label>
            <input type="tel" value={formData.patient_phone} onChange={e => setFormData({ ...formData, patient_phone: e.target.value })} placeholder="55 1234 5678" style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }} required />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ background: submitting ? '#9CA3AF' : 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '14px 24px', fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
        >
          {submitting ? 'Solicitando...' : '📅 Solicitar cita'}
        </button>

        <p style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
          Al solicitar esta cita aceptas que el médico te contacte para confirmar. Sin costos de intermediación.
        </p>
      </form>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────

  // Snippet "Sobre mí": máximo 180 caracteres + "..."
  const snippetAboutMe = medico.about_me
    ? medico.about_me.length > 180
      ? medico.about_me.slice(0, 180).trimEnd() + '...'
      : medico.about_me
    : null

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .tab-btn { padding:11px 14px; border:none; background:none; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600; color:#6B7280; cursor:pointer; border-bottom:2.5px solid transparent; transition:all 0.18s; white-space:nowrap; }
        .tab-btn.on { color:#3730A3; border-bottom-color:#3730A3; }
        .tabs-wrap { display:flex; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .tabs-wrap::-webkit-scrollbar { display:none; }
        .foto-ov { position:absolute; inset:0; border-radius:50%; background:rgba(55,48,163,0.75); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; cursor:pointer; }
        .foto-wr:hover .foto-ov { opacity:1; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-up { animation:fadeUp 0.35s ease-out; }
        .acordeon-body { overflow:hidden; transition:max-height 0.4s ease, opacity 0.3s ease; }
        .acordeon-body.open { max-height:2000px; opacity:1; }
        .acordeon-body.closed { max-height:0; opacity:0; }
        .info-label { font-size:10px; color:#9CA3AF; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px; }
        .info-val { font-size:13px; color:#1A1A2E; font-weight:500; }
        .chip { font-size:11px; background:#F3F4F6; border-radius:20px; padding:3px 10px; color:#374151; display:inline-block; }
        .chip-hl { font-size:11px; background:#EEF2FF; border:1px solid #C7D2FE; border-radius:20px; padding:3px 10px; color:#3730A3; display:inline-block; }
      `}</style>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '18px 16px 60px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 18, alignItems: 'start' }}>

          {/* ── COLUMNA PRINCIPAL ─────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ★ 1. TARJETA PRINCIPAL — Header del médico (PRIMERO EN MÓVIL) */}
            <div className="fade-up" style={{ background: '#fff', borderRadius: 18, padding: 'clamp(18px,4vw,24px)', border: '1px solid #E5E7EB' }}>

              {/* Foto + nombre */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }} className="foto-wr">
                  {medico.photo_url
                    ? <img src={medico.photo_url} alt={medico.full_name} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #EEF2FF' }} />
                    : <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 900, color: '#3730A3' }}>
                        {(medico.full_name || '?')[0].toUpperCase()}
                      </div>
                  }
                  {isOwner && (
                    <>
                      <div className="foto-ov" onClick={() => fileInputRef.current?.click()}>
                        {uploading
                          ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          : <Camera size={19} color="#fff" />
                        }
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
                    </>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 160 }}>
                  {/* Nombre + badge cédula */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px,5vw,24px)', fontWeight: 900, color: '#1A1A2E' }}>
                      {medico.full_name}
                    </h1>
                    {(medico.professional_license || licenses.length > 0) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', color: '#3730A3', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>
                        <ShieldCheck size={12} /> Cédula verificable
                      </span>
                    )}
                  </div>

                  {/* Especialidad */}
                  <p style={{ fontSize: 15, color: '#4F46E5', fontWeight: 600, marginBottom: 5 }}>
                    {medico.specialty}
                    {medico.sub_specialty && (
                      <span style={{ color: '#9CA3AF', fontWeight: 400 }}> · {medico.sub_specialty}</span>
                    )}
                  </p>

                  {/* Meta: ubicación, experiencia */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
                    {medico.location_city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={12} />
                        {medico.location_city}{medico.location_neighborhood ? `, ${medico.location_neighborhood}` : ''}
                      </span>
                    )}
                    {yearsExp != null && yearsExp > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={12} /> {yearsExp} años de experiencia
                      </span>
                    )}
                  </div>

                  {/* Idiomas */}
                  {langs.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
                      {langs.map((l, i) => <span key={i} className="chip-hl">{l}</span>)}
                    </div>
                  )}

                  {/* Rating */}
                  {reviews.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={13}
                          fill={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : 'none'}
                          color={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : '#E5E7EB'}
                        />
                      ))}
                      <span style={{ fontSize: 13, color: '#6B7280' }}>
                        {(medico.rating_avg || 0).toFixed(1)} ({reviews.length} reseñas)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Grid de información crítica ── */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  📋 Información del médico
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>

                  {/* Cédula profesional */}
                  {(licenses.length > 0 || medico.professional_license) && (
                    <div>
                      <p className="info-label">Cédula profesional</p>
                      <p className="info-val">
                        {licenses.length > 0
                          ? licenses[0].license_number
                          : medico.professional_license}
                      </p>
                    </div>
                  )}

                  {/* Consejo de especialidad */}
                  {medico.specialty_council && (
                    <div>
                      <p className="info-label">Consejo de especialidad</p>
                      <p className="info-val">{medico.specialty_council}</p>
                    </div>
                  )}

                  {/* Hospital */}
                  {medico.hospital_affiliation && (
                    <div>
                      <p className="info-label">Hospital / Clínica</p>
                      <p className="info-val">{medico.hospital_affiliation}</p>
                    </div>
                  )}

                  {/* Seguros */}
                  {medico.accepts_insurance && Array.isArray(medico.insurance_names) && medico.insurance_names.length > 0 && (
                    <div>
                      <p className="info-label">Acepta seguros</p>
                      <p className="info-val">{medico.insurance_names.slice(0, 3).join(' · ')}{medico.insurance_names.length > 3 ? ` +${medico.insurance_names.length - 3}` : ''}</p>
                    </div>
                  )}

                  {/* Accesibilidad */}
                  {(medico.wheelchair_accessible || medico.has_parking) && (
                    <div>
                      <p className="info-label">Instalaciones</p>
                      <p className="info-val">
                        {[medico.wheelchair_accessible && 'Acceso silla de ruedas', medico.has_parking && 'Estacionamiento'].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Snippet "Sobre mí" ── */}
              {snippetAboutMe && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, fontWeight: 300 }}>
                    {snippetAboutMe}
                  </p>
                </div>
              )}

              {/* CTA para el dueño del perfil si no ha llenado about_me */}
              {isOwner && !medico.about_me && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F3F4F6', background: '#FFFBEB', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 13, color: '#92400E', marginBottom: 6 }}>
                    ✏️ Tu presentación está vacía. Los médicos con una buena introducción generan más confianza.
                  </p>
                  <Link
                    href="/dashboard/editar"
                    style={{ fontSize: 13, color: '#3730A3', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Completar presentación en el dashboard →
                  </Link>
                </div>
              )}

              {/* ── Acordeón "Más sobre este médico" ── */}
              {tieneAcordeon && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6' }}>
                  <button
                    onClick={() => setAcordeonAbierto(prev => !prev)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                      border: 'none', cursor: 'pointer', color: '#3730A3',
                      fontSize: 14, fontWeight: 600, padding: 0, fontFamily: "'DM Sans', sans-serif"
                    }}
                  >
                    {acordeonAbierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {acordeonAbierto ? 'Ocultar información adicional' : 'Ver formación, experiencia y enfermedades que trata →'}
                  </button>

                  <div className={`acordeon-body ${acordeonAbierto ? 'open' : 'closed'}`}>
                    <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

                      {/* Educación */}
                      {education.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                            <GraduationCap size={15} color="#3730A3" />
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Formación académica</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {education.map(edu => (
                              <div key={edu.id} style={{ paddingLeft: 21 }}>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 1 }}>{edu.institution}</p>
                                <p style={{ fontSize: 13, color: '#6B7280' }}>
                                  {edu.degree}{edu.field_of_study ? ` · ${edu.field_of_study}` : ''}{edu.graduation_year ? ` · ${edu.graduation_year}` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Experiencia */}
                      {experience.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                            <Briefcase size={15} color="#3730A3" />
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Experiencia profesional</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {experience.map(exp => (
                              <div key={exp.id} style={{ paddingLeft: 21 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 1 }}>{exp.institution_name}</p>
                                  {exp.is_current && (
                                    <span style={{ fontSize: 10, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: 20, padding: '2px 7px', fontWeight: 600 }}>Actual</span>
                                  )}
                                </div>
                                <p style={{ fontSize: 13, color: '#6B7280' }}>
                                  {exp.position}{exp.location ? ` · ${exp.location}` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enfermedades tratadas */}
                      {conditions.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                            <Heart size={15} color="#3730A3" />
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Enfermedades que trata</p>
                          </div>
                          <div style={{ paddingLeft: 21 }}>
                            {conditions.filter(c => c.category === 'principal').length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Principales</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {conditions.filter(c => c.category === 'principal').map(c => (
                                    <span key={c.id} className="chip-hl">{c.condition_name}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {conditions.filter(c => c.category === 'otra').length > 0 && (
                              <div>
                                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Otras</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {conditions.filter(c => c.category === 'otra').map(c => (
                                    <span key={c.id} className="chip">{c.condition_name}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Redes sociales */}
                      {socialMedia.length > 0 && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                            <Globe size={15} color="#3730A3" />
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Redes sociales</p>
                          </div>
                          <div style={{ paddingLeft: 21, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {socialMedia.map(sm => (
                              <a
                                key={sm.id}
                                href={sm.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#3730A3', textDecoration: 'none' }}
                              >
                                <ExternalLink size={12} />
                                {sm.platform} {sm.username ? `· ${sm.username}` : ''}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ★ 2. TARJETA DE CONTACTO (SEGUNDO EN MÓVIL) */}
            {isMobile && (
              <div style={{ marginBottom: 16 }}>
                <ContactoCard />
              </div>
            )}

            {/* ★ 3. TABS (TERCERO EN MÓVIL) */}
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div className="tabs-wrap" style={{ borderBottom: '1px solid #F3F4F6', padding: '0 6px' }}>
                {TABS.map(t => (
                  <button
                    key={t.id}
                    className={`tab-btn${tab === t.id ? ' on' : ''}`}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 'clamp(16px,4vw,22px)' }}>

                {/* TAB: Agendar cita */}
                {tab === 'disponibilidad' && <AppointmentForm />}

                {/* TAB: Reseñas */}
                {tab === 'reviews' && (
                  <div>
                    <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#3730A3', lineHeight: 1.6 }}>
                      ✓ Solo se muestran reseñas de pacientes verificados que agendaron cita a través de Salurama.
                    </div>
                    {reviews.length > 0 ? reviews.map(r => (
                      <div key={r.id} style={{ padding: 14, background: '#F9FAFB', borderRadius: 10, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{r.user_name}</p>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(r.created_at).toLocaleDateString('es-MX')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 2, marginBottom: 5 }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} fill={s <= r.rating ? '#F59E0B' : 'none'} color={s <= r.rating ? '#F59E0B' : '#E5E7EB'} />
                          ))}
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{r.comment}</p>
                      </div>
                    )) : (
                      <div style={{ textAlign: 'center', padding: 40 }}>
                        <p style={{ fontSize: 32, marginBottom: 12 }}>📝</p>
                        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>Aún no hay reseñas verificadas</p>
                        <p style={{ fontSize: 12, color: '#9CA3AF' }}>Las reseñas aparecen después de que los pacientes asistan a sus citas.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: Ubicación */}
                {tab === 'ubicacion' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {medico.address && (
                      <div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dirección</p>
                        <p style={{ fontSize: 14, color: '#1A1A2E' }}>
                          {medico.address}{medico.location_neighborhood ? `, ${medico.location_neighborhood}` : ''}, {medico.location_city}
                        </p>
                      </div>
                    )}
                    {medico.best_contact_time && (
                      <div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mejor horario para llamar</p>
                        <p style={{ fontSize: 14, color: '#1A1A2E' }}>{medico.best_contact_time}</p>
                      </div>
                    )}
                    {medico.cancellation_policy && (
                      <div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Política de cancelación</p>
                        <p style={{ fontSize: 14, color: '#1A1A2E' }}>{medico.cancellation_policy}</p>
                      </div>
                    )}
                    <button
                      onClick={() => isMobile
                        ? window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((medico.address || '') + ', ' + medico.location_city)}`, '_blank')
                        : setShowMapModal(true)
                      }
                      style={{ width: '100%', background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '16px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      <MapPin size={18} /> Ver en Google Maps
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── COLUMNA LATERAL (desktop) ──────────────────────── */}
          {!isMobile && (
            <div style={{ position: 'sticky', top: 72 }}>
              <ContactoCard />
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL GOOGLE MAPS (desktop) ── */}
      {!isMobile && showMapModal && medico?.address && (
        <MapsModal
          address={medico.address}
          city={medico.location_city}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* ── MODAL VERIFICACIÓN SEP ── */}
      {showVerificationModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}
          onClick={() => setShowVerificationModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Shield size={26} color="#3730A3" />
              </div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: '#1A1A2E', marginBottom: 8 }}>Verificar cédula profesional</h3>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                La SEP no cuenta con API pública disponible, pero puedes verificar la cédula profesional directamente en su portal oficial en 3 pasos sencillos.
              </p>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3730A3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 2 }}>Copia el número de cédula</p>
                    {medico.professional_license ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', borderRadius: 8, padding: '6px 10px' }}>
                        <p style={{ fontSize: 13, color: '#3730A3', fontWeight: 500, margin: 0, flex: 1 }}>{medico.professional_license}</p>
                        <CopyButton text={medico.professional_license} label="número de cédula" />
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: '#9CA3AF' }}>Este médico aún no ha registrado su cédula profesional</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3730A3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>Entra al portal de la SEP y pega el número en el buscador de cédulas profesionales.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3730A3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                    Revisa que el nombre del médico, título e institución coincidan con la información del perfil.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowVerificationModal(false)}
                style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Cancelar
              </button>
              <a
                href="https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowVerificationModal(false)}
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
              >
                <ExternalLink size={14} /> Abrir portal SEP
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONACEM — flujo intencional ── */}
      {showConacemModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}
          onClick={() => setShowConacemModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, background: '#EEF2FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Shield size={26} color="#3730A3" />
              </div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: '#1A1A2E', marginBottom: 8 }}>Verificar en CONACEM</h3>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
                CONACEM no tiene una API automática, pero puedes verificar la certificación de especialidad directamente en su portal oficial en 3 pasos sencillos.
              </p>
            </div>

            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3730A3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>1</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 2 }}>Copia el nombre del médico</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EEF2FF', borderRadius: 8, padding: '6px 10px' }}>
                      <p style={{ fontSize: 13, color: '#3730A3', fontWeight: 500, margin: 0, flex: 1 }}>{medico.full_name}</p>
                      <CopyButton text={medico.full_name} label="nombre" />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3730A3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>2</div>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>Entra al portal de CONACEM y pega el nombre en el buscador.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#3730A3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>3</div>
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
              <button
                onClick={() => setShowConacemModal(false)}
                style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Cancelar
              </button>
              <a
                href="https://conacem.org.mx/buscador"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowConacemModal(false)}
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}
              >
                <ExternalLink size={14} /> Abrir portal CONACEM
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}