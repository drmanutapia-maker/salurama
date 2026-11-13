'use client'

import { useState, useEffect } from 'react'
import { Settings, Check, ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export default function CookieBanner() {
  const { isBannerVisible, acceptAll, rejectAll, saveConsent } = useCookieConsent()
  const [expandido, setExpandido] = useState(false)
  const [config, setConfig] = useState({ analytics: true, functionality: true })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!isBannerVisible) return null

  const handleSaveConfig = () => {
    saveConsent({
      necessary: true,
      analytics: config.analytics,
      functionality: config.functionality,
    })
    setExpandido(false)
  }

  const handleAcceptAll = () => {
    acceptAll()
    setExpandido(false)
  }

  const handleRejectAll = () => {
    rejectAll()
    setExpandido(false)
  }

  const containerStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 24px rgba(30, 27, 75, 0.12)',
        zIndex: 2000,
        border: '1px solid #E5E7EB',
        borderBottom: 'none',
        fontFamily: "'DM Sans', sans-serif",
      }
    : {
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 340,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(30, 27, 75, 0.15)',
        zIndex: 2000,
        border: '1px solid #E5E7EB',
        fontFamily: "'DM Sans', sans-serif",
      }

  return (
    <>
      {/* OVERLAY — solo móvil en estado expandido */}
      {isMobile && expandido && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1999,
          }}
          onClick={() => setExpandido(false)}
        />
      )}

      <div style={containerStyle}>
        {expandido ? (
          /* ESTADO EXPANDIDO */
          <>
            {/* Header fijo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px 0',
              }}
            >
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                  fontFamily: "'Fraunces', serif",
                }}
              >
                Personaliza tus cookies
              </p>
              <button
                onClick={() => setExpandido(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Cerrar"
              >
                {isMobile ? <ChevronDown size={20} /> : <X size={18} />}
              </button>
            </div>

            {/* Contenido scrollable en móvil */}
            <div
              style={{
                padding: '16px 20px 20px',
                maxHeight: isMobile ? '70vh' : 'none',
                overflowY: isMobile ? 'auto' : 'visible',
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: '#374151',
                  lineHeight: 1.7,
                  marginBottom: 20,
                }}
              >
                Elige qué cookies quieres aceptar. Las necesarias no se pueden
                desactivar.
              </p>

              {/* COOKIES NECESARIAS */}
              <div
                style={{
                  background: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 12,
                  opacity: 0.6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} color="#fff" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111827',
                        margin: 0,
                      }}
                    >
                      Cookies necesarias
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      Autenticación, seguridad (Supabase)
                    </p>
                  </div>
                </div>
                <p
                  style={{ fontSize: 11, color: '#6B7280', margin: 0, paddingLeft: 30 }}
                >
                  No se pueden desactivar. Esenciales para el funcionamiento.
                </p>
              </div>

              {/* COOKIES DE ANÁLISIS */}
              <div
                style={{
                  background: '#fff',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 12,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => setConfig((c) => ({ ...c, analytics: !c.analytics }))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: `2px solid ${config.analytics ? '#1E3A5F' : '#E5E7EB'}`,
                      background: config.analytics ? '#1E3A5F' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {config.analytics && <Check size={12} color="#fff" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111827',
                        margin: 0,
                      }}
                    >
                      Cookies de análisis
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      Vercel Analytics, Google Analytics (futuro)
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: '#6B7280', margin: '6px 0 0 30px' }}>
                  Nos ayudan a entender cómo usas la plataforma.
                </p>
              </div>

              {/* COOKIES DE FUNCIONALIDAD */}
              <div
                style={{
                  background: '#fff',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 20,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() =>
                  setConfig((c) => ({ ...c, functionality: !c.functionality }))
                }
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: `2px solid ${
                        config.functionality ? '#1E3A5F' : '#E5E7EB'
                      }`,
                      background: config.functionality ? '#1E3A5F' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {config.functionality && <Check size={12} color="#fff" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#111827',
                        margin: 0,
                      }}
                    >
                      Cookies de funcionalidad
                    </p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                      Preferencias guardadas
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: '#6B7280', margin: '6px 0 0 30px' }}>
                  Recuerdan tus preferencias entre sesiones.
                </p>
              </div>

              {/* BOTONES EXPANDIDO */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleRejectAll}
                  style={{
                    flex: 1,
                    background: '#fff',
                    color: '#111827',
                    border: '0.5px solid #E5E7EB',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Rechazar todo
                </button>
                <button
                  onClick={handleSaveConfig}
                  style={{
                    flex: 1,
                    background: '#1E3A5F',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Guardar preferencias
                </button>
              </div>

              {/* LINK POLÍTICA AL PIE */}
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Link
                  href="/politica-de-cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: '#1E3A5F',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Ver política completa →
                </Link>
              </div>
            </div>
          </>
        ) : (
          /* ESTADO COLAPSADO */
          <div style={{ padding: '16px' }}>
            <p
              style={{
                fontSize: 13,
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: 12,
              }}
            >
              Usamos cookies para mejorar tu experiencia.{' '}
              <Link
                href="/politica-de-cookies"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#1E3A5F',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Ver política completa
              </Link>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleRejectAll}
                style={{
                  flex: 1,
                  background: '#fff',
                  color: '#111827',
                  border: '0.5px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Rechazar todo
              </button>
              <button
                onClick={handleAcceptAll}
                style={{
                  flex: 1,
                  background: '#1E3A5F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Aceptar todo
              </button>
              <button
                onClick={() => setExpandido(true)}
                style={{
                  background: '#fff',
                  color: '#6B7280',
                  border: '0.5px solid #E5E7EB',
                  borderRadius: 8,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Personalizar cookies"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
