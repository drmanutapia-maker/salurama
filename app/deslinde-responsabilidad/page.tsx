'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ShieldCheck, GraduationCap, ExternalLink } from 'lucide-react'

export default function DeslindeResponsabilidad() {
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
        .alert-big { background: #FFFBEB; border: 2px solid #FCD34D; border-radius: 14px;
          padding: 20px 24px; margin: 24px 0; }
        .alert-big p { margin: 0; color: #78350F; font-size: 15px; line-height: 1.75; }
        .info-box { background: #EEF2FF; border: 1.5px solid #C7D2FE; border-radius: 10px;
          padding: 16px 20px; margin: 16px 0; }
        .info-box p { margin: 0; color: #3730A3; font-size: 14px; font-weight: 500; line-height: 1.65; }
        .legal-p { font-size: 14px; color: #4B5563; line-height: 1.85; margin-bottom: 14px; }
        .legal-h2 { font-family: 'Fraunces', serif; font-size: clamp(18px,3.5vw,22px);
          font-weight: 900; color: #1E1B4B; margin: 0 0 14px;
          padding-bottom: 10px; border-bottom: 2px solid #EEF2FF; }
        .legal-ul { padding-left: 20px; margin-bottom: 14px; }
        .legal-li { font-size: 14px; color: #4B5563; line-height: 1.8; margin-bottom: 6px; }
        .legal-strong { color: #1A1A2E; font-weight: 600; }
        .section-block { margin-bottom: 44px; scroll-margin-top: 80px; }
        .verify-btn { display: inline-flex; align-items: center; gap: 8px;
          background: #3730A3; color: #fff; text-decoration: none;
          padding: 11px 22px; border-radius: 50px; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; transition: background 0.18s; margin: 6px 6px 6px 0; }
        .verify-btn:hover { background: #4F46E5; }
        .verify-btn.secondary { background: #F9FAFB; color: #3730A3; border: 1.5px solid #C7D2FE; }
        .verify-btn.secondary:hover { background: #EEF2FF; }
        @media (max-width: 768px) {
          .dsk { display: none !important; }
          .mob-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mob-btn { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #FFFBEB 0%, #fff 60%)', padding: 'clamp(40px,6vw,60px) 20px 32px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Información importante
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(26px,5vw,38px)', fontWeight: 900, color: '#1E1B4B', marginBottom: 12, lineHeight: 1.2 }}>
            Deslinde de Responsabilidad Médica
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            Última actualización: 31 de marzo de 2026 · SALURAMA S.A.S.
          </p>
        </div>
      </section>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 20px 80px' }}>

        <div className="alert-big">
          <p>
            <strong>Salurama es un directorio de información, no un prestador de servicios médicos.</strong>{' '}
            No verifica, avala, certifica ni garantiza la calidad clínica de ningún profesional listado.
            La decisión de consultar a un médico es exclusivamente del paciente, quien asume la responsabilidad
            de verificar las credenciales mediante las herramientas y fuentes oficiales que Salurama facilita.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">1. Naturaleza de Salurama</h2>
          <p className="legal-p">
            Salurama opera como un <strong className="legal-strong">directorio digital de información pública</strong> sobre profesionales de la salud. Su función es facilitar el acceso a datos declarados por los propios profesionales y proporcionar acceso directo a fuentes oficiales para que el usuario pueda verificarlos de manera independiente.
          </p>
          <p className="legal-p">
            Salurama no ejerce la medicina, no participa en diagnósticos ni tratamientos, no supervisa la práctica clínica de los profesionales listados y no es parte de la relación médico-paciente en ninguna circunstancia.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">2. Lo que Salurama NO hace</h2>
          <ul className="legal-ul">
            <li className="legal-li">No verifica de forma independiente la vigencia, autenticidad o alcance de ninguna cédula profesional ni certificación de especialidad.</li>
            <li className="legal-li">No avala ni recomienda a ningún profesional de la salud sobre otro.</li>
            <li className="legal-li">No supervisa la calidad de la atención médica prestada.</li>
            <li className="legal-li">No garantiza que la información publicada en los perfiles esté actualizada o sea exacta.</li>
            <li className="legal-li">No interviene en la comunicación entre paciente y médico una vez establecido el contacto.</li>
          </ul>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">3. Lo que Salurama SÍ hace — y cómo usarlo</h2>
          <div className="info-box">
            <p>Salurama proporciona acceso directo a fuentes oficiales del gobierno mexicano para que el paciente pueda verificar por sí mismo las credenciales de cualquier médico antes de agendar una cita.</p>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#3730A3', margin: '20px 0 10px' }}>Verificar cédula profesional</h3>
          <p className="legal-p">
            En el perfil de cada médico encontrarás el botón "Verificar cédula" que te lleva directamente al portal de la Dirección General de Profesiones de la SEP. Ahí puedes confirmar:
          </p>
          <ul className="legal-ul">
            <li className="legal-li">Que la cédula está registrada y corresponde al nombre del médico.</li>
            <li className="legal-li">Que la especialidad declarada tiene cédula propia (las especialidades requieren cédula adicional a la de médico general).</li>
            <li className="legal-li">La institución donde realizó sus estudios.</li>
          </ul>
          <a href="https://www.dgp.sep.gob.mx" target="_blank" rel="noopener noreferrer" className="verify-btn">
            <ShieldCheck size={16} /> Ir al portal SEP <ExternalLink size={14} />
          </a>

          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#3730A3', margin: '24px 0 10px' }}>Verificar certificación de especialidad</h3>
          <p className="legal-p">
            Más allá de la cédula, muchos especialistas se certifican ante el consejo de su especialidad. Esta certificación acredita actualización continua y cumplimiento de estándares de calidad. También encontrarás el enlace directo en el perfil del médico.
          </p>
          <a href="https://www.consejonacional.com.mx" target="_blank" rel="noopener noreferrer" className="verify-btn secondary">
            <GraduationCap size={16} /> Directorio de consejos de especialidad <ExternalLink size={14} />
          </a>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">4. Responsabilidad del paciente</h2>
          <p className="legal-p">
            Al utilizar Salurama para buscar y contactar a un profesional de la salud, el usuario reconoce y acepta que:
          </p>
          <ul className="legal-ul">
            <li className="legal-li">La verificación de credenciales es una herramienta de información, no una garantía de resultado clínico.</li>
            <li className="legal-li">La decisión de consultar a un médico específico es exclusivamente suya.</li>
            <li className="legal-li">Salurama no asume responsabilidad por el resultado de la consulta, tratamiento o procedimiento médico.</li>
            <li className="legal-li">Ante cualquier duda sobre las credenciales de un profesional, puede y debe verificarlas directamente en las fuentes oficiales indicadas.</li>
          </ul>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">5. Reporte de irregularidades</h2>
          <p className="legal-p">
            Si encuentras un perfil con información que consideras falsa o que no coincide con las fuentes oficiales, puedes reportarlo a:
          </p>
          <p className="legal-p">
            <a href="mailto:reportes@salurama.com" style={{ color: '#3730A3', fontWeight: 600 }}>reportes@salurama.com</a>
          </p>
          <p className="legal-p">
            Salurama investigará el reporte y, en caso de encontrar inconsistencias documentadas, procederá conforme a los Términos para Profesionales. La seguridad y la veracidad de la información son prioritarias para nosotros.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">6. Limitación de responsabilidad</h2>
          <p className="legal-p">
            En ningún caso SALURAMA S.A.S., sus directivos, empleados o representantes serán responsables por daños directos, indirectos, incidentales o consecuentes derivados de: (i) la consulta a un profesional encontrado a través de la plataforma, (ii) información incorrecta proporcionada por el profesional, (iii) el resultado de cualquier acto médico. Esta limitación aplica en la máxima medida permitida por la legislación mexicana aplicable.
          </p>
          <p className="legal-p" style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
            © 2026 SALURAMA S.A.S. · Todos los derechos reservados · salurama.com
          </p>
        </div>

      </div>

      {/* CTA */}
      <section style={{ background: '#EEF2FF', padding: 'clamp(32px,5vw,44px) 20px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px,4vw,24px)', fontWeight: 900, color: '#1E1B4B', marginBottom: 16 }}>
          ¿Listo para elegir con información real?
        </p>
        <Link href="/como-elegir-medico" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#3730A3', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '12px 26px', borderRadius: '50px', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
          Ver guía para elegir médico →
        </Link>
      </section>

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