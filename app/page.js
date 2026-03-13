'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

// ─── Paleta oficial del Manual de Identidad Salurama ────────
// Verde: #0D5C4A | Ámbar: #F59E0B | Texto: #1A1A2E
const ESPECIALIDADES = [
  { nombre: 'Cardiología',      emoji: '🫀' },
  { nombre: 'Pediatría',        emoji: '👶' },
  { nombre: 'Dermatología',     emoji: '🔬' },
  { nombre: 'Ginecología',      emoji: '🌸' },
  { nombre: 'Hematología',      emoji: '🩸' },
  { nombre: 'Neurología',       emoji: '🧠' },
  { nombre: 'Ortopedia',        emoji: '🦴' },
  { nombre: 'Oftalmología',     emoji: '👁️' },
  { nombre: 'Psiquiatría',      emoji: '🧘' },
  { nombre: 'Endocrinología',   emoji: '⚗️' },
  { nombre: 'Gastroenterología',emoji: '🫁' },
  { nombre: 'Oncología',        emoji: '🎗️' },
]

const SUGERENCIAS = [
  'cardiólogo en CDMX',
  'pediatra cerca de mí',
  'dermatólogo verificado',
  'me duele la cabeza',
  'revisión general',
  'ginecóloga mujer',
]

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [placeholder, setPlaceholder] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const inputRef = useRef(null)
  const phIdx = useRef(0)
  const phChar = useRef(0)
  const phTimer = useRef(null)

  // Efecto de escritura en el placeholder
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
          phIdx.current = (phIdx.current + 1) % SUGERENCIAS.length
          type()
        }, 2200)
      }
    }
    type()
    return () => clearTimeout(phTimer.current)
  }, [])

  // Cargar médicos destacados
  useEffect(() => {
    async function fetchMedicos() {
      try {
        const { data } = await supabase
          .from('medicos')
          .select('*')
          .eq('licencia_verificada', true)
          .limit(6)
        setMedicos(data || [])
      } catch (_) {
        setMedicos([])
      } finally {
        setLoading(false)
      }
    }
    fetchMedicos()
  }, [])

  function handleBuscar(e) {
    e?.preventDefault()
    if (!query.trim()) return
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`)
  }

  function handleEspecialidad(nombre) {
    router.push(`/buscar?q=${encodeURIComponent(nombre)}`)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleBuscar()
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#1A1A2E' }}>
      {/* ── Fuentes ──────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #0D5C4A22; }
        .search-input {
          width: 100%;
          padding: 18px 60px 18px 24px;
          font-size: 18px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 400;
          color: #1A1A2E;
          background: #fff;
          border: 2px solid #D1D9D6;
          border-radius: 50px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          caret-color: #0D5C4A;
        }
        .search-input:focus {
          border-color: #0D5C4A;
          box-shadow: 0 0 0 4px #0D5C4A18;
        }
        .search-input::placeholder { color: #9CA3AF; font-weight: 300; }
        .btn-buscar {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: #0D5C4A;
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 10px 24px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .btn-buscar:hover { background: #1A7A62; }
        .btn-buscar:active { transform: translateY(-50%) scale(0.97); }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 18px;
          border-radius: 50px;
          border: 1.5px solid #D1D9D6;
          background: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #1A1A2E;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .chip:hover {
          border-color: #0D5C4A;
          background: #E8F5F1;
          color: #0D5C4A;
          transform: translateY(-1px);
        }
        .medico-card {
          background: #fff;
          border: 1.5px solid #E5EAE8;
          border-radius: 16px;
          padding: 24px;
          transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
          cursor: pointer;
          text-decoration: none;
          display: block;
          color: inherit;
        }
        .medico-card:hover {
          box-shadow: 0 8px 32px #0D5C4A14;
          transform: translateY(-3px);
          border-color: #0D5C4A44;
        }
        .avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #E8F5F1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Fraunces', serif;
          font-size: 22px;
          font-weight: 900;
          color: #0D5C4A;
          flex-shrink: 0;
        }
        .badge-verificado {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #0D5C4A;
          background: #E8F5F1;
          border-radius: 20px;
          padding: 3px 10px;
          font-weight: 500;
        }
        .paso-num {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #0D5C4A;
          color: #fff;
          font-family: 'Fraunces', serif;
          font-size: 20px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin: 0 auto 16px;
        }
        .nav-link {
          color: #1A1A2E;
          text-decoration: none;
          font-size: 15px;
          font-weight: 400;
          padding: 6px 2px;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
        }
        .nav-link:hover { color: #0D5C4A; border-color: #0D5C4A; }
        .btn-soy-medico {
          background: #0D5C4A;
          color: #fff;
          text-decoration: none;
          padding: 10px 22px;
          border-radius: 50px;
          font-size: 14px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          transition: background 0.18s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .btn-soy-medico:hover { background: #1A7A62; }
        @media (max-width: 640px) {
          .search-input { font-size: 16px; padding: 16px 56px 16px 20px; }
          .btn-buscar { padding: 8px 16px; font-size: 14px; }
          .chips-grid { gap: 8px; }
          .medicos-grid { grid-template-columns: 1fr !important; }
          .pasos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── NAVBAR ───────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #F0F4F2',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo - HORIZONTAL (UNA LÍNEA) */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#0D5C4A' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F59E0B' }}>rama</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/buscar" className="nav-link">Especialidades</Link>
            <Link href="/nosotros" className="nav-link">Nosotros</Link>
            <Link href="/registro" className="btn-soy-medico">
              <span>👨‍⚕️</span> Soy Médico
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ 
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
            }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D5C4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div style={{ 
            display: 'none',
            padding: '16px 24px',
            borderTop: '1px solid #F0F4F2',
            background: '#fff',
          }} className="mobile-menu">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Link 
                href="/buscar" 
                style={{ fontSize: 15, color: '#1A1A2E', textDecoration: 'none', padding: '8px 0' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Especialidades
              </Link>
              <Link 
                href="/nosotros" 
                style={{ fontSize: 15, color: '#1A1A2E', textDecoration: 'none', padding: '8px 0' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Nosotros
              </Link>
              <Link 
                href="/registro" 
                className="btn-soy-medico"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span>👨‍⚕️</span> Soy Médico
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO SECTION ───────────────────────────────── */}
      <section style={{ padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Logo grande - HORIZONTAL */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: 900, color: '#0D5C4A', letterSpacing: '-1px', display: 'inline-block' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: 600, color: '#F59E0B', letterSpacing: '-1px', display: 'inline-block', marginLeft: 2 }}>rama</span>
          </div>

          {/* Slogan oficial */}
          <p style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 'clamp(16px, 3vw, 20px)',
            fontWeight: 600,
            fontStyle: 'italic',
            color: '#1A7A62',
            marginBottom: 8,
            letterSpacing: '0.01em',
          }}>
            Salud en tus manos
          </p>

          {/* Tagline */}
          <p style={{
            fontSize: 15,
            color: '#6B7280',
            fontWeight: 300,
            marginBottom: 36,
          }}>
            Tu médico de confianza, al alcance de tu mano 🩺
          </p>

          {/* ── Buscador ── */}
          <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-label="Buscar médico, especialidad o síntoma"
            />
            <button className="btn-buscar" onClick={handleBuscar} aria-label="Buscar">
              Buscar
            </button>
          </div>

          {/* Hint */}
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 12, fontWeight: 300 }}>
            Busca por especialidad, síntoma, nombre de médico o clínica
          </p>
        </div>
      </section>

      {/* ── ESPECIALIDADES ───────────────────────────────── */}
      <section style={{ padding: '20px 24px 60px', background: '#fff' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center', marginBottom: 20 }}>
            Especialidades frecuentes
          </p>
          <div className="chips-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {ESPECIALIDADES.map(esp => (
              <button
                key={esp.nombre}
                className="chip"
                onClick={() => handleEspecialidad(esp.nombre)}
                aria-label={`Buscar ${esp.nombre}`}
              >
                <span>{esp.emoji}</span>
                <span>{esp.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ────────────────────────────────── */}
      <section style={{ padding: '60px 24px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#0D5C4A', textAlign: 'center', marginBottom: 8 }}>
            ¿Cómo funciona?
          </h2>
          <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: 48, fontSize: 15 }}>
            Encuentra a tu médico en menos de 2 minutos
          </p>
          <div className="pasos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { n: '1', titulo: 'Busca', desc: 'Escribe la especialidad, un síntoma o el nombre de tu médico en el buscador.' },
              { n: '2', titulo: 'Compara', desc: 'Revisa perfiles verificados con horarios, ubicación y teléfono de contacto.' },
              { n: '3', titulo: 'Contacta', desc: 'Llama o escribe por WhatsApp directamente. Sin intermediarios. Sin costo.' },
            ].map(paso => (
              <div key={paso.n} style={{ textAlign: 'center', padding: '32px 24px', background: '#fff', borderRadius: 16, border: '1.5px solid #E5EAE8' }}>
                <div className="paso-num">{paso.n}</div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1A1A2E', marginBottom: 10 }}>
                  {paso.titulo}
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, fontWeight: 300 }}>
                  {paso.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MÉDICOS DESTACADOS ───────────────────────────── */}
      <section style={{ padding: '60px 24px 80px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 900, color: '#0D5C4A' }}>
                Especialistas verificados
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: 300 }}>
                Cédula profesional confirmada · Perfil completo
              </p>
            </div>
            <Link href="/buscar" style={{ fontSize: 14, color: '#0D5C4A', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid #0D5C4A44', paddingBottom: 2 }}>
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 140, borderRadius: 16, background: '#F3F4F6', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : medicos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#9CA3AF' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🩺</p>
              <p style={{ fontSize: 15 }}>Próximamente más especialistas verificados</p>
              <Link href="/registro" style={{ display: 'inline-block', marginTop: 16, color: '#0D5C4A', fontWeight: 500, fontSize: 14, textDecoration: 'none', borderBottom: '1px solid #0D5C4A' }}>
                ¿Eres médico? Regístrate gratis →
              </Link>
            </div>
          ) : (
            <div className="medicos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {medicos.map(m => (
                <Link key={m.id} href={`/doctor/${m.id}`} className="medico-card">
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div className="avatar">
                      {(m.nombre_completo || m.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.nombre_completo || m.full_name}
                      </p>
                      <p style={{ fontSize: 13, color: '#0D5C4A', fontWeight: 500, marginBottom: 8 }}>
                        {m.especialidad}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {m.licencia_verificada && (
                          <span className="badge-verificado">✓ Verificado</span>
                        )}
                        {(m.ubicacion_ciudad || m.ciudad) && (
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                            📍 {m.ubicacion_ciudad || m.ciudad}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── BANNER CTA MÉDICOS ───────────────────────────── */}
      <section style={{ background: '#0D5C4A', padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Para médicos
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3 }}>
            ¿Eres médico? Tu perfil, gratis para siempre
          </h2>
          <p style={{ color: '#A7C4BB', fontSize: 15, marginBottom: 32, fontWeight: 300 }}>
            Sin suscripciones, sin comisiones. Solo más pacientes.
          </p>
          <Link href="/registro" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#F59E0B', color: '#fff', fontWeight: 700,
            textDecoration: 'none', padding: '14px 32px',
            borderRadius: '50px', fontSize: 16,
            fontFamily: "'DM Sans', sans-serif",
            transition: 'transform 0.15s, background 0.15s',
          }}>
            Registrarme gratis →
          </Link>
          <p style={{ marginTop: 16, fontSize: 12, color: '#A7C4BB', fontWeight: 300 }}>
            Ya somos más de 2 especialistas verificados · Creciendo cada día
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: '#111827', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#0D5C4A' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F59E0B' }}>rama</span>
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 20 }}>
            "Salud en tus manos"
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
            {['Especialidades', 'Registro médico', 'Nosotros'].map(link => (
              <a key={link} href="#" style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = '#fff'}
                onMouseLeave={e => e.target.style.color = '#6B7280'}>
                {link}
              </a>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#374151' }}>
            © 2026 Salurama · salurama.com · Hecho en México 🇲🇽
          </p>
        </div>
      </footer>

      {/* Mobile Styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
          .mobile-menu {
            display: block !important;
          }
          nav > div > div:last-child {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}