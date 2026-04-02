'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Menu, X, Search, ShieldCheck, GraduationCap, 
  CheckSquare, ChevronDown, ArrowRight, ExternalLink,
  Info, Star, MapPin, Clock, DollarSign
} from 'lucide-react'

const PASOS = [
  {
    num: '1',
    titulo: 'Define qué tipo de médico necesitas',
    icon: Search,
    contenido: [
      'Médico general → síntomas comunes (gripe, revisión rutinaria)',
      'Especialista → condición crónica o síntoma persistente',
      'Alta especialidad → casos complejos o segunda opinión',
    ],
    tip: 'En Salurama usa el buscador: escribe la especialidad, el síntoma o el nombre del médico.',
    accion: { label: 'Ir al buscador', href: '/buscar' },
  },
  {
    num: '2',
    titulo: 'Usa los filtros según lo que más te importa',
    icon: MapPin,
    contenido: [
      '📍 Ubicación — cerca de tu domicilio o trabajo',
      '🎓 Años de experiencia — trayectoria profesional',
      '🏥 Alta especialidad — subespecialidad si tu caso es complejo',
      '💰 Costo — opciones dentro de tu presupuesto',
      '⭐ Reseñas — como complemento, no como único criterio',
    ],
    tip: 'Combina varios filtros para obtener resultados más alineados a lo que buscas.',
    accion: { label: 'Buscar con filtros', href: '/buscar' },
  },
  {
    num: '3',
    titulo: 'Verifica tú mismo las credenciales',
    icon: ShieldCheck,
    contenido: [
      'En el perfil de cada médico encontrarás dos botones:',
      '🔍 Verificar cédula → te lleva a la SEP (Dirección General de Profesiones)',
      '🏛️ Verificar certificación → te lleva a CONACEM',
    ],
    tip: 'CONACEM es la autoridad que regula todos los consejos de especialidad en México. Ahí puedes confirmar si la certificación está vigente.',
    destacado: true,
    accion: { label: 'Ver médicos y verificar', href: '/buscar' },
  },
]

const CHECKLIST = [
  'Ya identifiqué el médico especialista que necesito',
  'Usé los filtros de prioridad para acotar opciones',
  'Verifiqué la cédula profesional en el sitio de la SEP',
  'Revisé si tiene certificación vigente ante CONACEM',
  'Confirmé su ubicación y horarios',
  'Me siento listo para contactarlo directamente',
]

const PREGUNTAS = [
  {
    q: '¿Salurama verifica las credenciales de los médicos?',
    a: 'No. Salurama no verifica, avala ni certifica credenciales. Lo que hacemos es darte acceso directo a las fuentes oficiales — la SEP y CONACEM — para que tú mismo puedas confirmar la información. La decisión es tuya, y nosotros te damos las herramientas para tomarla informado.',
  },
  {
    q: '¿Qué diferencia hay entre cédula profesional y certificación de especialidad?',
    a: 'La cédula profesional es el documento oficial expedido por la SEP que autoriza a una persona a ejercer su profesión. Es obligatoria para cualquier médico. La certificación de especialidad es un reconocimiento adicional otorgado por el consejo de esa especialidad (regulado por CONACEM), que implica haber pasado exámenes de conocimiento y actualización. No es obligatoria, pero es una señal de compromiso con la calidad.',
  },
  {
    q: '¿Qué es CONACEM?',
    a: 'CONACEM (Comité Normativo Nacional de Consejos de Especialidades Médicas) es la autoridad que regula y normativiza todos los consejos de especialidad médica en México. Cuando verificas en CONACEM, estás consultando la fuente oficial que confirma si un médico tiene certificación vigente en su especialidad.',
  },
  {
    q: '¿Todos los médicos en Salurama tienen cédula verificada?',
    a: 'Todos los médicos registrados proporcionan su número de cédula al momento del registro. Salurama no verifica este dato de forma independiente — para confirmarlo, usa el botón "Verificar cédula" en el perfil del médico, que te lleva directamente al sitio de la SEP.',
  },
  {
    q: '¿Por qué Salurama es gratuito para los médicos?',
    a: 'Porque creemos que la visibilidad médica no debe estar condicionada a quién paga más. Salurama funciona con un modelo de negocio B2B — trabajamos con laboratorios, aseguradoras y farmacéuticas para financiar la plataforma, sin que esto afecte los resultados de búsqueda ni el orden en que aparecen los médicos.',
  },
]

export default function ComoElegirMedico() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [preguntaAbierta, setPreguntaAbierta] = useState<number | null>(null)
  const [checklistItems, setChecklistItems] = useState<boolean[]>(new Array(CHECKLIST.length).fill(false))

  const toggleChecklist = (index: number) => {
    setChecklistItems(prev => {
      const newItems = [...prev]
      newItems[index] = !newItems[index]
      return newItems
    })
  }

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
          padding: 24px 20px; transition: box-shadow 0.2s, border-color 0.2s;
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
          font-size: 14px; color: '#6B7280'; line-height: 1.7; font-weight: 300;
          margin-top: 12px; padding-right: 28px;
        }
        .checklist-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 14px; color: '#374151'; line-height: 1.6; padding: 8px 0;
          border-bottom: 0.5px solid #F3F4F6; cursor: pointer;
        }
        .checklist-item:last-child { border-bottom: none; }
        .checklist-item.checked { color: '#059669'; }
        .checklist-checkbox {
          width: 18px; height: 18px; border-radius: 4px;
          border: 2px solid #E5E7EB; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.2s;
        }
        .checklist-item.checked .checklist-checkbox {
          background: #059669; border-color: #059669;
        }
        .verification-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #EEF2FF; color: #3730A3;
          padding: 6px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 600;
        }
        @media (max-width: 768px) {
          .dsk     { display: none !important; }
          .mob-btn { display: flex !important; }
          .trust-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .mob-btn  { display: none !important; }
          .mob-menu { display: none !important; }
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.3s ease-out; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #F3F4F6', padding: '0 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
          </Link>
          <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/buscar" className="nav-link">Especialidades</Link>
            <Link href="/como-elegir-medico" className="nav-link active">¿Cómo elegir médico?</Link>
            <Link href="/nosotros" className="nav-link">Nosotros</Link>
            <Link href="/registro" className="btn-medico">👨‍⚕️ Soy Médico</Link>
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
              <Link href="/buscar" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', display: 'block' }}>Especialidades</Link>
              <Link href="/como-elegir-medico" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, color: '#3730A3', fontWeight: 600, textDecoration: 'none', padding: '12px 8px', display: 'block' }}>¿Cómo elegir médico?</Link>
              <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', display: 'block' }}>Nosotros</Link>
              <Link href="/registro" onClick={() => setMobileMenuOpen(false)} className="btn-medico" style={{ marginTop: 8, justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}>👨‍⚕️ Soy Médico</Link>
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
            Tomar la decisión de ser atendido por un médico no debe tomarse a la ligera. No es suficiente basarse en reseñas u opiniones como si eligieras un restaurante. Tu salud o la de tus seres queridos está en juego. Por eso en Salurama te damos las herramientas para que tú mismo verifiques la cédula y la certificación de especialidad vigente, y tomes la decisión de manera informada.
          </p>
          <button
            onClick={() => document.getElementById('paso-1')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-accion"
          >
            Ver la guía paso a paso <ArrowRight size={16} />
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
                <div style={{ paddingTop: 8, flex: 1 }}>
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
                      {paso.accion.label} <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECCIÓN DE VERIFICACIÓN VISUAL ── */}
      <section style={{ padding: 'clamp(40px, 6vw, 60px) 20px', background: 'linear-gradient(160deg, #EEF2FF 0%, #F9FAFB 100%)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 10 }}>
            Tu herramienta de decisión
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#3730A3', textAlign: 'center', marginBottom: 10, lineHeight: 1.25 }}>
            Tú verificas, tú decides
          </h2>
          <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#6B7280', lineHeight: 1.75, textAlign: 'center', marginBottom: 32, maxWidth: 620, margin: '0 auto 32px' }}>
            En cada perfil de médico encontrarás dos botones que te dan acceso directo a las fuentes oficiales.
          </p>

          <div className="trust-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Cédula SEP */}
            <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '20px 18px', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <ShieldCheck size={20} color="#3730A3" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>Cédula profesional</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, fontWeight: 300, marginBottom: 12 }}>
                Te lleva al registro oficial de la SEP. Confirma que el médico tiene título registrado y vigente.
              </p>
              <div className="verification-badge">
                <ExternalLink size={12} />
                sep.gob.mx
              </div>
            </div>

            {/* Certificación CONACEM */}
            <div style={{ background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, padding: '20px 18px', transition: 'border-color 0.2s, box-shadow 0.2s' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <GraduationCap size={20} color="#3730A3" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>Certificación de especialidad</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, fontWeight: 300, marginBottom: 12 }}>
                Te lleva a CONACEM, la autoridad que regula todos los consejos de especialidad en México.
              </p>
              <div className="verification-badge">
                <ExternalLink size={12} />
                conacem.org.mx
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link href="/buscar" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, color: '#3730A3', fontWeight: 600,
              textDecoration: 'none', borderBottom: '1px solid #3730A344', paddingBottom: 2
            }}>
              Ver médicos y verificar credenciales →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CHECKLIST INTERACTIVA ── */}
      <section style={{ padding: 'clamp(32px, 5vw, 48px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: '#3730A3', marginBottom: 6 }}>
            Lista de verificación
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
            Antes de agendar tu cita, confirma estos puntos (marca los que ya completaste):
          </p>
          <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '4px 20px' }}>
            {CHECKLIST.map((item, i) => (
              <div 
                key={i} 
                className={`checklist-item${checklistItems[i] ? ' checked' : ''}`}
                onClick={() => toggleChecklist(i)}
              >
                <div className="checklist-checkbox">
                  {checklistItems[i] && <CheckSquare size={12} color="#fff" />}
                </div>
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
                titulo: 'Tú verificas',
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
            Tu salud merece más que opiniones
          </h2>
          <p style={{ color: '#A5B4FC', fontSize: 14, marginBottom: 24, fontWeight: 300 }}>
            Busca, verifica y contacta. La decisión es tuya.
          </p>
          <Link href="/buscar" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4623A', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: '50px', fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            Buscar médico ahora <ArrowRight size={16} />
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
              { label: '¿Cómo elegir médico?',     href: '/como-elegir-medico'       },
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