'use client'

import Link from 'next/link'
import { ArrowLeft, Cookie, Settings } from 'lucide-react'

export default function PoliticaCookies() {
  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        h1, h2, h3 { font-family: "'Fraunces', serif"; }
        .container { max-width: 800px; margin: 0 auto; padding: 24px 20px; }
        .card { background: #fff; borderRadius: 16px; padding: 32px; border: 1px solid #E5E7EB; }
        .section { marginBottom: 28px; }
        .section-title { fontSize: 18px; fontWeight: 700; color: '#3730A3'; marginBottom: 12px; }
        .text { fontSize: 14px; color: '#374151'; lineHeight: 1.7; marginBottom: 12px; }
        .list { paddingLeft: 20px; marginBottom: 12px; }
        .list li { fontSize: 14px; color: '#374151'; lineHeight: 1.7; marginBottom: 6px; }
        .highlight { background: '#EEF2FF'; padding: 16px; borderRadius: 10px; border-left: 4px solid #3730A3; margin: 16px 0; }
        .cookie-table { width: 100%; borderCollapse: 'collapse'; marginTop: 16px; }
        .cookie-table th, .cookie-table td { padding: 12px; textAlign: 'left'; borderBottom: '1px solid #E5E7EB'; fontSize: 13px; }
        .cookie-table th { background: '#F9FAFB'; fontWeight: 600; color: '#3730A3'; }
        @media (max-width: 640px) { .card { padding: 24px 18px; } }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </Link>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="container">
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6B7280', textDecoration: 'none', fontSize: 14, marginBottom: 20 }}>
          <ArrowLeft size={16} /> Volver al inicio
        </Link>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cookie size={24} color="#3730A3" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 }}>Política de Cookies</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Última actualización: 21 de marzo de 2026</p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">1. Responsable</h2>
            <p className="text">
              Salurama S.A.S. de C.V. es responsable del uso de cookies y tecnologías similares en la plataforma salurama.com.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">2. ¿Qué son las cookies?</h2>
            <p className="text">
              Las cookies son pequeños archivos de texto que se almacenan en su dispositivo al visitar un sitio web. Permiten:
            </p>
            <ul className="list">
              <li>Recordar preferencias del usuario</li>
              <li>Analizar el uso de la plataforma</li>
              <li>Mejorar la experiencia de navegación</li>
            </ul>
          </div>

          <div className="section">
            <h2 className="section-title">3. Tipos de cookies que utilizamos</h2>

            <div className="highlight">
              <p style={{ fontSize: 14, color: '#374151', margin: '0 0 8px 0' }}>
                <strong>3.1 Cookies necesarias (NO requieren consentimiento):</strong>
              </p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                Permiten el funcionamiento básico de la plataforma: Inicio de sesión y autenticación, Seguridad de la plataforma, Navegación entre páginas, Balanceo de carga del servidor.
              </p>
            </div>

            <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 10, margin: '16px 0' }}>
              <p style={{ fontSize: 14, color: '#374151', margin: '0 0 8px 0' }}>
                <strong>3.2 Cookies de análisis (requieren consentimiento):</strong>
              </p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                Nos permiten entender cómo los usuarios interactúan: Google Analytics (implementación futura). Datos recopilados: páginas visitadas, tiempo de navegación, ubicación aproximada, dispositivo utilizado.
              </p>
            </div>

            <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 10, margin: '16px 0' }}>
              <p style={{ fontSize: 14, color: '#374151', margin: '0 0 8px 0' }}>
                <strong>3.3 Cookies de funcionalidad (requieren consentimiento):</strong>
              </p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                Permiten recordar preferencias: Configuración de idioma, Ubicación guardada, Búsquedas recientes, Servicios: Mapbox (mapas y geolocalización).
              </p>
            </div>

            <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 10, margin: '16px 0' }}>
              <p style={{ fontSize: 14, color: '#374151', margin: '0 0 8px 0' }}>
                <strong>3.4 Cookies de publicidad (requieren consentimiento):</strong>
              </p>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                Para mostrar anuncios relevantes: Facebook Pixel (implementación futura), Google Ads (implementación futura). Permiten: medir campañas, publicidad personalizada.
              </p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">4. Cookies de terceros</h2>
            <p className="text">Algunas cookies son gestionadas por terceros:</p>
            
            <table className="cookie-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Finalidad</th>
                  <th>Política de Privacidad</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Supabase</td>
                  <td>Autenticación</td>
                  <td><a href="https://supabase.com/privacy" target="_blank" style={{ color: '#3730A3' }}>supabase.com/privacy</a></td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>Hosting</td>
                  <td><a href="https://vercel.com/privacy" target="_blank" style={{ color: '#3730A3' }}>vercel.com/privacy</a></td>
                </tr>
                <tr>
                  <td>Mapbox</td>
                  <td>Mapas</td>
                  <td><a href="https://mapbox.com/legal/privacy" target="_blank" style={{ color: '#3730A3' }}>mapbox.com/legal/privacy</a></td>
                </tr>
                <tr>
                  <td>Google</td>
                  <td>Analytics y Ads</td>
                  <td><a href="https://policies.google.com/privacy" target="_blank" style={{ color: '#3730A3' }}>policies.google.com/privacy</a></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section">
            <h2 className="section-title">5. Gestión de cookies</h2>
            
            <p className="text">Usted puede:</p>
            <ul className="list">
              <li>Configurar su navegador para bloquear cookies</li>
              <li>Eliminar cookies existentes</li>
              <li>Aceptar o rechazar categorías específicas</li>
            </ul>

            <p className="text"><strong>Cómo configurar cookies por navegador:</strong></p>
            <ul className="list">
              <li>Chrome: chrome://settings/cookies</li>
              <li>Firefox: about:preferences#privacy</li>
              <li>Safari: Preferencias &gt; Privacidad</li>
              <li>Edge: edge://settings/cookies</li>
            </ul>

            <div className="highlight">
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                <strong>Consecuencias de bloquear cookies:</strong> Algunas funcionalidades pueden no estar disponibles, la experiencia de usuario puede verse afectada, el inicio de sesión puede requerir autenticación frecuente.
              </p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">6. Consentimiento</h2>
            
            <p className="text">
              La plataforma mostrará un banner al primer acceso donde podrá:
            </p>
            <ul className="list">
              <li>Aceptar todas las cookies</li>
              <li>Rechazar cookies no necesarias</li>
              <li>Configurar preferencias por categoría</li>
            </ul>
            <p className="text">
              El consentimiento puede ser revocado en cualquier momento desde la configuración de cookies.
            </p>
            <p className="text">
              Las cookies necesarias NO pueden ser desactivadas.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">7. Contacto</h2>
            <p className="text">
              Para dudas sobre cookies: <strong>privacidad@salurama.com</strong>
            </p>
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 24, marginTop: 32 }}>
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>
              © 2026 Salurama S.A.S. de C.V. (en constitución) · Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}