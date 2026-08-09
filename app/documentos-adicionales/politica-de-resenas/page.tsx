import Link from 'next/link'

// ════════════════════════════════════════════════════════════════════════════
// POLÍTICA DE CONTENIDO Y RESEÑAS
// ════════════════════════════════════════════════════════════════════════════

export default function PoliticaResenas() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .legal-h2 { font-family:'Fraunces',serif; font-size:clamp(18px,3.5vw,22px); font-weight:900; color:#0D1829; margin:0 0 14px; padding-bottom:10px; border-bottom:2px solid #E8ECF3; }
        .legal-h3 { font-size:15px; font-weight:600; color:#1E3A5F; margin:20px 0 8px; }
        .legal-p { font-size:14px; color:#4A5568; line-height:1.85; margin-bottom:12px; }
        .legal-ul { padding-left:20px; margin-bottom:14px; }
        .legal-li { font-size:14px; color:#4A5568; line-height:1.8; margin-bottom:5px; }
        .legal-strong { color:#111827; font-weight:600; }
        .info-box { background:#E8ECF3; border:1.5px solid #C5D0E0; border-radius:10px; padding:14px 18px; margin:16px 0; }
        .info-box p { margin:0; color:#1E3A5F; font-size:13px; font-weight:500; line-height:1.6; }
        .section-block { margin-bottom:44px; scroll-margin-top:80px; }
      `}</style>

      <section style={{ background:'linear-gradient(160deg,#E8ECF3 0%,#fff 60%)', padding:'clamp(40px,6vw,60px) 20px 32px' }}>
        <div style={{ maxWidth:820, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'#2A9D8F', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Comunidad y confianza</p>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(26px,5vw,38px)', fontWeight:900, color:'#0D1829', marginBottom:12 }}>Política de Contenido y Reseñas</h1>
          <p style={{ fontSize:14, color:'#6B7280' }}>Última actualización: 7 de agosto de 2026 · SALURAMA S.A.S.</p>
        </div>
      </section>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'40px 20px 80px' }}>

        <div className="section-block">
          <h2 className="legal-h2">1. Propósito de las reseñas en Salurama</h2>
          <p className="legal-p">Las reseñas son información complementaria que los pacientes pueden compartir tras una consulta. En Salurama, las reseñas son un dato más dentro de un sistema de información más amplio que incluye credenciales verificables y filtros objetivos.</p>
          <div className="info-box">
            <p>Las reseñas nunca determinan el orden de aparición en resultados de búsqueda. Ningún médico aparece primero ni último por su calificación o número de reseñas.</p>
          </div>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">2. Quién puede publicar reseñas</h2>
          <ul className="legal-ul">
            <li className="legal-li">Pacientes que hayan tenido una cita registrada y completada con el profesional en Salurama. No se requiere crear una cuenta de usuario para dejar una reseña.</li>
            <li className="legal-li">Se permite una reseña por cada cita completada. Un mismo paciente puede dejar más de una reseña si ha tenido varias consultas distintas con el mismo profesional. Las reseñas duplicadas para la misma cita serán eliminadas.</li>
            <li className="legal-li">Salurama verifica que cada reseña provenga de una cita real y completada con el profesional evaluado, mediante un enlace de verificación único enviado exclusivamente al paciente de esa cita. Aun así, se reserva el derecho de eliminar reseñas con indicios de fraude o conflicto de interés.</li>
          </ul>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">3. Contenido permitido</h2>
          <p className="legal-p">Las reseñas deben referirse a la experiencia de atención y deben ser:</p>
          <ul className="legal-ul">
            <li className="legal-li">Honestas y basadas en experiencia personal real.</li>
            <li className="legal-li">Respetuosas y sin lenguaje ofensivo o discriminatorio.</li>
            <li className="legal-li">Relacionadas con el servicio recibido (trato, puntualidad, instalaciones, comunicación).</li>
          </ul>
          <h3 className="legal-h3">Contenido prohibido</h3>
          <ul className="legal-ul">
            <li className="legal-li">Información médica confidencial propia o de terceros.</li>
            <li className="legal-li">Datos personales de terceros sin consentimiento.</li>
            <li className="legal-li">Contenido difamatorio, falso o con ánimo de daño.</li>
            <li className="legal-li">Publicidad o promoción de servicios de terceros.</li>
            <li className="legal-li">Reseñas publicadas por el propio profesional o personas relacionadas con él.</li>
            <li className="legal-li">Reseñas publicadas por competidores con ánimo de dañar.</li>
          </ul>
          <p className="legal-p">Estas reglas de contenido aplican por igual a las reseñas de los pacientes y a las respuestas públicas de los profesionales.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">4. Propiedad del contenido</h2>
          <p className="legal-p">El autor de la reseña conserva la propiedad intelectual del contenido que publica. Al publicar, otorga a Salurama una licencia no exclusiva, gratuita y revocable para mostrar, reproducir y distribuir la reseña dentro de la plataforma.</p>
          <p className="legal-p">El profesional evaluado puede solicitar la eliminación de una reseña únicamente si puede demostrar que su contenido es objetivamente falso o viola esta Política. La mera calificación negativa no es causa suficiente para eliminar una reseña.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">5. Proceso de moderación y disputas</h2>
          <h3 className="legal-h3">Reporte de reseñas y respuestas</h3>
          <p className="legal-p">Cualquier usuario o profesional puede reportar una reseña o una respuesta que considere que viola esta Política enviando un correo a <a href="mailto:hola@salurama.com" style={{ color:'#1E3A5F' }}>hola@salurama.com</a> indicando: URL del perfil, texto del contenido reportado y motivo del reporte.</p>
          <p className="legal-p">Salurama podrá además utilizar herramientas automatizadas, incluyendo inteligencia artificial, para identificar posibles violaciones a esta Política en reseñas y respuestas. Estas herramientas únicamente señalan contenido para revisión humana; ninguna reseña o respuesta es eliminada de forma automática sin que Salurama la revise.</p>
          <h3 className="legal-h3">Resolución</h3>
          <p className="legal-p">Salurama evaluará el reporte en un plazo de 10 días hábiles y notificará la resolución. Las decisiones de moderación son definitivas pero pueden ser apeladas una vez con nueva evidencia. Salurama puede eliminar, sin necesidad de reporte previo, cualquier reseña o respuesta que identifique como violatoria de esta Política.</p>
          <h3 className="legal-h3">Respuesta del profesional</h3>
          <p className="legal-p">El profesional puede responder públicamente a cualquier reseña recibida, una sola vez por reseña. La respuesta está sujeta exactamente a las mismas reglas de contenido permitido y prohibido descritas en la Sección 3 de esta Política, y a las mismas consecuencias de moderación descritas en esta Sección — incluyendo reporte, revisión automatizada y eliminación por parte de Salurama.</p>
          <p className="legal-p">En particular, la respuesta del profesional no debe:</p>
          <ul className="legal-ul">
            <li className="legal-li">Incluir datos personales ni información médica confidencial del paciente.</li>
            <li className="legal-li">Usarse para presionar, intimidar o desincentivar al paciente de mantener, modificar o eliminar su reseña.</li>
            <li className="legal-li">Contener publicidad, promociones, o enlaces a servicios ajenos a la atención descrita en la reseña.</li>
            <li className="legal-li">Contener lenguaje ofensivo, discriminatorio o difamatorio hacia el paciente.</li>
          </ul>
          <p className="legal-p">El profesional puede editar o eliminar su respuesta en cualquier momento. Salurama conserva un registro interno de las versiones previas de cada respuesta, con fines de auditoría y cumplimiento; este registro no es público.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">6. Contacto</h2>
          <p className="legal-p">Para asuntos relacionados con reseñas y contenido: <a href="mailto:hola@salurama.com" style={{ color:'#1E3A5F' }}>hola@salurama.com</a></p>
          <p className="legal-p" style={{ marginTop:24, paddingTop:20, borderTop:'1px solid #F3F4F6', fontSize:12, color:'#9CA3AF' }}>© 2026 SALURAMA S.A.S. · salurama.com</p>
        </div>
      </div>

    </div>
  )
}
