'use client'

import { useState } from 'react'
import { X, Shield, Settings, Check } from 'lucide-react'
import Link from 'next/link'
import { useCookieConsent } from '@/hooks/useCookieConsent'

export default function CookieBanner() {
  const { isBannerVisible, acceptAll, rejectAll, saveConsent, closeBanner } = useCookieConsent()
  const [showConfig, setShowConfig] = useState(false)
  const [config, setConfig] = useState({
    analytics: true,
    functionality: true,
  })

  if (!isBannerVisible) return null

  const handleSaveConfig = () => {
    saveConsent({
      necessary: true,
      analytics: config.analytics,
      functionality: config.functionality,
    })
  }

  return (
    <>
      {/* OVERLAY */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(30, 27, 75, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          display: showConfig ? 'block' : 'none',
        }}
        onClick={() => setShowConfig(false)}
      />

      {/* BANNER */}
      <div
        style={{
          position: 'fixed',
          bottom: showConfig ? '50%' : 24,
          left: showConfig ? '50%' : 24,
          right: showConfig ? 'auto' : 24,
          transform: showConfig ? 'translate(50%, 50%)' : 'none',
          width: showConfig ? 'min(500px, calc(100vw - 48px))' : 'auto',
          maxWidth: showConfig ? 'none' : 500,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(30, 27, 75, 0.15)',
          zIndex: 9999,
          overflow: 'hidden',
          border: '1px solid #E5E7EB',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #F3F4F6',
            background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#3730A3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1A1A2E',
                  margin: 0,
                  fontFamily: "'Fraunces', serif",
                }}
              >
                Tu privacidad importa
              </p>
              <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>
                Salurama · Política de Cookies
              </p>
            </div>
          </div>
          {!showConfig && (
            <button
              onClick={closeBanner}
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
              <X size={18} />
            </button>
          )}
        </div>

        {/* CONTENIDO */}
        {!showConfig ? (
          <div style={{ padding: '20px' }}>
            <p
              style={{
                fontSize: 13,
                color: '#374151',
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              Usamos cookies para mejorar tu experiencia. Las cookies{' '}
              <strong style={{ color: '#3730A3' }}>necesarias</strong> son
              indispensables para el funcionamiento. Las de{' '}
              <strong style={{ color: '#3730A3' }}>análisis</strong> y{' '}
              <strong style={{ color: '#3730A3' }}>funcionalidad</strong> nos
              ayudan a mejorar la plataforma.
            </p>

            <Link
              href="/politica-de-cookies"
              style={{
                fontSize: 12,
                color: '#3730A3',
                fontWeight: 600,
                textDecoration: 'underline',
                marginBottom: 16,
                display: 'inline-block',
              }}
            >
              Ver política completa →
            </Link>

            {/* BOTONES */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <button
                onClick={acceptAll}
                style={{
                  width: '100%',
                  background: '#3730A3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 50,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Check size={16} />
                Aceptar todas
              </button>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                }}
              >
                <button
                  onClick={rejectAll}
                  style={{
                    flex: 1,
                    background: '#F3F4F6',
                    color: '#6B7280',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 50,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Rechazar
                </button>
                <button
                  onClick={() => setShowConfig(true)}
                  style={{
                    flex: 1,
                    background: '#EEF2FF',
                    color: '#3730A3',
                    border: '1.5px solid #C7D2FE',
                    borderRadius: 50,
                    padding: '12px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Settings size={14} />
                  Configurar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
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
                      color: '#1A1A2E',
                      margin: 0,
                    }}
                  >
                    Cookies necesarias
                  </p>
                  <p
                    style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}
                  >
                    Autenticación, seguridad (Supabase)
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: '#6B7280',
                  margin: 0,
                  paddingLeft: 30,
                }}
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
              onClick={() =>
                setConfig((c) => ({ ...c, analytics: !c.analytics }))
              }
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `2px solid ${
                      config.analytics ? '#3730A3' : '#E5E7EB'
                    }`,
                    background: config.analytics ? '#3730A3' : '#fff',
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
                      color: '#1A1A2E',
                      margin: 0,
                    }}
                  >
                    Cookies de análisis
                  </p>
                  <p
                    style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}
                  >
                    Vercel Analytics, Google Analytics (futuro)
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: '#6B7280',
                  margin: '6px 0 0 30px',
                }}
              >
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `2px solid ${
                      config.functionality ? '#3730A3' : '#E5E7EB'
                    }`,
                    background: config.functionality ? '#3730A3' : '#fff',
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
                      color: '#1A1A2E',
                      margin: 0,
                    }}
                  >
                    Cookies de funcionalidad
                  </p>
                  <p
                    style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}
                  >
                    Mapbox, preferencias guardadas
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: '#6B7280',
                  margin: '6px 0 0 30px',
                }}
              >
                Recuerdan tus preferencias entre sesiones.
              </p>
            </div>

            {/* BOTONES DE CONFIGURACIÓN */}
            <div
              style={{
                display: 'flex',
                gap: 10,
              }}
            >
              <button
                onClick={() => setShowConfig(false)}
                style={{
                  flex: 1,
                  background: '#F3F4F6',
                  color: '#6B7280',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 50,
                  padding: '12px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Volver
              </button>
              <button
                onClick={handleSaveConfig}
                style={{
                  flex: 2,
                  background: '#3730A3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 50,
                  padding: '12px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}