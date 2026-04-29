'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ShieldCheck, GraduationCap, SlidersHorizontal, Heart } from 'lucide-react'

export default function Nosotros() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-link { color: #111827; text-decoration: none; font-size: 15px; font-weight: 400;
          padding: 6px 2px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; }
        .nav-link:hover { color: #1E3A5F; border-color: #1E3A5F; }
        .btn-medico { background: #1E3A5F; color: #fff; text-decoration: none;
          padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; transition: background 0.18s;
          display: inline-flex; align-items: center; gap: 7px; }
        .btn-medico:hover { background: #526894; }
        .valor-card { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
          padding: 22px 18px; transition: box-shadow 0.2s, border-color 0.2s; }
        .valor-card:hover { box-shadow: 0 4px 18px #1E3A5F0D; border-color: #1E3A5F22; }
        .valor-icon { width: 42px; height: 42px; border-radius: 10px; background: #E8ECF3;
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

      {/* HERO */}
      <section style={{ background: 'linear-gradient(160deg, #E8ECF3 0%, #fff 60%)', padding: 'clamp(52px,8vw,80px) 20px clamp(40px,6vw,60px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Nuestra historia
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px,7vw,52px)', fontWeight: 900, color: '#0D1829', lineHeight: 1.15, marginBottom: 20 }}>
            Construimos confianza en salud
          </h1>
          <p style={{ fontSize: 'clamp(15px,3vw,18px)', color: '#4A5568', lineHeight: 1.8, maxWidth: 560, margin: '0 auto' }}>
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
              <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>El origen</p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: '#0D1829', marginBottom: 16, lineHeight: 1.25 }}>
                Creado por un médico que vivió el problema
              </h2>
              <p style={{ fontSize: 15, color: '#4A5568', lineHeight: 1.85, marginBottom: 14 }}>
                Salurama fue fundada por un médico hematólogo mexicano con práctica
                en el IMSS. Desde adentro del sistema de salud, observó dos realidades que no encajaban:
                pacientes que no sabían cómo verificar si su médico estaba realmente certificado, y médicos
                talentosos con poca visibilidad porque no podían o no querían pagar por aparecer en un directorio.
              </p>
              <p style={{ fontSize: 15, color: '#4A5568', lineHeight: 1.85 }}>
                La respuesta fue Salurama: una plataforma donde la visibilidad se gana con credenciales reales,
                y donde los pacientes tienen las herramientas para verificarlas por sí mismos, directamente
                en fuentes oficiales.
              </p>
            </div>
            <div style={{ background: 'linear-gradient(160deg, #E8ECF3 0%, #F9FAFB 100%)', borderRadius: 20, padding: '32px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { n: 'Dr. Manuel Augusto Tapia Dávila', d: 'Fundador' },
                  { n: 'Hematología', d: 'Especialidad' },
                  { n: 'IMSS · Ciudad de México', d: 'Práctica clínica' },
                  { n: 'IPN · Maestría en Ciencias', d: 'Investigación en salud' },
                ].map(item => (
                  <div key={item.n} style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{item.d}</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{item.n}</p>
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
              <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Misión</p>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#0D1829', marginBottom: 12, lineHeight: 1.3 }}>
                Democratizar el acceso a información médica verificable
              </p>
              <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.8 }}>
                Conectar pacientes con profesionales de la salud a través de información objetiva, verificable
                en fuentes oficiales, sin barreras económicas ni algoritmos que favorezcan a quien más invierte.
              </p>
            </div>
            <div style={{ background: '#1E3A5F', borderRadius: 16, padding: '28px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9FB0C9', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Visión</p>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
                El estándar de confianza en la elección médica en México y LATAM
              </p>
              <p style={{ fontSize: 14, color: '#9FB0C9', lineHeight: 1.8 }}>
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
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
            Nuestro diferenciador
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: '#0D1829', textAlign: 'center', marginBottom: 10, lineHeight: 1.25 }}>
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
                <div className="valor-icon"><item.icon size={20} color="#1E3A5F" /></div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 6 }}>{item.title}</p>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, fontWeight: 300 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODELO DE NEGOCIO */}
      <section style={{ padding: 'clamp(44px,6vw,60px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
            Transparencia sobre cómo nos financiamos
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, color: '#0D1829', textAlign: 'center', marginBottom: 12, lineHeight: 1.25 }}>
            Gratuito para médicos y pacientes
          </h2>
          <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 1.8, maxWidth: 560, margin: '0 auto 36px' }}>
            El registro de médicos y el uso por pacientes siempre será gratuito. Nos financiamos a través
            de acuerdos con empresas del sector salud — farmacéuticas, aseguradoras, laboratorios — para
            publicar contenido informativo y educativo.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: '22px 20px', border: '1.5px solid #E5E7EB' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Lo que nunca haremos</p>
              {['Cobrar a médicos por visibilidad básica', 'Alterar el orden de resultados por dinero', 'Vender datos personales de pacientes', 'Publicar contenido patrocinado sin identificarlo'].map(i => (
                <p key={i} style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }}>✕</span>{i}
                </p>
              ))}
            </div>
            <div style={{ background: '#E8ECF3', borderRadius: 14, padding: '22px 20px', border: '1.5px solid #C5D0E0' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F', marginBottom: 10 }}>Nuestro compromiso</p>
              {['Registro gratuito para médicos, siempre', 'Búsqueda gratuita para pacientes, siempre', 'Contenido patrocinado claramente identificado', 'Patrocinios que no afectan resultados de búsqueda'].map(i => (
                <p key={i} style={{ fontSize: 13, color: '#2A9D8F', lineHeight: 1.7, display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
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
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, color: '#0D1829', textAlign: 'center', marginBottom: 36, lineHeight: 1.25 }}>
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
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{v.titulo}</p>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, fontWeight: 300 }}>{v.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section style={{ background: '#1E3A5F', padding: 'clamp(44px,6vw,56px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Contacto</p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px,5vw,28px)', fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>
            ¿Tienes dudas o quieres colaborar?
          </h2>
          <p style={{ color: '#9FB0C9', fontSize: 15, marginBottom: 28, fontWeight: 300 }}>
            Escríbenos. Respondemos a todos.
          </p>
          <a href="mailto:hola@salurama.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#2A9D8F', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: '50px', fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            hola@salurama.com →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0D1829', padding: 'clamp(32px,5vw,40px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#2A9D8F' }}>rama</span>
          </div>
          <p style={{ fontSize: 13, color: '#9FB0C9', fontStyle: 'italic', marginBottom: 16 }}>"Más que opiniones, evidencia"</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['Especialidades','/buscar'],['¿Cómo elegir médico?','/como-elegir-medico'],['Registro médico','/registro'],
              ['Términos y Condiciones','/terminos-y-condiciones'],['Aviso de Privacidad','/aviso-de-privacidad']]
              .map(([l,h]) => <Link key={h} href={h} style={{ fontSize: 13, color: '#9FB0C9', textDecoration: 'none' }}>{l}</Link>)}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 SALURAMA S.A.S. · salurama.com · Hecho en México 🇲🇽</p>
        </div>
      </footer>
    </div>
  )
}
