'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { Settings } from 'lucide-react'
import { Skeleton } from '@/components/Skeleton'
import SeccionSeguridad from '@/components/dashboard/configuracion/SeccionSeguridad'
import SeccionNotificaciones from '@/components/dashboard/configuracion/SeccionNotificaciones'
import SeccionInstalarApp from '@/components/dashboard/configuracion/SeccionInstalarApp'

// Agrupa las acciones de configuración poco frecuentes que antes vivían
// sueltas (huella/Face ID en /dashboard/seguridad, ahora un redirect acá) o
// solo como banners de paso (notificaciones, instalar app) sin ningún lugar
// fijo al que volver. El check de sesión vive UNA VEZ aquí -- las 3
// secciones de abajo asumen que ya hay sesión y solo manejan su propio
// estado/datos, sin repetir la redirección a /login cada una.
export default function ConfiguracionPage() {
  const router = useRouter()
  const [autenticado, setAutenticado] = useState(false)
  const cancelRef = useRef(false)
  const initialCheckDoneRef = useRef(false)

  useEffect(() => {
    // Mismo criterio que /dashboard/seguridad (ahora movido acá): ignora el
    // evento INITIAL_SESSION con session=null que puede llegar mientras el
    // cliente todavía está leyendo la cookie, justo después de navegar aquí
    // -- para no rebotar a /login por una sesión válida que solo tardó en
    // confirmarse.
    initialCheckDoneRef.current = false
    cancelRef.current = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!initialCheckDoneRef.current) return
      if (!session) router.push('/login')
    })

    async function verificar() {
      const { user, networkError } = await getUserSafe(supabase)
      initialCheckDoneRef.current = true
      if (networkError) return
      if (!user) { router.push('/login'); return }
      if (!cancelRef.current) setAutenticado(true)
    }
    verificar()

    return () => { cancelRef.current = true; subscription.unsubscribe() }
  }, [router])

  if (!autenticado) return <ConfiguracionSkeleton />

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Settings size={22} color="#1E3A5F" aria-hidden="true" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>Configuración</h1>
        </div>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 32 }}>
          Ajustes de tu cuenta y de este dispositivo.
        </p>

        <SeccionSeguridad />
        <SeccionNotificaciones />
        <SeccionInstalarApp />
      </div>
    </div>
  )
}

function ConfiguracionSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif" }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando configuración…
      </span>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Settings size={22} color="#1E3A5F" aria-hidden="true" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>Configuración</h1>
        </div>
        <Skeleton width={280} height={14} style={{ marginBottom: 32 }} />
        <Skeleton width={160} height={18} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={140} radius={16} />
      </div>
    </div>
  )
}
