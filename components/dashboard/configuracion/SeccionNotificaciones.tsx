'use client'
import { useEffect, useState, useCallback } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { activarNotificacionesMedico, yaTieneSuscripcion, type ResultadoActivacion } from '@/lib/push/activarNotificaciones'

type EstadoPush = 'cargando' | 'activadas' | 'no_activadas' | 'bloqueadas' | 'no_soportado'

// Sección independiente de /dashboard/configuracion -- mismo flujo de
// activación que AvisoNotificacionesMedico.tsx (banner del layout), pero
// sin depender de ese banner ni de su lógica de "cuándo ofrecerlo": aquí
// siempre se muestra el estado real, para que el médico pueda revisarlo o
// activarlo cuando quiera, sin esperar a que el banner decida mostrarse.
export default function SeccionNotificaciones() {
  const [estado, setEstado] = useState<EstadoPush>('cargando')
  const [activando, setActivando] = useState(false)

  const revisar = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setEstado('no_soportado')
      return
    }
    if (Notification.permission === 'denied') { setEstado('bloqueadas'); return }
    if (Notification.permission === 'granted' && (await yaTieneSuscripcion())) { setEstado('activadas'); return }
    setEstado('no_activadas')
  }, [])

  useEffect(() => { revisar() }, [revisar])

  const handleActivar = async () => {
    setActivando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const resultado: ResultadoActivacion = await activarNotificacionesMedico(session.access_token)
      if (resultado === 'activadas') setEstado('activadas')
      else if (resultado === 'rechazadas') setEstado('bloqueadas')
      else if (resultado === 'no_soportado') setEstado('no_soportado')
      // 'error': se queda en 'no_activadas', el médico puede reintentar
    } finally {
      setActivando(false)
    }
  }

  // Sin nada que ofrecer si ya están activadas -- mostrar información sin
  // ninguna acción posible (no se puede desactivar desde aquí) es ruido,
  // no ayuda. Misma idea que SeccionInstalarApp: la sección solo aparece
  // cuando hay algo que el médico puede hacer.
  if (estado === 'activadas') return null

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Bell size={20} color="#1E3A5F" aria-hidden="true" />
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>Notificaciones</h2>
      </div>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
        Entérate al momento de citas nuevas y mensajes de tus pacientes, aunque no tengas Salurama abierto.
      </p>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {estado === 'cargando' && (
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Revisando...</p>
        )}

        {estado === 'no_soportado' && (
          <>
            <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BellOff size={18} color="#9CA3AF" aria-hidden="true" />
            </div>
            <p style={{ fontSize: 14, color: '#6B7280' }}>Este navegador no soporta notificaciones push.</p>
          </>
        )}

        {estado === 'bloqueadas' && (
          <>
            <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BellOff size={18} color="#DC2626" aria-hidden="true" />
            </div>
            <p style={{ fontSize: 14, color: '#6B7280' }}>
              Bloqueadas a nivel de navegador. Actívalas desde el ícono de candado o la configuración del sitio en tu navegador, y vuelve a esta página.
            </p>
          </>
        )}

        {estado === 'no_activadas' && (
          <button
            onClick={handleActivar}
            disabled={activando}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 16px', fontSize: 14, fontWeight: 600,
              cursor: activando ? 'not-allowed' : 'pointer', opacity: activando ? 0.6 : 1,
            }}
          >
            <Bell size={16} aria-hidden="true" />
            {activando ? 'Activando...' : 'Activar notificaciones'}
          </button>
        )}
      </div>
    </section>
  )
}
