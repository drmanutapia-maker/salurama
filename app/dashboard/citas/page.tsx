'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, MessageCircle, Calendar, User, Phone, Mail, MapPin, Clock, FileText, ChevronDown, ChevronRight, Send } from 'lucide-react'

interface Cita {
  id: string
  patient_name: string
  patient_email: string
  patient_phone: string
  requested_date: string
  requested_time: string
  reason: string | null
  clinic_address: string
  status: string
  created_at: string
  review_sent: boolean
  review_verified: boolean
}

interface CitasPorFecha {
  [key: string]: Cita[]
}

export default function CitasSolicitadasPage() {
  const router = useRouter()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [medicoId, setMedicoId] = useState<string | null>(null)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: medico } = await supabase.from('doctors').select('id').eq('email', user.email).single()
      if (!medico) {
        router.push('/dashboard')
        return
      }
      setMedicoId(medico.id)
      const { data } = await supabase
        .from('appointment_requests')
        .select('*')
        .eq('doctor_id', medico.id)
        .order('requested_date', { ascending: false })
        .order('requested_time', { ascending: true })
      
      setCitas((data as Cita[]) || [])
      setLoading(false)
    }
    load()
  }, [router])

  // Agrupar citas por fecha
  const citasPorFecha: CitasPorFecha = citas.reduce((acc, cita) => {
    if (!acc[cita.requested_date]) {
      acc[cita.requested_date] = []
    }
    acc[cita.requested_date].push(cita)
    return acc
  }, {} as CitasPorFecha)

  // Ordenar fechas de más reciente a más antigua
  const fechasOrdenadas = Object.keys(citasPorFecha).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  // Toggle expandir/colapsar fecha
  const toggleDate = (fecha: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fecha)) {
        newSet.delete(fecha)
      } else {
        newSet.add(fecha)
      }
      return newSet
    })
  }

  // ✅ VERIFICAR SI LA CITA YA PASÓ (1 día después mínimo)
  const canRequestReview = (cita: Cita) => {
    const citaDate = new Date(cita.requested_date + 'T' + (cita.requested_time || '00:00'))
    const now = new Date()
    const oneDayAfter = new Date(citaDate)
    oneDayAfter.setDate(oneDayAfter.getDate() + 1)
    
    // La cita debe haber pasado al menos 1 día
    return now >= oneDayAfter
  }

  // ✅ VERIFICAR SI EL ESTADO PERMITE RESEÑA
  const canShowReviewButton = (cita: Cita) => {
    // No mostrar si ya se envió o verificó la reseña
    if (cita.review_sent || cita.review_verified) return false
    
    // No mostrar para citas canceladas
    if (cita.status === 'cancelada') return false
    
    // No mostrar para citas futuras o de hoy
    if (!canRequestReview(cita)) return false
    
    // Mostrar para citas atendidas o confirmadas del pasado
    return ['atendida', 'confirmada', 'solicitada'].includes(cita.status)
  }

  // Enviar email de solicitud de reseña
  const sendReviewEmail = async (cita: Cita) => {
    if (!confirm(`¿Enviar solicitud de reseña a ${cita.patient_name}?`)) return
    
    setSendingEmail(cita.id)
    try {
      // Generar token único para esta cita
      const token = crypto.randomUUID()
      
      // Actualizar cita con token
      await supabase
        .from('appointment_requests')
        .update({ 
          review_sent: true,
          review_token: token
        })
        .eq('id', cita.id)

      // Enviar email
      const response = await fetch('/api/send-review-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cita.patient_email,
          token: token,
          doctorName: 'el médico',
          appointmentDate: new Date(cita.requested_date).toLocaleDateString('es-MX')
        })
      })

      if (response.ok) {
        // Actualizar estado local
        setCitas(prev => prev.map(c => 
          c.id === cita.id ? { ...c, review_sent: true } : c
        ))
        alert('✓ Email de reseña enviado correctamente')
      } else {
        throw new Error('Error al enviar email')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al enviar el email de reseña')
    } finally {
      setSendingEmail(null)
    }
  }

  const getWhatsAppLink = (phone: string, date: string, time: string, patientName: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    const message = `Hola ${patientName}, te contacto respecto a tu cita del ${date} a las ${time}. ¿Podemos confirmar?`
    return `https://wa.me/52${cleanPhone}?text=${encodeURIComponent(message)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'solicitada': return { bg: '#FEF3C7', text: '#92400E' }
      case 'confirmada': return { bg: '#DCFCE7', text: '#059669' }
      case 'cancelada': return { bg: '#FEE2E2', text: '#DC2626' }
      case 'atendida': return { bg: '#E0E7FF', text: '#3730A3' }
      default: return { bg: '#F3F4F6', text: '#6B7280' }
    }
  }

  const formatDate = (fecha: string) => {
    const date = new Date(fecha + 'T00:00:00')
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (fecha === today.toISOString().split('T')[0]) {
      return { label: 'Hoy', sublabel: '' }
    } else if (fecha === yesterday.toISOString().split('T')[0]) {
      return { label: 'Ayer', sublabel: '' }
    } else {
      return {
        label: date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
        sublabel: date.toLocaleDateString('es-MX', { year: 'numeric' })
      }
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando citas...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
      `}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              color: '#3730A3',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 16
            }}
          >
            ← Volver
          </button>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#1A1A2E' }}>
            Citas Solicitadas
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
            {citas.length} {citas.length === 1 ? 'cita' : 'citas'} {citas.length === 0 ? 'pendientes' : 'registradas'}
          </p>
        </div>

        {/* Lista de Citas Agrupadas por Fecha */}
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {fechasOrdenadas.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '60px 20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
              <Calendar size={48} color="#9CA3AF" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, color: '#6B7280', fontWeight: 600, marginBottom: 8 }}>No hay citas solicitadas</p>
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>Cuando los pacientes soliciten citas, aparecerán aquí</p>
            </div>
          ) : (
            fechasOrdenadas.map(fecha => {
              const citasDelDia = citasPorFecha[fecha]
              const fechaFormateada = formatDate(fecha)
              const isExpanded = expandedDates.has(fecha)
              const isFutureDate = new Date(fecha + 'T00:00:00') > new Date()

              return (
                <div key={fecha} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #E5E7EB', overflow: 'hidden' }}>
                  {/* Header de Fecha - Clickable */}
                  <div
                    onClick={() => toggleDate(fecha)}
                    style={{
                      background: '#F9FAFB',
                      padding: '16px 20px',
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#F9FAFB'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {isExpanded ? (
                        <ChevronDown size={20} color="#3730A3" />
                      ) : (
                        <ChevronRight size={20} color="#6B7280" />
                      )}
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>
                          {fechaFormateada.label}
                        </p>
                        {fechaFormateada.sublabel && (
                          <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                            {fechaFormateada.sublabel}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        background: isFutureDate ? '#EEF2FF' : '#F3F4F6',
                        color: isFutureDate ? '#3730A3' : '#6B7280',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {citasDelDia.length} {citasDelDia.length === 1 ? 'cita' : 'citas'}
                        {isFutureDate && ' · Futuras'}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Citas del Día */}
                  {isExpanded && (
                    <div style={{ padding: '16px 20px' }}>
                      {citasDelDia.map((cita, index) => {
                        const status = getStatusColor(cita.status)
                        const showReviewButton = canShowReviewButton(cita)
                        const isCitaHoy = fecha === new Date().toISOString().split('T')[0]
                        const isCitaFutura = new Date(fecha + 'T00:00:00') > new Date()

                        return (
                          <div
                            key={cita.id}
                            style={{
                              background: '#fff',
                              borderRadius: 12,
                              padding: '20px',
                              border: '1.5px solid #E5E7EB',
                              marginBottom: index < citasDelDia.length - 1 ? 16 : 0,
                              opacity: cita.status === 'cancelada' ? 0.6 : 1
                            }}
                          >
                            {/* Header de la cita */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #3730A3, #F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff' }}>
                                  {cita.patient_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', margin: '0 0 2px' }}>{cita.patient_name}</p>
                                  <span style={{
                                    display: 'inline-block',
                                    background: status.bg,
                                    color: status.text,
                                    padding: '3px 10px',
                                    borderRadius: 12,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: 'uppercase'
                                  }}>
                                    {cita.status}
                                  </span>
                                  {isCitaFutura && (
                                    <span style={{
                                      display: 'inline-block',
                                      background: '#EEF2FF',
                                      color: '#3730A3',
                                      padding: '3px 10px',
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      marginLeft: 6
                                    }}>
                                      📅 Futura
                                    </span>
                                  )}
                                  {isCitaHoy && !isCitaFutura && (
                                    <span style={{
                                      display: 'inline-block',
                                      background: '#DCFCE7',
                                      color: '#059669',
                                      padding: '3px 10px',
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      marginLeft: 6
                                    }}>
                                      ✓ Hoy
                                    </span>
                                  )}
                                  {cita.review_verified && (
                                    <span style={{
                                      display: 'inline-block',
                                      background: '#DCFCE7',
                                      color: '#059669',
                                      padding: '3px 10px',
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      marginLeft: 6
                                    }}>
                                      ✓ Reseña verificada
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <a
                                  href={getWhatsAppLink(cita.patient_phone, cita.requested_date, cita.requested_time, cita.patient_name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#25D366',
                                    color: '#fff',
                                    borderRadius: 50,
                                    padding: '10px 18px',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    fontFamily: "'DM Sans', sans-serif"
                                  }}
                                >
                                  <MessageCircle size={16} />
                                  WhatsApp
                                </a>
                                {showReviewButton ? (
                                  <button
                                    onClick={() => sendReviewEmail(cita)}
                                    disabled={sendingEmail === cita.id}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      background: sendingEmail === cita.id ? '#9CA3AF' : '#3730A3',
                                      color: '#fff',
                                      borderRadius: 50,
                                      padding: '10px 18px',
                                      fontSize: 13,
                                      fontWeight: 600,
                                      border: 'none',
                                      cursor: sendingEmail === cita.id ? 'not-allowed' : 'pointer',
                                      fontFamily: "'DM Sans', sans-serif",
                                      opacity: sendingEmail === cita.id ? 0.6 : 1
                                    }}
                                  >
                                    <Send size={16} />
                                    {sendingEmail === cita.id ? 'Enviando...' : 'Solicitar reseña'}
                                  </button>
                                ) : (
                                  cita.review_sent && !cita.review_verified && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      background: '#EEF2FF',
                                      color: '#3730A3',
                                      borderRadius: 50,
                                      padding: '10px 18px',
                                      fontSize: 13,
                                      fontWeight: 600,
                                      fontFamily: "'DM Sans', sans-serif"
                                    }}>
                                      ✓ Email enviado
                                    </span>
                                  )
                                )}
                                {!showReviewButton && !cita.review_sent && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#F3F4F6',
                                    color: '#9CA3AF',
                                    borderRadius: 50,
                                    padding: '10px 18px',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    fontFamily: "'DM Sans', sans-serif"
                                  }}>
                                    {isCitaFutura ? '🕐 Esperar cita' : cita.status === 'cancelada' ? 'Cancelada' : 'No disponible'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Detalles de la cita */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '16px 0', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <Clock size={14} color="#6B7280" />
                                  <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, margin: 0 }}>Hora solicitada</p>
                                </div>
                                <p style={{ fontSize: 14, color: '#1A1A2E', fontWeight: 600, margin: 0 }}>{cita.requested_time}</p>
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <MapPin size={14} color="#6B7280" />
                                  <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, margin: 0 }}>Consultorio</p>
                                </div>
                                <p style={{ fontSize: 13, color: '#1A1A2E', margin: 0, lineHeight: 1.5 }}>{cita.clinic_address}</p>
                              </div>
                            </div>

                            {/* Información de contacto */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <User size={14} color="#6B7280" />
                                  <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, margin: 0 }}>Paciente</p>
                                </div>
                                <p style={{ fontSize: 14, color: '#1A1A2E', margin: 0 }}>{cita.patient_name}</p>
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <Phone size={14} color="#6B7280" />
                                  <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, margin: 0 }}>Teléfono</p>
                                </div>
                                <p style={{ fontSize: 14, color: '#1A1A2E', margin: 0 }}>{cita.patient_phone}</p>
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <Mail size={14} color="#6B7280" />
                                  <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, margin: 0 }}>Email</p>
                                </div>
                                <p style={{ fontSize: 14, color: '#1A1A2E', margin: 0 }}>{cita.patient_email}</p>
                              </div>
                              {cita.reason && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <FileText size={14} color="#6B7280" />
                                    <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, margin: 0 }}>Motivo de consulta</p>
                                  </div>
                                  <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>{cita.reason}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}