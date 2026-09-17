'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import BannerDashboard from '@/components/dashboard/BannerDashboard'
import { useColaBanners, TransicionBanner } from '@/hooks/useColaBanners'
import {
  detectarPlataforma,
  activarNotificacionesMedico,
  yaTieneSuscripcion,
  EVENTO_NOTIFICACIONES_MEDICO_ACTIVADAS,
  type ResultadoActivacion,
} from '@/lib/push/activarNotificaciones'

// Con el doctorId de la cuenta actual -- sin esto, un "No, gracias" quedaba
// en localStorage SIN cuenta asociada, así que se le pegaba a cualquier
// otro médico que usara después el mismo navegador/dispositivo (confirmado:
// pasó entre dos cuentas reales en la misma sesión del túnel). localStorage
// es por origen, no por cuenta -- namespacear por doctorId es lo que lo
// vuelve "por cuenta" igual que las demás banderas de estos banners viven
// en la fila de `doctors`.
const DISMISS_KEY_PREFIX = 'salurama_push_medico_dismissed_'

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
  const [doctorId, setDoctorId] = useState<string | null>(null)

  // Resuelve primero de quién es la sesión -- la clave de localStorage de
  // abajo depende de esto, así que `evaluar()` espera a que `doctorId`
  // exista antes de decidir nada (ver el siguiente efecto).
  useEffect(() => {
    let cancelado = false
    async function cargarDoctorId() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError || !user) return
      const { data: medico } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!medico || cancelado) return
      setDoctorId(medico.id)
    }
    cargarDoctorId()
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (!doctorId) return
    let cancelado = false

    async function evaluar() {
      if (typeof window === 'undefined' || typeof Notification === 'undefined') return

      // El "No, gracias" es una decisión sobre CONCEDER el permiso -- no debe
      // seguir aplicando si la persona cambió de opinión y revocó un permiso
      // que sí había concedido (o nunca llegó a concederlo tras descartar el
      // banner). Sin este reseteo, SeccionNotificaciones (que no tiene este
      // descarte, solo lee Notification.permission/yaTieneSuscripcion()) sí
      // vuelve a ofrecer activar, pero este banner se queda mudo para
      // siempre en ese dispositivo -- misma fuente de verdad, dos resultados
      // distintos. Se limpia aquí, no en el guard de abajo, para que la
      // decisión de "ocultarse por descarte" de esta misma pasada ya la vea
      // levantada.
      if (Notification.permission !== 'granted') {
        localStorage.removeItem(DISMISS_KEY_PREFIX + doctorId)
      }

      // Los "return" de abajo ponen 'oculto' explícitamente (no solo lo dejan
      // implícito en el estado inicial) porque evaluar() también se vuelve a
      // llamar en caliente -- ver el listener del evento más abajo -- cuando
      // el banner ya pudo haber estado mostrando 'activar' y necesita
      // ocultarse de verdad, no solo "no cambiar nada".
      if (localStorage.getItem(DISMISS_KEY_PREFIX + doctorId) === '1') { if (!cancelado) setPaso('oculto'); return }
      if (Notification.permission === 'denied') { if (!cancelado) setPaso('oculto'); return }
      if (Notification.permission === 'granted' && (await yaTieneSuscripcion())) { if (!cancelado) setPaso('oculto'); return }
      if (cancelado) return

      const { esIOS, esSafari } = detectarPlataforma()
      setPaso(esIOS && !esSafari ? 'abrir_en_safari' : 'activar')
    }

    evaluar()
    // Si se activan desde SeccionNotificaciones (Configuración) en vez de
    // este banner, hay que reevaluar para ocultarlo -- ambos leen la misma
    // fuente de verdad pero cada uno solo la revisaba en su propio montaje.
    window.addEventListener(EVENTO_NOTIFICACIONES_MEDICO_ACTIVADAS, evaluar)
    return () => {
      cancelado = true
      window.removeEventListener(EVENTO_NOTIFICACIONES_MEDICO_ACTIVADAS, evaluar)
    }
  }, [doctorId])

  // "No, gracias" -- descarte permanente, nunca vuelve a preguntar (igual que
  // declinar() en el banner de huella, que marca webauthn_banner_declined).
  // Si por lo que sea `doctorId` todavía no resolvió (no debería pasar --
  // este botón solo es alcanzable después de que `evaluar()` ya lo usó para
  // decidir mostrar el banner), no persiste nada para no escribir una clave
  // sin cuenta asociada.
  const cerrarDefinitivo = useCallback(() => {
    if (doctorId) localStorage.setItem(DISMISS_KEY_PREFIX + doctorId, '1')
    setPaso('oculto')
  }, [doctorId])

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

  // Prioridad 2 -- ver hooks/useColaBanners.tsx. `paso !== 'oculto'` es
  // exactamente la misma condición de "tengo algo que mostrar" de antes.
  const listo = paso !== 'oculto'
  const miTurno = useColaBanners('push', listo)

  let contenido: React.ReactNode = null

  if (miTurno && paso === 'confirmado') {
    contenido = (
      <BannerDashboard
        icon={<Bell size={16} color={COLOR_ACCENTO} />}
        mensaje="Notificaciones activadas."
        colorFondo={COLOR_FONDO}
        colorBorde={COLOR_BORDE}
        colorTexto={COLOR_TEXTO}
        colorAccento={COLOR_ACCENTO}
      />
    )
  } else if (miTurno && paso === 'abrir_en_safari') {
    contenido = (
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
  } else if (miTurno && paso === 'activar') {
    contenido = (
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

  return <TransicionBanner>{contenido}</TransicionBanner>
}
