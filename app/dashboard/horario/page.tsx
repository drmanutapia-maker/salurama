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

type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

interface HorarioDia {
  activo: boolean
  inicio: string
  fin: string
  descanso_inicio?: string
  descanso_fin?: string
}

type Horario = Record<DiaSemana, HorarioDia>

const DIAS: { key: DiaSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

// Las horas son strings "HH:MM" de 2 dígitos, así que compararlas como
// texto da el mismo resultado que compararlas como minutos -- se aprovecha
// eso para no tener que parsear cada vez.
function validarDia(dia: HorarioDia): string | null {
  if (!dia.activo) return null
  if (dia.fin <= dia.inicio) return 'La hora de cierre debe ser después de la hora de apertura'
  if (dia.descanso_inicio && dia.descanso_fin && dia.descanso_fin <= dia.descanso_inicio) {
    return 'La hora de fin de comida debe ser después de la hora de inicio'
  }
  return null
}

const HORARIO_DEFAULT: Horario = DIAS.reduce((acc, { key }) => {
  acc[key] = {
    activo: false,
    inicio: '09:00',
    fin: '18:00'
  }
  return acc
}, {} as Horario)

export default function HorarioDoctor() {
  const router = useRouter()
  const [horario, setHorario] = useState<Horario>(HORARIO_DEFAULT)
  const [duracion, setDuracion] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PageErrorType | null>(null)
  const [saving, setSaving] = useState(false)
  const cancelRef = useRef(false)
  const initialCheckDoneRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const doctorIdRef = useRef<string | null>(null)
  // En true hasta que loadHorario() termina de poblar `horario`/`duracion` --
  // evita que el efecto de guardado automático (más abajo) dispare un
  // guardado innecesario apenas se cargan los datos existentes.
  const skipNextAutosaveRef = useRef(true)
  const [saveError, setSaveError] = useState<PageErrorType | null>(null)
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
  // servidor se viera igual que "no tienes horario configurado todavía"
  // (todos los días desactivados), mostrando un estado falso en vez de un
  // error. Ahora si la consulta falla, se relanza para que `load()` lo
  // clasifique y muestre el error real.
  const loadHorario = useCallback(async (userId: string) => {
    const { data: doctor, error: doctorErr } = await supabase
      .from('doctors')
      .select('id, horario, duracion_cita_minutos')
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

    if (doctor?.horario && typeof doctor.horario === 'object') {
      const horarioCargado = { ...HORARIO_DEFAULT }
      const raw = doctor.horario as Record<string, any>

      DIAS.forEach(({ key }) => {
        if (raw[key]) {
          horarioCargado[key] = {
            activo: raw[key].abierto ?? raw[key].open ?? raw[key].activo ?? !!(raw[key].inicio || raw[key].start),
            inicio: raw[key].inicio || raw[key].start || '09:00',
            fin: raw[key].fin || raw[key].end || '18:00',
            descanso_inicio: raw[key].descanso_inicio || raw[key].lunch_start || raw[key].comida_inicio,
            descanso_fin: raw[key].descanso_fin || raw[key].lunch_end || raw[key].comida_fin,
          }
        }
      })

      setHorario(horarioCargado)
    }

    setDuracion(doctor?.duracion_cita_minutos || 30)
  }, [])

  const load = useCallback(async () => {
    cancelRef.current = false
    skipNextAutosaveRef.current = true
    setLoading(true)
    setError(null)
    const { user, networkError } = await getUserSafe(supabase)
    initialCheckDoneRef.current = true
    if (networkError) { if (!cancelRef.current) { setError('network'); setLoading(false) }; return }
    if (!user) { router.push('/login'); return }
    userIdRef.current = user.id

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

  const updateDia = (dia: DiaSemana, campo: keyof HorarioDia, valor: any) => {
    setHorario(prev => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }))
  }

  const toggleDia = (dia: DiaSemana) => updateDia(dia, 'activo', !horario[dia].activo)

  const toggleDescanso = (dia: DiaSemana, checked: boolean) => {
    setHorario(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        descanso_inicio: checked ? '14:00' : undefined,
        descanso_fin: checked ? '15:00' : undefined
      }
    }))
  }

  const copiarATodos = (diaOrigen: DiaSemana) => {
    const origen = horario[diaOrigen]
    const nuevo = { ...horario }
    DIAS.forEach(({ key }) => { if (key !== diaOrigen) nuevo[key] = { ...origen } })
    setHorario(nuevo)
    toast.success('Horario copiado a todos los días')
  }

  // Se recalcula en cada render a partir de `horario` -- no hace falta
  // estado propio, y así el aviso aparece/desaparece en cuanto el médico
  // corrige el campo, sin esperar a que intente guardar.
  const erroresPorDia = DIAS.reduce((acc, { key }) => {
    const err = validarDia(horario[key])
    if (err) acc[key] = err
    return acc
  }, {} as Partial<Record<DiaSemana, string>>)

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

  // Misma lógica de "bloque continuo" que ya usa DoctorProfileClient.tsx
  // para el resumen público (diasAtencionTexto), adaptada para incluir
  // horarios: agrupa corridas de días consecutivos (DIAS ya está en orden
  // lunes→domingo, así que la adyacencia en el arreglo ES la adyacencia de
  // la semana) que además comparten el mismo inicio/fin -- si dos días
  // consecutivos están activos pero con horas distintas, no se combinan,
  // para no mostrar una hora que no aplica a todo el rango.
  const segmentosVistaPrevia = (() => {
    // Se guarda el índice original de cada día (0=lunes..6=domingo) porque
    // filtrar por "activo" rompe la adyacencia por posición en el arreglo
    // filtrado -- lunes y miércoles quedarían "seguidos" en `activos` aunque
    // martes (inactivo) esté entre ellos.
    const activos = DIAS.map((d, idx) => ({ ...d, idx })).filter(d => horario[d.key].activo)
    const segmentos: string[] = []
    let i = 0
    while (i < activos.length) {
      let j = i
      const { inicio, fin } = horario[activos[i].key]
      while (
        j + 1 < activos.length &&
        activos[j + 1].idx === activos[j].idx + 1 &&
        horario[activos[j + 1].key].inicio === inicio &&
        horario[activos[j + 1].key].fin === fin
      ) {
        j++
      }
      segmentos.push(
        j > i
          ? `${activos[i].label} a ${activos[j].label}: ${inicio}–${fin}`
          : `${activos[i].label.slice(0, 3)}: ${inicio}–${fin}`
      )
      i = j + 1
    }
    return segmentos
  })()

  const hayErroresValidacion = Object.keys(erroresPorDia).length > 0

  // Guardado real de horario/duración -- lo dispara el efecto de guardado
  // automático de abajo (debounce), y también el botón "Reintentar" del
  // aviso de error si el intento anterior falló por red/servidor.
  const guardarHorarioYDuracion = useCallback(async () => {
    // Reusa el user_id ya confirmado por getUserSafe en load() en vez de
    // pedirlo de nuevo con getUser() crudo -- evita el user!.id (non-null
    // assertion) de antes, que podía tronar sin control si la sesión ya
    // había expirado justo al momento de guardar.
    const userId = userIdRef.current
    if (!userId) { setSaveError('auth'); setSaving(false); return }

    setSaving(true)
    setSaveError(null)
    try {
      const { error } = await supabase
        .from('doctors')
        .update({
          horario,
          duracion_cita_minutos: duracion,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
      if (error) throw error
    } catch (err) {
      // Antes esto era un toast.error genérico -- si fallaba (ej. sin
      // internet), el médico no tenía forma de saber qué pasó ni de
      // reintentar sin perder sus cambios (que siguen en `horario`/`duracion`
      // en memoria, así que reintentar no los pierde).
      setSaveError(classifyError(err))
    } finally {
      setSaving(false)
    }
  }, [horario, duracion])

  // Guardado automático: espera 500ms sin cambios nuevos antes de guardar,
  // para no mandar un guardado por cada clic mientras el médico sigue
  // ajustando. `saving` se pone en true de inmediato (no hasta que arranca
  // la llamada de red) para que el indicador nunca diga "Guardado" durante
  // esa espera, cuando en realidad todavía no se guardó nada.
  //
  // Si hay un horario inválido (ver erroresPorDia), NO se agenda ningún
  // guardado -- el aviso rojo por día ya construido es la señal, y en
  // cuanto se corrija este efecto vuelve a correr (horario cambió) y
  // agenda el guardado normal.
  useEffect(() => {
    if (loading) return
    if (skipNextAutosaveRef.current) { skipNextAutosaveRef.current = false; return }

    if (hayErroresValidacion) {
      setSaving(false)
      return
    }

    setSaving(true)
    const timer = setTimeout(() => { guardarHorarioYDuracion() }, 500)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horario, duracion, loading])

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
    // una fecha en ese momento. Ahora participa del mismo indicador que
    // horario/duración, con el mismo try/finally que garantiza que nunca
    // se quede pegado en "Guardando...".
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
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Horario de atención</h1>
        <p style={{ fontSize: 14, color: '#6B7280' }}>Define cuándo pueden agendar citas tus pacientes</p>
      </div>

      {/* Duración */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#111827' }}>Configuración general</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>Duración de cada cita:</label>
          <select
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
            style={{ padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, background: '#fff', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}
          >
            <option value={15}>15 minutos</option>
            <option value={20}>20 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
          </select>
        </div>
      </div>

      {/* Días */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
        {DIAS.map(({ key, label }) => {
          const dia = horario[key]
          const errorDia = erroresPorDia[key]
          return (
            <div key={key} style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6', background: errorDia ? '#FEF2F2' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 140 }}>
                  <button
                    onClick={() => toggleDia(key)}
                    style={{
                      width: 44, height: 26, borderRadius: 13,
                      background: dia.activo ? '#1E3A5F' : '#D1D5DB',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s', flexShrink: 0
                    }}
                    aria-label={`${dia.activo ? 'Desactivar' : 'Activar'} ${label}`}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: dia.activo ? 20 : 2,
                      width: 22, height: 22, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: 15, color: dia.activo ? '#111827' : '#6B7280' }}>{label}</span>
                </div>

                {dia.activo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <select value={dia.inicio} onChange={(e) => updateDia(key, 'inicio', e.target.value)} style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span style={{ color: '#6B7280' }}>—</span>
                    <select value={dia.fin} onChange={(e) => updateDia(key, 'fin', e.target.value)} style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <button onClick={() => copiarATodos(key)} style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>
                      Copiar a todos
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: '#6B7280' }}>No disponible</span>
                )}
              </div>

              {dia.activo && (
                <div style={{ marginTop: 12, marginLeft: 56, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>
                    <input
                      type="checkbox"
                      checked={!!dia.descanso_inicio}
                      onChange={(e) => toggleDescanso(key, e.target.checked)}
                      style={{ accentColor: '#1E3A5F', width: 16, height: 16 }}
                    />
                    Agregar hora de comida
                  </label>
                  {dia.descanso_inicio && (
                    <>
                      <select value={dia.descanso_inicio} onChange={(e) => updateDia(key, 'descanso_inicio', e.target.value)} style={{ padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: '#fff' }}>
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>—</span>
                      <select value={dia.descanso_fin} onChange={(e) => updateDia(key, 'descanso_fin', e.target.value)} style={{ padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: '#fff' }}>
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </>
                  )}
                </div>
              )}

              {errorDia && (
                <p role="alert" style={{ marginTop: 10, marginLeft: 56, fontSize: 12, color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} aria-hidden="true" /> {errorDia}
                </p>
              )}
            </div>
          )
        })}
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

      {/* Vista previa */}
      <div style={{ background: '#F0F4FF', borderRadius: 16, padding: 20, border: '1px solid #C7D2FE', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', marginBottom: 8 }}>Vista previa para pacientes</h3>
        <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.6 }}>
          {segmentosVistaPrevia.length > 0 ? segmentosVistaPrevia.join('  •  ') : 'Sin horario configurado'}
        </p>
      </div>

      {/* Estado de guardado -- automático, sin botón. Prioridad: un error
          real (red/servidor) gana sobre todo; si no, mientras haya un
          horario inválido no se intenta guardar y se avisa que falta
          corregir (el aviso rojo por día ya lo explica); si no, se refleja
          si hay un guardado en curso o si ya se guardó todo. */}
      {saveError ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #FECACA' }}>
          <PageErrorState
            type={saveError}
            onRetry={guardarHorarioYDuracion}
            compact
            title="No se pudo guardar tu horario"
            message={
              saveError === 'network' ? 'No pudimos conectar con el servidor para guardar tus cambios. Revisa tu conexión e intenta de nuevo -- no se perdieron.'
              : saveError === 'auth' ? 'Tu sesión expiró mientras editabas. Inicia sesión de nuevo -- tus cambios no se perdieron, pero necesitas volver a entrar para guardarlos.'
              : 'Tuvimos un problema al guardar tus cambios. Intenta de nuevo -- no se perdieron.'
            }
          />
        </div>
      ) : (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }} role="status" aria-live="polite">
        {hayErroresValidacion ? (
          <span style={{ fontSize: 13, color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertTriangle size={14} aria-hidden="true" /> Sin guardar — corrige el horario marcado en rojo
          </span>
        ) : saving ? (
          <span style={{ fontSize: 13, color: '#6B7280' }}>Guardando...</span>
        ) : (
          <span style={{ fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Guardado</span>
        )}
      </div>
      )}
    </div>
  )
}

// Skeleton de Horario — mantiene la misma estructura (config general, lista
// de 7 días, vista previa) para que la carga no cambie de layout.
function HorarioSkeleton() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px', fontFamily: "'DM Sans', sans-serif" }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando tu horario…
      </span>
      <div style={{ marginBottom: 32 }}>
        <Skeleton width={260} height={28} style={{ marginBottom: 8 }} />
        <Skeleton width={320} height={16} />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <Skeleton width={180} height={16} style={{ marginBottom: 16 }} />
        <Skeleton width={260} height={40} radius={10} />
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: 16 }}>
        {DIAS.map(({ key }) => (
          <div key={key} style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Skeleton width={44} height={26} radius={13} />
              <Skeleton width={80} height={16} />
            </div>
            <Skeleton width={160} height={32} radius={8} />
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', marginBottom: 16 }}>
        <Skeleton width={180} height={16} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={40} radius={8} />
      </div>

      <div style={{ background: '#F0F4FF', borderRadius: 16, padding: 20, border: '1px solid #C7D2FE' }}>
        <Skeleton width={220} height={14} style={{ marginBottom: 10 }} />
        <Skeleton width="90%" height={14} />
      </div>
    </div>
  )
}