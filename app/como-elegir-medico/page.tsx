'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Menu, X, Search, ShieldCheck, GraduationCap, SlidersHorizontal, Phone, CheckSquare, ChevronDown } from 'lucide-react'

const PASOS = [
  {
    num: '1',
    titulo: 'Define qué tipo de médico necesitas',
    icon: Search,
    contenido: [
      'Identifica si requieres un médico general o un especialista.',
      'Para síntomas comunes (gripe, revisión rutinaria) un médico general es suficiente.',
      'Si tienes una condición crónica, un síntoma persistente o requieres un procedimiento específico, busca un especialista.',
    ],
    tip: 'En Salurama usa el buscador: escribe la especialidad, el síntoma principal o el nombre del médico si ya tienes una referencia.',
    accion: { label: 'Ir al buscador', href: '/buscar' },
  },
  {
    num: '2',
    titulo: 'Usa los filtros según lo que más te importa',
    icon: SlidersHorizontal,
    contenido: [
      'Ubicación — para encontrar atención cerca de tu domicilio o trabajo.',
      'Años de experiencia — como referencia de trayectoria profesional.',
      'Alta especialidad — si tu caso es complejo o requiere una subespecialidad.',
      'Reseñas — como complemento, no como único criterio.',
      'Costo — si buscas opciones dentro de tu presupuesto.',
    ],
    tip: 'Combina varios filtros para obtener un grupo pequeño de candidatos. Menos opciones, pero más alineadas a lo que buscas.',
    accion: null,
  },
  {
    num: '3',
    titulo: 'Verifica la cédula profesional en la SEP',
    icon: ShieldCheck,
    contenido: [
      'En el perfil de cada médico encontrarás el botón "Verificar cédula profesional".',
      'Al hacer clic, llegarás directo al sitio oficial de la Dirección General de Profesiones de la SEP.',
      'Verifica que la cédula esté vigente y coincida con el nombre del médico.',
      'Asegúrate de que la especialidad declarada esté registrada — algunas cédulas son solo de médico general.',
    ],
    tip: 'Este paso garantiza que la persona que te atenderá tiene el título y la autorización legal para ejercer. Ninguna reseña reemplaza este filtro.',
    accion: null,
    destacado: true,
  },
  {
    num: '4',
    titulo: 'Valida la certificación ante el consejo de la especialidad',
    icon: GraduationCap,
    contenido: [
      'Muchos médicos se certifican voluntariamente ante colegios o consejos de especialidad.',
      'Usa el botón "Ver certificación en consejo de especialidad" en el perfil del médico.',
      'La certificación acredita que el médico ha pasado exámenes de actualización y cumple estándares de calidad.',
      'No es obligatoria, pero es un distintivo de compromiso con la excelencia.',
    ],
    tip: 'Un médico certificado por su consejo se actualiza periódicamente. Es una señal relevante, especialmente para especialidades de alta complejidad.',
    accion: null,
  },
  {
    num: '5',
    titulo: 'Contacta con confianza',
    icon: Phone,
    contenido: [
      'Una vez verificadas las credenciales, usa el botón "Contactar" para comunicarte directamente.',
      'No hay intermediarios ni costos adicionales.',
      'Si tienes dudas, pregúntale directamente sobre su cédula o certificación. Un profesional confiable lo tomará con naturalidad.',
    ],
    tip: 'Saber que elegiste con información objetiva te permite llegar a la consulta con tranquilidad.',
    accion: { label: 'Buscar especialistas', href: '/buscar' },
  },
]

const PREGUNTAS = [
  {
    q: '¿Salurama verifica las credenciales de los médicos?',
    a: 'No. Salurama no verifica, avala ni certifica credenciales. Lo que hacemos es darte acceso directo a las fuentes oficiales — la SEP y los consejos de especialidad — para que tú mismo puedas confirmar la información. La decisión es tuya, y nosotros te damos las herramientas para tomarla informado.',
  },
  {
    q: '¿Qué diferencia hay entre cédula profesional y certificación de especialidad?',
    a: 'La cédula profesional es el documento oficial expedido por la SEP que autoriza a una persona a ejercer su profesión. Es obligatoria para cualquier médico. La certificación de especialidad es un reconocimiento adicional otorgado por el consejo o colegio de esa especialidad, que implica haber aprobado exámenes de conocimiento y actualización. No es obligatoria, pero es una señal de compromiso con la calidad.',
  },
  {
    q: '¿Todos los médicos en Salurama tienen cédula verificada?',
    a: 'Todos los médicos registrados proporcionan su número de cédula al momento del registro. Salurama no verifica este dato de forma independiente — para confirmarlo, usa el botón "Verificar cédula" en el perfil del médico, que te lleva directamente al sitio de la SEP.',
  },
  {
    q: '¿Por qué Salurama es gratuito para los médicos?',
    a: 'Porque creemos que la visibilidad médica no debe estar condicionada a quién paga más. Salurama funciona con un modelo de negocio B2B — trabajamos con laboratorios, aseguradoras y farmacéuticas para financiar la plataforma, sin que esto afecte los resultados de búsqueda ni el orden en que aparecen los médicos.',
  },
  {
    q: '¿Puedo dejar una reseña sobre un médico?',
    a: 'Sí. Las reseñas son parte de la información disponible en los perfiles, pero en Salurama las tratamos como un dato más, no como el criterio principal. Ningún médico aparece primero por tener más reseñas o pagar por visibilidad.',
  },
]

export default function ComoElegirMedico() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [preguntaAbierta, setPreguntaAbierta] = useState<number | null>(null)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .nav-link {
          color: #1A1A2E; text-decoration: none; font-size: 15px; font-weight: 400;
          padding: 6px 2px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s;
        }
        .nav-link:hover, .nav-link.active { color: #3730A3; border-color: #3730A3; }

        .btn-medico {
          background: #3730A3; color: #fff; text-decoration: none;
          padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; transition: background 0.18s;
          display: inline-flex; align-items: center; gap: 7px;
        }
        .btn-medico:hover { background: #4F46E5; }

        .paso-card {
          background: #fff; border: 1.5px solid #E5E7EB; border-radius: 16px;
          padding: 28px 24px; transition: box-shadow 0.2s, border-color 0.2s;
        }
        .paso-card:hover { box-shadow: 0 4px 20px #3730A30F; border-color: #3730A322; }
        .paso-card.destacado { border-color: #3730A3; background: #F9FAFB; }

        .paso-num {
          width: 40px; height: 40px; border-radius: 50%; background: #3730A3; color: #fff;
          font-family: 'Fraunces', serif; font-size: 18px; font-weight: 900;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .paso-num.destacado { background: #F4623A; }

        .btn-accion {
          display: inline-flex; align-items: center; gap: 6px;
          background: #3730A3; color: #fff; text-decoration: none;
          padding: 10px 20px; border-radius: 50px; font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; transition: background 0.18s; border: none; cursor: pointer;
        }
        .btn-accion:hover { background: #4F46E5; }

        .faq-item {
          border-bottom: 1px solid #F3F4F6; padding: 18px 0; cursor: pointer;
        }
        .faq-item:first-child { border-top: 1px solid #F3F4F6; }
        .faq-q {
          display: flex; justify-content: space-between; align-items: center; gap: 12px;
          font-size: 15px; font-weight: 500; color: #1A1A2E;
        }
        .faq-a {
          font-size: 14px; color: #6B7280; line-height: 1.7; font-weight: 300;
          margin-top: 12px; padding-right: 28px;
        }

        .checklist-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px; color: #374151; line-height: 1.6; padding: 8px 0;
          border-bottom: 0.5px solid #F3F4F6;
        }
        .checklist-item:last-child { border-bottom: none; }

        @media (max-width: 768px) {
          .dsk     { display: none !important; }
          .mob-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mob-btn  { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #F3F4F6', padding: '0 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
          </Link>
          <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/buscar"             className="nav-link">Especialidades</Link>
            <Link href="/como-elegir-medico" className="nav-link active">¿Cómo elegir médico?</Link>
            <Link href="/nosotros"           className="nav-link">Nosotros</Link>
            <Link href="/registro"           className="btn-medico">👨‍⚕️ Soy Médico</Link>
          </div>
          <button
            className="mob-btn"
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ display: 'none', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? <X size={24} color="#3730A3" /> : <Menu size={24} color="#3730A3" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mob-menu" style={{ padding: '16px 20px 20px', borderTop: '1px solid #F3F4F6', background: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Link href="/buscar"             onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', display: 'block' }}>Especialidades</Link>
              <Link href="/como-elegir-medico" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, color: '#3730A3', fontWeight: 600, textDecoration: 'none', padding: '12px 8px', display: 'block' }}>¿Cómo elegir médico?</Link>
              <Link href="/nosotros"           onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', display: 'block' }}>Nosotros</Link>
              <Link href="/registro" onClick={() => setMobileMenuOpen(false)} className="btn-medico" style={{ marginTop: 8, justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}>
                👨‍⚕️ Soy Médico
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: 'clamp(48px, 8vw, 72px) 20px 40px', textAlign: 'center', background: 'linear-gradient(160deg, #EEF2FF 0%, #fff 60%)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Guía para pacientes
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 900, color: '#3730A3', lineHeight: 1.15, marginBottom: 16 }}>
            ¿Cómo elegir médico?
          </h1>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 600, fontStyle: 'italic', color: '#4F46E5', marginBottom: 16 }}>
            No es lo mismo que elegir un restaurante.
          </p>
          <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#6B7280', lineHeight: 1.75, maxWidth: 520, margin: '0 auto 28px' }}>
            Una buena relación médico-paciente se basa en la confianza. Y sabemos
            que la confianza se debe construir — con información real, no con rankings pagados.
          </p>
          <button
            onClick={() => document.getElementById('paso-1')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-accion"
          >
            Ver la guía paso a paso
          </button>
        </div>
      </section>

      {/* ── PASOS ── */}
      <section style={{ padding: 'clamp(40px, 6vw, 64px) 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {PASOS.map((paso, i) => (
            <div
              key={paso.num}
              id={i === 0 ? 'paso-1' : undefined}
              className={`paso-card${paso.destacado ? ' destacado' : ''}`}
            >
              {/* Encabezado del paso */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                <div className={`paso-num${paso.destacado ? ' destacado' : ''}`}>{paso.num}</div>
                <div style={{ paddingTop: 8 }}>
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(17px, 3.5vw, 21px)', fontWeight: 900, color: '#1A1A2E', lineHeight: 1.25 }}>
                    {paso.titulo}
                  </h2>
                </div>
              </div>

              {/* Contenido */}
              <div style={{ paddingLeft: 54 }}>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {paso.contenido.map((item, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#374151', lineHeight: 1.65 }}>
                      <span style={{ color: '#3730A3', marginTop: 2, flexShrink: 0 }}>→</span>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Tip */}
                <div style={{
                  background: paso.destacado ? '#EEF2FF' : '#F9FAFB',
                  border: `1px solid ${paso.destacado ? '#C7D2FE' : '#E5E7EB'}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 13,
                  color: paso.destacado ? '#3730A3' : '#6B7280',
                  lineHeight: 1.65,
                  marginBottom: paso.accion ? 16 : 0,
                }}>
                  <strong style={{ fontWeight: 600 }}>💡 </strong>
                  {paso.tip}
                </div>

                {/* Botón de acción */}
                {paso.accion && (
                  <div style={{ marginTop: 16 }}>
                    <Link href={paso.accion.href} className="btn-accion">
                      {paso.accion.label} →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}

        </div>
      </section>

      {/* ── CHECKLIST ── */}
      <section style={{ padding: 'clamp(32px, 5vw, 48px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: '#3730A3', marginBottom: 6 }}>
            Lista de verificación
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
            Antes de agendar tu cita, confirma estos puntos:
          </p>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '4px 20px' }}>
            {[
              'Identifiqué si necesito médico general o especialista',
              'Usé los filtros de prioridad para acotar opciones',
              'Verifiqué la cédula profesional en el sitio de la SEP',
              'Revisé si tiene certificación vigente ante su consejo de especialidad',
              'Confirmé su ubicación y horarios',
              'Revisé las reseñas como dato complementario',
              'Me siento listo para contactarlo directamente',
            ].map((item, i) => (
              <div key={i} className="checklist-item">
                <CheckSquare size={16} color="#3730A3" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── POR QUÉ SALURAMA ── */}
      <section style={{ padding: 'clamp(40px, 6vw, 56px) 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: '#3730A3', marginBottom: 16 }}>
            ¿Por qué Salurama es diferente?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              {
                titulo: 'Tú verificas, no nosotros',
                texto: 'Salurama no te dice "este médico es bueno". Te da las herramientas para que tú mismo confirmes su respaldo oficial.',
              },
              {
                titulo: 'Sin rankings pagados',
                texto: 'Ningún médico aparece primero por pagar más. El orden refleja relevancia para tu búsqueda, no inversión publicitaria.',
              },
              {
                titulo: 'Gratuito para médicos y pacientes',
                texto: 'No cobramos comisiones por citas ni cuotas de visibilidad. El modelo B2B financia la plataforma sin afectar los resultados.',
              },
            ].map((item, i) => (
              <div key={i} style={{ background: '#F9FAFB', borderRadius: 12, padding: '18px 16px', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 6 }}>{item.titulo}</p>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, fontWeight: 300 }}>{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREGUNTAS FRECUENTES ── */}
      <section style={{ padding: 'clamp(32px, 5vw, 48px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: '#3730A3', marginBottom: 24 }}>
            Preguntas frecuentes
          </h2>
          {PREGUNTAS.map((item, i) => (
            <div
              key={i}
              className="faq-item"
              onClick={() => setPreguntaAbierta(preguntaAbierta === i ? null : i)}
            >
              <div className="faq-q">
                <span>{item.q}</span>
                <ChevronDown
                  size={18}
                  color="#9CA3AF"
                  style={{ flexShrink: 0, transform: preguntaAbierta === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                />
              </div>
              {preguntaAbierta === i && (
                <p className="faq-a">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ background: '#3730A3', padding: 'clamp(40px, 6vw, 52px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>
            ¿Listo para elegir con certeza?
          </h2>
          <p style={{ color: '#A5B4FC', fontSize: 14, marginBottom: 24, fontWeight: 300 }}>
            Busca, verifica y contacta. La decisión es tuya.
          </p>
          <Link href="/buscar" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4623A', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: '50px', fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            Buscar médico ahora →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#1E1B4B', padding: 'clamp(32px, 5vw, 40px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </div>
          <p style={{ fontSize: 13, color: '#A5B4FC', fontStyle: 'italic', marginBottom: 16 }}>"Más que opiniones, evidencia"</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Inicio',                  href: '/'                         },
              { label: 'Especialidades',           href: '/buscar'                   },
              { label: 'Registro médico',          href: '/registro'                 },
              { label: 'Nosotros',                 href: '/nosotros'                 },
              { label: 'Términos y Condiciones',   href: '/terminos-y-condiciones'   },
              { label: 'Aviso de Privacidad',      href: '/aviso-de-privacidad'      },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ fontSize: 13, color: '#A5B4FC', textDecoration: 'none' }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 Salurama S.A.S. · salurama.com · Hecho en México 🇲🇽</p>
        </div>
      </footer>
    </div>
  )
}
