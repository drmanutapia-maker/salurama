'use client'

import Link from 'next/link'
import { Mail, Calendar, Shield, Users } from 'lucide-react'

export default function ComingSoon() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #EEF2FF 0%, #FAFAFA 100%)', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        .fade-in { animation: fadeIn 0.6s ease-out; }
        @media (max-width: 640px) {
          .container { padding: 24px 16px !important; }
          .logo { font-size: clamp(42px, 10vw, 64px) !important; }
        }
      `}</style>

      {/* NAVBAR SIMPLE */}
      <nav style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #F3F4F6', padding: '0 20px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
          </div>
          <a href="mailto:hola@salurama.com" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>
            hola@salurama.com
          </a>
        </div>
      </nav>

      {/* HERO */}
      <main className="container" style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(60px, 10vw, 100px) 20px', textAlign: 'center' }}>
        <div className="fade-in">
          {/* LOGO GRANDE */}
          <div style={{ marginBottom: 16 }}>
            <span className="logo" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(56px, 12vw, 84px)', fontWeight: 900, color: '#3730A3', letterSpacing: '-2px' }}>Salu</span>
            <span className="logo" style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(56px, 12vw, 84px)', fontWeight: 600, color: '#F4623A', letterSpacing: '-2px' }}>rama</span>
          </div>

          {/* TAGLINE */}
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 600, fontStyle: 'italic', color: '#4F46E5', marginBottom: 12 }}>
            Salud en tus manos
          </p>

          {/* MENSAJE PRINCIPAL */}
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: '#1A1A2E', marginBottom: 16, lineHeight: 1.3 }}>
            Estamos preparando algo especial
          </h1>

          <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#6B7280', lineHeight: 1.7, marginBottom: 32, maxWidth: 600, margin: '0 auto 32px', fontWeight: 300 }}>
            El primer directorio médico donde la confianza se verifica. 
            <strong style={{ color: '#3730A3', fontWeight: 500 }}>Más que opiniones, evidencia.</strong>
          </p>

          {/* CARACTERÍSTICAS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 700, margin: '0 auto 40px' }}>
            <div style={{ background: '#fff', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Shield size={24} color="#3730A3" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Verificación oficial</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>Cédulas y certificaciones verificables</p>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Users size={24} color="#3730A3" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Directorio gratuito</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>Para médicos y pacientes</p>
            </div>
            <div style={{ background: '#fff', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Calendar size={24} color="#3730A3" style={{ marginBottom: 10 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Próximamente</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>Lanzamiento oficial 2026</p>
            </div>
          </div>

          {/* CTA MÉDICOS */}
          <div style={{ background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)', padding: 'clamp(24px, 5vw, 32px)', borderRadius: 18, maxWidth: 520, margin: '0 auto 24px', boxShadow: '0 8px 24px rgba(55,48,163,0.2)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#F4623A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              ¿Eres médico?
            </p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: '#fff', marginBottom: 8 }}>
              Tus pacientes te están buscando
            </h2>
            <p style={{ color: '#A5B4FC', fontSize: 13, marginBottom: 16, fontWeight: 300 }}>
              Registro gratuito · Sin comisiones · Perfil verificado
            </p>
            <a href="mailto:hola@salurama.com?subject=Interesado en Salurama - Médico" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4623A', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.18s' }}>
              <Mail size={16} />
              Avisarme cuando lance
            </a>
            <p style={{ color: '#A5B4FC', fontSize: 11, marginTop: 10, fontWeight: 300 }}>
              Te notificaremos antes del lanzamiento oficial
            </p>
          </div>

          {/* CONTACTO GENERAL */}
          <div style={{ marginTop: 32 }}>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>¿Tienes dudas o sugerencias?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="mailto:hola@salurama.com" style={{ fontSize: 13, color: '#3730A3', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #3730A344' }}>
                hola@salurama.com
              </a>
              <span style={{ color: '#D1D5DB' }}>•</span>
              <a href="mailto:privacidad@salurama.com" style={{ fontSize: 13, color: '#3730A3', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #3730A344' }}>
                privacidad@salurama.com
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{ background: '#fff', borderTop: '1px solid #F3F4F6', padding: '24px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
            © 2026 Salurama S.A.S. de C.V. (en constitución) · Todos los derechos reservados
          </p>
          <p style={{ fontSize: 11, color: '#D1D5DB' }}>
            Hecho en México 🇲🇽
          </p>
        </div>
      </footer>
    </div>
  )
}