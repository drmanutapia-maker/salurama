import Link from 'next/link'

// ════════════════════════════════════════════════════════════════════════════
// CONTRATO MARCO B2B (versión pública / resumen)
// El contrato completo y firmado se entrega de forma privada a cada socio.
// ════════════════════════════════════════════════════════════════════════════

export default function ContratoB2B() {
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#fff', minHeight:'100vh', color:'#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .legal-h2 { font-family:'Fraunces',serif; font-size:clamp(18px,3.5vw,22px); font-weight:900; color:#0D1829; margin:0 0 14px; padding-bottom:10px; border-bottom:2px solid #E8ECF3; }
        .legal-h3 { font-size:15px; font-weight:600; color:#1E3A5F; margin:20px 0 8px; }
        .legal-p { font-size:14px; color:#4A5568; line-height:1.85; margin-bottom:12px; }
        .legal-ul { padding-left:20px; margin-bottom:14px; }
        .legal-li { font-size:14px; color:#4A5568; line-height:1.8; margin-bottom:5px; }
        .legal-strong { color:#111827; font-weight:600; }
        .clause-box { background:#F9FAFB; border:1px solid #E5E7EB; border-radius:10px; padding:16px 20px; margin:14px 0; font-style:italic; }
        .clause-box p { margin:0; font-size:13px; color:#4A5568; line-height:1.75; }
        .info-box { background:#E8ECF3; border:1.5px solid #C5D0E0; border-radius:10px; padding:14px 18px; margin:16px 0; }
        .info-box p { margin:0; color:#1E3A5F; font-size:13px; font-weight:500; line-height:1.6; }
        .section-block { margin-bottom:44px; }
      `}</style>

      <section style={{ background:'linear-gradient(160deg,#E8ECF3 0%,#fff 60%)', padding:'clamp(40px,6vw,60px) 20px 32px' }}>
        <div style={{ maxWidth:820, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'#2A9D8F', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Para empresas del sector salud</p>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(26px,5vw,38px)', fontWeight:900, color:'#0D1829', marginBottom:12 }}>Condiciones de Colaboración B2B</h1>
          <p style={{ fontSize:14, color:'#6B7280' }}>Última actualización: 31 de marzo de 2026 · SALURAMA S.A.S.</p>
        </div>
      </section>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'40px 20px 80px' }}>

        <div className="section-block">
          <h2 className="legal-h2">1. Alcance y finalidad</h2>
          <p className="legal-p">El presente documento describe las condiciones marco aplicables a todos los acuerdos de colaboración entre SALURAMA S.A.S. y empresas del sector salud (en adelante, "el Socio"). Esto incluye empresas farmacéuticas, aseguradoras de salud, laboratorios clínicos, dispositivos médicos y proveedores de servicios complementarios a la salud.</p>
          <p className="legal-p">El contrato específico de cada colaboración se formaliza mediante un Convenio Particular firmado por ambas partes, que detalla alcances, tarifas, duración y entregables.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">2. Cláusula de no-interferencia en el directorio</h2>
          <p className="legal-p">Esta es la cláusula más importante de cualquier acuerdo con Salurama. No es negociable.</p>
          <div className="clause-box">
            <p>"El Socio reconoce y acepta expresamente que la celebración del presente Convenio no otorga, directa ni indirectamente, ningún derecho, beneficio o ventaja sobre el posicionamiento, orden de aparición, visibilidad, calificación ni ningún otro aspecto del algoritmo o criterios de búsqueda de la Plataforma Salurama respecto de ningún profesional de la salud, producto, servicio o institución. Cualquier cláusula, acuerdo verbal o práctica contraria a lo establecido en este párrafo se tendrá por no escrita y será nula de pleno derecho."</p>
          </div>
          <p className="legal-p">Esta restricción existe para proteger la neutralidad del directorio, que es el activo más valioso que Salurama ofrece tanto a médicos como a pacientes.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">3. Modalidades de colaboración disponibles</h2>
          <ul className="legal-ul">
            <li className="legal-li"><strong className="legal-strong">Contenido educativo patrocinado:</strong> Artículos, guías o infografías sobre temas de salud relevantes para la audiencia de Salurama. Siempre identificados como patrocinados.</li>
            <li className="legal-li"><strong className="legal-strong">Webinars para profesionales:</strong> Eventos de educación médica continua dirigidos a los médicos registrados en la plataforma.</li>
            <li className="legal-li"><strong className="legal-strong">Espacios publicitarios:</strong> Banners en secciones editoriales de la plataforma, no relacionadas con resultados de búsqueda de médicos.</li>
            <li className="legal-li"><strong className="legal-strong">Boletines segmentados:</strong> Comunicaciones educativas enviadas a segmentos de profesionales o pacientes con consentimiento expreso.</li>
          </ul>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">4. Obligaciones de Salurama</h2>
          <ul className="legal-ul">
            <li className="legal-li">Identificar claramente todo el contenido patrocinado.</li>
            <li className="legal-li">Mantener separación total entre el equipo comercial y el equipo de producto/algoritmo.</li>
            <li className="legal-li">Reportar métricas de alcance e impacto del contenido publicado.</li>
            <li className="legal-li">Garantizar que los datos del Socio sean tratados conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares vigente.</li>
          </ul>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">5. Protección de datos en relaciones B2B</h2>
          <p className="legal-p">Cuando el Socio comparta datos personales con Salurama para fines de la colaboración (por ejemplo, listas de distribución de webinars con consentimiento previo), Salurama actuará como Encargado del Tratamiento conforme a la Ley, y el Socio como Responsable. Se formalizará un Acuerdo de Tratamiento de Datos como anexo al Convenio Particular.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">6. Inicio de colaboración</h2>
          <div className="info-box">
            <p>Para iniciar una colaboración o solicitar información comercial, escríbenos a <strong>hola@salurama.com</strong>. Respondemos en 48 horas hábiles.</p>
          </div>
          <p className="legal-p">Las condiciones específicas (tarifa, duración, entregables) se acordarán en el Convenio Particular correspondiente. Este documento marco no es un contrato vinculante por sí solo.</p>
          <p className="legal-p" style={{ marginTop:24, paddingTop:20, borderTop:'1px solid #F3F4F6', fontSize:12, color:'#9CA3AF' }}>© 2026 SALURAMA S.A.S. · Todos los derechos reservados · salurama.com</p>
        </div>
      </div>

    </div>
  )
}
