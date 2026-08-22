'use client'

import { useEffect, useRef } from 'react'
import { Download, Share, X, Smartphone } from 'lucide-react'
import type { BeforeInstallPromptEvent, ModoInstalacion } from '@/hooks/useInstalarAppElegibilidad'

/**
 * Banner discreto de "instalar como app". Puramente presentacional: quien lo
 * usa ya trae `modo`/`deferredPrompt` de useInstalarAppElegibilidad (montado
 * arriba, desde que se abrió la pantalla -- ver ese hook para el porqué) y
 * decide CUANDO ofrecerlo pasando `visible=true` una sola vez (ej. primera
 * cita confirmada/agendada).
 *
 * `onShown` se dispara una sola vez, justo cuando se confirma que SI hay
 * algo que mostrar -- quien llama debe usarlo para guardar en la base de
 * datos que ya se le mostro a esta cuenta, para nunca repetirlo. Si el
 * navegador no soporta nada (modo 'esperando' o 'ninguno'), `onShown` nunca
 * se llama y el registro se queda sin tocar (no se "quema" la unica
 * oportunidad en un navegador que de todos modos no iba a mostrar nada).
 */
export default function InstalarAppBanner({
  visible,
  modo,
  deferredPrompt,
  onShown,
  onClose,
}: {
  visible: boolean
  modo: ModoInstalacion
  deferredPrompt: BeforeInstallPromptEvent | null
  onShown: () => void
  onClose: () => void
}) {
  const yaAvisado = useRef(false)

  useEffect(() => {
    if (visible && (modo === 'android' || modo === 'ios') && !yaAvisado.current) {
      yaAvisado.current = true
      onShown()
    }
  }, [visible, modo, onShown])

  const handleInstalar = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try { await deferredPrompt.userChoice } catch {}
    onClose()
  }

  if (!visible || (modo !== 'android' && modo !== 'ios')) return null

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#EEF6F5', border: '1px solid #CFE8E4', borderRadius: 12, padding: '12px 14px' }}>
      <Smartphone size={18} color="#2A9D8F" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        {modo === 'android' ? (
          <>
            <p style={{ fontSize: 13, color: '#134E4A', margin: 0 }}>
              Instala Salurama como app en tu celular: acceso más rápido, sin ocupar espacio de más.
            </p>
            <button
              onClick={handleInstalar}
              style={{ marginTop: 8, background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={13} /> Instalar
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#134E4A', margin: 0 }}>
              Agrega Salurama a tu pantalla de inicio: toca <Share size={13} style={{ display: 'inline', verticalAlign: -2, margin: '0 2px' }} /> Compartir y luego "Agregar a inicio".
            </p>
          </>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#134E4A', flexShrink: 0, padding: 2 }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
