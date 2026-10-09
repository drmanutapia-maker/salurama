'use client'

export default function PoliticaCancelacion() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#111827' }}><style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .legal-h2 { font-family: 'Fraunces', serif; font-size: clamp(18px,3.5vw,22px); font-weight: 900; color: #0D1829; margin: 0 0 14px; padding-bottom: 10px; border-bottom: 2px solid #E8ECF3; }
        .legal-h3 { font-size: 15px; font-weight: 600; color: #1E3A5F; margin: 20px 0 8px; }
        .legal-p { font-size: 14px; color: #4A5568; line-height: 1.85; margin-bottom: 12px; }
        .legal-ul { padding-left: 20px; margin-bottom: 14px; }
        .legal-li { font-size: 14px; color: #4A5568; line-height: 1.8; margin-bottom: 5px; }
        .legal-strong { color: #111827; font-weight: 600; }
        .alert-box { background: #E8ECF3; border: 1.5px solid #C5D0E0; border-radius: 10px; padding: 14px 18px; margin: 16px 0; }
        .alert-box p { margin: 0; color: #1E3A5F; font-size: 13px; font-weight: 500; line-height: 1.6; }
        .section-block { margin-bottom: 44px; scroll-margin-top: 80px; }
      `}</style>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #E8ECF3 0%, #fff 60%)', padding: 'clamp(40px,6vw,60px) 20px 32px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Citas médicas</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px,6vw,40px)', fontWeight: 900, color: '#0D1829', marginBottom: 12 }}>
            Política de Cancelación
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Última actualización: 9 de octubre de 2026 · SALURAMA S.A.S.</p>
        </div>
      </section>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 80px' }}>

        <div className="section-block">
          <h2 className="legal-h2">1. Ventana de cancelación</h2>
          <p className="legal-p">
            Cada consultorio puede establecer su propio plazo mínimo de cancelación en línea. Por defecto, el plazo es de <strong className="legal-strong">12 horas</strong> antes de la cita. Algunos consultorios pueden requerir un plazo mayor (por ejemplo, 24 horas).
          </p>
          <p className="legal-p">
            El plazo aplicable a tu cita depende del consultorio en el que fue agendada.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">2. Cancelación dentro del plazo</h2>
          <p className="legal-p">
            Si cancelas tu cita con la antelación suficiente (dentro del plazo establecido por el consultorio), la cancelación se procesa automáticamente y recibirás confirmación por correo electrónico.
          </p>
          <p className="legal-p">
            El médico también será notificado de forma inmediata para que pueda disponer del horario.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">3. Cancelación fuera del plazo</h2>
          <p className="legal-p">
            Si tu cita está próxima y ya no es posible cancelarla en línea, tienes dos opciones:
          </p>
          <ul className="legal-ul">
            <li className="legal-li"><strong className="legal-strong">Contactar directamente al consultorio</strong> — si el consultorio tiene habilitado el aviso por WhatsApp, encontrarás un botón de contacto en la página de tu cita.</li>
            <li className="legal-li"><strong className="legal-strong">Llamar al consultorio</strong> — usando el número de teléfono indicado en tu confirmación de cita.</li>
          </ul>
          <div className="alert-box">
            <p>Aunque no puedas cancelar en línea, siempre te recomendamos avisar al consultorio lo antes posible. Esto permite que otro paciente aproveche el horario.</p>
          </div>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">4. Responsabilidad del paciente</h2>
          <p className="legal-p">
            Salurama es una plataforma de intermediación. No somos responsables de las políticas internas de cada consultorio ni de los cobros por cancelación tardía que el médico pudiera aplicar de manera particular.
          </p>
          <p className="legal-p">
            Al agendar una cita a través de Salurama, aceptas los <a href="/terminos-y-condiciones" style={{ color: '#1E3A5F' }}>Términos y condiciones</a> de la plataforma.
          </p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">5. Citas confirmadas vs. pendientes</h2>
          <p className="legal-p">
            Algunas citas requieren confirmación previa del médico antes de quedar agendadas. En ese caso:
          </p>
          <ul className="legal-ul">
            <li className="legal-li">Si la cita aún está <strong className="legal-strong">pendiente de confirmación</strong>, puede cancelarse sin restricción de plazo.</li>
            <li className="legal-li">Una vez que el médico <strong className="legal-strong">confirma</strong> la cita, aplica la política de ventana de cancelación descrita en esta página.</li>
          </ul>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">6. Contacto</h2>
          <p className="legal-p">
            Si tienes dudas sobre la cancelación de una cita específica, escríbenos a <a href="mailto:hola@salurama.com" style={{ color: '#1E3A5F' }}>hola@salurama.com</a> o contáctanos directamente desde tu confirmación de cita.
          </p>
          <p className="legal-p" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
            © 2026 SALURAMA S.A.S. · Todos los derechos reservados · salurama.com
          </p>
        </div>

      </div>
    </div>
  )
}
