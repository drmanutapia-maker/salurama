'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import {
  Menu, X, MapPin, Brain, Hospital, DollarSign, Star,
  ShieldCheck, GraduationCap, SlidersHorizontal, ArrowRight
} from 'lucide-react'

// ─── Datos estáticos ────────────────────────────────────────────────────────

const ESPECIALIDADES = [
  { nombre: 'Cardiología',       emoji: '🫀' },
  { nombre: 'Pediatría',         emoji: '👶' },
  { nombre: 'Dermatología',      emoji: '🔬' },
  { nombre: 'Ginecología',       emoji: '🌸' },
  { nombre: 'Hematología',       emoji: '🩸' },
  { nombre: 'Neurología',        emoji: '🧠' },
  { nombre: 'Ortopedia',         emoji: '🦴' },
  { nombre: 'Oftalmología',      emoji: '👁️' },
  { nombre: 'Psiquiatría',       emoji: '🧘' },
  { nombre: 'Endocrinología',    emoji: '⚗️' },
  { nombre: 'Gastroenterología', emoji: '🩺' },
  { nombre: 'Oncología',         emoji: '🎗️' },
]

const SUGERENCIAS = [
  'cardiólogo en CDMX',
  'pediatra cerca de mí',
  'dermatóloga verificada',
  'me duele la cabeza',
  'revisión general',
  'ginecóloga mujer',
  'hematólogo adultos',
]

const PRIORIDADES = [
  { label: 'Cerca de mí',       icon: MapPin,     value: 'ubicacion'   },
  { label: 'Más experiencia',   icon: Brain,      value: 'experiencia' },
  { label: 'Alta especialidad', icon: Hospital,   value: 'especialidad'},
  { label: 'Precio accesible',  icon: DollarSign, value: 'precio'      },
  { label: 'Reseñas',           icon: Star,       value: 'resenas'     },
]

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Medico {
  id: string
  full_name: string
  specialty: string
  location_city: string
  consultation_price: number
  license_verified: boolean
}

// ─── Hook: IntersectionObserver correcto ─────────────────────────────────────

function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return { ref, visible }
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter()

  const [query, setQuery]             = useState('')
  const [medicos, setMedicos]         = useState<Medico[]>([])
  const [loading, setLoading]         = useState(true)
  const [placeholder, setPlaceholder] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prioridades, setPrioridades] = useState<string[]>([])

  // Refs para animaciones
  const heroReveal      = useReveal()
  const confianzaReveal = useReveal()
  const pasosReveal     = useReveal()
  const medicosReveal   = useReveal()

  // Placeholder animado
  const phIdx   = useRef(0)
  const phChar  = useRef(0)
  const phTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function type() {
      const current = SUGERENCIAS[phIdx.current]
      if (phChar.current < current.length) {
        setPlaceholder('Ej: ' + current.slice(0, phChar.current + 1))
        phChar.current++
        phTimer.current = setTimeout(type, 55)
      } else {
        phTimer.current = setTimeout(() => {
          phChar.current = 0
          phIdx.current  = (phIdx.current + 1) % SUGERENCIAS.length
          type()
        }, 2200)
      }
    }
    type()
    return () => { if (phTimer.current) clearTimeout(phTimer.current) }
  }, [])

  // Datos de médicos
  useEffect(() => {
    supabase
      .from('doctors')
      .select('*')
      .eq('license_verified', true)
      .eq('is_active', true)
      .limit(6)
      .then(({ data }) => { setMedicos(data || []); setLoading(false) })
      .catch(() => { setMedicos([]); setLoading(false) })
  }, [])

  const togglePrioridad = (value: string) =>
    setPrioridades(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )

  const handleBuscar = () => {
    if (!query.trim()) return
    const params = new URLSearchParams()
    params.set('q', query.trim())
    if (prioridades.length > 0) params.set('p', prioridades.join(','))
    router.push(`/buscar?${params.toString()}`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#1A1A2E', overflowX: 'hidden' }}>

      {/* ── ESTILOS GLOBALES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #3730A322; }

        /* ── Animaciones de entrada (solo se disparan una vez al hacer scroll) ── */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(-14px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes checkPop {
          0%   { transform: translateY(-50%) scale(0); }
          70%  { transform: translateY(-50%) scale(1.3); }
          100% { transform: translateY(-50%) scale(1); }
        }

        .reveal       { opacity: 0; }
        .reveal.shown { animation: fadeInUp 0.55s ease-out forwards; }
        .reveal.shown.d1 { animation-delay: 0.08s; }
        .reveal.shown.d2 { animation-delay: 0.18s; }
        .reveal.shown.d3 { animation-delay: 0.28s; }

        /* ── Buscador ── */
        .search-input {
          width: 100%; padding: 16px 116px 16px 22px;
          font-size: 17px; font-family: 'DM Sans', sans-serif; font-weight: 400;
          color: #1A1A2E; background: #fff;
          border: 2px solid #E5E7EB; border-radius: 50px; outline: none;
          transition: border-color 0.22s, box-shadow 0.22s;
          caret-color: #3730A3;
        }
        .search-input:focus {
          border-color: #3730A3;
          box-shadow: 0 0 0 4px #3730A314;
        }
        .search-input::placeholder { color: #9CA3AF; font-weight: 300; }

        .btn-buscar {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: #3730A3; color: #fff; border: none; border-radius: 50px;
          padding: 10px 22px; font-size: 14px; font-family: 'DM Sans', sans-serif;
          font-weight: 600; cursor: pointer;
          transition: background 0.18s, transform 0.12s;
          white-space: nowrap;
        }
        .btn-buscar:hover  { background: #4F46E5; }
        .btn-buscar:active { transform: translateY(-50%) scale(0.96); }

        /* ── Chips de especialidad ── */
        .chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 50px;
          border: 1.5px solid #E5E7EB; background: #fff;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; cursor: pointer;
          transition: border-color 0.18s, background 0.18s, color 0.18s, transform 0.15s;
          white-space: nowrap;
        }
        .chip:hover {
          border-color: #3730A3; background: #EEF2FF; color: #3730A3;
          transform: translateY(-2px);
        }
        .chip:active { transform: translateY(0); }

        /* ── Chips de prioridad con micro-interacción ── */
        .priority-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 16px 10px 16px;
          border-radius: 50px;
          border: 1.5px solid #E5E7EB; background: #fff;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; cursor: pointer;
          transition: border-color 0.2s, background 0.2s, color 0.2s, transform 0.15s, box-shadow 0.2s, padding 0.2s;
          white-space: nowrap; font-weight: 500;
          position: relative; overflow: hidden;
        }
        .priority-chip:hover {
          border-color: #3730A3; background: #EEF2FF; color: #3730A3;
          transform: translateY(-2px);
        }
        .priority-chip:active { transform: translateY(0); }
        .priority-chip.active {
          border-color: #3730A3;
          background: #EEF2FF;
          color: #3730A3;
          padding-right: 30px;
          box-shadow: 0 2px 10px #3730A31A;
        }
        .priority-chip.active::after {
          content: '✓';
          position: absolute; right: 10px; top: 50%;
          transform: translateY(-50%) scale(1);
          font-size: 12px; font-weight: 700; color: #3730A3;
          animation: checkPop 0.25s ease-out;
        }

        /* ── Tarjetas de médico ── */
        .mcard {
          background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
          padding: 18px;
          transition: box-shadow 0.22s, transform 0.22s, border-color 0.22s;
          text-decoration: none; display: block; color: inherit;
        }
        .mcard:hover {
          box-shadow: 0 8px 28px #3730A314;
          transform: translateY(-3px);
          border-color: #3730A344;
        }

        /* ── Avatar ── */
        .avatar {
          width: 48px; height: 48px; border-radius: 50%; background: #EEF2FF;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Fraunces', serif; font-size: 20px; font-weight: 900;
          color: #3730A3; flex-shrink: 0;
          transition: transform 0.2s;
        }
        .mcard:hover .avatar { transform: scale(1.06); }

        /* ── Navbar ── */
        .nav-link {
          color: #1A1A2E; text-decoration: none; font-size: 15px; font-weight: 400;
          padding: 6px 2px; border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
        }
        .nav-link:hover { color: #3730A3; border-color: #3730A3; }
        .nav-link.active-page { color: #3730A3; border-color: #3730A3; }

        .btn-medico {
          background: #3730A3; color: #fff; text-decoration: none;
          padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.18s, transform 0.12s;
          display: inline-flex; align-items: center; gap: 7px;
        }
        .btn-medico:hover  { background: #4F46E5; }
        .btn-medico:active { transform: scale(0.97); }

        /* ── Paso número ── */
        .paso-num {
          width: 42px; height: 42px; border-radius: 50%;
          background: #3730A3; color: #fff;
          font-family: 'Fraunces', serif; font-size: 19px; font-weight: 900;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 14px;
          box-shadow: 0 4px 14px #3730A326;
        }

        /* ── Tarjeta de trust ── */
        .trust-card {
          background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
          padding: 22px 18px; display: flex; flex-direction: column; gap: 8px;
          transition: border-color 0.22s, box-shadow 0.22s, transform 0.22s;
          cursor: default;
        }
        .trust-card:hover {
          border-color: #3730A333;
          box-shadow: 0 6px 22px #3730A30D;
          transform: translateY(-2px);
        }
        .trust-icon {
          width: 42px; height: 42px; border-radius: 10px; background: #EEF2FF;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.25s;
        }
        .trust-card:hover .trust-icon { transform: scale(1.1) rotate(4deg); }

        /* ── Paso card ── */
        .paso-card {
          text-align: center;
          padding: clamp(22px, 4vw, 32px) 18px;
          background: #fff; border-radius: 16px; border: 1.5px solid #E5E7EB;
          transition: box-shadow 0.22s, border-color 0.22s, transform 0.22s;
        }
        .paso-card:hover {
          box-shadow: 0 6px 22px #3730A30D;
          border-color: #3730A322;
          transform: translateY(-2px);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .dsk          { display: none !important; }
          .mob-btn      { display: flex !important; }
          .pasos-grid   { grid-template-columns: 1fr !important; }
          .medicos-grid { grid-template-columns: 1fr !important; }
          .trust-grid   { grid-template-columns: 1fr !important; }
          .priority-wrap {
            justify-content: flex-start !important;
            flex-wrap: nowrap !important;
            overflow-x: auto;
            padding-bottom: 6px;
            -webkit-overflow-scrolling: touch;
          }
          .priority-wrap::-webkit-scrollbar { display: none; }
        }
        @media (min-width: 769px) {
          .mob-btn  { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════════
          NAVBAR
      ════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid #F3F4F6',
        padding: '0 20px'
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
          </Link>

          {/* Desktop */}
          <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/buscar"             className="nav-link">Especialidades</Link>
            <Link href="/como-elegir-medico" className="nav-link">¿Cómo elegir médico?</Link>
            <Link href="/nosotros"           className="nav-link">Nosotros</Link>
            <Link href="/registro"           className="btn-medico">👨‍⚕️ Soy Médico</Link>
          </div>

          {/* Mobile burger */}
          <button
            className="mob-btn"
            onClick={() => setMobileMenuOpen(o => !o)}
            style={{ display: 'none', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8 }}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileMenuOpen ? <X size={24} color="#3730A3" /> : <Menu size={24} color="#3730A3" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mob-menu" style={{ padding: '12px 20px 20px', borderTop: '1px solid #F3F4F6', background: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { label: 'Especialidades',        href: '/buscar'             },
                { label: '¿Cómo elegir médico?',  href: '/como-elegir-medico' },
                { label: 'Nosotros',               href: '/nosotros'           },
              ].map(l => (
                <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
                  style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', borderRadius: 10, display: 'block' }}>
                  {l.label}
                </Link>
              ))}
              <Link href="/registro" onClick={() => setMobileMenuOpen(false)}
                className="btn-medico"
                style={{ marginTop: 10, justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}>
                👨‍⚕️ Soy Médico
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ════════════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroReveal.ref as React.RefObject<HTMLElement>}
        style={{ padding: 'clamp(52px, 8vw, 84px) 20px 44px', textAlign: 'center' }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Logo grande */}
          <div className={`reveal ${heroReveal.visible ? 'shown' : ''}`} style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 11vw, 78px)', fontWeight: 900, color: '#3730A3', letterSpacing: '-2px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 11vw, 78px)', fontWeight: 600, color: '#F4623A', letterSpacing: '-2px' }}>rama</span>
          </div>

          {/* H1 */}
          <h1 className={`reveal ${heroReveal.visible ? 'shown d1' : ''}`}
            style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(27px, 6vw, 42px)', fontWeight: 900, color: '#3730A3', marginBottom: 8, lineHeight: 1.2 }}>
            Elige médico con certeza
          </h1>

          {/* Subtítulo */}
          <p className={`reveal ${heroReveal.visible ? 'shown d2' : ''}`}
            style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 600, fontStyle: 'italic', color: '#4F46E5', marginBottom: 26 }}>
            Más que opiniones, evidencia.
          </p>

          {/* Buscador */}
          <div className={`reveal ${heroReveal.visible ? 'shown d2' : ''}`}
            style={{ position: 'relative', maxWidth: 580, margin: '0 auto' }}>
            <input
              type="text"
              className="search-input"
              placeholder={placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              autoComplete="off"
              aria-label="Buscar médico, especialidad o síntoma"
            />
            <button className="btn-buscar" onClick={handleBuscar}>Buscar</button>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10, fontWeight: 300 }}>
            Busca por especialidad, síntoma, nombre o ubicación
          </p>

          {/* ── Prioridades ── */}
          <div className={`reveal ${heroReveal.visible ? 'shown d3' : ''}`} style={{ marginTop: 26 }}>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, fontWeight: 500 }}>
              ¿Qué es más importante para ti?
            </p>
            <div className="priority-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {PRIORIDADES.map(p => {
                const active = prioridades.includes(p.value)
                return (
                  <button
                    key={p.value}
                    onClick={() => togglePrioridad(p.value)}
                    className={`priority-chip${active ? ' active' : ''}`}
                    aria-pressed={active}
                  >
                    <p.icon size={14} />
                    {p.label}
                  </button>
                )
              })}
            </div>

            {/* Feedback dinámico — micro-interacción clave */}
            <div style={{ minHeight: 28, marginTop: 10 }}>
              {prioridades.length > 0 && (
                <p style={{
                  fontSize: 12, color: '#3730A3', fontWeight: 500,
                  animation: 'slideInRight 0.28s ease-out'
                }}>
                  ✓ {prioridades.length === 1
                    ? `Buscando por: ${PRIORIDADES.find(p => p.value === prioridades[0])?.label}`
                    : `${prioridades.length} prioridades seleccionadas — tus resultados se ordenarán así`}
                </p>
              )}
            </div>
          </div>

          {/* ── Narrativa de confianza ── */}
          <div className={`reveal ${heroReveal.visible ? 'shown d3' : ''}`}
            style={{
              marginTop: 28,
              padding: '20px 24px',
              background: '#F9FAFB',
              borderRadius: 16,
              border: '1px solid #EAECF0',
              textAlign: 'left',
            }}>
            <p style={{ fontSize: 'clamp(13px, 2.5vw, 15px)', color: '#374151', lineHeight: 1.8, fontWeight: 400 }}>
              Una buena relación médico-paciente se basa en la{' '}
              <strong style={{ color: '#3730A3', fontWeight: 600 }}>confianza</strong>.
              Y sabemos que la confianza se debe construir.
            </p>
            <p style={{ fontSize: 'clamp(13px, 2.5vw, 15px)', color: '#374151', lineHeight: 1.8, fontWeight: 400, marginTop: 10 }}>
              Por eso te damos las herramientas para que{' '}
              <strong style={{ color: '#3730A3', fontWeight: 600 }}>tú mismo verifiques</strong>{' '}
              fácil y rápidamente la cédula profesional ante la SEP y la certificación vigente
              ante el consejo de la especialidad. Una decisión informada puede construir esa
              confianza <em>incluso antes de concertar una cita</em>.
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['📍 Ubicación', '🎓 Experiencia', '💰 Costo', '⭐ Reseñas'].map(tag => (
                <span key={tag} style={{
                  fontSize: 12, color: '#4F46E5', background: '#EEF2FF',
                  borderRadius: 20, padding: '4px 12px', fontWeight: 500
                }}>{tag}</span>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          ESPECIALIDADES FRECUENTES
      ════════════════════════════════════════════════════════ */}
      <section style={{ padding: '0 20px 52px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 16 }}>
            Especialidades frecuentes
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {ESPECIALIDADES.map(esp => (
              <button key={esp.nombre} className="chip"
                onClick={() => router.push(`/buscar?q=${encodeURIComponent(esp.nombre)}`)}>
                <span style={{ fontSize: 15 }}>{esp.emoji}</span>
                <span>{esp.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          SECCIÓN: HERRAMIENTAS DE CONFIANZA
      ════════════════════════════════════════════════════════ */}
      <section
        ref={confianzaReveal.ref as React.RefObject<HTMLElement>}
        style={{ padding: 'clamp(44px, 6vw, 64px) 20px', background: 'linear-gradient(160deg, #EEF2FF 0%, #F9FAFB 100%)' }}
      >
        <div style={{ maxWidth: 820, margin: '0 auto' }}>

          <p className={`reveal ${confianzaReveal.visible ? 'shown' : ''}`}
            style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 10 }}>
            Tu herramienta de decisión
          </p>

          <h2 className={`reveal ${confianzaReveal.visible ? 'shown d1' : ''}`}
            style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#3730A3', textAlign: 'center', marginBottom: 12, lineHeight: 1.25 }}>
            Elegir médico no es como elegir un restaurante
          </h2>

          <p className={`reveal ${confianzaReveal.visible ? 'shown d2' : ''}`}
            style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#6B7280', lineHeight: 1.8, textAlign: 'center', maxWidth: 620, margin: '0 auto 36px' }}>
            En un restaurante, una mala reseña arruina una cena. En salud, una mala
            elección puede comprometer lo más valioso. Por eso Salurama te da acceso directo
            a las fuentes que realmente importan — sin filtros, sin intermediarios.
          </p>

          <div className={`trust-grid reveal ${confianzaReveal.visible ? 'shown d2' : ''}`}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

            <div className="trust-card">
              <div className="trust-icon"><ShieldCheck size={20} color="#3730A3" /></div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Cédula profesional</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, fontWeight: 300 }}>
                En el perfil de cada médico hay un botón que te lleva directo al registro
                oficial de la SEP. Tú verificas, tú decides.
              </p>
            </div>

            <div className="trust-card">
              <div className="trust-icon"><GraduationCap size={20} color="#3730A3" /></div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Certificación vigente</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, fontWeight: 300 }}>
                Acceso directo al consejo de la especialidad para confirmar que la
                certificación está activa. Sin intermediarios.
              </p>
            </div>

            <div className="trust-card">
              <div className="trust-icon"><SlidersHorizontal size={20} color="#3730A3" /></div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Atajos que importan</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65, fontWeight: 300 }}>
                Elige basado en lo que es importante para ti: ubicación, experiencia,
                costo o reseñas. No por quién pagó más.
              </p>
            </div>

          </div>

          <div className={`reveal ${confianzaReveal.visible ? 'shown d3' : ''}`}
            style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/como-elegir-medico" style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 14, color: '#3730A3', fontWeight: 600,
              textDecoration: 'none', borderBottom: '1.5px solid #3730A344', paddingBottom: 3,
              transition: 'border-color 0.18s',
            }}>
              Aprende a elegir médico con información real <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CÓMO FUNCIONA
      ════════════════════════════════════════════════════════ */}
      <section
        ref={pasosReveal.ref as React.RefObject<HTMLElement>}
        style={{ padding: 'clamp(44px, 6vw, 60px) 20px', background: '#F9FAFB' }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto' }}>

          <h2 className={`reveal ${pasosReveal.visible ? 'shown' : ''}`}
            style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#3730A3', textAlign: 'center', marginBottom: 8 }}>
            Tu tranquilidad en 3 pasos
          </h2>
          <p className={`reveal ${pasosReveal.visible ? 'shown d1' : ''}`}
            style={{ textAlign: 'center', color: '#6B7280', marginBottom: 40, fontSize: 15 }}>
            Encuentra y verifica a tu médico en menos de 2 minutos
          </p>

          <div className="pasos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {[
              {
                n: '1',
                titulo: 'Busca con libertad',
                desc: 'Escribe la especialidad, un síntoma o el nombre. Aplica los filtros que más te importan.',
                delay: '',
              },
              {
                n: '2',
                titulo: 'Verifica tú mismo',
                desc: 'Desde el perfil, accede con un clic a la SEP y al consejo de su especialidad. Fuentes oficiales, sin intermediarios.',
                delay: 'd1',
              },
              {
                n: '3',
                titulo: 'Contacta directo',
                desc: 'Llama o escribe directamente al consultorio. Sin comisiones. Sin costo.',
                delay: 'd2',
              },
            ].map(paso => (
              <div key={paso.n}
                className={`paso-card reveal ${pasosReveal.visible ? `shown ${paso.delay}` : ''}`}>
                <div className="paso-num">{paso.n}</div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 }}>
                  {paso.titulo}
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, fontWeight: 300 }}>
                  {paso.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          ESPECIALISTAS VERIFICADOS
      ════════════════════════════════════════════════════════ */}
      <section
        ref={medicosReveal.ref as React.RefObject<HTMLElement>}
        style={{ padding: 'clamp(44px, 6vw, 60px) 20px 72px', background: '#fff' }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          <div className={`reveal ${medicosReveal.visible ? 'shown' : ''}`}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 26px)', fontWeight: 900, color: '#3730A3' }}>
                Especialistas registrados
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4, fontWeight: 300 }}>
                Cédula verificable en SEP · Perfil completo
              </p>
            </div>
            <Link href="/buscar" style={{ fontSize: 14, color: '#3730A3', fontWeight: 600, textDecoration: 'none', borderBottom: '1.5px solid #3730A344', paddingBottom: 2 }}>
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 110, borderRadius: 14, background: 'linear-gradient(90deg, #F3F4F6 25%, #E9EBEE 50%, #F3F4F6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
              ))}
            </div>
          ) : medicos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '52px 20px', color: '#9CA3AF' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🩺</p>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#6B7280' }}>Próximamente más especialistas</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, marginBottom: 16 }}>
                Estamos incorporando especialistas verificados semana a semana.
              </p>
              <Link href="/registro" style={{ display: 'inline-block', color: '#3730A3', fontWeight: 600, fontSize: 14, textDecoration: 'none', borderBottom: '1.5px solid #3730A3' }}>
                ¿Eres médico? Regístrate →
              </Link>
            </div>
          ) : (
            <div className="medicos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {medicos.map(m => (
                <Link key={m.id} href={`/doctor/${m.id}`} className="mcard">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="avatar">{(m.full_name || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.full_name}
                      </p>
                      <p style={{ fontSize: 13, color: '#4F46E5', fontWeight: 600, marginBottom: 8 }}>
                        {m.specialty}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {m.license_verified && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#3730A3', background: '#EEF2FF', borderRadius: 20, padding: '3px 9px', fontWeight: 600 }}>
                            ✓ Cédula verificable
                          </span>
                        )}
                        {m.location_city && <span style={{ fontSize: 11, color: '#9CA3AF' }}>📍 {m.location_city}</span>}
                        {m.consultation_price > 0 && <span style={{ fontSize: 11, color: '#9CA3AF' }}>${m.consultation_price} MXN</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          CTA MÉDICOS
      ════════════════════════════════════════════════════════ */}
      <section style={{ background: '#3730A3', padding: 'clamp(44px, 6vw, 56px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#F4623A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Para médicos
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
            Tus pacientes te están buscando
          </h2>
          <p style={{ color: '#A5B4FC', fontSize: 15, marginBottom: 28, fontWeight: 300, lineHeight: 1.7 }}>
            Registro gratuito · Visibilidad basada en tus méritos · Sin comisiones por paciente
          </p>
          <Link href="/registro" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#F4623A', color: '#fff', fontWeight: 700,
            textDecoration: 'none', padding: '13px 30px',
            borderRadius: '50px', fontSize: 15,
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 4px 18px #F4623A44',
            transition: 'background 0.18s, transform 0.12s',
          }}>
            Registrarme →
          </Link>
          <p style={{ marginTop: 14, fontSize: 13, color: '#A5B4FC', fontWeight: 300 }}>
            Tu perfil aparece por lo que sabes, no por lo que pagas.
          </p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#1E1B4B', padding: 'clamp(36px, 5vw, 48px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#fff' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </div>
          <p style={{ fontSize: 14, color: '#A5B4FC', fontStyle: 'italic', marginBottom: 20 }}>
            "Más que opiniones, evidencia"
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
            {[
              { label: 'Especialidades',          href: '/buscar'                  },
              { label: '¿Cómo elegir médico?',    href: '/como-elegir-medico'      },
              { label: 'Registro médico',          href: '/registro'                },
              { label: 'Nosotros',                 href: '/nosotros'                },
              { label: 'Términos y Condiciones',   href: '/terminos-y-condiciones'  },
              { label: 'Aviso de Privacidad',      href: '/aviso-de-privacidad'     },
              { label: 'Política de Cookies',      href: '/politica-de-cookies'     },
              { label: 'Términos Profesionales',   href: '/terminos-profesionales'  },
            ].map(l => (
              <Link key={l.label} href={l.href}
                style={{ fontSize: 13, color: '#A5B4FC', textDecoration: 'none', transition: 'color 0.15s' }}>
                {l.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>
            © 2026 Salurama S.A.S. · salurama.com · Hecho en México 🇲🇽
          </p>
        </div>
      </footer>

    </div>
  )
}
