'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const SECTIONS = [
  { id: 'naturaleza',      title: '1. Naturaleza de la relación' },
  { id: 'registro',        title: '2. Registro y perfil' },
  { id: 'verificacion',    title: '3. Verificación de credenciales' },
  { id: 'responsabilidad', title: '4. Responsabilidad médica' },
  { id: 'resenas',         title: '5. Reseñas y reputación' },
  { id: 'conducta',        title: '6. Conducta profesional' },
  { id: 'modelo',          title: '7. Modelo gratuito y servicios futuros' },
  { id: 'suspension',      title: '8. Suspensión y cancelación' },
  { id: 'jurisdiccion',    title: '9. Jurisdicción' },
]

export default function TerminosProfesionales() {
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

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #E8ECF3 0%, #fff 60%)', padding: 'clamp(40px,6vw,60px) 20px 32px' }}><div style={{ maxWidth: 860, margin: '0 auto' }}><p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Para médicos y especialistas
          </p><h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px,6vw,40px)', fontWeight: 900, color: '#0D1829', marginBottom: 12 }}>
            Términos para Profesionales de la Salud
          </h1><p style={{ fontSize: 14, color: '#6B7280', marginBottom: 6 }}>
            Última actualización: 31 de marzo de 2026
          </p><p style={{ fontSize: 14, color: '#6B7280' }}>
            Este contrato regula la relación entre <strong style={{ color: '#111827' }}>SALURAMA S.A.S.</strong> y los profesionales de la salud que utilizan la plataforma.
          </p></div></section>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 80px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, alignItems: 'start' }}><aside className="sidebar-col" style={{ position: 'sticky', top: 80 }}><p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Contenido</p><nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s =><a key={s.id} href={`#${s.id}`} className="toc-link">{s.title}</a>)}
          </nav></aside><main>

          {/* 1 */}
          <div id="naturaleza" className="section-block"><h2 className="legal-h2">1. Naturaleza de la relación</h2><p className="legal-p">
              Al registrarse en Salurama, el profesional de la salud reconoce y acepta que:
            </p><ul className="legal-ul"><li className="legal-li">Salurama es <strong className="legal-strong">exclusivamente una plataforma tecnológica</strong> que facilita el acceso a información pública sobre profesionales de la salud.</li><li className="legal-li">No existe entre las partes relación laboral, de sociedad, de mandato, de agencia ni de representación legal de ningún tipo.</li><li className="legal-li">El profesional actúa en forma completamente independiente y bajo su propia responsabilidad.</li></ul><p className="legal-p">Salurama NO ejerce la medicina, NO supervisa actos médicos, NO garantiza resultados de tratamientos, NO interviene en la relación médico-paciente y NO es responsable de los actos u omisiones del profesional en el ejercicio de su profesión.</p></div>

          {/* 2 */}
          <div id="registro" className="section-block"><h2 className="legal-h2">2. Registro y perfil</h2><p className="legal-p">Al registrarse, el profesional se compromete a:</p><ul className="legal-ul"><li className="legal-li">Proporcionar información veraz, completa y actualizada en todos los campos del perfil.</li><li className="legal-li">Contar con cédula profesional válida y vigente expedida en México.</li><li className="legal-li">Mantener actualizados sus datos de contacto, especialidad y credenciales.</li><li className="legal-li">Notificar a Salurama de inmediato ante cualquier cambio relevante en sus credenciales o situación profesional.</li></ul><p className="legal-p">
              El profesional otorga a Salurama una licencia no exclusiva para mostrar públicamente los datos de su perfil con la finalidad de conectarlo con pacientes. Esta licencia se revoca automáticamente al cancelar la cuenta.
            </p></div>

          {/* 3 */}
          <div id="verificacion" className="section-block"><h2 className="legal-h2">3. Verificación de credenciales — Transparencia al paciente</h2><div className="alert-box"><p>El diferenciador central de Salurama es que los pacientes verifican las credenciales directamente en fuentes oficiales (SEP, consejos de especialidad), sin intermediarios. Salurama NO es un aval, NO certifica y NO garantiza la vigencia de ninguna credencial.</p></div><p className="legal-p">
              En el perfil del profesional se incluirán botones de acceso directo al portal de cédulas de la SEP y al consejo de especialidad correspondiente. El profesional acepta que esta funcionalidad es fundamental para el servicio y no puede ser desactivada.
            </p><p className="legal-p">
              Salurama podrá incluir en el perfil la leyenda <strong className="legal-strong">"Cédula verificable en SEP"</strong> únicamente para indicar que el número de cédula reportado por el profesional es consultable en el portal oficial. Esta leyenda no implica que Salurama haya realizado verificación alguna ni que avale al profesional.
            </p><p className="legal-p">
              Salurama podrá suspender o eliminar perfiles cuando exista evidencia documentada de inconsistencias entre los datos declarados y la información disponible en fuentes oficiales, o ante denuncia fundada de información falsa.
            </p></div>

          {/* 4 */}
          <div id="responsabilidad" className="section-block"><h2 className="legal-h2">4. Responsabilidad médica e indemnización</h2><p className="legal-p">
              El profesional acepta que es el <strong className="legal-strong">único responsable</strong> de los servicios médicos que presta a través de cualquier contacto generado desde la plataforma. Salurama no participa en diagnósticos, tratamientos ni en ningún acto médico.
            </p><p className="legal-p"><strong className="legal-strong">Indemnización:</strong> El profesional se obliga a indemnizar, defender y mantener en paz y a salvo a SALURAMA S.A.S., sus directivos, empleados y representantes, de cualquier reclamación, demanda, pérdida, multa o gasto (incluyendo honorarios legales razonables) que surja directamente de: (i) información falsa o engañosa proporcionada en su perfil, (ii) actos u omisiones en el ejercicio de su práctica médica, o (iii) incumplimiento de los presentes Términos. Esta obligación de indemnización estará limitada a daños directos y comprobables, excluyendo daños indirectos o lucro cesante.
            </p></div>

          {/* 5 */}
          <div id="resenas" className="section-block"><h2 className="legal-h2">5. Reseñas y calificaciones</h2><p className="legal-p">
              Los pacientes podrán publicar reseñas y calificaciones en el perfil del profesional. El profesional acepta que:
            </p><ul className="legal-ul"><li className="legal-li">Las reseñas legítimas serán públicas y no podrán ser eliminadas a petición del profesional.</li><li className="legal-li">Podrá responder públicamente a las reseñas de manera profesional y respetuosa.</li><li className="legal-li">Las reseñas son opiniones de terceros; Salurama no las avala ni verifica su veracidad.</li></ul><p className="legal-p">
              Salurama se reserva el derecho de eliminar reseñas que contengan: información falsa verificable, contenido difamatorio, datos personales de terceros sin consentimiento, o contenido contrario a la legislación mexicana. La moderación se realizará con criterios objetivos y no discriminatorios.
            </p><div className="alert-box"><p>Las reseñas nunca afectan el orden de aparición en búsquedas. Ningún médico aparece primero por tener más o mejores reseñas, ni por ningún pago. El orden de resultados refleja relevancia para la búsqueda del paciente.</p></div></div>

          {/* 6 */}
          <div id="conducta" className="section-block"><h2 className="legal-h2">6. Conducta profesional</h2><p className="legal-p">El profesional se compromete a:</p><ul className="legal-ul"><li className="legal-li">No publicar información engañosa, exagerada o no verificable sobre su práctica o credenciales.</li><li className="legal-li">No contactar a pacientes que no hayan iniciado el contacto a través de la plataforma para fines de prospección.</li><li className="legal-li">Respetar la normativa aplicable a su profesión, incluyendo el Código de Ética del sector.</li><li className="legal-li">No utilizar la plataforma para actividades contrarias a la Ley General de Salud y sus reglamentos.</li></ul></div>

          {/* 7 */}
          <div id="modelo" className="section-block"><h2 className="legal-h2">7. Modelo gratuito y servicios opcionales futuros</h2><p className="legal-p">
              El <strong className="legal-strong">registro y perfil básico en Salurama es gratuito</strong> para los profesionales de la salud. Salurama se financia mediante contratos con empresas del sector salud (farmacéuticas, aseguradoras, laboratorios) para contenido informativo, sin que esto afecte la visibilidad o el orden de aparición de los profesionales.
            </p><p className="legal-p">
              En el futuro, Salurama podrá ofrecer servicios adicionales opcionales como herramientas de gestión de agenda, estadísticas del perfil o funcionalidades avanzadas. Estos servicios serán siempre opcionales, se informarán previamente y requerirán aceptación expresa del profesional. <strong className="legal-strong">Ningún servicio de pago afectará el orden de aparición en resultados de búsqueda.</strong></p></div>

          {/* 8 */}
          <div id="suspension" className="section-block"><h2 className="legal-h2">8. Suspensión y cancelación de cuenta</h2><h3 className="legal-h3">Causales de suspensión o eliminación por parte de Salurama</h3><ul className="legal-ul"><li className="legal-li">Información falsa, engañosa o inconsistente con fuentes oficiales verificadas.</li><li className="legal-li">Conducta contraria al Código de Ética o que afecte a pacientes o terceros.</li><li className="legal-li">Violación reiterada de los presentes Términos.</li><li className="legal-li">Solicitud fundamentada de autoridad competente.</li><li className="legal-li">Inactividad del perfil por más de 24 meses sin actualización.</li></ul><p className="legal-p">
              Salvo en casos de urgencia o riesgo para pacientes, Salurama notificará al profesional con al menos <strong className="legal-strong">5 días hábiles de anticipación</strong> antes de proceder a la suspensión, indicando la causal específica y el mecanismo para subsanarla.
            </p><h3 className="legal-h3">Cancelación voluntaria</h3><p className="legal-p">
              El profesional podrá cancelar su cuenta en cualquier momento enviando solicitud a <a href="mailto:hola@salurama.com" style={{ color: '#1E3A5F' }}>hola@salurama.com</a>. La cancelación se procesará en un plazo máximo de 5 días hábiles.
            </p></div>

          {/* 9 */}
          <div id="jurisdiccion" className="section-block"><h2 className="legal-h2">9. Jurisdicción y ley aplicable</h2><p className="legal-p">
              El presente contrato se rige por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales competentes de la Ciudad de México, renunciando al fuero que pudiera corresponderles por razón de domicilio presente o futuro.
            </p><p className="legal-p">
              Las partes acuerdan intentar resolver cualquier diferencia mediante negociación directa en un plazo de 30 días. De no lograrse acuerdo, la controversia se someterá al Centro de Arbitraje de México (CAM) conforme a su reglamento vigente.
            </p><p className="legal-p">
              Estos Términos entran en vigor el 31 de marzo de 2026. Salurama se reserva el derecho de modificarlos con notificación previa de 15 días naturales.
            </p><p className="legal-p" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6', fontSize: 12, color: '#9CA3AF' }}>
              © 2026 SALURAMA S.A.S. · Todos los derechos reservados · salurama.com
            </p></div></main></div><footer style={{ background: '#0D1829', padding: 'clamp(32px,5vw,40px) 20px', textAlign: 'center' }}><div style={{ maxWidth: 860, margin: '0 auto' }}><div style={{ marginBottom: 10 }}><span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span><span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#2A9D8F' }}>rama</span></div><div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Términos y Condiciones','/terminos-y-condiciones'],['Aviso de Privacidad','/aviso-de-privacidad'],
              ['Política de Cookies','/politica-de-cookies'],['Inicio','/']]
              .map(([l,h]) =><Link key={h} href={h} style={{ fontSize: 13, color: '#9FB0C9', textDecoration: 'none' }}>{l}</Link>)}
          </div><p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 SALURAMA S.A.S. · salurama.com · Hecho en México 🇲🇽</p></div></footer></div>
  )
}
