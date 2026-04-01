'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function PoliticaDeCookies() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-link { color: #1A1A2E; text-decoration: none; font-size: 15px; font-weight: 400;
          padding: 6px 2px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; }
        .nav-link:hover { color: #3730A3; border-color: #3730A3; }
        .btn-medico { background: #3730A3; color: #fff; text-decoration: none;
          padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; transition: background 0.18s;
          display: inline-flex; align-items: center; gap: 7px; }
        .btn-medico:hover { background: #4F46E5; }
        .legal-h2 { font-family: 'Fraunces', serif; font-size: clamp(18px,3.5vw,22px);
          font-weight: 900; color: #1E1B4B; margin: 0 0 14px;
          padding-bottom: 10px; border-bottom: 2px solid #EEF2FF; }
        .legal-h3 { font-size: 15px; font-weight: 600; color: #3730A3; margin: 20px 0 8px; }
        .legal-p { font-size: 14px; color: #4B5563; line-height: 1.85; margin-bottom: 12px; }
        .legal-ul { padding-left: 20px; margin-bottom: 14px; }
        .legal-li { font-size: 14px; color: #4B5563; line-height: 1.8; margin-bottom: 5px; }
        .legal-strong { color: #1A1A2E; font-weight: 600; }
        .alert-box { background: #EEF2FF; border: 1.5px solid #C7D2FE; border-radius: 10px;
          padding: 14px 18px; margin: 16px 0; }
        .alert-box p { margin: 0; color: #3730A3; font-size: 13px; font-weight: 500; line-height: 1.6; }
        .cookie-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
        .cookie-table th { background: #1E1B4B; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; }
        .cookie-table td { padding: 9px 14px; color: #4B5563; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
        .cookie-table tr:hover td { background: #F9FAFB; }
        .badge { display: inline-block; font-size: 11px; font-weight: 600; border-radius: 4px; padding: 2px 8px; }
        .badge-green { background: #D1FAE5; color: #065F46; }
        .badge-yellow { background: #FEF3C7; color: #92400E; }
        .section-block { margin-bottom: 44px; scroll-margin-top: 80px; }
        @media (max-width: 768px) {
          .dsk { display: none !important; }
          .mob-btn { display: flex !important; }
          .cookie-table { font-size: 12px; }
          .cookie-table td, .cookie-table th { padding: 7px 10px; }
        }
        @media (min-width: 769px) {
          .mob-btn { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(14px)', borderBottom: '1px solid #F3F4F6', padding: '0 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
          </Link>
          <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/buscar"             className="nav-link">Especialidades</Link>
            <Link href="/como-elegir-medico" className="nav-link">¿Cómo elegir médico?</Link>
            <Link href="/nosotros"           className="nav-link">Nosotros</Link>
            <Link href="/registro"           className="btn-medico">👨‍⚕️ Soy Médico</Link>
          </div>
          <button className="mob-btn" onClick={() => setMobileMenuOpen(o => !o)}
            style={{ display: 'none', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
            {mobileMenuOpen ? <X size={24} color="#3730A3" /> : <Menu size={24} color="#3730A3" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mob-menu" style={{ padding: '12px 20px 20px', borderTop: '1px solid #F3F4F6', background: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[['Especialidades','/buscar'],['¿Cómo elegir médico?','/como-elegir-medico'],['Nosotros','/nosotros']].map(([l,h]) => (
                <Link key={h} href={h} onClick={() => setMobileMenuOpen(false)}
                  style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', display: 'block' }}>{l}</Link>
              ))}
              <Link href="/registro" onClick={() => setMobileMenuOpen(false)} className="btn-medico"
                style={{ marginTop: 10, justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}>
                👨‍⚕️ Soy Médico
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #fff 60%)', padding: 'clamp(40px,6vw,60px) 20px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Tecnología y privacidad</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px,6vw,40px)', fontWeight: 900, color: '#1E1B4B', marginBottom: 12 }}>
            Política de Cookies
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Última actualización: 31 de marzo de 2026 · SALURAMA S.A.S.</p>
        </div>
      </section>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 80px' }}>

        <div className="section-block">
          <h2 className="legal-h2">1. ¿Qué son las cookies?</h2>
          <p className="legal-p">
            Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web. Permiten que el sitio recuerde sus preferencias, mantenga su sesión activa y entienda cómo interactúa con la plataforma.
          </p>
          <p className="legal-p">
            El uso de cookies en salurama.com está regulado por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (vigente desde el 21 de marzo de 2025) y los presentes Términos.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">2. Cookies que utilizamos</h2>

          <h3 className="legal-h3">Cookies necesarias <span className="badge badge-green">No requieren consentimiento</span></h3>
          <p className="legal-p">Son indispensables para el funcionamiento básico de la plataforma. No pueden desactivarse sin afectar el servicio.</p>
          <table className="cookie-table">
            <thead>
              <tr><th>Cookie</th><th>Finalidad</th><th>Duración</th></tr>
            </thead>
            <tbody>
              {[
                ['sb-auth-token','Autenticación de sesión (Supabase)','Sesión'],
                ['sb-refresh-token','Renovación de sesión activa','7 días'],
                ['csrf-token','Protección contra ataques CSRF','Sesión'],
              ].map(([n,f,d]) => <tr key={n}><td><code>{n}</code></td><td>{f}</td><td>{d}</td></tr>)}
            </tbody>
          </table>

          <h3 className="legal-h3" style={{ marginTop: 28 }}>Cookies de análisis <span className="badge badge-yellow">Requieren consentimiento</span></h3>
          <p className="legal-p">Nos permiten entender cómo los usuarios interactúan con la plataforma para mejorarla. Los datos se procesan de forma agregada y anónima.</p>
          <table className="cookie-table">
            <thead>
              <tr><th>Proveedor</th><th>Finalidad</th><th>Duración</th><th>Política</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Vercel Analytics</td>
                <td>Estadísticas de uso y rendimiento</td>
                <td>90 días</td>
                <td><a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#3730A3' }}>ver política</a></td>
              </tr>
            </tbody>
          </table>

          <h3 className="legal-h3" style={{ marginTop: 28 }}>Cookies de funcionalidad <span className="badge badge-yellow">Requieren consentimiento</span></h3>
          <p className="legal-p">Permiten recordar preferencias del usuario entre sesiones.</p>
          <table className="cookie-table">
            <thead>
              <tr><th>Cookie</th><th>Finalidad</th><th>Duración</th></tr>
            </thead>
            <tbody>
              {[
                ['salurama-city','Ciudad de búsqueda guardada','30 días'],
                ['salurama-prefs','Prioridades de búsqueda seleccionadas','30 días'],
                ['cookie-consent','Registro de preferencias de cookies','12 meses'],
              ].map(([n,f,d]) => <tr key={n}><td><code>{n}</code></td><td>{f}</td><td>{d}</td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">3. Cookies de terceros</h2>
          <table className="cookie-table">
            <thead>
              <tr><th>Proveedor</th><th>Servicio</th><th>Tipo</th><th>Política</th></tr>
            </thead>
            <tbody>
              {[
                ['Supabase Inc.','Base de datos y autenticación','Necesaria','supabase.com/privacy'],
                ['Vercel Inc.','Hosting y analytics','Necesaria / Análisis','vercel.com/legal/privacy-policy'],
                ['Resend Inc.','Correos transaccionales','Necesaria','resend.com/privacy'],
              ].map(([p,s,t,url]) => (
                <tr key={p}>
                  <td><strong>{p}</strong></td>
                  <td>{s}</td>
                  <td>{t}</td>
                  <td><a href={`https://${url}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3730A3', fontSize: 12 }}>ver política</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="legal-p">
            Todos los proveedores están ubicados en Estados Unidos. Las transferencias se realizan bajo contratos de protección de datos conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares vigente.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">4. Gestión del consentimiento</h2>
          <p className="legal-p">
            Al acceder por primera vez a salurama.com, verá un banner que le permitirá:
          </p>
          <ul className="legal-ul">
            <li className="legal-li"><strong className="legal-strong">Aceptar todas</strong> las cookies (necesarias + análisis + funcionalidad).</li>
            <li className="legal-li"><strong className="legal-strong">Rechazar</strong> las cookies no necesarias (solo se activarán las técnicas).</li>
            <li className="legal-li"><strong className="legal-strong">Configurar</strong> sus preferencias por categoría.</li>
          </ul>
          <p className="legal-p">Su elección se guarda en la cookie <code>cookie-consent</code> por 12 meses. Puede modificar sus preferencias en cualquier momento desde el enlace "Configurar cookies" en el pie de página.</p>
          <div className="alert-box">
            <p>Las cookies necesarias no pueden desactivarse. Son imprescindibles para mantener su sesión activa y garantizar la seguridad de la plataforma.</p>
          </div>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">5. Cómo gestionar cookies en su navegador</h2>
          <p className="legal-p">También puede gestionar o eliminar cookies directamente desde su navegador:</p>
          <ul className="legal-ul">
            <li className="legal-li"><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.</li>
            <li className="legal-li"><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies y datos del sitio.</li>
            <li className="legal-li"><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos de sitios web.</li>
            <li className="legal-li"><strong>Edge:</strong> Configuración → Privacidad, búsqueda y servicios → Cookies.</li>
          </ul>
          <p className="legal-p">
            Bloquear todas las cookies puede afectar el funcionamiento de la plataforma, en particular el inicio de sesión y la persistencia de preferencias.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">6. Actualizaciones</h2>
          <p className="legal-p">
            Esta Política podrá actualizarse cuando incorporemos nuevas tecnologías o proveedores. La fecha de última actualización siempre estará visible en la parte superior. Los cambios significativos se comunicarán mediante aviso en la plataforma.
          </p>
          <h2 className="legal-h2" style={{ marginTop: 32 }}>7. Contacto</h2>
          <p className="legal-p">
            Para consultas sobre el uso de cookies: <a href="mailto:privacidad@salurama.com" style={{ color: '#3730A3' }}>privacidad@salurama.com</a>
          </p>
          <p className="legal-p" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
            © 2026 SALURAMA S.A.S. · Todos los derechos reservados · salurama.com
          </p>
        </div>

      </div>

      <footer style={{ background: '#1E1B4B', padding: 'clamp(32px,5vw,40px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Términos y Condiciones','/terminos-y-condiciones'],['Aviso de Privacidad','/aviso-de-privacidad'],
              ['Términos Profesionales','/terminos-profesionales'],['Inicio','/']]
              .map(([l,h]) => <Link key={h} href={h} style={{ fontSize: 13, color: '#A5B4FC', textDecoration: 'none' }}>{l}</Link>)}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 SALURAMA S.A.S. · salurama.com · Hecho en México 🇲🇽</p>
        </div>
      </footer>
    </div>
  )
}
