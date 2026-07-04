import Link from 'next/link'

// ════════════════════════════════════════════════════════════════════════════
// POLÍTICA DE PUBLICIDAD ÉTICA
// ════════════════════════════════════════════════════════════════════════════

export default function PublicidadEtica() {
  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#fff', minHeight:'100vh', color:'#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        .legal-h2 { font-family:'Fraunces',serif; font-size:clamp(18px,3.5vw,22px); font-weight:900; color:#0D1829; margin:0 0 14px; padding-bottom:10px; border-bottom:2px solid #E8ECF3; }
        .legal-p { font-size:14px; color:#4A5568; line-height:1.85; margin-bottom:12px; }
        .legal-ul { padding-left:20px; margin-bottom:14px; }
        .legal-li { font-size:14px; color:#4A5568; line-height:1.8; margin-bottom:5px; }
        .legal-strong { color:#111827; font-weight:600; }
        .commit-box { background:#E8ECF3; border:1.5px solid #C5D0E0; border-radius:12px; padding:18px 20px; margin:16px 0; }
        .commit-box p { margin:0; color:#1E3A5F; font-size:14px; line-height:1.7; }
        .section-block { margin-bottom:44px; }
      `}</style>

      <section style={{ background:'linear-gradient(160deg,#E8ECF3 0%,#fff 60%)', padding:'clamp(40px,6vw,60px) 20px 32px' }}>
        <div style={{ maxWidth:820, margin:'0 auto' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'#2A9D8F', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Transparencia comercial</p>
          <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(26px,5vw,38px)', fontWeight:900, color:'#0D1829', marginBottom:12 }}>Política de Publicidad Ética</h1>
          <p style={{ fontSize:14, color:'#6B7280' }}>Última actualización: 31 de marzo de 2026 · SALURAMA S.A.S.</p>
        </div>
      </section>

      <div style={{ maxWidth:820, margin:'0 auto', padding:'40px 20px 80px' }}>

        <div className="section-block">
          <h2 className="legal-h2">1. Nuestro principio fundamental</h2>
          <div className="commit-box">
            <p><strong>Ningún acuerdo comercial con terceros afecta el orden de aparición de los médicos en los resultados de búsqueda.</strong> Esto no es una aspiración: es una restricción contractual explícita en todos nuestros acuerdos con socios comerciales.</p>
          </div>
          <p className="legal-p">Salurama se financia mediante contratos con empresas del sector salud (farmacéuticas, aseguradoras, laboratorios clínicos) para la publicación de contenido informativo y educativo. Este modelo nos permite mantener el registro de médicos y el uso por pacientes completamente gratuitos.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">2. Qué se puede y qué no se puede patrocinar</h2>
          <h3 style={{ fontSize:15, fontWeight:600, color:'#1E3A5F', margin:'16px 0 8px' }}>Permitido</h3>
          <ul className="legal-ul">
            <li className="legal-li">Contenido educativo e informativo sobre enfermedades, tratamientos y prevención, claramente etiquetado como patrocinado.</li>
            <li className="legal-li">Webinars y eventos de educación médica continua para profesionales.</li>
            <li className="legal-li">Información institucional sobre servicios de salud complementarios (laboratorios, aseguradoras).</li>
            <li className="legal-li">Banners o espacios publicitarios en secciones no relacionadas con los resultados de búsqueda de médicos.</li>
          </ul>
          <h3 style={{ fontSize:15, fontWeight:600, color:'#DC2626', margin:'16px 0 8px' }}>Prohibido</h3>
          <ul className="legal-ul">
            <li className="legal-li">Pago de cualquier tipo para mejorar la posición de un médico en resultados de búsqueda.</li>
            <li className="legal-li">Contenido que simule ser información editorial sin identificación clara de patrocinio.</li>
            <li className="legal-li">Publicidad que denigre a profesionales o instituciones de salud.</li>
            <li className="legal-li">Cualquier acuerdo que comprometa la neutralidad del directorio.</li>
          </ul>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">3. Identificación del contenido patrocinado</h2>
          <p className="legal-p">Todo contenido generado bajo acuerdos comerciales será claramente identificado con la etiqueta <strong className="legal-strong">"Patrocinado"</strong> o <strong className="legal-strong">"Contenido de [nombre del patrocinador]"</strong>. El usuario siempre podrá distinguir el contenido editorial del contenido comercial.</p>
        </div>

        <div className="section-block">
          <h2 className="legal-h2">4. Cláusula de no-interferencia (resumen para el público)</h2>
          <p className="legal-p">Todos los contratos B2B de Salurama incluyen de forma explícita la siguiente restricción: <em>"El patrocinador reconoce y acepta que el presente acuerdo no otorga, directa ni indirectamente, ningún derecho sobre el posicionamiento, orden de aparición, visibilidad o cualquier otro aspecto del algoritmo de búsqueda de la plataforma Salurama respecto de ningún profesional de la salud."</em></p>
          <p className="legal-p">Si en algún momento crees que esta política está siendo vulnerada, puedes reportarlo a: <a href="mailto:hola@salurama.com" style={{ color:'#1E3A5F' }}>hola@salurama.com</a></p>
          <p className="legal-p" style={{ marginTop:24, paddingTop:20, borderTop:'1px solid #F3F4F6', fontSize:12, color:'#9CA3AF' }}>© 2026 SALURAMA S.A.S. · salurama.com</p>
        </div>
      </div>

    </div>
  )
}
