'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Scale } from 'lucide-react'

export default function TerminosCondiciones() {
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
        .warning { background: '#FFF0EB'; padding: 16px; borderRadius: 10px; border-left: 4px solid #F4623A; margin: 16px 0; }
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
              <FileText size={24} color="#3730A3" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 }}>Términos y Condiciones de Uso</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Última actualización: 21 de marzo de 2026</p>
            </div>
          </div>

          <div className="warning">
            <p style={{ fontSize: 14, color: '#993C1D', margin: 0 }}>
              <strong>AL ACCEDER A SALURAMA, USTED ACEPTA LOS SIGUIENTES TÉRMINOS:</strong>
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">1. Identificación del responsable</h2>
            
            <p className="text">
              Salurama es operado por <strong>Salurama S.A.S. de C.V. (en constitución)</strong>, sociedad mercantil mexicana, con domicilio fiscal en Ciudad de México, representada legalmente por Manuel Augusto Tapia Dávila.
            </p>
            <p className="text">
              Para efectos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, Salurama es el "Responsable" del tratamiento de sus datos personales.
            </p>
            <p className="text">Contacto: <strong>hola@salurama.com</strong></p>
          </div>

          <div className="section">
            <h2 className="section-title">2. Naturaleza del servicio</h2>
            
            <p className="text">
              Salurama es ÚNICAMENTE un directorio digital que facilita la conexión entre pacientes y profesionales de la salud registrados.
            </p>

            <div className="warning">
              <p style={{ fontSize: 14, color: '#993C1D', margin: 0 }}>
                <strong>IMPORTANTE: Salurama NO:</strong>
              </p>
              <ul className="list" style={{ marginBottom: 0, marginTop: 8 }}>
                <li>Presta servicios médicos</li>
                <li>Realiza diagnósticos</li>
                <li>Recomienda tratamientos</li>
                <li>Garantiza resultados médicos</li>
                <li>Interviene en la relación médico-paciente</li>
                <li>Procesa pagos entre pacientes y médicos</li>
              </ul>
            </div>

            <p className="text">
              La relación médico-paciente es EXCLUSIVAMENTE entre el usuario y el profesional de la salud, sin participación de Salurama.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">3. Limitación de responsabilidad</h2>
            
            <p className="text">Salurama NO será responsable por:</p>
            <ul className="list">
              <li>Actos u omisiones de los profesionales de la salud</li>
              <li>Resultados de tratamientos médicos</li>
              <li>Decisiones clínicas tomadas por los profesionales</li>
              <li>Daños o perjuicios derivados del uso de la plataforma</li>
              <li>Información falsa o inexacta proporcionada por los profesionales</li>
              <li>Comunicaciones o acuerdos realizados fuera de la plataforma</li>
              <li>Errores en la verificación de cédulas profesionales</li>
            </ul>

            <div className="highlight">
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                <strong>Límite de responsabilidad contractual:</strong> En ningún caso la responsabilidad acumulada de Salurama excederá el monto de <strong>$1,000.00 MXN</strong> (mil pesos 00/100 M.N.) por cualquier concepto derivado del uso de la plataforma.
              </p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">4. Registro y uso</h2>
            
            <p className="text">El usuario se compromete a:</p>
            <ul className="list">
              <li>Proporcionar información veraz y actualizada</li>
              <li>Mantener confidencialidad de su cuenta</li>
              <li>No suplantar identidad</li>
              <li>No usar la plataforma para fines ilegales</li>
            </ul>

            <p className="text">Salurama se reserva el derecho de:</p>
            <ul className="list">
              <li>Suspender cuentas sin previo aviso por incumplimiento</li>
              <li>Eliminar contenido falso o fraudulento</li>
              <li>Modificar los términos en cualquier momento</li>
            </ul>
          </div>

          <div className="section">
            <h2 className="section-title">5. Verificación de profesionales</h2>
            
            <p className="text">
              Salurama verifica cédulas profesionales ante la Secretaría de Educación Pública (SEP) de manera manual.
            </p>
            <p className="text">
              La verificación se basa en información pública disponible en portales gubernamentales al momento de la consulta.
            </p>
            <p className="text">
              Salurama no garantiza la vigencia continua de la cédula profesional después de la verificación inicial.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">6. Propiedad intelectual</h2>
            
            <p className="text">
              Todo el contenido de la plataforma (código, diseño, logos, textos) es propiedad exclusiva de Salurama S.A.S. de C.V.
            </p>
            <p className="text">
              Queda prohibida la reproducción, distribución o uso comercial sin autorización escrita.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">7. Monetización</h2>
            
            <p className="text">La plataforma podrá incluir:</p>
            <ul className="list">
              <li>Publicidad de terceros</li>
              <li>Servicios premium</li>
              <li>Colaboraciones con farmacéuticas, aseguradoras o laboratorios</li>
            </ul>
            <p className="text">
              El registro y perfil básico es GRATUITO para médicos.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">8. Jurisdicción y ley aplicable</h2>
            
            <p className="text">
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.
            </p>
            <p className="text">
              Para cualquier controversia, las partes se someten a los tribunales de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.
            </p>
            <p className="text">
              Las controversias se resolverán primero mediante mediación. De no llegar a acuerdo, se someterán a arbitraje ante el Centro de Arbitraje de México (CAM).
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">9. Vigencia</h2>
            
            <p className="text">
              Estos términos entran en vigor el 21 de marzo de 2026.
            </p>
            <p className="text">
              Salurama se reserva el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados con 15 días de anticipación.
            </p>
            <p className="text">
              El uso continuado de la plataforma después de cambios implica aceptación de los nuevos términos.
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