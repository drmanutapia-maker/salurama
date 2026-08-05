'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import {
  ArrowLeft, MessageCircle, Calendar, Phone, Mail, MapPin,
  FileText, Send, CheckCircle, XCircle, Check
} from 'lucide-react'
import ConversacionesLista, { ConversacionResumen } from '@/components/chat/ConversacionesLista'
import ConversacionChat from '@/components/chat/ConversacionChat'

interface Cita {
  id: string
  paciente_nombre: string
  paciente_email: string
  paciente_telefono: string
  fecha: string
  hora: string
  motivo: string | null
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
  review_token?: string | null
}

interface MedicoData {
  id: string
  full_name: string
  specialty: string
  clinic_lat: number | null
  clinic_lng: number | null
  clinic_phone: string | null
}

type Tab = 'todas' | 'pending_verification' | 'confirmed' | 'completed' | 'mensajes'

export default function CitasPage() {
  const router = useRouter()
  const [citas, setCitas] = useState<Cita[]>([])
  const [medico, setMedico] = useState<MedicoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<Tab>('todas')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState<ConversacionResumen | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const cargarCitas = useCallback(async (docId: string) => {
    const { data } = await supabase
      .from('citas')
      .select('*')
      .eq('medico_id', docId)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: true })
    setCitas((data as Cita[]) || [])
  }, [])

  useEffect(() => {
    async function load() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError) { setLoadError(true); setLoading(false); return }
      if (!user) { await supabase.auth.signOut(); router.push('/login'); return }
      
      const { data: medicoData } = await supabase
        .from('doctors')
        .select('id, full_name, specialty, clinic_lat, clinic_lng, clinic_phone')
        .eq('user_id', user.id)
        .single()
      
      if (!medicoData) { router.push('/dashboard'); return }
      
      setMedico(medicoData)
      await cargarCitas(medicoData.id)
      setLoading(false)
    }
    load()
  }, [router, cargarCitas])

  const cambiarEstado = async (citaId: string, nuevoEstado: Cita['estado']) => {
    // Validar: no permitir completar citas futuras
    if (nuevoEstado === 'completed') {
      const cita = citas.find(c => c.id === citaId)
      if (cita && new Date(cita.fecha + 'T00:00') > new Date()) {
        showToast('No puedes completar una cita futura', 'error')
        return
      }
    }

    setProcesando(citaId + nuevoEstado)
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', citaId)
    if (error) {
      showToast('Error al actualizar la cita', 'error')
      setProcesando(null)
      return
    }
    
    setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado: nuevoEstado } : c))
    const labels: Record<string, string> = {
      confirmed: 'Cita confirmada',
      cancelled: 'Cita cancelada',
      completed: 'Marcada como completada',
    }
    showToast(labels[nuevoEstado] || 'Cita actualizada', 'success')
    setProcesando(null)

    // Si se confirmó manualmente, disparar el link de chat (idempotente en el servidor)
    if (nuevoEstado === 'confirmed') {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        fetch('/api/citas/enviar-link-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ citaId }),
        }).catch(console.error)
      }
    }

    // Si se marcó como completada, enviar email de reseña (solo si no tiene token previo)
    if (nuevoEstado === 'completed') {
      const cita = citas.find(c => c.id === citaId)
      if (cita?.paciente_email && !cita.review_token) {
        const reviewToken = crypto.randomUUID()
        
        await supabase.from('citas').update({ 
          review_token: reviewToken, 
          review_sent_at: new Date().toISOString() 
        }).eq('id', citaId)
        
        // Actualizar el estado local para que no se envíe dos veces
        setCitas(prev => prev.map(c => c.id === citaId ? { ...c, review_token: reviewToken } : c))
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          fetch('/api/send-review-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: cita.paciente_email,
              token: reviewToken,
              doctorName: medico?.full_name || 'tu médico',
            }),
          }).catch(console.error)
        }
      }
    }
  }

  const getWhatsAppLink = (phone: string, fecha: string, hora: string, nombre: string) => {
    const clean = phone.replace(/\D/g, '')
    const d = new Date(fecha + 'T00:00:00')
    const fechaFormateada = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    
    const nombreMedico = medico?.full_name || 'el médico'
    
    // Convertir especialidad a profesión
    const esp = medico?.specialty?.toLowerCase() || ''
    let profesion = ''
    
    if (esp.includes('alergolog')) profesion = 'alergólogo'
    else if (esp.includes('anestesiolog')) profesion = 'anestesiólogo'
    else if (esp.includes('angiolog')) profesion = 'angiólogo'
    else if (esp.includes('cardiolog')) profesion = 'cardiólogo'
    else if (esp.includes('cirug')) profesion = 'cirujano'
    else if (esp.includes('dermatolog')) profesion = 'dermatólogo'
    else if (esp.includes('endocrinolog')) profesion = 'endocrinólogo'
    else if (esp.includes('gastroenterolog')) profesion = 'gastroenterólogo'
    else if (esp.includes('geriatr')) profesion = 'geriatra'
    else if (esp.includes('hematolog')) profesion = 'hematólogo'
    else if (esp.includes('infectolog')) profesion = 'infectólogo'
    else if (esp.includes('medicina crítica')) profesion = 'intensivista'
    else if (esp.includes('medicina familiar')) profesion = 'médico familiar'
    else if (esp.includes('medicina física')) profesion = 'médico de rehabilitación'
    else if (esp.includes('medicina interna')) profesion = 'internista'
    else if (esp.includes('medicina general')) profesion = 'médico general'
    else if (esp.includes('nefrolog')) profesion = 'nefrólogo'
    else if (esp.includes('neonatolog')) profesion = 'neonatólogo'
    else if (esp.includes('neumolog')) profesion = 'neumólogo'
    else if (esp.includes('neurocirug')) profesion = 'neurocirujano'
    else if (esp.includes('neurolog')) profesion = 'neurólogo'
    else if (esp.includes('nutric')) profesion = 'nutriólogo'
    else if (esp.includes('oncolog')) profesion = 'oncólogo'
    else if (esp.includes('oftalmolog')) profesion = 'oftalmólogo'
    else if (esp.includes('ortopedia') || esp.includes('traumatolog')) profesion = 'traumatólogo'
    else if (esp.includes('otorrinolaringolog')) profesion = 'otorrinolaringólogo'
    else if (esp.includes('patolog')) profesion = 'patólogo'
    else if (esp.includes('pediatr')) profesion = 'pediatra'
    else if (esp.includes('psiquiatr')) profesion = 'psiquiatra'
    else if (esp.includes('radiolog')) profesion = 'radiólogo'
    else if (esp.includes('reumatolog')) profesion = 'reumatólogo'
    else if (esp.includes('urolog')) profesion = 'urólogo'
    else if (esp.includes('ginecolog') || esp.includes('obstetric')) profesion = 'ginecólogo'
    else profesion = medico?.specialty || ''
    
    let msg = `Hola ${nombre}, soy el Dr. ${nombreMedico}`
    if (profesion) msg += `, ${profesion}`
    msg += `.%0ATe espero en tu cita el ${fechaFormateada} a las ${hora?.slice(0, 5)}.`
    
    if (medico?.clinic_lat && medico?.clinic_lng) {
      msg += `%0A📍 Cómo llegar: https://maps.google.com/?q=${medico.clinic_lat},${medico.clinic_lng}`
    }
    
    msg += `%0A¿Tienes alguna duda? Confírmame por favor.`
    
    return `https://wa.me/52${clean}?text=${msg}`
  }

  const formatFecha = (fechaStr: string) => {
    const d = new Date(fechaStr + 'T00:00:00')
    const hoy = new Date().toISOString().split('T')[0]
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (fechaStr === hoy) return 'Hoy'
    if (fechaStr === ayer) return 'Ayer'
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const isFutura = (fechaStr: string) => new Date(fechaStr + 'T00:00') > new Date()

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending_verification: { bg: '#FEF3C7', text: '#92400E', label: 'Pendiente' },
    confirmed: { bg: '#DCFCE7', text: '#059669', label: 'Confirmada' },
    cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelada' },
    completed: { bg: '#E0E7FF', text: '#3730A3', label: 'Completada' },
  }

  const citasFiltradas = tab === 'todas' ? citas : citas.filter(c => c.estado === tab)
  const countPorEstado = (s: string) => citas.filter(c => c.estado === s).length

  if (loadError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ color: '#111827', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No se pudo conectar</p>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 16 }}>Revisa tu conexión a internet e inténtalo de nuevo.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )

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
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease-out; }
        .action-btn { display:inline-flex; align-items:center; gap:6px; border-radius:50px; padding:8px 14px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; border:none; transition:all 0.18s; }
        .action-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .tab-btn { padding:8px 16px; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; border:none; font-family:'DM Sans',sans-serif; transition:all 0.18s; }
        @media(max-width:600px) {.cita-header { flex-direction:column!important; }.cita-actions { flex-wrap:wrap!important; } }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: toast.type === 'success' ? '#059669' : '#DC2626', border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Mis Citas</h1>
              <p style={{ fontSize: 14, color: '#6B7280' }}>{citas.length} {citas.length === 1 ? 'cita' : 'citas'} en total</p>
            </div>
          </div>
        </div>

        <div className="fade-up" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { id: 'todas', label: 'Todas', count: citas.length },
            { id: 'pending_verification', label: 'Pendientes', count: countPorEstado('pending_verification') },
            { id: 'confirmed', label: 'Confirmadas', count: countPorEstado('confirmed') },
            { id: 'completed', label: 'Completadas', count: countPorEstado('completed') },
            { id: 'mensajes', label: 'Mensajes', count: 0 },
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

        {tab === 'mensajes' ? (
          <div className="fade-up">
            {conversacionSeleccionada ? (
              <ConversacionChat
                conversacion={conversacionSeleccionada}
                onVolver={() => setConversacionSeleccionada(null)}
                onError={(msg) => showToast(msg, 'error')}
              />
            ) : (
              <ConversacionesLista medicoId={medico!.id} onSeleccionar={setConversacionSeleccionada} />
            )}
          </div>
        ) : (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {citasFiltradas.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '60px 20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
              <Calendar size={48} color="#D1D5DB" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, marginBottom: 8 }}>
                {tab === 'pending_verification' ? 'Sin citas pendientes' : tab === 'confirmed' ? 'Sin citas confirmadas' : tab === 'completed' ? 'Sin citas completadas' : 'Aún no tienes citas'}
              </p>
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>
                {tab === 'todas' ? 'Cuando los pacientes soliciten citas, aparecerán aquí' : 'Cambia el filtro de arriba para ver otras citas'}
              </p>
            </div>
          ) : (
            citasFiltradas.map(cita => {
              const sc = statusColors[cita.estado] || statusColors.pending_verification
              const esProc = (suffix: string) => procesando === cita.id + suffix
              const futura = isFutura(cita.fecha)
              const horaMostrada = cita.hora?.slice(0, 5) || ''

              return (
                <div key={cita.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '20px', opacity: cita.estado === 'cancelled' ? 0.65 : 1 }}>
                  <div className="cita-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
                        {cita.paciente_nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{cita.paciente_nombre}</p>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ background: sc.bg, color: sc.text, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                            {sc.label}
                          </span>
                          {futura && cita.estado !== 'cancelled' && (
                            <span style={{ background: '#EEF2FF', color: '#1E3A5F', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                              Futura
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{formatFecha(cita.fecha)}</p>
                      <p style={{ fontSize: 13, color: '#6B7280' }}>{horaMostrada}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, padding: '14px 0', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
                    {cita.paciente_telefono && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={13} color="#9CA3AF" />
                        <a href={`tel:${cita.paciente_telefono}`} style={{ fontSize: 13, color: '#111827', textDecoration: 'none' }}>{cita.paciente_telefono}</a>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mail size={13} color="#9CA3AF" />
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{cita.paciente_email}</span>
                    </div>
                    {cita.motivo && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, gridColumn: '1 / -1' }}>
                        <FileText size={13} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{cita.motivo}</span>
                      </div>
                    )}
                  </div>
                  <div className="cita-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {cita.estado === 'pending_verification' && (
                      <>
                        <button className="action-btn" onClick={() => cambiarEstado(cita.id, 'confirmed')} disabled={!!esProc('confirmed')} style={{ background: '#DCFCE7', color: '#059669' }}>
                          {esProc('confirmed') ? <span style={{ width: 13, height: 13, border: '2px solid #05966944', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Check size={14} />}
                          Confirmar
                        </button>
                        <button className="action-btn" onClick={() => cambiarEstado(cita.id, 'cancelled')} disabled={!!esProc('cancelled')} style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          {esProc('cancelled') ? <span style={{ width: 13, height: 13, border: '2px solid #DC262644', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <XCircle size={14} />}
                          Rechazar
                        </button>
                      </>
                    )}
                    {cita.estado === 'confirmed' && (
                      <>
                        <button className="action-btn" onClick={() => cambiarEstado(cita.id, 'completed')} disabled={!!esProc('completed')} style={{ background: '#E0E7FF', color: '#3730A3' }}>
                          {esProc('completed') ? <span style={{ width: 13, height: 13, border: '2px solid #3730A344', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <CheckCircle size={14} />}
                          Marcar completada
                        </button>
                        <button className="action-btn" onClick={() => cambiarEstado(cita.id, 'cancelled')} disabled={!!esProc('cancelled')} style={{ background: '#FEE2E2', color: '#DC2626' }}>
                          {esProc('cancelled') ? <span style={{ width: 13, height: 13, border: '2px solid #DC262644', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <XCircle size={14} />}
                          Cancelar
                        </button>
                      </>
                    )}
                    {cita.estado !== 'cancelled' && cita.paciente_telefono && (
                      <a href={getWhatsAppLink(cita.paciente_telefono, cita.fecha, cita.hora, cita.paciente_nombre)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 50, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <MessageCircle size={14} />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
        )}
      </div>
    </div>
  )
}