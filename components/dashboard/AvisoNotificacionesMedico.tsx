'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import {
  detectarPlataforma,
  activarNotificacionesMedico,
  yaTieneSuscripcion,
  type ResultadoActivacion,
} from '@/lib/push/activarNotificaciones'

const DISMISS_KEY = 'salurama_push_medico_dismissed'

type Paso = 'oculto' | 'abrir_en_safari' | 'activar' | 'confirmado'

/**
 * Aviso de notificaciones push del lado médico -- contraparte de
 * AvisoNotificaciones.tsx (paciente, en el chat). Global en /dashboard
 * (montado desde DashboardNavClient), no gateado a ningún evento de negocio:
 * el médico ya está en su propio dashboard, no hace falta esperar nada más
 * para ofrecérselo.
 */
export default function AvisoNotificacionesMedico() {
  const [paso, setPaso] = useState<Paso>('oculto')

  useEffect(() => {
    let cancelado = false

    async function evaluar() {
      if (typeof window === 'undefined' || typeof Notification === 'undefined') return
      if (localStorage.getItem(DISMISS_KEY) === '1') return
      if (Notification.permission === 'denied') return
      if (Notification.permission === 'granted' && (await yaTieneSuscripcion())) return
      if (cancelado) return

      const { esIOS, esSafari } = detectarPlataforma()
      setPaso(esIOS && !esSafari ? 'abrir_en_safari' : 'activar')
    }

    evaluar()
    return () => { cancelado = true }
  }, [])

  const cerrarDefinitivo = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setPaso('oculto')
  }, [])

  const manejarResultado = useCallback((resultado: ResultadoActivacion) => {
    if (resultado === 'activadas') {
      setPaso('confirmado')
      setTimeout(() => setPaso('oculto'), 2500)
    } else {
      setPaso('oculto')
    }
  }, [])

  const handleActivarClick = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) { setPaso('oculto'); return }
    const resultado = await activarNotificacionesMedico(session.access_token)
    manejarResultado(resultado)
  }, [manejarResultado])

  if (paso === 'oculto') return null

  if (paso === 'confirmado') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #C4B5FD', background: '#F5F3FF', padding: '10px 16px' }}>
        <Bell size={16} color="#7C3AED" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 13, color: '#5B21B6', margin: 0 }}>Notificaciones activadas.</p>
      </div>
    )
  }

  if (paso === 'abrir_en_safari') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #C4B5FD', background: '#F5F3FF', padding: '10px 16px' }}>
        <Bell size={16} color="#7C3AED" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ flex: 1, fontSize: 13, color: '#5B21B6', margin: 0, lineHeight: 1.5 }}>
          Para recibir avisos de citas y mensajes nuevos, abre tu dashboard en Safari.
        </p>
        <button onClick={cerrarDefinitivo} aria-label="Cerrar aviso" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', flexShrink: 0, padding: 2 }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  // paso === 'activar'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #C4B5FD', background: '#F5F3FF', padding: '10px 16px' }}>
      <Bell size={16} color="#7C3AED" style={{ flexShrink: 0 }} />
      <p style={{ flex: 1, minWidth: 200, fontSize: 13, color: '#5B21B6', margin: 0 }}>
        Activa tus notificaciones para enterarte al momento de citas nuevas y mensajes de tus pacientes.
      </p>
      <button
        onClick={handleActivarClick}
        style={{ flexShrink: 0, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        Activar
      </button>
      <button onClick={cerrarDefinitivo} aria-label="Ahora no" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', flexShrink: 0 }}>
        <X size={16} />
      </button>
    </div>
  )
}
