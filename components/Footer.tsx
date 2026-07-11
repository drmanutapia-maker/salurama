'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  // El chat MSL Virtual ocupa el viewport completo con scroll interno propio;
  // el Footer haría que el documento exceda el viewport y el navegador
  // arranque con scroll de window desplazado hacia abajo. En /hema/educacion
  // el disclaimer NOM-004 de HemaLayout sí se mantiene (es de cumplimiento,
  // no de marketing) — solo este Footer se oculta.
  if (pathname?.startsWith('/dashboard/msl-virtual') || pathname?.startsWith('/hema/educacion')) return null

  return (
    <footer
      className=""
      style={{ background: '#1E3A5F', color: '#FFFFFF' }}
      role="contentinfo"
    >
      <style>{`
        .footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 40px; }
        @media (max-width: 767px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 0' }}>
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, color: '#fff' }}>Salu</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, color: '#2A9D8F' }}>rama</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: '#C5D0E0', margin: 0 }}>
              Verifica. Elige. Confía.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20, marginTop: 0 }}>Plataforma</h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/buscar" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Buscar médico</Link>
              <Link href="/como-elegir-medico" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>¿Cómo elegir médico?</Link>
              <Link href="/registro" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Soy Médico</Link>
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20, marginTop: 0 }}>Legal</h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/terminos-y-condiciones" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Términos y condiciones</Link>
              <Link href="/terminos-profesionales" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Términos para profesionales</Link>
              <Link href="/politica-de-cookies" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Política de cookies</Link>
              <Link href="/aviso-de-privacidad" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Aviso de privacidad</Link>
              <Link href="/deslinde-responsabilidad" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Deslinde de responsabilidad</Link>
              <Link href="/documentos-adicionales/politica-de-resenas" style={{ fontSize: 14, color: '#C5D0E0', textDecoration: 'none' }}>Política de reseñas</Link>
            </nav>
          </div>

          {/* Contacto */}
          <div>
            <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 20, marginTop: 0 }}>Contacto</h4>
            <p style={{ fontSize: 14, color: '#C5D0E0', margin: '0 0 8px 0' }}>¿Tienes dudas? Escríbenos:</p>
            <a href="mailto:hola@salurama.com" style={{ fontSize: 15, color: '#fff', fontWeight: 600, textDecoration: 'none' }}>hola@salurama.com</a>
          </div>
        </div>

        {/* Línea amarilla */}
        <div style={{ height: 1, background: '#E9C46A', width: '100%', marginBottom: 24 }} />

        {/* Copyright */}
        <div style={{ paddingBottom: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            © 2026 Salurama 🇲🇽 Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}