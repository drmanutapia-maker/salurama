'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import BannerDashboard from '@/components/dashboard/BannerDashboard'
import {
  detectarPlataforma,
  activarNotificacionesMedico,
  yaTieneSuscripcion,
  type ResultadoActivacion,
} from '@/lib/push/activarNotificaciones'

const DISMISS_KEY = 'salurama_push_medico_dismissed'

type Paso = 'oculto' | 'abrir_en_safari' | 'activar' | 'confirmado'

const COLOR_FONDO = '#F5F3FF'
const COLOR_BORDE = '#C4B5FD'
const COLOR_TEXTO = '#5B21B6'
const COLOR_ACCENTO = '#7C3AED'

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

  // "No, gracias" -- descarte permanente, nunca vuelve a preguntar (igual que
  // declinar() en el banner de huella, que marca webauthn_banner_declined).
  const cerrarDefinitivo = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setPaso('oculto')
  }, [])

  // X -- descarte solo para esta visita, sin persistir nada. Reaparece en la
  // próxima carga de /dashboard (igual que la X del banner de huella, que
  // solo hace setVisible(false) sin tocar la base de datos).
  const cerrarTemporal = useCallback(() => setPaso('oculto'), [])

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
      <BannerDashboard
        icon={<Bell size={16} color={COLOR_ACCENTO} />}
        mensaje="Notificaciones activadas."
        colorFondo={COLOR_FONDO}
        colorBorde={COLOR_BORDE}
        colorTexto={COLOR_TEXTO}
        colorAccento={COLOR_ACCENTO}
      />
    )
  }

  if (paso === 'abrir_en_safari') {
    return (
      <BannerDashboard
        icon={<Bell size={16} color={COLOR_ACCENTO} />}
        mensaje="Para recibir avisos de citas y mensajes nuevos, abre tu dashboard en Safari."
        colorFondo={COLOR_FONDO}
        colorBorde={COLOR_BORDE}
        colorTexto={COLOR_TEXTO}
        colorAccento={COLOR_ACCENTO}
        onCerrar={cerrarDefinitivo}
        cerrarAriaLabel="Cerrar aviso"
      />
    )
  }

  // paso === 'activar'
  return (
    <BannerDashboard
      icon={<Bell size={16} color={COLOR_ACCENTO} />}
      mensaje="Activa tus notificaciones para enterarte al momento de citas nuevas y mensajes de tus pacientes."
      colorFondo={COLOR_FONDO}
      colorBorde={COLOR_BORDE}
      colorTexto={COLOR_TEXTO}
      colorAccento={COLOR_ACCENTO}
      accionPrincipal={{ label: 'Activar', onClick: handleActivarClick }}
      accionSecundaria={{ label: 'No, gracias', onClick: cerrarDefinitivo }}
      onCerrar={cerrarTemporal}
      cerrarAriaLabel="Ahora no"
    />
  )
}
