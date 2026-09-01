'use client'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface AccionBanner {
  label: string
  onClick: () => void
  disabled?: boolean
}

interface BannerDashboardProps {
  icon: ReactNode
  mensaje: ReactNode
  colorFondo: string
  colorBorde: string
  colorTexto: string
  colorAccento: string
  /** Botón sólido, ej. "Ir a activar" / "Activar". Omítelo si el banner no ofrece ninguna acción (solo informativo). */
  accionPrincipal?: AccionBanner
  /** Link secundario tipo "No, gracias" -- opcional, no todos los banners lo necesitan. */
  accionSecundaria?: AccionBanner
  /** Botón de cerrar (X). Omítelo si el banner no se puede cerrar manualmente. */
  onCerrar?: () => void
  cerrarAriaLabel?: string
}

/**
 * Base compartida de los banners de /dashboard (huella/Face ID, notificaciones
 * push, y cualquier otro que se agregue después). Fija el layout y el
 * breakpoint una sola vez para que nunca se repita la inconsistencia entre
 * banners -- variar colores/texto/acciones vía props, no reescribir la
 * estructura en cada banner nuevo.
 *
 * Escritorio: ícono + texto a la izquierda, acciones a la derecha, misma fila.
 * Móvil (<=640px): breakpoint explícito -- las acciones bajan completas debajo
 * del texto como su propia fila, nunca comparten línea con el texto (un wrap
 * automático por elemento dejaría acciones sueltas apretadas contra el texto
 * largo).
 */
export default function BannerDashboard({
  icon, mensaje, colorFondo, colorBorde, colorTexto, colorAccento,
  accionPrincipal, accionSecundaria, onCerrar, cerrarAriaLabel = 'Cerrar',
}: BannerDashboardProps) {
  const hayAcciones = !!(accionPrincipal || accionSecundaria || onCerrar)

  return (
    <div style={{ background: colorFondo, borderBottom: `1px solid ${colorBorde}` }}>
      <style>{`
        .banner-dash-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .banner-dash-texto { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .banner-dash-acciones { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        @media (max-width: 640px) {
          .banner-dash-inner { flex-direction: column; align-items: flex-start; }
        }
      `}</style>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '10px 16px' }}>
        <div className="banner-dash-inner">
          <div className="banner-dash-texto">
            <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
            <p style={{ fontSize: 13, color: colorTexto, margin: 0, lineHeight: 1.5 }}>{mensaje}</p>
          </div>

          {hayAcciones && (
            <div className="banner-dash-acciones">
              {accionPrincipal && (
                <button
                  onClick={accionPrincipal.onClick}
                  disabled={accionPrincipal.disabled}
                  style={{
                    background: colorAccento, color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    cursor: accionPrincipal.disabled ? 'not-allowed' : 'pointer',
                    opacity: accionPrincipal.disabled ? 0.6 : 1, flexShrink: 0,
                  }}
                >
                  {accionPrincipal.label}
                </button>
              )}
              {accionSecundaria && (
                <button
                  onClick={accionSecundaria.onClick}
                  style={{ background: 'none', color: colorTexto, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
                >
                  {accionSecundaria.label}
                </button>
              )}
              {onCerrar && (
                <button
                  onClick={onCerrar}
                  aria-label={cerrarAriaLabel}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: colorTexto, flexShrink: 0, padding: 2 }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
