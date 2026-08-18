'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { toast } from 'sonner'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'

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
  const [hasChanges, setHasChanges] = useState(false)
  const cancelRef = useRef(false)
  const initialCheckDoneRef = useRef(false)

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
      .select('horario, duracion_cita_minutos')
      .eq('user_id', userId)
      .single()

    if (doctorErr) throw doctorErr

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

  const updateDia = (dia: DiaSemana, campo: keyof HorarioDia, valor: any) => {
    setHorario(prev => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }))
    setHasChanges(true)
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
    setHasChanges(true)
  }

  const copiarATodos = (diaOrigen: DiaSemana) => {
    const origen = horario[diaOrigen]
    const nuevo = { ...horario }
    DIAS.forEach(({ key }) => { if (key !== diaOrigen) nuevo[key] = { ...origen } })
    setHorario(nuevo)
    setHasChanges(true)
    toast.success('Horario copiado a todos los días')
  }

  const guardar = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('doctors')
      .update({
        horario,
        duracion_cita_minutos: duracion,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user!.id)
    setSaving(false)
    if (error) toast.error('Error al guardar')
    else { toast.success('Horario actualizado'); setHasChanges(false) }
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
            onChange={(e) => { setDuracion(Number(e.target.value)); setHasChanges(true) }}
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
          return (
            <div key={key} style={{ padding: '18px 20px', borderBottom: '1px solid #F3F4F6' }}>
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
            </div>
          )
        })}
      </div>

      {/* Vista previa */}
      <div style={{ background: '#F0F4FF', borderRadius: 16, padding: 20, border: '1px solid #C7D2FE', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', marginBottom: 8 }}>Vista previa para pacientes</h3>
        <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.6 }}>
          {DIAS.filter(d => horario[d.key].activo).length > 0
            ? DIAS.filter(d => horario[d.key].activo)
                .map(d => `${d.label.slice(0, 3)}: ${horario[d.key].inicio}–${horario[d.key].fin}`)
                .join('  •  ')
            : 'Sin horario configurado'
          }
        </p>
      </div>

      {/* Guardar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }} role="status" aria-live="polite">
        {hasChanges && !saving && <span style={{ fontSize: 13, color: '#D97706' }}>Cambios sin guardar...</span>}
        {saving && <span style={{ fontSize: 13, color: '#6B7280' }}>Guardando...</span>}
        {!hasChanges && !saving && <span style={{ fontSize: 13, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Guardado</span>}
        <button
          onClick={guardar}
          disabled={saving || !hasChanges}
          style={{
            padding: '10px 20px', background: '#1E3A5F', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
            opacity: saving || !hasChanges ? 0.5 : 1,
            fontFamily: "'DM Sans', sans-serif"
          }}
        >
          Guardar ahora
        </button>
      </div>
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

      <div style={{ background: '#F0F4FF', borderRadius: 16, padding: 20, border: '1px solid #C7D2FE' }}>
        <Skeleton width={220} height={14} style={{ marginBottom: 10 }} />
        <Skeleton width="90%" height={14} />
      </div>
    </div>
  )
}