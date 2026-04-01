'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

const SECTIONS = [
  { id: 'responsable',     title: '1. Responsable del servicio' },
  { id: 'naturaleza',      title: '2. Naturaleza del servicio' },
  { id: 'verificacion',    title: '3. Verificación de credenciales' },
  { id: 'limitacion',      title: '4. Limitación de responsabilidad' },
  { id: 'registro',        title: '5. Registro y uso' },
  { id: 'contenido',       title: '6. Contenido generado por usuarios' },
  { id: 'propiedad',       title: '7. Propiedad intelectual' },
  { id: 'monetizacion',    title: '8. Modelo de negocio' },
  { id: 'modificaciones',  title: '9. Modificaciones' },
  { id: 'jurisdiccion',    title: '10. Jurisdicción y ley aplicable' },
]

export default function TerminosYCondiciones() {
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
        .toc-link { display: block; font-size: 13px; color: #6B7280; text-decoration: none;
          padding: 7px 12px; border-radius: 6px; transition: all 0.15s;
          border-left: 2px solid transparent; }
        .toc-link:hover { background: #EEF2FF; color: #3730A3; border-left-color: #3730A3; }
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
        .warning-box { background: #FFFBEB; border: 1.5px solid #FCD34D; border-radius: 10px;
          padding: 14px 18px; margin: 16px 0; }
        .warning-box p { margin: 0; color: #92400E; font-size: 13px; font-weight: 500; line-height: 1.6; }
        .section-block { margin-bottom: 44px; scroll-margin-top: 80px; }
        @media (max-width: 768px) {
          .dsk { display: none !important; }
          .mob-btn { display: flex !important; }
          .sidebar-col { display: none !important; }
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
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Marco legal
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px,6vw,40px)', fontWeight: 900, color: '#1E1B4B', marginBottom: 12 }}>
            Términos y Condiciones de Uso
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 6 }}>
            Última actualización: 31 de marzo de 2026
          </p>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            Operado por <strong style={{ color: '#1A1A2E' }}>SALURAMA S.A.S.</strong> · Ley aplicable: Estados Unidos Mexicanos
          </p>
        </div>
      </section>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 80px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }}>

        {/* SIDEBAR */}
        <aside className="sidebar-col" style={{ position: 'sticky', top: 80 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Contenido
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="toc-link">{s.title}</a>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main>

          {/* 1 */}
          <div id="responsable" className="section-block">
            <h2 className="legal-h2">1. Responsable del servicio</h2>
            <p className="legal-p">
              Salurama es operado por <strong className="legal-strong">SALURAMA S.A.S.</strong>, sociedad mercantil mexicana constituida conforme a la Ley General de Sociedades Mercantiles, con domicilio en la Ciudad de México, representada legalmente por Manuel Augusto Tapia Dávila.
            </p>
            <p className="legal-p">
              Contacto: <a href="mailto:hola@salurama.com" style={{ color: '#3730A3' }}>hola@salurama.com</a> · Para asuntos de privacidad: <a href="mailto:privacidad@salurama.com" style={{ color: '#3730A3' }}>privacidad@salurama.com</a>
            </p>
            <p className="legal-p">
              Al acceder o utilizar la plataforma salurama.com, usted acepta quedar vinculado por los presentes Términos y Condiciones. Si no está de acuerdo con alguna de estas disposiciones, le pedimos que se abstenga de utilizar la plataforma.
            </p>
          </div>

          {/* 2 */}
          <div id="naturaleza" className="section-block">
            <h2 className="legal-h2">2. Naturaleza del servicio</h2>
            <p className="legal-p">
              Salurama es <strong className="legal-strong">exclusivamente un directorio digital</strong> que facilita el acceso a información pública sobre profesionales de la salud registrados, y proporciona herramientas para que los usuarios verifiquen credenciales directamente en fuentes oficiales.
            </p>
            <div className="alert-box">
              <p>Salurama NO presta servicios médicos, NO realiza diagnósticos, NO recomienda tratamientos, NO garantiza resultados médicos, NO interviene en la relación médico-paciente y NO procesa pagos entre pacientes y profesionales.</p>
            </div>
            <p className="legal-p">
              La relación médico-paciente es exclusivamente entre el usuario y el profesional de la salud. Salurama no es parte de dicha relación en ninguna circunstancia.
            </p>
          </div>

          {/* 3 */}
          <div id="verificacion" className="section-block">
            <h2 className="legal-h2">3. Verificación de credenciales</h2>
            <p className="legal-p">
              Salurama proporciona <strong className="legal-strong">acceso directo a fuentes oficiales públicas</strong> para que cada usuario pueda verificar por sí mismo las credenciales de los profesionales. Esto incluye:
            </p>
            <ul className="legal-ul">
              <li className="legal-li">Enlace al portal de la Dirección General de Profesiones de la Secretaría de Educación Pública (SEP) para consulta de cédulas profesionales.</li>
              <li className="legal-li">Enlace al consejo o colegio de la especialidad correspondiente para consulta de certificaciones vigentes.</li>
            </ul>
            <div className="warning-box">
              <p>⚠️ Salurama NO verifica, avala, certifica ni garantiza la autenticidad o vigencia de ninguna credencial. Los datos mostrados en los perfiles son proporcionados por los propios profesionales. La verificación la realiza el usuario directamente en las fuentes oficiales indicadas. Salurama actúa como facilitador de información, no como autoridad certificadora.</p>
            </div>
            <p className="legal-p">
              Salurama no asume responsabilidad por información incorrecta, desactualizada o fraudulenta proporcionada por profesionales registrados, ni por discrepancias entre los datos del perfil y la información disponible en fuentes oficiales.
            </p>
          </div>

          {/* 4 */}
          <div id="limitacion" className="section-block">
            <h2 className="legal-h2">4. Limitación de responsabilidad</h2>
            <p className="legal-p">Salurama no será responsable por:</p>
            <ul className="legal-ul">
              <li className="legal-li">Actos u omisiones de los profesionales de la salud registrados en la plataforma.</li>
              <li className="legal-li">Resultados de tratamientos, diagnósticos o intervenciones médicas.</li>
              <li className="legal-li">Información falsa, inexacta o desactualizada proporcionada por los profesionales.</li>
              <li className="legal-li">Daños derivados del uso o imposibilidad de uso de la plataforma.</li>
              <li className="legal-li">Comunicaciones, acuerdos o transacciones realizadas fuera de la plataforma.</li>
              <li className="legal-li">Interrupciones del servicio por causas de fuerza mayor o problemas técnicos ajenos a Salurama.</li>
            </ul>
            <p className="legal-p">
              <strong className="legal-strong">Límite de responsabilidad contractual:</strong> En ningún caso la responsabilidad acumulada de SALURAMA S.A.S. por cualquier concepto derivado del uso de la plataforma excederá la cantidad de <strong className="legal-strong">$1,000.00 MXN (un mil pesos 00/100 M.N.)</strong>. Este límite no aplica en casos de dolo o mala fe comprobada de Salurama.
            </p>
          </div>

          {/* 5 */}
          <div id="registro" className="section-block">
            <h2 className="legal-h2">5. Registro y uso de la plataforma</h2>
            <h3 className="legal-h3">Obligaciones del usuario</h3>
            <ul className="legal-ul">
              <li className="legal-li">Proporcionar información veraz, completa y actualizada al momento del registro.</li>
              <li className="legal-li">Mantener la confidencialidad de sus credenciales de acceso.</li>
              <li className="legal-li">No suplantar la identidad de terceros.</li>
              <li className="legal-li">No utilizar la plataforma para fines ilegales, fraudulentos o contrarios a estos Términos.</li>
              <li className="legal-li">No intentar acceder a sistemas, datos o cuentas de terceros sin autorización.</li>
            </ul>
            <h3 className="legal-h3">Facultades de Salurama</h3>
            <p className="legal-p">
              Salurama se reserva el derecho de suspender o cancelar cuentas, sin responsabilidad, cuando existan indicios fundados de: (i) información falsa o engañosa, (ii) uso contrario a estos Términos, (iii) solicitud de autoridad competente, o (iv) inactividad superior a 24 meses. En los supuestos (i), (ii) y (iv), se notificará previamente al usuario con al menos 5 días hábiles de anticipación, excepto cuando la urgencia del caso lo impida.
            </p>
          </div>

          {/* 6 */}
          <div id="contenido" className="section-block">
            <h2 className="legal-h2">6. Contenido generado por usuarios</h2>
            <h3 className="legal-h3">Reseñas y calificaciones</h3>
            <p className="legal-p">
              Los usuarios podrán publicar reseñas y calificaciones de los profesionales. Al hacerlo, otorgan a Salurama una licencia no exclusiva, gratuita y territorial (México) para mostrar, reproducir y distribuir dicho contenido en la plataforma.
            </p>
            <p className="legal-p">
              La propiedad intelectual de las reseñas permanece en el usuario que las publica. Salurama no adquiere derechos de propiedad sobre el contenido generado por usuarios.
            </p>
            <h3 className="legal-h3">Moderación</h3>
            <p className="legal-p">
              Salurama se reserva el derecho de eliminar contenido que: sea difamatorio o contenga falsedades verificables, incite al odio o discriminación, viole derechos de terceros, o contravenga la legislación mexicana aplicable. La moderación no implica que Salurama avale o garantice la veracidad del contenido publicado.
            </p>
          </div>

          {/* 7 */}
          <div id="propiedad" className="section-block">
            <h2 className="legal-h2">7. Propiedad intelectual</h2>
            <p className="legal-p">
              El diseño, código, logotipos, marca "Salurama", textos originales y demás elementos de la plataforma son propiedad exclusiva de SALURAMA S.A.S. o de sus licenciantes, protegidos por la Ley Federal del Derecho de Autor y la Ley de la Propiedad Industrial.
            </p>
            <p className="legal-p">
              Queda prohibida la reproducción, distribución, modificación o uso comercial de cualquier elemento de la plataforma sin autorización escrita previa de Salurama.
            </p>
          </div>

          {/* 8 */}
          <div id="monetizacion" className="section-block">
            <h2 className="legal-h2">8. Modelo de negocio y publicidad</h2>
            <p className="legal-p">
              El registro y perfil básico en Salurama es <strong className="legal-strong">gratuito para los profesionales de la salud</strong>. Salurama se financia a través de contratos con empresas del sector (farmacéuticas, aseguradoras, laboratorios) para la publicación de contenido informativo y educativo.
            </p>
            <div className="alert-box">
              <p>Los acuerdos comerciales con terceros no afectan el orden de aparición de los profesionales en los resultados de búsqueda. Ningún médico puede pagar para aparecer primero. El orden refleja relevancia para la búsqueda del usuario, no inversión publicitaria.</p>
            </div>
            <p className="legal-p">
              El contenido patrocinado estará claramente identificado como tal. Salurama podrá incorporar servicios adicionales opcionales para profesionales en el futuro, con notificación previa y aceptación expresa.
            </p>
          </div>

          {/* 9 */}
          <div id="modificaciones" className="section-block">
            <h2 className="legal-h2">9. Modificaciones a estos Términos</h2>
            <p className="legal-p">
              Salurama podrá modificar los presentes Términos y Condiciones. Los cambios serán notificados con al menos <strong className="legal-strong">15 días naturales de anticipación</strong> mediante aviso en la plataforma y, cuando sea posible, por correo electrónico al usuario registrado.
            </p>
            <p className="legal-p">
              El uso continuado de la plataforma tras la entrada en vigor de los nuevos Términos implica su aceptación. Si el usuario no está de acuerdo con los cambios, podrá cancelar su cuenta antes de la fecha de vigencia.
            </p>
          </div>

          {/* 10 */}
          <div id="jurisdiccion" className="section-block">
            <h2 className="legal-h2">10. Jurisdicción y ley aplicable</h2>
            <p className="legal-p">
              Los presentes Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia derivada del uso de la plataforma, las partes se someten a la jurisdicción de los Tribunales competentes de la Ciudad de México, renunciando expresamente a cualquier otro fuero que pudiera corresponderles por razón de domicilio.
            </p>
            <p className="legal-p">
              Las partes procurarán resolver cualquier diferencia mediante negociación directa. De no lograrse acuerdo en 30 días calendario, la controversia se someterá al Centro de Arbitraje de México (CAM) conforme a su reglamento vigente.
            </p>
            <p className="legal-p" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
              © 2026 SALURAMA S.A.S. · Todos los derechos reservados · salurama.com
            </p>
          </div>

        </main>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#1E1B4B', padding: 'clamp(32px,5vw,40px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Aviso de Privacidad','/aviso-de-privacidad'],['Política de Cookies','/politica-de-cookies'],
              ['Términos Profesionales','/terminos-profesionales'],['Inicio','/']]
              .map(([l,h]) => <Link key={h} href={h} style={{ fontSize: 13, color: '#A5B4FC', textDecoration: 'none' }}>{l}</Link>)}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 SALURAMA S.A.S. · salurama.com · Hecho en México 🇲🇽</p>
        </div>
      </footer>
    </div>
  )
}
