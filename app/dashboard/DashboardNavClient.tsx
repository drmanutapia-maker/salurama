'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { isManuelEmail } from '@/lib/manuelOnly'
import { contarMensajesSinLeerTotal, EVENTO_CHAT_LEIDO } from '@/lib/chat/sinLeer'
import { confirmarCredencialLocal } from '@/lib/webauthn/dispositivoLocal'
import { useInstalarAppElegibilidad } from '@/hooks/useInstalarAppElegibilidad'
import { detectarPlataforma } from '@/lib/push/activarNotificaciones'
import { ColaBanneresProvider, useColaBanners, TransicionBanner } from '@/hooks/useColaBanners'
import AvisoNotificacionesMedico from '@/components/dashboard/AvisoNotificacionesMedico'
import BannerDashboard from '@/components/dashboard/BannerDashboard'
import { Fingerprint, Smartphone, Megaphone } from 'lucide-react'

const BANNER_FLAG = 'salurama_mostrar_banner_biometrico'

function BannerBiometrico() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let mostrarSolicitado = false
    try {
      mostrarSolicitado = sessionStorage.getItem(BANNER_FLAG) === '1'
      sessionStorage.removeItem(BANNER_FLAG)
    } catch {}
    if (!mostrarSolicitado) return

    let cancelado = false
    async function revisar() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError || !user) return

      const { data: medico } = await supabase
        .from('doctors')
        .select('webauthn_banner_declined')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!medico || medico.webauthn_banner_declined) return

      // Pregunta por ESTE dispositivo, no por la cuenta -- el mismo mensaje
      // aplica si nunca se activó en ningún lado o si se activó en otro
      // aparato distinto a este.
      const activo = await confirmarCredencialLocal(true)
      if (activo) return

      if (!cancelado) setVisible(true)
    }
    revisar()
    return () => { cancelado = true }
  }, [])

  const declinar = async () => {
    setVisible(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('doctors').update({ webauthn_banner_declined: true }).eq('user_id', user.id)
  }

  // Prioridad 1 -- ver hooks/useColaBanners.tsx. `visible` sigue siendo
  // exactamente la misma condición de "tengo algo que mostrar" de antes; lo
  // único nuevo es que ahora además hace falta que le toque el turno.
  const miTurno = useColaBanners('biometrico', visible)

  return (
    <TransicionBanner>
      {miTurno && (
        <BannerDashboard
          icon={<Fingerprint size={18} color="#2A9D8F" />}
          mensaje="Entra sin escribir tu contraseña la próxima vez en este navegador: activa el inicio de sesión con huella o Face ID."
          colorFondo="#EEF6F5"
          colorBorde="#CFE8E4"
          colorTexto="#134E4A"
          colorAccento="#1E3A5F"
          accionPrincipal={{ label: 'Ir a activar', onClick: () => { setVisible(false); router.push('/dashboard/seguridad') } }}
          accionSecundaria={{ label: 'No, gracias', onClick: declinar }}
          onCerrar={() => setVisible(false)}
        />
      )}
    </TransicionBanner>
  )
}

// Invitación a instalar la app (PWA) en la barra superior de /dashboard/* --
// mismo patrón que BannerBiometrico arriba: componente autocontenido, hace
// su propia consulta a `doctors` para la cuenta de la sesión, y se marca
// como visto en la base de datos una sola vez, independiente del botón de
// cerrar. Única fuente de este banner del lado médico -- el disparador
// propio de /dashboard/citas ("primera cita confirmada" vía
// InstalarAppBanner.tsx) se retiró porque este ya cubre todo /dashboard/*.
function BannerInstalarApp() {
  const [pwaBannerShown, setPwaBannerShown] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  // Readiness interna (la misma condición de siempre: cuenta que nunca lo
  // vio + navegador/SO que ofrece instalar) -- separada de "cerrado", que es
  // el equivalente al X manual de los otros banners. Ninguna de las dos
  // toca la condición original, solo se combinan para lo que se reporta a
  // la cola.
  const [listoInterno, setListoInterno] = useState(false)
  const [cerrado, setCerrado] = useState(false)
  const { modo } = useInstalarAppElegibilidad()
  const yaMarcado = useRef(false)

  useEffect(() => {
    let cancelado = false
    async function revisar() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError || !user) return
      const { data: medico } = await supabase
        .from('doctors')
        .select('pwa_banner_shown')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!medico || cancelado) return
      setUserId(user.id)
      setPwaBannerShown(medico.pwa_banner_shown)
    }
    revisar()
    return () => { cancelado = true }
  }, [])

  // Misma condición exacta de antes (cuenta que nunca lo vio + Android/iOS
  // real, nunca escritorio -- ver detectarPlataforma()), solo que ahora
  // guarda el resultado en vez de marcar la base de datos de inmediato: ver
  // el siguiente efecto para cuándo se marca de verdad.
  useEffect(() => {
    if (pwaBannerShown !== false || !userId) { setListoInterno(false); return }
    if (modo !== 'android' && modo !== 'ios') { setListoInterno(false); return }
    const { esMobile, esIOS, esAndroid } = detectarPlataforma()
    setListoInterno(esMobile && (esIOS || esAndroid))
  }, [pwaBannerShown, modo, userId])

  const listo = listoInterno && !cerrado
  const miTurno = useColaBanners('instalarApp', listo)

  // A diferencia de la versión anterior, esto YA NO se dispara en cuanto hay
  // algo que mostrar -- se dispara solo cuando la cola de verdad le da el
  // turno (miTurno), para no "quemar" la única oportunidad de esta cuenta
  // mientras espera detrás de un banner de mayor prioridad (huella o push).
  useEffect(() => {
    if (!miTurno || yaMarcado.current || !userId) return
    yaMarcado.current = true
    supabase.from('doctors').update({ pwa_banner_shown: true }).eq('user_id', userId).eq('pwa_banner_shown', false)
  }, [miTurno, userId])

  return (
    <TransicionBanner>
      {miTurno && (
        <BannerDashboard
          icon={<Smartphone size={18} color="#2A9D8F" />}
          mensaje={modo === 'android' ? (
            <><strong>Android (Chrome):</strong> toca el menú ⋮ y elige "Instalar app" o "Agregar a pantalla de inicio".</>
          ) : (
            <><strong>iPhone (Safari):</strong> toca el ícono de Compartir y elige "Agregar a inicio".</>
          )}
          colorFondo="#EEF6F5"
          colorBorde="#CFE8E4"
          colorTexto="#134E4A"
          colorAccento="#1E3A5F"
          onCerrar={() => setCerrado(true)}
        />
      )}
    </TransicionBanner>
  )
}

// Invitación a formalizar el Aviso de Publicidad ante COFEPRIS -- antes era
// una tarjeta grande fija en el contenido de /dashboard (Inicio), visible
// solo ahí; ahora vive en la barra superior como los demás, con prioridad 4
// (la más baja) y visible en cualquier página de /dashboard/*. Mismo patrón
// autocontenido: consulta ligera propia (solo las 2 columnas que necesita,
// no el select('*') pesado de page.tsx). Condición de "tengo algo que
// mostrar" sin tocar: cuenta de Manuel, sin número de aviso capturado aún.
function BannerCofepris() {
  const router = useRouter()
  const [cargado, setCargado] = useState(false)
  const [avisoNumero, setAvisoNumero] = useState<string | null>(null)
  const [esManuel, setEsManuel] = useState(false)
  const [cerrado, setCerrado] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function revisar() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError || !user) return
      const { data: medico } = await supabase
        .from('doctors')
        .select('cofepris_aviso_numero, email')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!medico || cancelado) return
      setAvisoNumero(medico.cofepris_aviso_numero)
      setEsManuel(isManuelEmail(medico.email))
      setCargado(true)
    }
    revisar()
    return () => { cancelado = true }
  }, [])

  // `cargado` evita que el efecto de abajo cuente el estado inicial
  // (antes de que resuelva el fetch) como "sin aviso" -- misma condición de
  // siempre (`!cofepris_aviso_numero && isManuelEmail`), sin tocar.
  const listo = cargado && !avisoNumero && esManuel && !cerrado
  const miTurno = useColaBanners('cofepris', listo)

  return (
    <TransicionBanner>
      {miTurno && (
        <BannerDashboard
          icon={<Megaphone size={18} color="#2A9D8F" />}
          mensaje="Formaliza tu Aviso de Publicidad ante COFEPRIS. Te ayudamos a preparar la documentación -- es opcional, no afecta tu perfil ni tu visibilidad."
          colorFondo="#E8F7F5"
          colorBorde="#9FD8CD"
          colorTexto="#1D6F65"
          colorAccento="#2A9D8F"
          accionPrincipal={{ label: 'Empezar', onClick: () => { setCerrado(true); router.push('/dashboard/cofepris') } }}
          onCerrar={() => setCerrado(true)}
        />
      )}
    </TransicionBanner>
  )
}

export default function DashboardNavClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [pendientes, setPendientes] = useState(0)
  const [sinLeer, setSinLeer] = useState(0)
  const [isManuel, setIsManuel] = useState(false)

  useEffect(() => {
    async function load() {
      const { user, networkError } = await getUserSafe(supabase)
      // Fallo de red: no hay forma de saber si hay sesión o no. Se deja el
      // badge como estaba — el intervalo de 60s de abajo reintentará solo.
      if (networkError) return
      if (!user) return
      setIsManuel(isManuelEmail(user.email))
      const { data: medico } = await supabase.from('doctors').select('id').eq('user_id', user.id).single()
      if (!medico) return
      const { count } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('medico_id', medico.id)
        .eq('estado', 'pending_verification')
        .gte('expires_at', new Date().toISOString())
      setPendientes(count || 0)
      setSinLeer(await contarMensajesSinLeerTotal(medico.id))
    }
    load()

    // Refrescar cada 60 segundos (respaldo, por si llegan mensajes nuevos
    // mientras el médico no interactúa con nada) y también justo cuando abre
    // una conversación y se marca como leída (ver ConversacionChat.tsx) —
    // así el badge no se queda con el número viejo hasta que caiga el reloj.
    const interval = setInterval(load, 60000)
    window.addEventListener(EVENTO_CHAT_LEIDO, load)
    return () => {
      clearInterval(interval)
      window.removeEventListener(EVENTO_CHAT_LEIDO, load)
    }
  }, [])

  const links = [
    { href: '/dashboard', label: 'Inicio', active: pathname === '/dashboard' },
    { href: '/dashboard/horario', label: 'Horarios', active: pathname.startsWith('/dashboard/horario') },
    { href: '/dashboard/citas', label: 'Citas', badge: pendientes, active: pathname.startsWith('/dashboard/citas') },
    { href: '/dashboard/chat', label: 'Chat', badge: sinLeer, active: pathname.startsWith('/dashboard/chat') },
    // MSL Virtual: oculto salvo para la cuenta de Manuel — ver lib/manuelOnly.ts
    ...(isManuel ? [{ href: '/dashboard/msl-virtual', label: 'MSL Virtual', active: pathname.startsWith('/dashboard/msl-virtual') }] : []),
  ]

  // El chat MSL Virtual ocupa el viewport completo con scroll interno propio;
  // este nav (sticky, ocupa espacio en el flujo del documento) no aplica a esas
  // rutas y añadiría altura que empujaría el documento más allá del viewport.
  const isMslVirtual = pathname?.startsWith('/dashboard/msl-virtual')

  return (
    <ColaBanneresProvider>
      {!isMslVirtual && <BannerBiometrico />}
      {!isMslVirtual && <BannerInstalarApp />}
      {!isMslVirtual && <AvisoNotificacionesMedico />}
      {!isMslVirtual && <BannerCofepris />}
      {!isMslVirtual && (
      <nav className="hidden md:block sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 flex gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch
              className={`py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                link.active
                  ? 'text-primary-500 border-primary-500'
                  : 'text-neutral-500 border-transparent hover:text-primary-700'
              }`}
            >
              {link.label}
              {link.badge != null && link.badge > 0 && (
                <span style={{ background: '#DC2626', color: '#fff', borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700, lineHeight: '18px' }}>
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
      )}
      {children}
    </ColaBanneresProvider>
  )
}
