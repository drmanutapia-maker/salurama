'use client'

import Link from 'next/link'
import { ArrowLeft, UserCheck, Stethoscope } from 'lucide-react'

export default function TerminosProfesionales() {
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
        .warning { background: '#DCFCE7'; padding: 16px; borderRadius: 10px; border-left: 4px solid '#059669'; margin: 16px 0; }
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
              <UserCheck size={24} color="#3730A3" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 }}>Términos para Profesionales de la Salud</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Última actualización: 21 de marzo de 2026</p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">1. Identificación</h2>
            <p className="text">
              Este contrato regula la relación entre <strong>Salurama S.A.S. de C.V. (en constitución)</strong> y los profesionales de la salud que utilizan la plataforma.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">2. Naturaleza de la relación</h2>
            
            <p className="text">El profesional reconoce que:</p>
            <ul className="list">
              <li>Salurama es ÚNICAMENTE una plataforma tecnológica intermediaria</li>
              <li>NO existe relación laboral, sociedad o representación legal</li>
              <li>El profesional actúa de manera independiente</li>
              <li>El profesional es responsable de sus actos profesionales</li>
            </ul>

            <p className="text">Salurama NO:</p>
            <ul className="list">
              <li>Ejerce la medicina</li>
              <li>Supervisa actos médicos</li>
              <li>Garantiza resultados de tratamientos</li>
              <li>Interviene en la relación médico-paciente</li>
            </ul>
          </div>

          <div className="section">
            <h2 className="section-title">3. Registro y verificación</h2>
            
            <p className="text">El profesional se compromete a:</p>
            <ul className="list">
              <li>Proporcionar información VERAZ y ACTUALIZADA</li>
              <li>Contar con cédula profesional VÁLIDA en México</li>
              <li>Mantener actualizados sus datos de contacto</li>
              <li>Notificar cambios en su situación profesional</li>
            </ul>

            <div className="warning">
              <p style={{ fontSize: 14, color: '#065F46', margin: '0 0 8px 0' }}>
                <strong>Proceso de verificación:</strong>
              </p>
              <ul className="list" style={{ marginBottom: 0 }}>
                <li>Salurama verificará la cédula profesional ante la SEP</li>
                <li>El proceso toma 24-48 horas hábiles</li>
                <li>El profesional será notificado del resultado</li>
                <li>Perfiles no verificados no serán visibles públicamente</li>
              </ul>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">4. Responsabilidad médica</h2>
            
            <p className="text">El profesional acepta que:</p>
            <ul className="list">
              <li>Es el ÚNICO responsable de los servicios médicos prestados</li>
              <li>Salurama NO participa en diagnósticos ni tratamientos</li>
              <li>La relación médico-paciente es directa entre las partes</li>
              <li>Salurama NO es responsable de resultados médicos</li>
            </ul>

            <div className="highlight">
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                <strong>Indemnización:</strong> El profesional indemnizará a Salurama S.A.S. de C.V. por cualquier reclamación, demanda o multa derivada de su actuación profesional.
              </p>
            </div>
          </div>

          <div className="section">
            <h2 className="section-title">5. Reseñas y reputación</h2>
            
            <p className="text">Los pacientes podrán dejar reseñas y calificaciones.</p>
            <p className="text">El profesional acepta que:</p>
            <ul className="list">
              <li>Las reseñas serán públicas</li>
              <li>No podrá eliminar reseñas negativas legítimas</li>
              <li>Podrá responder a las reseñas de manera profesional</li>
            </ul>
            <p className="text">Salurama se reserva el derecho de:</p>
            <ul className="list">
              <li>Eliminar contenido ofensivo o falso</li>
              <li>Moderar reseñas sin previo aviso</li>
              <li>Suspender cuentas con reseñas fraudulentas</li>
            </ul>
          </div>

          <div className="section">
            <h2 className="section-title">6. Monetización y servicios futuros</h2>
            
            <p className="text">El directorio básico es GRATUITO para médicos.</p>
            <p className="text">Salurama podrá implementar servicios premium:</p>
            <ul className="list">
              <li>Posicionamiento destacado</li>
              <li>Herramientas de gestión de agenda</li>
              <li>Estadísticas de perfil</li>
              <li>Procesamiento de pagos en línea (futuro)</li>
            </ul>
            <p className="text">
              Las tarifas de servicios premium serán informadas previamente y requerirán aceptación expresa.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">7. Suspensión y cancelación</h2>
            
            <p className="text">Salurama podrá suspender o eliminar cuentas por:</p>
            <ul className="list">
              <li>Información falsa o engañosa</li>
              <li>Mala conducta profesional</li>
              <li>Violaciones a estos términos</li>
              <li>Solicitud de la autoridad competente</li>
              <li>Inactividad por más de 12 meses</li>
            </ul>
            <p className="text">
              El profesional podrá cancelar su cuenta en cualquier momento notificando a: <strong>hola@salurama.com</strong>
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">8. Jurisdicción y ley aplicable</h2>
            
            <p className="text">
              Este contrato se rige por las leyes de México.
            </p>
            <p className="text">
              Para controversias, las partes se someten a los tribunales de la Ciudad de México.
            </p>
            <p className="text">
              Las controversias se resolverán primero mediante mediación.
            </p>
          </div>

          <div className="section">
            <h2 className="section-title">9. Vigencia</h2>
            
            <p className="text">
              Estos términos entran en vigor el 21 de marzo de 2026.
            </p>
            <p className="text">
              Salurama se reserva el derecho de modificar los términos con 15 días de anticipación.
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