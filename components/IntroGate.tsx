'use client'

import { useEffect, useState } from 'react'
import SplashInicial from '@/components/SplashInicial'

const FLAG_SESSION = 'salurama_intro_vista'

// Coincide con la duración total coreografiada de SplashInicial (dibujo +
// desvanecido, ver ese archivo) -- es un momento de marca, no un indicador
// literal de "los datos ya llegaron": a este nivel (toda la app) no hay un
// solo estado de "loading" al que engancharse -- las páginas públicas (Home,
// perfil de médico) ni siquiera tienen uno propio -- así que se usa un
// tiempo fijo en vez de depender de cada página.
const DURACION_MS = 3500

/**
 * Envuelve TODA la app -- montado una sola vez en app/layout.tsx (el layout
 * raíz), fuera de cualquier página específica. Mientras esta pestaña/sesión
 * no haya visto la animación de apertura, la muestra encima de lo que sea
 * que haya debajo (Home, perfil de médico, dashboard...) durante los mismos
 * 3.5s de siempre, sin importar por dónde haya entrado la persona a la app.
 * `children` se monta desde el primer render, por debajo del overlay -- así
 * cada página ya puede empezar a pedir sus propios datos mientras el splash
 * todavía tapa la pantalla, en vez de esperar a que termine para arrancar.
 */
export default function IntroGate({ children }: { children: React.ReactNode }) {
  // true por default -- seguro para SSR (sessionStorage no existe ahí) y
  // coincide con lo que de verdad pasa en una apertura fría real. El efecto
  // de abajo lo corrige a false de inmediato si esta sesión ya la vio, sin
  // provocar un mismatch de hidratación (mismo criterio ya usado antes en
  // app/dashboard/page.tsx para este mismo problema).
  const [mostrarSplash, setMostrarSplash] = useState(true)

  useEffect(() => {
    let yaVista = false
    try {
      yaVista = sessionStorage.getItem(FLAG_SESSION) === '1'
      if (!yaVista) sessionStorage.setItem(FLAG_SESSION, '1')
    } catch { /* incógnito estricto sin sessionStorage -- se muestra igual, una vez por carga */ }

    if (yaVista) { setMostrarSplash(false); return }

    const t = setTimeout(() => setMostrarSplash(false), DURACION_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {mostrarSplash && (
        // El id lo apunta la regla CSS de app/globals.css que el script
        // inline "beforeInteractive" de app/layout.tsx activa -- ver ese
        // script para por qué existe: sin él, cualquier recarga completa de
        // la página después de la primera (login redirige con
        // window.location.href, no navegación de cliente) vuelve a
        // renderizar este overlay visible por defecto (el server no puede
        // leer sessionStorage) durante la fracción de segundo entre el
        // primer pintado y que este mismo useEffect corrija el estado --
        // ese es exactamente el parpateo breve reportado. El script corre
        // ANTES de que el navegador pinte el body, así que cuando esta
        // sesión ya vio la animación, el overlay nace ya oculto por CSS,
        // sin esperar a React.
        <div id="salurama-splash-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          <SplashInicial />
        </div>
      )}
      {children}
    </>
  )
}
