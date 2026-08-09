'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, Share, X } from 'lucide-react'
import {
  detectarPlataforma,
  activarNotificaciones,
  yaTieneSuscripcion,
  type ResultadoActivacion,
} from '@/lib/push/activarNotificaciones'

// El navegador no tiene un tipo estándar para este evento — TS solo conoce
// los eventos DOM base. Se declara aquí lo mínimo que se usa.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'salurama_push_dismissed'

type Paso =
  | 'oculto'
  | 'aviso'
  | 'instrucciones_ios'
  | 'abrir_en_safari'
  | 'activar'
  | 'confirmado'

/**
 * Aviso de notificaciones push del chat del paciente (Parte 2). `activo` es
 * la condición de negocio que decide SI corresponde ofrecer notificaciones en
 * este momento (primer mensaje del médico, o cita confirmada) — este
 * componente decide, aparte, SI ya se puede mostrar algo (permiso ya
 * concedido/denegado, ya suscrito, o el paciente ya dijo "ahora no").
 */
export default function AvisoNotificaciones({ token, activo }: { token: string; activo: boolean }) {
  const [paso, setPaso] = useState<Paso>('oculto')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [plataforma, setPlataforma] = useState({ esIOS: false, esSafari: false, esStandalone: false })

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    let cancelado = false

    async function evaluar() {
      if (!activo) return
      if (typeof window === 'undefined' || typeof Notification === 'undefined') return
      if (localStorage.getItem(DISMISS_KEY) === '1') return
      if (Notification.permission === 'denied') return

      if (Notification.permission === 'granted' && (await yaTieneSuscripcion())) return
      if (cancelado) return

      const info = detectarPlataforma()
      setPlataforma(info)

      if (info.esStandalone) {
        setPaso('activar')
      } else if (info.esIOS && !info.esSafari) {
        setPaso('abrir_en_safari')
      } else {
        setPaso('aviso')
      }
    }

    evaluar()
    return () => { cancelado = true }
  }, [activo])

  const cerrarDefinitivo = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setPaso('oculto')
  }, [])

  const manejarResultado = useCallback((resultado: ResultadoActivacion) => {
    if (resultado === 'activadas') {
      setPaso('confirmado')
      setTimeout(() => setPaso('oculto'), 2500)
    } else {
      // 'rechazadas': el navegador ya guardó el permiso denegado, no hay que
      // insistir. 'no_soportado' / 'error': ya se logueó dentro de
      // activarNotificaciones — tampoco hay nada más que ofrecer aquí.
      setPaso('oculto')
    }
  }, [])

  const handleActivarClick = useCallback(async () => {
    const resultado = await activarNotificaciones(token)
    manejarResultado(resultado)
  }, [token, manejarResultado])

  const handleAgregarClick = useCallback(async () => {
    if (plataforma.esIOS && plataforma.esSafari) {
      setPaso('instrucciones_ios')
      return
    }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      try { await deferredPrompt.userChoice } catch {}
      setDeferredPrompt(null)
    }
    setPaso('activar')
  }, [plataforma, deferredPrompt])

  if (paso === 'oculto') return null

  if (paso === 'confirmado') {
    return (
      <div className="shrink-0 flex items-center gap-2 border-b border-primary-100 bg-primary-50 px-4 py-3">
        <Bell size={16} className="text-primary-600 shrink-0" />
        <p className="font-body text-sm text-primary-700">Notificaciones activadas.</p>
      </div>
    )
  }

  if (paso === 'abrir_en_safari') {
    return (
      <div className="shrink-0 flex items-start gap-3 border-b border-primary-100 bg-primary-50 px-4 py-3">
        <Bell size={16} className="text-primary-600 shrink-0 mt-0.5" />
        <p className="flex-1 font-body text-sm text-primary-700 leading-relaxed">
          Para recibir avisos cuando tu médico te escriba, abre este enlace en Safari.
        </p>
        <button onClick={cerrarDefinitivo} aria-label="Cerrar aviso" className="shrink-0 text-primary-400 hover:text-primary-600">
          <X size={16} />
        </button>
      </div>
    )
  }

  if (paso === 'instrucciones_ios') {
    return (
      <div className="shrink-0 border-b border-primary-100 bg-primary-50 px-4 py-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="font-body font-semibold text-sm text-primary-800">Agrega Salurama a tu pantalla de inicio</p>
          <button onClick={cerrarDefinitivo} aria-label="Cerrar instrucciones" className="shrink-0 text-primary-400 hover:text-primary-600">
            <X size={16} />
          </button>
        </div>
        <ol className="space-y-2 font-body text-sm text-primary-700">
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary-200 text-primary-800 text-xs font-semibold flex items-center justify-center">1</span>
            Toca el botón <Share size={14} className="inline mx-1 -mt-0.5" /> Compartir en la barra de Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary-200 text-primary-800 text-xs font-semibold flex items-center justify-center">2</span>
            Busca y toca "Agregar a pantalla de inicio"
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-primary-200 text-primary-800 text-xs font-semibold flex items-center justify-center">3</span>
            Toca "Agregar" y abre Salurama desde el ícono nuevo
          </li>
        </ol>
        <p className="mt-3 font-body text-xs text-primary-600">Ahí te ofreceremos activar tus notificaciones.</p>
      </div>
    )
  }

  if (paso === 'activar') {
    return (
      <div className="shrink-0 flex items-center gap-3 border-b border-primary-100 bg-primary-50 px-4 py-3">
        <Bell size={16} className="text-primary-600 shrink-0" />
        <p className="flex-1 font-body text-sm text-primary-700 leading-relaxed">
          Activa tus notificaciones para no perderte respuestas de tu médico.
        </p>
        <button
          onClick={handleActivarClick}
          className="shrink-0 font-body text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 active:bg-primary-700 rounded-lg px-3 py-2 transition-colors"
        >
          Activar
        </button>
        <button onClick={cerrarDefinitivo} aria-label="Ahora no" className="shrink-0 text-primary-400 hover:text-primary-600">
          <X size={16} />
        </button>
      </div>
    )
  }

  // paso === 'aviso'
  const mostrarAtajoAndroid = !plataforma.esIOS

  return (
    <div className="shrink-0 border-b border-primary-100 bg-primary-50 px-4 py-4">
      <div className="flex items-start gap-3">
        <Bell size={18} className="text-primary-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-body text-sm text-primary-800 leading-relaxed">
            Recibe avisos cuando tu médico te escriba — Agrega Salurama a tu pantalla de inicio para tenerlo como una
            app, rápido, seguro, sin ocupar espacio. Así podrás activar notificaciones y no perderte respuestas de tu
            doctor.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={handleAgregarClick}
              className="font-body text-xs font-semibold text-white bg-primary-500 hover:bg-primary-600 active:bg-primary-700 rounded-lg px-3 py-2 transition-colors"
            >
              Agregar a pantalla de inicio
            </button>
            <button
              onClick={cerrarDefinitivo}
              className="font-body text-xs font-semibold text-primary-600 hover:text-primary-800 rounded-lg px-3 py-2 transition-colors"
            >
              Ahora no
            </button>
          </div>
          {mostrarAtajoAndroid && (
            <button
              onClick={handleActivarClick}
              className="block mt-2 font-body text-xs text-primary-500 hover:text-primary-700 underline underline-offset-2 transition-colors"
            >
              También puedes activar notificaciones sin instalar, solo da clic aquí
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
