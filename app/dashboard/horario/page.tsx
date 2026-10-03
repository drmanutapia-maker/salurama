'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'
import FechasBloqueadas, { type BloqueoFecha } from '@/components/FechasBloqueadas'
import { fechaISOLocal } from '@/lib/citas/fechas'

export default function HorarioDoctor() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PageErrorType | null>(null)
  const cancelRef = useRef(false)
  const initialCheckDoneRef = useRef(false)
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [bloqueos, setBloqueos] = useState<BloqueoFecha[]>([])

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
    setDoctorId(doctor?.id ?? null)

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

      <FechasBloqueadas doctorId={doctorId} bloqueos={bloqueos} onChange={setBloqueos} />
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
