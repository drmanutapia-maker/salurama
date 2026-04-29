'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const SECTIONS = [
  { id: 'responsable',     title: '1. Responsable y marco legal' },
  { id: 'datos',           title: '2. Datos que recabamos' },
  { id: 'finalidades',     title: '3. Finalidades del tratamiento' },
  { id: 'transferencias',  title: '4. Transferencia de datos' },
  { id: 'arco',            title: '5. Derechos ARCO' },
  { id: 'seguridad',       title: '6. Medidas de seguridad' },
  { id: 'cambios',         title: '7. Cambios al aviso' },
  { id: 'autoridad',       title: '8. Autoridad competente' },
  { id: 'contacto',        title: '9. Contacto' },
]

export default function AvisoDePrivacidad() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#111827' }}><style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-link { color: #111827; text-decoration: none; font-size: 15px; font-weight: 400;
          padding: 6px 2px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; }
        .nav-link:hover { color: #1E3A5F; border-color: #1E3A5F; }
        .btn-medico { background: #1E3A5F; color: #fff; text-decoration: none;
          padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; transition: background 0.18s;
          display: inline-flex; align-items: center; gap: 7px; }
        .btn-medico:hover { background: #2A9D8F; }
        .toc-link { display: block; font-size: 13px; color: #6B7280; text-decoration: none;
          padding: 7px 12px; border-radius: 6px; transition: all 0.15s;
          border-left: 2px solid transparent; }
        .toc-link:hover { background: #E8ECF3; color: #1E3A5F; border-left-color: #1E3A5F; }
        .legal-h2 { font-family: 'Fraunces', serif; font-size: clamp(18px,3.5vw,22px);
          font-weight: 900; color: #0D1829; margin: 0 0 14px;
          padding-bottom: 10px; border-bottom: 2px solid #E8ECF3; }
        .legal-h3 { font-size: 15px; font-weight: 600; color: #1E3A5F; margin: 20px 0 8px; }
        .legal-p { font-size: 14px; color: #4A5568; line-height: 1.85; margin-bottom: 12px; }
        .legal-ul { padding-left: 20px; margin-bottom: 14px; }
        .legal-li { font-size: 14px; color: #4A5568; line-height: 1.8; margin-bottom: 5px; }
        .legal-strong { color: #111827; font-weight: 600; }
        .alert-box { background: #E8ECF3; border: 1.5px solid #C5D0E0; border-radius: 10px;
          padding: 14px 18px; margin: 16px 0; }
        .alert-box p { margin: 0; color: #1E3A5F; font-size: 13px; font-weight: 500; line-height: 1.6; }
        .data-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
        .data-table th { background: #0D1829; color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; }
        .data-table td { padding: 9px 14px; color: #4A5568; border-bottom: 1px solid #F3F4F6; }
        .data-table tr:hover td { background: #F9FAFB; }
        .section-block { margin-bottom: 44px; scroll-margin-top: 80px; }
        @media (max-width: 768px) {
          .dsk { display: none !important; }
          .mob-btn { display: flex !important; }
          .sidebar-col { display: none !important; }
          .data-table { font-size: 12px; }
        }
        @media (min-width: 769px) {
          .mob-btn { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #E8ECF3 0%, #fff 60%)', padding: 'clamp(40px,6vw,60px) 20px 32px' }}><div style={{ maxWidth: 860, margin: '0 auto' }}><p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Privacidad y datos
          </p><h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px,6vw,40px)', fontWeight: 900, color: '#0D1829', marginBottom: 12 }}>
            Aviso de Privacidad
          </h1><p style={{ fontSize: 14, color: '#6B7280', marginBottom: 6 }}>
            Última actualización: 31 de marzo de 2026
          </p><p style={{ fontSize: 14, color: '#6B7280' }}>
            Conforme a la <strong style={{ color: '#111827' }}>Ley Federal de Protección de Datos Personales en Posesión de los Particulares</strong> (publicada en el DOF el 20 de marzo de 2025, vigente desde el 21 de marzo de 2025)
          </p></div></section>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 80px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }}>

        {/* SIDEBAR */}
        <aside className="sidebar-col" style={{ position: 'sticky', top: 80 }}><p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Contenido
          </p><nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => (
              <a key={s.id} href={`#${s.id}`} className="toc-link">{s.title}</a>
            ))}
          </nav></aside>

        {/* MAIN */}
        <main>

          {/* 1 */}
          <div id="responsable" className="section-block"><h2 className="legal-h2">1. Responsable y marco legal</h2><p className="legal-p"><strong className="legal-strong">SALURAMA S.A.S.</strong>, con domicilio en la Ciudad de México, es el Responsable del tratamiento de sus datos personales en términos de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares vigente (en adelante, "la Ley").
            </p><p className="legal-p">
              El Responsable de Protección de Datos designado es <strong className="legal-strong">Manuel Augusto Tapia Dávila</strong>, contactable en <a href="mailto:privacidad@salurama.com" style={{ color: '#1E3A5F' }}>privacidad@salurama.com</a>.
            </p><div className="alert-box"><p>Este Aviso de Privacidad se pone a su disposición desde el momento en que recabamos sus datos personales, conforme al artículo 16 de la Ley.</p></div></div>

          {/* 2 */}
          <div id="datos" className="section-block"><h2 className="legal-h2">2. Datos personales que recabamos</h2><h3 className="legal-h3">De usuarios (pacientes)</h3><ul className="legal-ul"><li className="legal-li">Nombre completo y correo electrónico (al registrarse).</li><li className="legal-li">Teléfono y ciudad (opcionales, si el usuario los proporciona).</li><li className="legal-li">Historial de búsquedas en la plataforma.</li><li className="legal-li">Dirección IP y datos de navegación (cookies técnicas).</li></ul><h3 className="legal-h3">De profesionales de la salud</h3><ul className="legal-ul"><li className="legal-li">Nombre completo y datos de contacto profesional.</li><li className="legal-li">Número de cédula profesional (dato público — proporcionado voluntariamente para su perfil).</li><li className="legal-li">Consejo de especialidad (para enlace de consulta pública).</li><li className="legal-li">Ciudad, estado y dirección del consultorio (opcionales).</li><li className="legal-li">Fotografía de perfil, descripción y costo de consulta (opcionales).</li></ul><div className="alert-box"><p>IMPORTANTE: La cédula profesional y datos de especialidad son información pública disponible en portales gubernamentales. Su inclusión en Salurama tiene como único propósito que los pacientes puedan acceder fácilmente a las fuentes oficiales de verificación (SEP, consejos de especialidad). Salurama NO verifica ni certifica estas credenciales.</p></div><h3 className="legal-h3">Datos que NO recabamos</h3><p className="legal-p">
              Salurama <strong className="legal-strong">no recaba</strong> información clínica de pacientes, diagnósticos, historial médico personal, datos biométricos, ni información financiera completa. No recabamos datos personales de menores de 18 años.
            </p></div>

          {/* 3 */}
          <div id="finalidades" className="section-block"><h2 className="legal-h2">3. Finalidades del tratamiento</h2><h3 className="legal-h3">Finalidades primarias (necesarias para el servicio)</h3><ul className="legal-ul"><li className="legal-li">Crear y administrar cuentas de usuario en la plataforma.</li><li className="legal-li">Mostrar perfiles públicos de profesionales de la salud.</li><li className="legal-li">Facilitar la conexión entre pacientes y profesionales.</li><li className="legal-li">Operación, mantenimiento y mejora técnica de la plataforma.</li><li className="legal-li">Atender solicitudes de derechos ARCO y otras comunicaciones.</li></ul><h3 className="legal-h3">Finalidades secundarias (requieren consentimiento expreso)</h3><ul className="legal-ul"><li className="legal-li">Envío de comunicaciones sobre nuevas funcionalidades o servicios de Salurama.</li><li className="legal-li">Elaboración de estadísticas y análisis de uso (siempre en forma agregada y anónima).</li><li className="legal-li">Compartir información con socios comerciales del sector salud para contenido educativo o informativo relevante.</li></ul><p className="legal-p">
              Si no desea que sus datos sean tratados para finalidades secundarias, puede manifestarlo en cualquier momento a <a href="mailto:privacidad@salurama.com" style={{ color: '#1E3A5F' }}>privacidad@salurama.com</a>. La negativa no afectará el acceso a las funcionalidades principales.
            </p></div>

          {/* 4 */}
          <div id="transferencias" className="section-block"><h2 className="legal-h2">4. Transferencia de datos a terceros</h2><p className="legal-p">
              Sus datos podrán ser compartidos con los siguientes terceros, conforme al artículo 37 de la Ley:
            </p><table className="data-table"><thead><tr><th>Destinatario</th><th>Finalidad</th><th>País</th></tr></thead><tbody>{[
                  ['Supabase Inc.', 'Base de datos y autenticación', 'EE.UU.'],
                  ['Vercel Inc.', 'Hospedaje de la plataforma', 'EE.UU.'],
                  ['Resend Inc.', 'Envío de correos electrónicos', 'EE.UU.'],
                  ['Autoridades competentes', 'Por orden judicial o mandato legal fundado', 'México'],
                  ['Profesionales registrados', 'Para facilitar contacto solicitado por el usuario', 'México'],
                ].map(([d,f,p]) => (
                  <tr key={d}><td><strong>{d}</strong></td><td>{f}</td><td>{p}</td></tr>
                ))}</tbody></table><p className="legal-p">
              Las transferencias internacionales a proveedores ubicados en Estados Unidos se realizan bajo contratos de protección de datos que garantizan niveles adecuados de seguridad, conforme al artículo 37 de la Ley. Al utilizar nuestra plataforma, usted otorga su consentimiento expreso para estas transferencias.
            </p><p className="legal-p">
              Salurama <strong className="legal-strong">no vende, renta ni cede</strong> datos personales a terceros con fines comerciales propios de esos terceros.
            </p></div>

          {/* 5 */}
          <div id="arco" className="section-block"><h2 className="legal-h2">5. Derechos ARCO</h2><p className="legal-p">
              Conforme a la Ley, usted tiene derecho a:
            </p><ul className="legal-ul"><li className="legal-li"><strong className="legal-strong">Acceder</strong> a sus datos personales en posesión de Salurama y conocer las condiciones de su tratamiento.</li><li className="legal-li"><strong className="legal-strong">Rectificar</strong> datos inexactos, incompletos o desactualizados.</li><li className="legal-li"><strong className="legal-strong">Cancelar</strong> sus datos cuando no sean necesarios para la finalidad que motivó su recabación, o cuando haya concluido la relación.</li><li className="legal-li"><strong className="legal-strong">Oponerse</strong> al tratamiento de sus datos para finalidades específicas, incluyendo decisiones automatizadas que le afecten.</li><li className="legal-li"><strong className="legal-strong">Revocar el consentimiento</strong> otorgado para finalidades secundarias en cualquier momento.</li></ul><h3 className="legal-h3">Procedimiento para ejercer derechos ARCO</h3><p className="legal-p">
              Envíe su solicitud a <a href="mailto:privacidad@salurama.com" style={{ color: '#1E3A5F' }}>privacidad@salurama.com</a> indicando:
            </p><ul className="legal-ul"><li className="legal-li">Nombre completo y correo electrónico registrado en la plataforma.</li><li className="legal-li">El derecho ARCO específico que desea ejercer o una descripción clara de su solicitud.</li><li className="legal-li">Copia de identificación oficial vigente.</li><li className="legal-li">En caso de rectificación: descripción del dato incorrecto y el valor correcto.</li></ul><div className="alert-box"><p>Recibirá respuesta en un plazo máximo de <strong>20 días hábiles</strong> contados a partir de la recepción de su solicitud, conforme a la Ley vigente. Si la solicitud procede, los cambios se realizarán dentro de los 15 días hábiles siguientes.</p></div></div>

          {/* 6 */}
          <div id="seguridad" className="section-block"><h2 className="legal-h2">6. Medidas de seguridad</h2><p className="legal-p">
              Implementamos medidas técnicas, administrativas y físicas para proteger sus datos personales contra daño, pérdida, alteración, destrucción o acceso no autorizado, incluyendo:
            </p><ul className="legal-ul"><li className="legal-li">Cifrado de datos en tránsito mediante HTTPS/TLS.</li><li className="legal-li">Cifrado de datos en reposo en la base de datos.</li><li className="legal-li">Control de acceso con autenticación y gestión de privilegios mínimos.</li><li className="legal-li">Respaldos automáticos y monitoreo de accesos no autorizados.</li><li className="legal-li">Obligación de confidencialidad para todos los colaboradores que intervengan en el tratamiento de datos.</li></ul><p className="legal-p">
              En caso de una vulneración de seguridad que afecte de forma significativa sus derechos, se le notificará conforme a los mecanismos establecidos en la Ley.
            </p></div>

          {/* 7 */}
          <div id="cambios" className="section-block"><h2 className="legal-h2">7. Cambios al Aviso de Privacidad</h2><p className="legal-p">
              Salurama podrá actualizar este Aviso de Privacidad cuando sea necesario para reflejar cambios en la plataforma, en la legislación aplicable o en las prácticas de tratamiento de datos. Los cambios serán comunicados mediante publicación en esta página y, en su caso, por correo electrónico. La fecha de última actualización siempre estará visible en la parte superior de este documento.
            </p></div>

          {/* 8 */}
          <div id="autoridad" className="section-block"><h2 className="legal-h2">8. Autoridad competente</h2><p className="legal-p">
              La autoridad competente en materia de protección de datos personales en posesión de particulares en México es la:
            </p><div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '16px 20px', margin: '12px 0' }}><p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                Secretaría Anticorrupción y Buen Gobierno
              </p><p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
                Unidad de Protección de Datos Personales<br />
                Sitio oficial: <a href="https://www.gob.mx/buengobierno" target="_blank" rel="noopener noreferrer" style={{ color: '#1E3A5F' }}>www.gob.mx/buengobierno</a><br />
                (Sustituyó al INAI a partir del 21 de marzo de 2025, conforme al Decreto publicado en el DOF el 20 de marzo de 2025)
              </p></div><p className="legal-p">
              Contra las resoluciones emitidas por la Secretaría procede el juicio de amparo indirecto ante Juzgados de Distrito y Tribunales Colegiados de Circuito especializados en materia de acceso a la información y protección de datos personales.
            </p></div>

          {/* 9 */}
          <div id="contacto" className="section-block"><h2 className="legal-h2">9. Contacto</h2><p className="legal-p">
              Para cualquier consulta relacionada con este Aviso de Privacidad o con el tratamiento de sus datos personales:
            </p><ul className="legal-ul"><li className="legal-li">Correo: <a href="mailto:privacidad@salurama.com" style={{ color: '#1E3A5F' }}>privacidad@salurama.com</a></li><li className="legal-li">Asunto del correo: "Aviso de Privacidad — [su nombre]"</li><li className="legal-li">Domicilio: Ciudad de México, México</li></ul><p className="legal-p" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
              © 2026 SALURAMA S.A.S. · Todos los derechos reservados · salurama.com
            </p></div></main></div>

      {/* FOOTER */}
      <footer style={{ background: '#0D1829', padding: 'clamp(32px,5vw,40px) 20px', textAlign: 'center' }}><div style={{ maxWidth: 860, margin: '0 auto' }}><div style={{ marginBottom: 10 }}><span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span><span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#2A9D8F' }}>rama</span></div><div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Términos y Condiciones','/terminos-y-condiciones'],['Política de Cookies','/politica-de-cookies'],
              ['Términos Profesionales','/terminos-profesionales'],['Inicio','/']]
              .map(([l,h]) =><Link key={h} href={h} style={{ fontSize: 13, color: '#9FB0C9', textDecoration: 'none' }}>{l}</Link>)}
          </div><p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 SALURAMA S.A.S. · salurama.com · Hecho en México 🇲🇽</p></div></footer></div>
  )
}
