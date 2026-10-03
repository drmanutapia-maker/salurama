'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { toast } from 'sonner'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'
import { AlertTriangle, CalendarOff, X, Plus } from 'lucide-react'
import { fechaISOLocal } from '@/lib/citas/fechas'

export default function HorarioDoctor() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PageErrorType | null>(null)
  const [saving, setSaving] = useState(false)
  const cancelRef = useRef(false)
  const initialCheckDoneRef = useRef(false)
  const doctorIdRef = useRef<string | null>(null)
  const [bloqueos, setBloqueos] = useState<{ id: string; fecha: string; motivo: string | null; created_at: string }[]>([])
  const [nuevaFechaBloqueo, setNuevaFechaBloqueo] = useState('')
  const [motivoBloqueo, setMotivoBloqueo] = useState('')
  const [rangoInicio, setRangoInicio] = useState('')
  const [rangoFin, setRangoFin] = useState('')
  const [modoBloqueo, setModoBloqueo] = useState<'fecha' | 'rango'>('fecha')
  const [agregandoBloqueo, setAgregandoBloqueo] = useState(false)
  const [eliminandoBloqueoId, setEliminandoBloqueoId] = useState<string | null>(null)

  // Antes esta función no verificaba nada y se quedaba en blanco en
  // silencio si no había sesión (sin redirigir a /login) — ver auditoría de
  // esta página. Ahora recibe el userId ya confirmado por el efecto de
  // abajo, que es quien decide si hay sesión o no.
  //
  // También antes ignoraba el `error` de la consulta y se quedaba con
  // doctor=undefined en silencio — eso hacía que un fallo real de red o del
  // servidor se viera igual que "no tienes fechas bloqueadas", mostrando un
  // estado falso en vez de un error. Ahora si la consulta falla, se relanza
  // para que `load()` lo clasifique y muestre el error real.
  const loadHorario = useCallback(async (userId: string) => {
    const { data: doctor, error: doctorErr } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (doctorErr) throw doctorErr
    doctorIdRef.current = doctor?.id ?? null

    if (doctor?.id) {
      const hoy = fechaISOLocal(new Date())
      const { data: bloqueosData, error: bloqueosErr } = await supabase
        .from('doctor_blocked_dates')
        .select('id, fecha, motivo, created_at')
        .eq('doctor_id', doctor.id)
        .gte('fecha', hoy)
        .order('fecha', { ascending: true })

      if (bloqueosErr) throw bloqueosErr
      setBloqueos(bloqueosData || [])
    }
  }, [])

  const load = useCallback(async () => {
    cancelRef.current = false
    setLoading(true)
    setError(null)
    const { user, networkError } = await getUserSafe(supabase)
    initialCheckDoneRef.current = true
    if (networkError) { if (!cancelRef.current) { setError('network'); setLoading(false) }; return }
    if (!user) { router.push('/login'); return }

    try {
      await loadHorario(user.id)
    } catch (err) {
      if (!cancelRef.current) setError(classifyError(err))
    }
    if (!cancelRef.current) setLoading(false)
  }, [router, loadHorario])

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

  // Agrupa filas de doctor_blocked_dates que vinieron del mismo "Bloquear
  // rango" en /dashboard/horario, para mostrarlas como un solo renglón en
  // vez de una fila por día.
  //
  // No hay columna de "id de rango" en la tabla -- cada fecha del rango se
  // guarda como su propia fila independiente. El criterio que se usa en su
  // lugar: fechas consecutivas (sin huecos) + mismo motivo + mismo
  // `created_at`. Ese último dato es la clave real: el INSERT de un rango
  // manda todas las fechas en una sola sentencia SQL, y Postgres evalúa
  // now() una sola vez por sentencia -- confirmado con los datos reales de
  // Manuel (10 filas del rango 26 ago–5 sep con el mismo created_at al
  // microsegundo). Fechas consecutivas agregadas una por una en momentos
  // distintos (aunque terminen siendo seguidas por coincidencia) tienen
  // created_at distinto y por eso NO se agrupan -- ver bug reportado, el
  // pedido es agrupar solo lo que se creó junto como rango.
  const gruposBloqueo = (() => {
    const ordenados = [...bloqueos].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const grupos: { ids: string[]; fechaInicio: string; fechaFin: string; motivo: string | null; createdAt: string }[] = []
    for (const b of ordenados) {
      const anterior = grupos[grupos.length - 1]
      const diaSiguienteEsperado = anterior
        ? fechaISOLocal(new Date(new Date(anterior.fechaFin + 'T00:00:00').getTime() + 86400000))
        : null
      const mismoLote = !!anterior && anterior.createdAt === b.created_at && anterior.motivo === b.motivo && diaSiguienteEsperado === b.fecha
      if (mismoLote && anterior) {
        anterior.ids.push(b.id)
        anterior.fechaFin = b.fecha
      } else {
        grupos.push({ ids: [b.id], fechaInicio: b.fecha, fechaFin: b.fecha, motivo: b.motivo, createdAt: b.created_at })
      }
    }
    return grupos
  })()

  const formatRangoBloqueo = (fechaInicio: string, fechaFin: string) => {
    const dIni = new Date(fechaInicio + 'T00:00:00')
    const dFin = new Date(fechaFin + 'T00:00:00')
    const mesIni = dIni.toLocaleDateString('es-MX', { month: 'long' })
    const mesFin = dFin.toLocaleDateString('es-MX', { month: 'long' })
    const mismoAnio = dIni.getFullYear() === dFin.getFullYear()
    const inicioTxt = mismoAnio ? `${dIni.getDate()} de ${mesIni}` : `${dIni.getDate()} de ${mesIni} de ${dIni.getFullYear()}`
    return `${inicioTxt} al ${dFin.getDate()} de ${mesFin} de ${dFin.getFullYear()}`
  }

  // Genera el rango de fechas ISO (YYYY-MM-DD) entre inicio y fin, ambos
  // incluidos -- comparación como texto, ya funciona porque el formato es
  // siempre de ancho fijo.
  const rangoDeFechas = (inicio: string, fin: string): string[] => {
    const fechas: string[] = []
    let actual = new Date(inicio + 'T00:00:00')
    const finDate = new Date(fin + 'T00:00:00')
    while (actual <= finDate) {
      fechas.push(fechaISOLocal(actual))
      actual = new Date(actual.getTime() + 86400000)
    }
    return fechas
  }

  const agregarBloqueo = async (fechas: string[], motivo: string) => {
    const doctorId = doctorIdRef.current
    if (!doctorId || fechas.length === 0) return

    // El botón mismo ya muestra su propio estado (deshabilitado mientras
    // agrega), pero antes esto no tocaba el indicador compartido de abajo
    // -- ese indicador se quedaba mostrando lo que fuera que el guardado de
    // horario había dejado, sin importar si en verdad se estaba bloqueando
    // una fecha en ese momento. Ahora participa del mismo indicador, con el
    // mismo try/finally que garantiza que nunca se quede pegado en
    // "Guardando...".
    setAgregandoBloqueo(true)
    setSaving(true)
    try {
      const filas = fechas.map(fecha => ({ doctor_id: doctorId, fecha, motivo: motivo.trim() || null }))
      // upsert con ignoreDuplicates: si alguna fecha del rango ya estaba
      // bloqueada (UNIQUE doctor_id+fecha), no truena todo el lote -- solo
      // no duplica esa fila.
      const { error } = await supabase
        .from('doctor_blocked_dates')
        .upsert(filas, { onConflict: 'doctor_id,fecha', ignoreDuplicates: true })
      if (error) throw error

      const hoy = fechaISOLocal(new Date())
      const { data, error: refetchErr } = await supabase
        .from('doctor_blocked_dates')
        .select('id, fecha, motivo, created_at')
        .eq('doctor_id', doctorId)
        .gte('fecha', hoy)
        .order('fecha', { ascending: true })
      if (refetchErr) throw refetchErr
      setBloqueos(data || [])

      toast.success(fechas.length === 1 ? 'Fecha bloqueada' : `${fechas.length} fechas bloqueadas`)
      setNuevaFechaBloqueo('')
      setMotivoBloqueo('')
      setRangoInicio('')
      setRangoFin('')
    } catch {
      toast.error('No se pudo bloquear la fecha. Intenta de nuevo.')
    } finally {
      setAgregandoBloqueo(false)
      setSaving(false)
    }
  }

  // Acepta uno o varios ids -- un grupo de fechas creado como rango se
  // borra completo de una sola vez (ver agruparBloqueos más abajo).
  //
  // Este era justo el flujo donde Manuel vio el indicador de abajo
  // desfasado de la realidad -- eliminarBloqueo nunca tocaba `saving`, así
  // que el indicador compartido se quedaba mostrando lo que fuera que
  // hubiera quedado de una acción de horario, sin reflejar que aquí también
  // había (o no) un guardado en curso. Ahora participa del mismo indicador.
  const eliminarBloqueo = async (ids: string[]) => {
    setEliminandoBloqueoId(ids[0])
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_blocked_dates').delete().in('id', ids)
      if (error) throw error
      setBloqueos(prev => prev.filter(b => !ids.includes(b.id)))
      toast.success(ids.length === 1 ? 'Bloqueo quitado' : `${ids.length} fechas bloqueadas quitadas`)
    } catch {
      toast.error('No se pudo quitar el bloqueo. Intenta de nuevo.')
    } finally {
      setEliminandoBloqueoId(null)
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
        <PageErrorState type={error} onRetry={load} />
      </div>
    )
  }

  if (loading) {
    return <HorarioSkeleton />
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Fechas bloqueadas</h1>
        <p style={{ fontSize: 14, color: '#6B7280' }}>Define los días en que tus pacientes no podrán agendar citas</p>
      </div>

      {/* Fechas bloqueadas */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <CalendarOff size={18} color="#1E3A5F" aria-hidden="true" />
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Fechas bloqueadas</h2>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
          Bloquea días específicos o periodos por fechas sin cambiar tu horario semanal. Los pacientes no podrán agendar en estas fechas.
        </p>

        <div role="tablist" style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #E5E7EB' }}>
          <button
            role="tab"
            aria-selected={modoBloqueo === 'fecha'}
            onClick={() => setModoBloqueo('fecha')}
            style={{
              padding: '8px 14px', background: 'none', border: 'none', borderBottom: modoBloqueo === 'fecha' ? '2px solid #1E3A5F' : '2px solid transparent',
              marginBottom: -1, fontSize: 13, fontWeight: 600, color: modoBloqueo === 'fecha' ? '#1E3A5F' : '#6B7280', cursor: 'pointer',
            }}
          >
            Fecha específica
          </button>
          <button
            role="tab"
            aria-selected={modoBloqueo === 'rango'}
            onClick={() => setModoBloqueo('rango')}
            style={{
              padding: '8px 14px', background: 'none', border: 'none', borderBottom: modoBloqueo === 'rango' ? '2px solid #1E3A5F' : '2px solid transparent',
              marginBottom: -1, fontSize: 13, fontWeight: 600, color: modoBloqueo === 'rango' ? '#1E3A5F' : '#6B7280', cursor: 'pointer',
            }}
          >
            Rango de fechas
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
          {modoBloqueo === 'fecha' ? (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Fecha</label>
                <input
                  type="date"
                  value={nuevaFechaBloqueo}
                  min={fechaISOLocal(new Date())}
                  onChange={(e) => setNuevaFechaBloqueo(e.target.value)}
                  style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Motivo (opcional)</label>
                <input
                  type="text"
                  value={motivoBloqueo}
                  onChange={(e) => setMotivoBloqueo(e.target.value)}
                  placeholder="Ej. Vacaciones"
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <button
                onClick={() => agregarBloqueo([nuevaFechaBloqueo], motivoBloqueo)}
                disabled={!nuevaFechaBloqueo || agregandoBloqueo}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#1E3A5F', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: !nuevaFechaBloqueo || agregandoBloqueo ? 'not-allowed' : 'pointer',
                  opacity: !nuevaFechaBloqueo || agregandoBloqueo ? 0.5 : 1,
                }}
              >
                <Plus size={14} aria-hidden="true" /> Bloquear fecha
              </button>
            </>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Desde</label>
                <input
                  type="date"
                  value={rangoInicio}
                  min={fechaISOLocal(new Date())}
                  onChange={(e) => setRangoInicio(e.target.value)}
                  style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Hasta</label>
                <input
                  type="date"
                  value={rangoFin}
                  min={rangoInicio || fechaISOLocal(new Date())}
                  onChange={(e) => setRangoFin(e.target.value)}
                  style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Motivo (opcional)</label>
                <input
                  type="text"
                  value={motivoBloqueo}
                  onChange={(e) => setMotivoBloqueo(e.target.value)}
                  placeholder="Ej. Vacaciones"
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
              <button
                onClick={() => agregarBloqueo(rangoDeFechas(rangoInicio, rangoFin), motivoBloqueo)}
                disabled={!rangoInicio || !rangoFin || rangoFin < rangoInicio || agregandoBloqueo}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#1E3A5F', color: '#fff',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: (!rangoInicio || !rangoFin || rangoFin < rangoInicio || agregandoBloqueo) ? 'not-allowed' : 'pointer',
                  opacity: (!rangoInicio || !rangoFin || rangoFin < rangoInicio || agregandoBloqueo) ? 0.5 : 1,
                }}
              >
                <Plus size={14} aria-hidden="true" /> Bloquear rango
              </button>
            </>
          )}
        </div>
        {modoBloqueo === 'rango' && rangoInicio && rangoFin && rangoFin < rangoInicio && (
          <p role="alert" style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={14} aria-hidden="true" /> "Hasta" debe ser después de "Desde"
          </p>
        )}

        {gruposBloqueo.length > 0 ? (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {gruposBloqueo.map(g => {
              const esRango = g.fechaInicio !== g.fechaFin
              const eliminando = eliminandoBloqueoId === g.ids[0]
              return (
                <li key={g.ids[0]} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    <strong>
                      {esRango
                        ? formatRangoBloqueo(g.fechaInicio, g.fechaFin)
                        : new Date(g.fechaInicio + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </strong>
                    {g.motivo && <span style={{ color: '#6B7280' }}> — {g.motivo}</span>}
                  </span>
                  <button
                    onClick={() => eliminarBloqueo(g.ids)}
                    disabled={eliminando}
                    aria-label={esRango ? `Quitar bloqueo del ${formatRangoBloqueo(g.fechaInicio, g.fechaFin)}` : `Quitar bloqueo del ${g.fechaInicio}`}
                    style={{ background: 'none', border: 'none', color: '#DC2626', cursor: eliminando ? 'not-allowed' : 'pointer', opacity: eliminando ? 0.5 : 1, display: 'flex', alignItems: 'center' }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>No tienes fechas bloqueadas próximamente.</p>
        )}
      </div>

      {/* Estado de guardado de fechas bloqueadas -- refleja si hay un
          bloqueo agregándose/quitándose en curso o si ya se guardó todo. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} role="status" aria-live="polite">
        {saving ? (
          <span style={{ fontSize: 13, color: '#6B7280' }}>Guardando...</span>
        ) : (
          <span style={{ fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Guardado</span>
        )}
      </div>
    </div>
  )
}

// Skeleton de Fechas bloqueadas — mantiene la misma estructura (encabezado
// y tarjeta de fechas bloqueadas) para que la carga no cambie de layout.
function HorarioSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px', fontFamily: "'DM Sans', sans-serif" }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando tus fechas bloqueadas…
      </span>
      <div style={{ marginBottom: 32 }}>
        <Skeleton width={260} height={28} style={{ marginBottom: 8 }} />
        <Skeleton width={320} height={16} />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <Skeleton width={180} height={16} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={40} radius={8} />
      </div>
    </div>
  )
}
