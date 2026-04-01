'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ShieldCheck, GraduationCap, SlidersHorizontal, Heart } from 'lucide-react'

export default function Nosotros() {
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
        .valor-card { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
          padding: 22px 18px; transition: box-shadow 0.2s, border-color 0.2s; }
        .valor-card:hover { box-shadow: 0 4px 18px #3730A30D; border-color: #3730A322; }
        .valor-icon { width: 42px; height: 42px; border-radius: 10px; background: #EEF2FF;
          display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
          transition: transform 0.25s; }
        .valor-card:hover .valor-icon { transform: scale(1.08) rotate(3deg); }
        @media (max-width: 768px) {
          .dsk { display: none !important; }
          .mob-btn { display: flex !important; }
          .valores-grid { grid-template-columns: 1fr !important; }
          .pillares-grid { grid-template-columns: 1fr !important; }
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
            <Link href="/nosotros"           className="nav-link active-page" style={{ color: '#3730A3', borderBottomColor: '#3730A3' }}>Nosotros</Link>
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
      <section style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #fff 60%)', padding: 'clamp(52px,8vw,80px) 20px clamp(40px,6vw,60px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Nuestra historia
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px,7vw,52px)', fontWeight: 900, color: '#1E1B4B', lineHeight: 1.15, marginBottom: 20 }}>
            Construimos confianza en salud
          </h1>
          <p style={{ fontSize: 'clamp(15px,3vw,18px)', color: '#4B5563', lineHeight: 1.8, maxWidth: 560, margin: '0 auto' }}>
            Salurama nació de una convicción simple: los pacientes merecen información real para elegir
            a su médico, y los médicos merecen visibilidad basada en sus méritos, no en su presupuesto publicitario.
          </p>
        </div>
      </section>

      {/* EL ORIGEN */}
      <section style={{ padding: 'clamp(44px,6vw,64px) 20px', background: '#fff' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>El origen</p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: '#1E1B4B', marginBottom: 16, lineHeight: 1.25 }}>
                Creado por un médico que vivió el problema
              </h2>
              <p style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.85, marginBottom: 14 }}>
                Salurama fue fundada por el Dr. Manuel Augusto Tapia Dávila, médico hematólogo con práctica
                en el IMSS. Desde adentro del sistema de salud, observó dos realidades que no encajaban:
                pacientes que no sabían cómo verificar si su médico estaba realmente certificado, y médicos
                talentosos con poca visibilidad porque no podían o no querían pagar por aparecer en un directorio.
              </p>
              <p style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.85 }}>
                La respuesta fue Salurama: una plataforma donde la visibilidad se gana con credenciales reales,
                y donde los pacientes tienen las herramientas para verificarlas por sí mismos, directamente
                en fuentes oficiales.
              </p>
            </div>
            <div style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #F9FAFB 100%)', borderRadius: 20, padding: '32px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { n: 'Dr. Manuel Augusto Tapia Dávila', d: 'Fundador' },
                  { n: 'Hematología', d: 'Especialidad' },
                  { n: 'IMSS · Ciudad de México', d: 'Práctica clínica' },
                  { n: 'IPN · Maestría en Ciencias', d: 'Investigación en salud' },
                ].map(item => (
                  <div key={item.n} style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{item.d}</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>{item.n}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MISIÓN Y VISIÓN */}
      <section style={{ padding: 'clamp(44px,6vw,60px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '28px 24px', border: '1.5px solid #E5E7EB' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Misión</p>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1E1B4B', marginBottom: 12, lineHeight: 1.3 }}>
                Democratizar el acceso a información médica verificable
              </p>
              <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.8 }}>
                Conectar pacientes con profesionales de la salud a través de información objetiva, verificable
                en fuentes oficiales, sin barreras económicas ni algoritmos que favorezcan a quien más invierte.
              </p>
            </div>
            <div style={{ background: '#3730A3', borderRadius: 16, padding: '28px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Visión</p>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
                El estándar de confianza en la elección médica en México y LATAM
              </p>
              <p style={{ fontSize: 14, color: '#A5B4FC', lineHeight: 1.8 }}>
                Ser la referencia donde pacientes y médicos confíen en que la información es real,
                la verificación es posible y la visibilidad es justa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA EL MODELO */}
      <section style={{ padding: 'clamp(44px,6vw,64px) 20px', background: '#fff' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
            Nuestro diferenciador
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: '#1E1B4B', textAlign: 'center', marginBottom: 10, lineHeight: 1.25 }}>
            Verificación real, no rankings pagados
          </h2>
          <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 1.8, maxWidth: 560, margin: '0 auto 40px' }}>
            La confianza entre médico y paciente se construye. En Salurama, ese proceso empieza antes
            de la primera cita, con información verificable por el propio paciente.
          </p>

          <div className="pillares-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              { icon: ShieldCheck, title: 'Cédula verificable', desc: 'Botón directo al portal de la SEP en cada perfil. El paciente verifica, no nosotros. Sin intermediarios.' },
              { icon: GraduationCap, title: 'Certificación vigente', desc: 'Acceso al consejo de la especialidad para confirmar que la certificación está al día.' },
              { icon: SlidersHorizontal, title: 'Filtros que importan', desc: 'Ubicación, experiencia, costo o reseñas. El paciente elige según lo que es importante para él, no según quien pagó más.' },
            ].map(item => (
              <div key={item.title} className="valor-card">
                <div className="valor-icon"><item.icon size={20} color="#3730A3" /></div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, fontWeight: 300 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODELO DE NEGOCIO */}
      <section style={{ padding: 'clamp(44px,6vw,60px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
            Transparencia sobre cómo nos financiamos
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, color: '#1E1B4B', textAlign: 'center', marginBottom: 12, lineHeight: 1.25 }}>
            Gratuito para médicos y pacientes
          </h2>
          <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 1.8, maxWidth: 560, margin: '0 auto 36px' }}>
            El registro de médicos y el uso por pacientes siempre será gratuito. Nos financiamos a través
            de acuerdos con empresas del sector salud — farmacéuticas, aseguradoras, laboratorios — para
            publicar contenido informativo y educativo.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '22px 20px', border: '1.5px solid #E5E7EB' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 10 }}>Lo que nunca haremos</p>
              {['Cobrar a médicos por visibilidad básica', 'Alterar el orden de resultados por dinero', 'Vender datos personales de pacientes', 'Publicar contenido patrocinado sin identificarlo'].map(i => (
                <p key={i} style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }}>✕</span>{i}
                </p>
              ))}
            </div>
            <div style={{ background: '#EEF2FF', borderRadius: 14, padding: '22px 20px', border: '1.5px solid #C7D2FE' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#3730A3', marginBottom: 10 }}>Nuestro compromiso</p>
              {['Registro gratuito para médicos, siempre', 'Búsqueda gratuita para pacientes, siempre', 'Contenido patrocinado claramente identificado', 'Patrocinios que no afectan resultados de búsqueda'].map(i => (
                <p key={i} style={{ fontSize: 13, color: '#4F46E5', lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>✓</span>{i}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VALORES */}
      <section style={{ padding: 'clamp(44px,6vw,60px) 20px', background: '#fff' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, color: '#1E1B4B', textAlign: 'center', marginBottom: 36, lineHeight: 1.25 }}>
            Nuestros valores
          </h2>
          <div className="valores-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
            {[
              { titulo: 'Transparencia', texto: 'La información debe ser verificable, no solo presentada. Cada dato en Salurama tiene una fuente oficial a la que el paciente puede acceder directamente.' },
              { titulo: 'Equidad', texto: 'La visibilidad de un médico no debe depender de su inversión publicitaria. Todos los perfiles tienen las mismas oportunidades de ser encontrados.' },
              { titulo: 'Confianza', texto: 'La confianza médico-paciente se construye con información real. Salurama es el puente entre la decisión informada y la primera cita.' },
              { titulo: 'Accesibilidad', texto: 'El acceso a información de calidad sobre salud no debe tener precio. Para médicos ni para pacientes.' },
            ].map(v => (
              <div key={v.titulo} style={{ padding: '20px 18px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>{v.titulo}</p>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, fontWeight: 300 }}>{v.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section style={{ background: '#3730A3', padding: 'clamp(44px,6vw,56px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#F4623A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Contacto</p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>
            ¿Tienes dudas o quieres colaborar?
          </h2>
          <p style={{ color: '#A5B4FC', fontSize: 15, marginBottom: 28, fontWeight: 300 }}>
            Escríbenos. Respondemos a todos.
          </p>
          <a href="mailto:hola@salurama.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4623A', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: '50px', fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            hola@salurama.com →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#1E1B4B', padding: 'clamp(32px,5vw,40px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </div>
          <p style={{ fontSize: 13, color: '#A5B4FC', fontStyle: 'italic', marginBottom: 16 }}>"Más que opiniones, evidencia"</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Especialidades','/buscar'],['¿Cómo elegir médico?','/como-elegir-medico'],['Registro médico','/registro'],
              ['Términos y Condiciones','/terminos-y-condiciones'],['Aviso de Privacidad','/aviso-de-privacidad']]
              .map(([l,h]) => <Link key={h} href={h} style={{ fontSize: 13, color: '#A5B4FC', textDecoration: 'none' }}>{l}</Link>)}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 SALURAMA S.A.S. · salurama.com · Hecho en México 🇲🇽</p>
        </div>
      </footer>
    </div>
  )
}
