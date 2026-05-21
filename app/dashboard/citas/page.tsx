'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import {
  ArrowLeft, MessageCircle, Calendar, Phone, Mail, MapPin,
  FileText, Send, CheckCircle, XCircle, Check
} from 'lucide-react'

interface Cita {
  id: string
  patient_name: string
  patient_email: string
  patient_phone: string
  requested_date: string
  requested_time: string
  reason: string | null
  clinic_address: string | null
  status: 'solicitada' | 'confirmada' | 'atendida' | 'cancelada'
  created_at: string
  review_sent: boolean
  review_verified: boolean
}

type Tab = 'todas' | 'solicitada' | 'confirmada' | 'atendida'

export default function CitasPage() {
  const supabase = createClient()
  const router = useRouter()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('todas')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [sendingEmail, setSendingEmail] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const cargarCitas = useCallback(async (docId: string) => {
    const { data } = await supabase
      .from('appointment_requests')
      .select('*')
      .eq('doctor_id', docId)
      .order('requested_date', { ascending: false })
      .order('requested_time', { ascending: true })
    setCitas((data as Cita[]) || [])
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: medico } = await supabase.from('doctors').select('id').eq('email', user.email).single()
      if (!medico) { router.push('/dashboard'); return }
      await cargarCitas(medico.id)
      setLoading(false)
    }
    load()
  }, [router, cargarCitas])

  const cambiarStatus = async (citaId: string, nuevoStatus: Cita['status']) => {
    setProcesando(citaId + nuevoStatus)
    const { error } = await supabase
      .from('appointment_requests')
      .update({ status: nuevoStatus })
      .eq('id', citaId)
    if (error) {
      showToast('Error al actualizar la cita', 'error')
    } else {
      setCitas(prev => prev.map(c => c.id === citaId ? { ...c, status: nuevoStatus } : c))
      const labels: Record<string, string> = {
        confirmada: 'Cita confirmada',
        cancelada: 'Cita cancelada',
        atendida: 'Marcada como atendida',
      }
      showToast(labels[nuevoStatus] || 'Cita actualizada', 'success')
    }
    setProcesando(null)
  }

  const sendReviewEmail = async (cita: Cita) => {
    setSendingEmail(cita.id)
    try {
      const token = crypto.randomUUID()
      // 1. Enviar el email PRIMERO
      const res = await fetch('/api/send-review-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cita.patient_email,
          token,
          doctorName: 'el médico',
          appointmentDate: new Date(cita.requested_date).toLocaleDateString('es-MX'),
        }),
      })
      if (!res.ok) {
        showToast('Error al enviar el email', 'error')
        return
      }
      // 2. Solo si el email fue exitoso, guardar el token en BD
      await supabase.from('appointment_requests').update({ review_sent: true, review_token: token }).eq('id', cita.id)
      setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, review_sent: true } : c))
      showToast('Email de reseña enviado', 'success')
    } catch {
      showToast('Error al enviar el email', 'error')
    } finally {
      setSendingEmail(null)
    }
  }

  const canRequestReview = (cita: Cita) => {
    const citaDate = new Date(cita.requested_date + 'T' + (cita.requested_time || '00:00'))
    const oneDayAfter = new Date(citaDate)
    oneDayAfter.setDate(oneDayAfter.getDate() + 1)
    return new Date() >= oneDayAfter
  }

  const getWhatsAppLink = (phone: string, date: string, time: string, name: string) => {
    const clean = phone.replace(/\D/g, '')
    const msg = `Hola ${name}, te contacto respecto a tu cita del ${date} a las ${time}.`
    return `https://wa.me/52${clean}?text=${encodeURIComponent(msg)}`
  }

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha + 'T00:00:00')
    const hoy = new Date().toISOString().split('T')[0]
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (fecha === hoy) return 'Hoy'
    if (fecha === ayer) return 'Ayer'
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const isFutura = (fecha: string) => new Date(fecha + 'T00:00:00') > new Date()

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    solicitada: { bg: '#FEF3C7', text: '#92400E', label: 'Solicitada' },
    confirmada:  { bg: '#DCFCE7', text: '#059669', label: 'Confirmada' },
    cancelada:   { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelada' },
    atendida:    { bg: '#E0E7FF', text: '#3730A3', label: 'Atendida' },
  }

  const citasFiltradas = tab === 'todas' ? citas : citas.filter(c => c.status === tab)
  const countPorStatus = (s: string) => citas.filter(c => c.status === s).length

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando citas...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease-out; }
        .action-btn { display:inline-flex; align-items:center; gap:6px; border-radius:50px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; border:none; transition:all 0.18s; }
        .action-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .tab-btn { padding:8px 16px; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; border:none; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        @media(max-width:600px) { .cita-header { flex-direction:column !important; } .cita-actions { flex-wrap:wrap !important; } }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: toast.type === 'success' ? '#059669' : '#DC2626', border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <button onClick={() => router.push('/dashboard')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#1E3A5F', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
            <ArrowLeft size={16} /> Volver al panel
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 }}>Mis Citas</h1>
              <p style={{ fontSize: 14, color: '#6B7280' }}>{citas.length} {citas.length === 1 ? 'cita' : 'citas'} en total</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="fade-up" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { id: 'todas',     label: 'Todas',      count: citas.length },
            { id: 'solicitada', label: 'Pendientes', count: countPorStatus('solicitada') },
            { id: 'confirmada', label: 'Confirmadas', count: countPorStatus('confirmada') },
            { id: 'atendida',   label: 'Atendidas',  count: countPorStatus('atendida') },
          ] as { id: Tab; label: string; count: number }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="tab-btn"
              style={{
                background: tab === t.id ? '#1E3A5F' : '#fff',
                color: tab === t.id ? '#fff' : '#6B7280',
                border: `1px solid ${tab === t.id ? '#1E3A5F' : '#E5E7EB'}`,
              }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 6, background: tab === t.id ? 'rgba(255,255,255,0.2)' : '#F3F4F6', borderRadius: 20, padding: '1px 7px', fontSize: 11 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {citasFiltradas.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '60px 20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
              <Calendar size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, marginBottom: 8 }}>
                {tab === 'solicitada' ? 'Sin citas pendientes' : tab === 'confirmada' ? 'Sin citas confirmadas' : tab === 'atendida' ? 'Sin citas atendidas' : 'Aún no tienes citas'}
              </p>
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>
                {tab === 'todas' ? 'Cuando los pacientes soliciten citas, aparecerán aquí' : 'Cambia el filtro de arriba para ver otras citas'}
              </p>
            </div>
          ) : (
            citasFiltradas.map(cita => {
              const sc = statusColors[cita.status] || statusColors.solicitada
              const esProc = (suffix: string) => procesando === cita.id + suffix
              const futura = isFutura(cita.requested_date)
              const puedeReseña = !cita.review_sent && !cita.review_verified && cita.status !== 'cancelada' && canRequestReview(cita)

              return (
                <div key={cita.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '20px', opacity: cita.status === 'cancelada' ? 0.65 : 1 }}>

                  {/* Header cita */}
                  <div className="cita-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                        {cita.patient_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>{cita.patient_name}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ background: sc.bg, color: sc.text, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                            {sc.label}
                          </span>
                          {futura && cita.status !== 'cancelada' && (
                            <span style={{ background: '#EEF2FF', color: '#1E3A5F', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                              Futura
                            </span>
                          )}
                          {cita.review_verified && (
                            <span style={{ background: '#DCFCE7', color: '#059669', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                              ✓ Reseña
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fecha y hora */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{formatFecha(cita.requested_date)}</p>
                      <p style={{ fontSize: 13, color: '#6B7280' }}>{cita.requested_time}</p>
                    </div>
                  </div>

                  {/* Datos contacto */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, padding: '14px 0', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone size={13} color="#9CA3AF" />
                      <a href={`tel:${cita.patient_phone}`} style={{ fontSize: 13, color: '#1A1A2E', textDecoration: 'none' }}>{cita.patient_phone}</a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mail size={13} color="#9CA3AF" />
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{cita.patient_email}</span>
                    </div>
                    {cita.clinic_address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={13} color="#9CA3AF" />
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{cita.clinic_address}</span>
                      </div>
                    )}
                    {cita.reason && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, gridColumn: '1 / -1' }}>
                        <FileText size={13} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{cita.reason}</span>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="cita-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

                    {/* Cita SOLICITADA → Confirmar / Rechazar */}
                    {cita.status === 'solicitada' && (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => cambiarStatus(cita.id, 'confirmada')}
                          disabled={!!esProc('confirmada')}
                          style={{ background: '#DCFCE7', color: '#059669' }}
                        >
                          {esProc('confirmada')
                            ? <span style={{ width: 13, height: 13, border: '2px solid #05966944', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            : <Check size={14} />}
                          Confirmar
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => cambiarStatus(cita.id, 'cancelada')}
                          disabled={!!esProc('cancelada')}
                          style={{ background: '#FEE2E2', color: '#DC2626' }}
                        >
                          {esProc('cancelada')
                            ? <span style={{ width: 13, height: 13, border: '2px solid #DC262644', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            : <XCircle size={14} />}
                          Rechazar
                        </button>
                      </>
                    )}

                    {/* Cita CONFIRMADA → Marcar atendida / Cancelar */}
                    {cita.status === 'confirmada' && (
                      <>
                        <button
                          className="action-btn"
                          onClick={() => cambiarStatus(cita.id, 'atendida')}
                          disabled={!!esProc('atendida')}
                          style={{ background: '#E0E7FF', color: '#3730A3' }}
                        >
                          {esProc('atendida')
                            ? <span style={{ width: 13, height: 13, border: '2px solid #3730A344', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            : <CheckCircle size={14} />}
                          Marcar atendida
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => cambiarStatus(cita.id, 'cancelada')}
                          disabled={!!esProc('cancelada')}
                          style={{ background: '#FEE2E2', color: '#DC2626' }}
                        >
                          {esProc('cancelada')
                            ? <span style={{ width: 13, height: 13, border: '2px solid #DC262644', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            : <XCircle size={14} />}
                          Cancelar
                        </button>
                      </>
                    )}

                    {/* WhatsApp siempre disponible (excepto canceladas) */}
                    {cita.status !== 'cancelada' && (
                      <a
                        href={getWhatsAppLink(cita.patient_phone, cita.requested_date, cita.requested_time, cita.patient_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 50, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                      >
                        <MessageCircle size={14} />
                        WhatsApp
                      </a>
                    )}

                    {/* Solicitar reseña para citas pasadas */}
                    {puedeReseña && (
                      <button
                        className="action-btn"
                        onClick={() => sendReviewEmail(cita)}
                        disabled={sendingEmail === cita.id}
                        style={{ background: '#F5F3FF', color: '#8B5CF6' }}
                      >
                        {sendingEmail === cita.id
                          ? <span style={{ width: 13, height: 13, border: '2px solid #8B5CF644', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          : <Send size={14} />}
                        {sendingEmail === cita.id ? 'Enviando...' : 'Pedir reseña'}
                      </button>
                    )}

                    {cita.review_sent && !cita.review_verified && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F3F4F6', color: '#9CA3AF', borderRadius: 50, padding: '8px 14px', fontSize: 12, fontWeight: 500 }}>
                        ✓ Reseña solicitada
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
