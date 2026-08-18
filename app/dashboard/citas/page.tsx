'use client'
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { Calendar, X, CheckCircle, XCircle } from 'lucide-react'
import CitaCard from '@/components/citas/CitaCard'
import CalendarioMensual from '@/components/citas/CalendarioMensual'
import { Cita, MedicoData } from '@/lib/citas/types'
import { formatFecha } from '@/lib/citas/fechas'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'

type Tab = 'todas' | 'pending_verification' | 'confirmed' | 'completed' | 'cancelled'

const citaWord = (n: number) => n === 1 ? 'cita' : 'citas'

export default function CitasPage() {
  const router = useRouter()
  const [citas, setCitas] = useState<Cita[]>([])
  const [medico, setMedico] = useState<MedicoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<PageErrorType | null>(null)
  const cancelRef = useRef(false)
  const initialCheckDoneRef = useRef(false)
  const [tab, setTab] = useState<Tab>('todas')
  const [procesando, setProcesando] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [rechazando, setRechazando] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [enviandoRechazo, setEnviandoRechazo] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const listaRef = useRef<HTMLDivElement>(null)
  const [listaMaxHeight, setListaMaxHeight] = useState<number | null>(null)

  // Mismo patrón que DoctorProfileClient.tsx — misma página, sin ruta aparte.
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Alto disponible medido en vivo (no un número fijo adivinado): el
  // calendario y la lista deben caber en pantalla sin scroll de página, y la
  // altura del encabezado de arriba (tabs, nombre del médico, etc.) puede
  // variar. Se mide la posición real de la lista y se le resta a la altura
  // de la ventana, dejando un margen chico abajo.
  useLayoutEffect(() => {
    if (isMobile) return
    function medir() {
      if (!listaRef.current) return
      const top = listaRef.current.getBoundingClientRect().top
      setListaMaxHeight(Math.max(200, window.innerHeight - top - 24))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [isMobile, tab, selectedDate, citas.length])

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const cargarCitas = useCallback(async (docId: string) => {
    const { data, error } = await supabase
      .from('citas')
      .select('*')
      .eq('medico_id', docId)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: true })
    if (error) throw error
    setCitas((data as Cita[]) || [])
  }, [])

  // Expuesta con useCallback (no solo dentro del useEffect) para que el
  // botón "Reintentar" del estado de error pueda volver a llamarla.
  const load = useCallback(async () => {
    cancelRef.current = false
    setLoading(true)
    setLoadError(null)
    const { user, networkError } = await getUserSafe(supabase)
    initialCheckDoneRef.current = true
    if (networkError) { if (!cancelRef.current) { setLoadError('network'); setLoading(false) }; return }
    if (!user) { router.push('/login'); return }

    try {
      const { data: medicoData, error: medicoErr } = await supabase
        .from('doctors')
        .select('id, full_name, specialty, clinic_lat, clinic_lng, clinic_phone')
        .eq('user_id', user.id)
        .single()
      if (medicoErr) throw medicoErr

      if (!medicoData) { router.push('/dashboard'); return }

      if (cancelRef.current) return
      setMedico(medicoData)
      await cargarCitas(medicoData.id)
      if (!cancelRef.current) setLoading(false)
    } catch (err) {
      if (!cancelRef.current) { setLoadError(classifyError(err)); setLoading(false) }
    }
  }, [router, cargarCitas])

  useEffect(() => {
    // Ignora el evento INITIAL_SESSION con session=null que puede llegar
    // mientras el cliente todavía está leyendo la cookie (justo después de
    // navegar aquí) — mismo criterio que app/dashboard/page.tsx, para no
    // rebotar a /login por una sesión válida que solo tardó en confirmarse.
    initialCheckDoneRef.current = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!initialCheckDoneRef.current) return
      if (!session) router.push('/login')
    })

    load()

    return () => { cancelRef.current = true; subscription.unsubscribe() }
  }, [load])

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

  const confirmarRechazo = async (citaId: string) => {
    const motivo = motivoRechazo.trim()
    if (!motivo || enviandoRechazo) return

    setEnviandoRechazo(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      showToast('Error al rechazar la cita', 'error')
      setEnviandoRechazo(false)
      return
    }

    try {
      const res = await fetch('/api/citas/rechazar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ citaId, motivo }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showToast(data?.error || 'Error al rechazar la cita', 'error')
        return
      }

      setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado: 'cancelled', rejection_reason: motivo } : c))
      setRechazando(null)
      setMotivoRechazo('')
      showToast('Cita rechazada', 'success')
    } catch {
      showToast('Error al rechazar la cita', 'error')
    } finally {
      setEnviandoRechazo(false)
    }
  }

  // Sin fecha seleccionada: el tab de estado manda, como antes. Con fecha
  // seleccionada (clic en el calendario): manda la fecha, se ven todos los
  // estados de ese día — es más útil ver "qué tengo el día X" completo que
  // cruzarlo con el tab activo.
  const esCancelada = (c: Cita) => c.estado === 'cancelled' || c.estado === 'cancelada_paciente'

  const citasFiltradas = selectedDate
    ? citas.filter(c => c.fecha === selectedDate)
    : tab === 'todas' ? citas
    : tab === 'cancelled' ? citas.filter(esCancelada)
    : citas.filter(c => c.estado === tab)
  const countPorEstado = (s: string) => citas.filter(c => c.estado === s).length
  const countCanceladas = citas.filter(esCancelada).length

  const gruposPorFecha = useMemo(() => {
    const mapa = new Map<string, Cita[]>()
    for (const cita of citasFiltradas) {
      const grupo = mapa.get(cita.fecha)
      if (grupo) grupo.push(cita)
      else mapa.set(cita.fecha, [cita])
    }
    return Array.from(mapa.entries())
  }, [citasFiltradas])

  const listaCitas = citasFiltradas.length === 0 ? (
    <div style={{ background: '#fff', borderRadius: 16, padding: '60px 20px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
      <Calendar size={48} color="#D1D5DB" aria-hidden="true" style={{ margin: '0 auto 16px' }} />
      <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, marginBottom: 8 }}>
        {selectedDate ? 'Sin citas ese día' : tab === 'pending_verification' ? 'Sin citas pendientes' : tab === 'confirmed' ? 'Sin citas confirmadas' : tab === 'completed' ? 'Sin citas completadas' : tab === 'cancelled' ? 'Sin citas canceladas' : 'Aún no tienes citas'}
      </p>
      <p style={{ fontSize: 14, color: '#6B7280' }}>
        {selectedDate ? 'Elige otro día en el calendario.' : tab === 'todas' ? 'Cuando los pacientes soliciten citas, aparecerán aquí' : 'Cambia el filtro de arriba para ver otras citas'}
      </p>
    </div>
  ) : isMobile ? (
    // Vista de agenda: agrupada por fecha con encabezado, en vez de la
    // cuadrícula de calendario (que no cabe bien en una pantalla chica).
    gruposPorFecha.map(([fecha, citasDelDia]) => (
      <div key={fecha}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '8px 0 10px' }}>
          {formatFecha(fecha)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {citasDelDia.map(cita => (
            <CitaCard
              key={cita.id}
              cita={cita}
              medico={medico}
              procesando={procesando}
              rechazando={rechazando}
              motivoRechazo={motivoRechazo}
              enviandoRechazo={enviandoRechazo}
              setRechazando={setRechazando}
              setMotivoRechazo={setMotivoRechazo}
              cambiarEstado={cambiarEstado}
              confirmarRechazo={confirmarRechazo}
            />
          ))}
        </div>
      </div>
    ))
  ) : (
    citasFiltradas.map(cita => (
      <CitaCard
        key={cita.id}
        cita={cita}
        medico={medico}
        procesando={procesando}
        rechazando={rechazando}
        motivoRechazo={motivoRechazo}
        enviandoRechazo={enviandoRechazo}
        setRechazando={setRechazando}
        setMotivoRechazo={setMotivoRechazo}
        cambiarEstado={cambiarEstado}
        confirmarRechazo={confirmarRechazo}
      />
    ))
  )

  const chipFecha = selectedDate && (
    <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 13, color: '#6B7280' }}>
        Mostrando citas del <strong style={{ color: '#111827' }}>{formatFecha(selectedDate)}</strong>
      </span>
      <button
        onClick={() => setSelectedDate(null)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 50, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        <X size={12} aria-hidden="true" /> Ver todas las fechas
      </button>
    </div>
  )

  if (loadError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <PageErrorState type={loadError} onRetry={load} />
    </div>
  )

  if (loading) return <CitasSkeleton isMobile={isMobile} />

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
        <div
          role="status"
          aria-live="polite"
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: toast.type === 'success' ? '#059669' : '#DC2626', border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          {toast.type === 'success' ? <CheckCircle size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Mis Citas</h1>
              <p style={{ fontSize: 14, color: '#6B7280' }}>{citas.length} {citas.length === 1 ? 'cita' : 'citas'} en total</p>
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="fade-up" style={{ marginBottom: 20 }}>
            <button
              onClick={() => { setTab('todas'); setSelectedDate(null) }}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: tab === 'todas' ? '#1E3A5F' : '#fff',
                color: tab === 'todas' ? '#fff' : '#111827',
                border: `1.5px solid ${tab === 'todas' ? '#1E3A5F' : '#E5E7EB'}`,
                borderRadius: 14, padding: '14px 16px', marginBottom: 8, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700 }}>Todas</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{citas.length} {citaWord(citas.length)}</span>
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { id: 'pending_verification', label: 'Pendientes', count: countPorEstado('pending_verification') },
                { id: 'confirmed', label: 'Confirmadas', count: countPorEstado('confirmed') },
                { id: 'completed', label: 'Completadas', count: countPorEstado('completed') },
                { id: 'cancelled', label: 'Canceladas', count: countCanceladas },
              ] as { id: Tab; label: string; count: number }[]).map(f => (
                <button
                  key={f.id}
                  onClick={() => { setTab(f.id); setSelectedDate(null) }}
                  style={{
                    textAlign: 'left',
                    background: tab === f.id ? '#1E3A5F' : '#fff',
                    color: tab === f.id ? '#fff' : '#111827',
                    border: `1.5px solid ${tab === f.id ? '#1E3A5F' : '#E5E7EB'}`,
                    borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{f.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{f.count} {citaWord(f.count)}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="fade-up" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {([
              { id: 'todas', label: 'Todas', count: citas.length },
              { id: 'pending_verification', label: 'Pendientes', count: countPorEstado('pending_verification') },
              { id: 'confirmed', label: 'Confirmadas', count: countPorEstado('confirmed') },
              { id: 'completed', label: 'Completadas', count: countPorEstado('completed') },
              { id: 'cancelled', label: 'Canceladas', count: countCanceladas },
            ] as { id: Tab; label: string; count: number }[]).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSelectedDate(null) }}
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
        )}

        {isMobile ? (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chipFecha}
            {listaCitas}
          </div>
        ) : (
          <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 20, alignItems: 'start' }}>
            <div style={{ position: 'sticky', top: 20 }}>
              <CalendarioMensual citas={citas} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </div>
            <div
              ref={listaRef}
              style={{
                display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0,
                maxHeight: listaMaxHeight ? `${listaMaxHeight}px` : undefined,
                overflowY: 'auto', paddingRight: 4,
              }}
            >
              {chipFecha}
              {listaCitas}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Skeleton de Citas — encabezado, tabs, y calendario + lista (o lista sola
// en móvil, donde el calendario se reemplaza por una vista de agenda) para
// que la carga no cambie de layout entre el skeleton y los datos reales.
function CitasSkeleton({ isMobile }: { isMobile: boolean }) {
  const tarjetaCita = (i: number) => (
    <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Skeleton width={44} height={44} radius={999} style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton width={140} height={16} />
          <Skeleton width={80} height={14} radius={12} />
        </div>
      </div>
      <Skeleton width="100%" height={1} style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton width={100} height={30} radius={50} />
        <Skeleton width={100} height={30} radius={50} />
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif" }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando tus citas…
      </span>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <Skeleton width={160} height={28} style={{ marginBottom: 8 }} />
          <Skeleton width={110} height={16} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[90, 110, 110, 110, 110].map((w, i) => (
            <Skeleton key={i} width={w} height={34} radius={50} />
          ))}
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map(tarjetaCita)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 20, alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <Skeleton width={150} height={20} />
                <Skeleton width={60} height={24} radius={50} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {Array.from({ length: 35 }, (_, i) => (
                  <Skeleton key={i} width="100%" height={40} radius={10} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2].map(tarjetaCita)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}