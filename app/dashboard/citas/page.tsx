'use client'
import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { Calendar, X, CheckCircle, XCircle } from 'lucide-react'
import InstalarAppBanner from '@/components/InstalarAppBanner'
import { useInstalarAppElegibilidad } from '@/hooks/useInstalarAppElegibilidad'
import PacienteCard, { construirPacienteCard, chatActivoParaGrupo, type GrupoPaciente, type DeshacerInfo } from '@/components/citas/PacienteCard'
import ConfirmarUnionModal, { type GrupoComparable } from '@/components/citas/ConfirmarUnionModal'
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
  // Decisiones de "unir pacientes" ya guardadas -- clave que se absorbe ->
  // { id de la fila (para poder deshacer), clave que sobrevive, cuándo se
  // unió (para la notita "Unida con... el...") }. Ver doctor_patient_merges
  // (no toca `citas` ni la tabla global `pacientes`, ver migración).
  const [fusiones, setFusiones] = useState<Map<string, { id: string; claveDestino: string; createdAt: string }>>(new Map())
  // Ventana de comparación+confirmación antes de unir (nunca un clic único)
  // -- null cuando está cerrada.
  const [confirmandoUnion, setConfirmandoUnion] = useState<{ origen: GrupoComparable; destino: GrupoComparable } | null>(null)
  const [uniendoModal, setUniendoModal] = useState(false)
  const [deshaciendoId, setDeshaciendoId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [mostrarInstalarBanner, setMostrarInstalarBanner] = useState(false)
  const { modo: modoInstalarApp, deferredPrompt: deferredInstalarApp } = useInstalarAppElegibilidad()

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

  const cargarFusiones = useCallback(async (docId: string) => {
    const { data, error } = await supabase
      .from('doctor_patient_merges')
      .select('id, clave_origen, clave_destino, created_at')
      .eq('medico_id', docId)
    if (error) throw error
    setFusiones(new Map((data || []).map(f => [f.clave_origen, { id: f.id, claveDestino: f.clave_destino, createdAt: f.created_at }])))
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
        .select('id, full_name, specialty, clinic_lat, clinic_lng, clinic_phone, pwa_banner_shown')
        .eq('user_id', user.id)
        .single()
      if (medicoErr) throw medicoErr

      if (!medicoData) { router.push('/dashboard'); return }

      if (cancelRef.current) return
      setUserId(user.id)
      setMedico(medicoData)
      await Promise.all([cargarCitas(medicoData.id), cargarFusiones(medicoData.id)])
      if (!cancelRef.current) setLoading(false)
    } catch (err) {
      if (!cancelRef.current) { setLoadError(classifyError(err)); setLoading(false) }
    }
  }, [router, cargarCitas, cargarFusiones])

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

    // Invitación a instalar la app -- una sola vez en la vida de la cuenta,
    // justo tras la primera cita que el médico confirma (ver InstalarAppBanner).
    if (nuevoEstado === 'confirmed' && medico?.pwa_banner_shown === false) {
      setMostrarInstalarBanner(true)
    }

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

  // Resuelve una clave cruda (paciente_id o "email:...") a través de las
  // fusiones ya guardadas -- si A se unió a B y luego B se unió a C, una
  // cita con clave A debe terminar agrupada bajo C. El set `visitados` es
  // solo defensivo (nunca debería haber ciclos, pero si los hubiera por
  // algún dato corrupto, esto no se cuelga).
  const resolverClave = useCallback((claveCruda: string): string => {
    let clave = claveCruda
    const visitados = new Set<string>()
    while (fusiones.has(clave) && !visitados.has(clave)) {
      visitados.add(clave)
      clave = fusiones.get(clave)!.claveDestino
    }
    return clave
  }, [fusiones])

  // Mismo criterio que normalizar_telefono() en la base de datos
  // (supabase/migrations/20260820000001) -- así "misma persona" se evalúa
  // igual en cliente y en DB. Deliberadamente NO recorta un 1 inicial en
  // números de 11 dígitos (podría ser un número real de EE.UU./Canadá) --
  // ver el comentario de esa migración.
  const normalizarTelefono = (raw: string | null | undefined): string | null => {
    if (!raw) return null
    let v = raw.replace(/\D/g, '')
    if (v.length === 12 && v.startsWith('52')) v = v.slice(-10)
    else if (v.length === 13 && v.startsWith('521')) v = v.slice(-10)
    else if (v.length === 13 && (v.startsWith('044') || v.startsWith('045'))) v = v.slice(-10)
    return v.length === 10 ? v : null
  }

  // Todas las citas del médico agrupadas por su clave CRUDA (sin resolver
  // fusiones) -- da el nombre/historial ORIGINAL de un paciente ya
  // absorbido, para la notita "Unida con [nombre] el [fecha]" y el lado
  // "origen" del comparador antes de unir.
  const gruposCrudosPorClave = useMemo(() => {
    const mapa = new Map<string, GrupoPaciente>()
    for (const cita of citas) {
      const claveCruda = cita.paciente_id || `email:${cita.paciente_email.trim().toLowerCase()}`
      let g = mapa.get(claveCruda)
      if (!g) { g = { clave: claveCruda, pacienteNombre: cita.paciente_nombre, citas: [] }; mapa.set(claveCruda, g) }
      g.citas.push(cita)
    }
    return mapa
  }, [citas])

  // Todas las citas del médico agrupadas por paciente, ya resolviendo las
  // fusiones -- a diferencia de gruposPorPaciente (más abajo), NO se filtra
  // por el tab activo. Es la fuente de verdad para todo lo que debe
  // reflejar "todas las citas de este paciente" sin importar qué pestaña
  // esté abierta: el estado del chat, las sugerencias de "misma persona", y
  // los dos lados del comparador al unir.
  const gruposResueltosPorClave = useMemo(() => {
    const mapa = new Map<string, GrupoPaciente>()
    for (const cita of citas) {
      const claveCruda = cita.paciente_id || `email:${cita.paciente_email.trim().toLowerCase()}`
      const clave = resolverClave(claveCruda)
      let g = mapa.get(clave)
      if (!g) { g = { clave, pacienteNombre: cita.paciente_nombre, citas: [] }; mapa.set(clave, g) }
      g.citas.push(cita)
    }
    return mapa
  }, [citas, resolverClave])

  // Estado real del canal de chat por paciente -- ver chatActivoParaGrupo()
  // en PacienteCard.tsx. Sobre TODAS sus citas, no las del tab activo: es
  // un hecho del paciente, no debería cambiar según el filtro abierto.
  const chatActivoPorClave = useMemo(() => {
    const mapa = new Map<string, boolean>()
    for (const [clave, grupo] of gruposResueltosPorClave) mapa.set(clave, chatActivoParaGrupo(grupo.citas))
    return mapa
  }, [gruposResueltosPorClave])

  // Sugerencias de "¿es la misma persona?" -- se calculan sobre TODAS las
  // citas del médico (no solo las filtradas por el tab activo), para que la
  // sugerencia no dependa de qué pestaña esté abierta. Compara cada par de
  // tarjetas ya agrupadas (después de aplicar las fusiones existentes) y
  // marca sospecha cuando comparten teléfono o correo normalizado pero
  // quedaron en tarjetas distintas -- si compartieran ambos, la agrupación
  // normal ya las habría unido solas. Cada tarjeta recibe como máximo una
  // sugerencia, para no saturar.
  const sugerenciasPorClave = useMemo(() => {
    const grupos = Array.from(gruposResueltosPorClave.values()).map(g => ({
      clave: g.clave,
      pacienteNombre: g.pacienteNombre,
      emails: new Set(g.citas.map(c => c.paciente_email.trim().toLowerCase())),
      telefonos: new Set(g.citas.map(c => normalizarTelefono(c.paciente_telefono)).filter((t): t is string => !!t)),
    }))
    const sugerencias = new Map<string, { clave: string; nombre: string }>()
    for (let i = 0; i < grupos.length; i++) {
      if (sugerencias.has(grupos[i].clave)) continue
      for (let j = i + 1; j < grupos.length; j++) {
        if (sugerencias.has(grupos[j].clave)) continue
        const a = grupos[i], b = grupos[j]
        const compartenTelefono = [...a.telefonos].some(t => b.telefonos.has(t))
        const compartenEmail = [...a.emails].some(e => b.emails.has(e))
        if (compartenTelefono || compartenEmail) {
          sugerencias.set(a.clave, { clave: b.clave, nombre: b.pacienteNombre })
          sugerencias.set(b.clave, { clave: a.clave, nombre: a.pacienteNombre })
          break
        }
      }
    }
    return sugerencias
  }, [gruposResueltosPorClave])

  // Fusiones ya confirmadas, indexadas por su clave FINAL (siguiendo la
  // cadena) -- para la notita "Unida con [nombre] el [fecha]" en la tarjeta
  // sobreviviente. Puede haber más de una por tarjeta.
  const deshacerPorClave = useMemo(() => {
    const mapa = new Map<string, DeshacerInfo[]>()
    for (const [claveOrigen, info] of fusiones) {
      const claveFinal = resolverClave(info.claveDestino)
      const nombreOrigen = gruposCrudosPorClave.get(claveOrigen)?.pacienteNombre || claveOrigen
      const lista = mapa.get(claveFinal) || []
      lista.push({ fusionId: info.id, nombreOrigen, createdAt: info.createdAt })
      mapa.set(claveFinal, lista)
    }
    return mapa
  }, [fusiones, gruposCrudosPorClave, resolverClave])

  // Abre la ventana de comparación+confirmación -- ya NO une con un clic.
  // Busca el historial COMPLETO de ambas tarjetas (todas sus citas, sin
  // filtrar por tab) para que el médico compare con la información real.
  const solicitarUnion = (claveOrigen: string, claveDestino: string) => {
    const origen = gruposResueltosPorClave.get(claveOrigen)
    const destino = gruposResueltosPorClave.get(claveDestino)
    if (!origen || !destino) return
    setConfirmandoUnion({ origen, destino })
  }

  const confirmarUnionModal = async () => {
    if (!confirmandoUnion || !medico) return
    const { origen, destino } = confirmandoUnion
    setUniendoModal(true)
    try {
      const { data, error } = await supabase
        .from('doctor_patient_merges')
        .upsert({ medico_id: medico.id, clave_origen: origen.clave, clave_destino: destino.clave }, { onConflict: 'medico_id,clave_origen' })
        .select('id, created_at')
        .single()
      if (error) throw error
      setFusiones(prev => new Map(prev).set(origen.clave, { id: data.id, claveDestino: destino.clave, createdAt: data.created_at }))
      showToast('Pacientes unidos', 'success')
      setConfirmandoUnion(null)
    } catch {
      showToast('No se pudo unir a los pacientes. Intenta de nuevo.', 'error')
    } finally {
      setUniendoModal(false)
    }
  }

  // Deshacer una unión -- nunca tocó `citas` ni el expediente real, así que
  // deshacer es instantáneo y sin ningún riesgo de pérdida de información:
  // solo borra la fila que decía "estas dos claves son la misma persona".
  const deshacerUnion = async (fusionId: string) => {
    setDeshaciendoId(fusionId)
    try {
      const { error } = await supabase.from('doctor_patient_merges').delete().eq('id', fusionId)
      if (error) throw error
      setFusiones(prev => {
        const siguiente = new Map(prev)
        for (const [claveOrigen, info] of siguiente) {
          if (info.id === fusionId) { siguiente.delete(claveOrigen); break }
        }
        return siguiente
      })
      showToast('Unión deshecha', 'success')
    } catch {
      showToast('No se pudo deshacer la unión. Intenta de nuevo.', 'error')
    } finally {
      setDeshaciendoId(null)
    }
  }

  // Agrupa las citas ya filtradas (por tab o por fecha del calendario) por
  // paciente -- una tarjeta por paciente en vez de una por cita. Clave:
  // paciente_id cuando existe (lo llena un trigger de la base de datos
  // desde 2026-07-23); las citas de antes de esa fecha no lo tienen, así
  // que caen a paciente_email (normalizado) como respaldo, el mismo campo
  // que usa ese trigger para identificar/crear al paciente. Después se
  // resuelve la clave a través de las fusiones manuales del médico.
  const gruposPorPaciente = useMemo(() => {
    const mapa = new Map<string, GrupoPaciente & { pacienteId: string | null }>()
    for (const cita of citasFiltradas) {
      const claveCruda = cita.paciente_id || `email:${cita.paciente_email.trim().toLowerCase()}`
      const clave = resolverClave(claveCruda)
      const grupo = mapa.get(clave)
      if (grupo) {
        grupo.citas.push(cita)
        if (!grupo.pacienteId && cita.paciente_id) grupo.pacienteId = cita.paciente_id
      } else {
        mapa.set(clave, { clave, pacienteNombre: cita.paciente_nombre, pacienteId: cita.paciente_id, citas: [cita] })
      }
    }

    const tarjetas = Array.from(mapa.values()).map(g => construirPacienteCard(g, g.pacienteId))

    // Con próxima cita primero (la más próxima arriba); sin próxima cita
    // después, ordenados por su cita más reciente.
    tarjetas.sort((a, b) => {
      const proximaA = a.proximaCita ? new Date(`${a.proximaCita.fecha}T${a.proximaCita.hora || '00:00'}`).getTime() : null
      const proximaB = b.proximaCita ? new Date(`${b.proximaCita.fecha}T${b.proximaCita.hora || '00:00'}`).getTime() : null
      if (proximaA !== null && proximaB !== null) return proximaA - proximaB
      if (proximaA !== null) return -1
      if (proximaB !== null) return 1
      const recienteA = a.historial[0] ? new Date(`${a.historial[0].fecha}T${a.historial[0].hora || '00:00'}`).getTime() : 0
      const recienteB = b.historial[0] ? new Date(`${b.historial[0].fecha}T${b.historial[0].hora || '00:00'}`).getTime() : 0
      return recienteB - recienteA
    })

    return tarjetas
  }, [citasFiltradas, resolverClave])

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
  ) : (
    gruposPorPaciente.map(data => (
      <PacienteCard
        key={data.clave}
        data={data}
        procesando={procesando}
        rechazando={rechazando}
        motivoRechazo={motivoRechazo}
        enviandoRechazo={enviandoRechazo}
        setRechazando={setRechazando}
        setMotivoRechazo={setMotivoRechazo}
        cambiarEstado={cambiarEstado}
        confirmarRechazo={confirmarRechazo}
        sugerencia={sugerenciasPorClave.get(data.clave) || null}
        onSolicitarUnion={solicitarUnion}
        deshacerInfo={deshacerPorClave.get(data.clave) || []}
        deshaciendoId={deshaciendoId}
        onDeshacerUnion={deshacerUnion}
        chatActivo={chatActivoPorClave.get(data.clave) ?? true}
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

  // Se llama solo cuando InstalarAppBanner confirmó que SI hay algo que
  // mostrar (Android con prompt nativo o iOS/Safari) -- recién ahí se
  // "gasta" la única oportunidad de esta cuenta, atómico contra el flag
  // actual para no pisar un cierre ya guardado desde otra pestaña.
  const marcarBannerInstalarVisto = async () => {
    if (!userId) return
    setMedico(prev => prev ? { ...prev, pwa_banner_shown: true } : prev)
    await supabase.from('doctors').update({ pwa_banner_shown: true }).eq('user_id', userId).eq('pwa_banner_shown', false)
  }

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

      {confirmandoUnion && (
        <ConfirmarUnionModal
          origen={confirmandoUnion.origen}
          destino={confirmandoUnion.destino}
          confirmando={uniendoModal}
          onCancel={() => { if (!uniendoModal) setConfirmandoUnion(null) }}
          onConfirm={confirmarUnionModal}
        />
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 80px' }}>
        {mostrarInstalarBanner && (
          <div className="fade-up" style={{ marginBottom: 20 }}>
            <InstalarAppBanner
              visible={mostrarInstalarBanner}
              modo={modoInstalarApp}
              deferredPrompt={deferredInstalarApp}
              onShown={marcarBannerInstalarVisto}
              onClose={() => setMostrarInstalarBanner(false)}
            />
          </div>
        )}
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
    <div key={i} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Skeleton width={44} height={44} radius={999} style={{ flexShrink: 0 }} />
          <Skeleton width={140} height={17} />
        </div>
        <Skeleton width={64} height={22} radius={12} />
      </div>
      <Skeleton width="100%" height={72} radius={12} />
      <Skeleton width="100%" height={60} radius={12} />
      <Skeleton width="100%" height={44} radius={10} />
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