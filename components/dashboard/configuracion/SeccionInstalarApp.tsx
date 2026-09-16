'use client'
import { Download, Share, Smartphone } from 'lucide-react'
import { useInstalarAppElegibilidad } from '@/hooks/useInstalarAppElegibilidad'

// Sección independiente de /dashboard/configuracion -- usa el mismo hook
// que el banner del layout (BannerInstalarApp en DashboardNavClient.tsx),
// pero sin su filtro de "solo móvil" ni su lógica de "una sola vez por
// cuenta": esta pantalla es una acción que el médico busca activamente, así
// que se muestra siempre que el navegador la ofrezca (incluido escritorio,
// a diferencia del banner), sin depender de pwa_banner_shown en absoluto.
// Se oculta por completo cuando `modo` es 'ninguno' (ya instalada / iOS sin
// Safari) o se queda en 'esperando' (navegador sin soporte del evento
// beforeinstallprompt, ej. Firefox de escritorio) -- en ambos casos no hay
// nada útil que ofrecer.
export default function SeccionInstalarApp() {
  const { modo, deferredPrompt } = useInstalarAppElegibilidad()

  const handleInstalar = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    try { await deferredPrompt.userChoice } catch {}
  }

  if (modo !== 'android' && modo !== 'ios') return null

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Smartphone size={20} color="#1E3A5F" aria-hidden="true" />
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>Instalar app</h2>
      </div>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>
        Instala Salurama en tu dispositivo para acceso más rápido, sin ocupar espacio de más.
      </p>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {modo === 'android' ? (
          <>
            <p style={{ fontSize: 14, color: '#374151', flex: 1, minWidth: 200 }}>
              Usa el botón de abajo, o desde el menú ⋮ de Chrome elige "Instalar app" o "Agregar a pantalla de inicio".
            </p>
            <button
              onClick={handleInstalar}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Download size={16} aria-hidden="true" /> Instalar
            </button>
          </>
        ) : (
          <p style={{ fontSize: 14, color: '#374151' }}>
            En Safari, toca el ícono de{' '}
            <Share size={14} style={{ display: 'inline', verticalAlign: -2, margin: '0 2px' }} aria-hidden="true" /> Compartir (abajo
            o arriba de la pantalla) y luego elige "Agregar a inicio".
          </p>
        )}
      </div>
    </section>
  )
}
