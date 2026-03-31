'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Menu, X, Search, MapPin, Brain, Hospital, DollarSign, CheckCircle } from 'lucide-react'

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
  { label: 'Cerca de mí', icon: MapPin, value: 'ubicacion' },
  { label: 'Más experiencia', icon: Brain, value: 'experiencia' },
  { label: 'Alta especialidad', icon: Hospital, value: 'especialidad' },
  { label: 'Precio accesible', icon: DollarSign, value: 'precio' },
]

interface Medico {
  id: string
  full_name: string
  specialty: string
  location_city: string
  consultation_price: number
  license_verified: boolean
}

export default function HomePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [placeholder, setPlaceholder] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prioridades, setPrioridades] = useState<string[]>([])

  const phIdx = useRef(0)
  const phChar = useRef(0)
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
          phIdx.current = (phIdx.current + 1) % SUGERENCIAS.length
          type()
        }, 2200)
      }
    }
    type()
    return () => { if (phTimer.current) clearTimeout(phTimer.current) }
  }, [])

  useEffect(() => {
    supabase.from('doctors').select('*').eq('license_verified', true).eq('is_active', true).limit(6)
      .then(({ data }) => { setMedicos(data || []); setLoading(false) })
      .catch(() => { setMedicos([]); setLoading(false) })
  }, [])

  const togglePrioridad = (value: string) => {
    setPrioridades(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    )
  }

  const handleBuscar = () => {
    if (!query.trim()) return
    const params = new URLSearchParams()
    params.set('q', query.trim())
    if (prioridades.length > 0) {
      params.set('p', prioridades.join(','))
    }
    router.push(`/buscar?${params.toString()}`)
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: #3730A322; }
        .search-input {
          width: 100%; padding: 16px 100px 16px 20px;
          font-size: 17px; font-family: 'DM Sans', sans-serif; font-weight: 400;
          color: #1A1A2E; background: #fff;
          border: 2px solid #E5E7EB; border-radius: 50px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; caret-color: #3730A3;
        }
        .search-input:focus { border-color: #3730A3; box-shadow: 0 0 0 4px #3730A314; }
        .search-input::placeholder { color: #9CA3AF; font-weight: 300; }
        .btn-buscar {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: #3730A3; color: #fff; border: none; border-radius: 50px;
          padding: 9px 20px; font-size: 14px; font-family: 'DM Sans', sans-serif;
          font-weight: 600; cursor: pointer; transition: background 0.18s; white-space: nowrap;
        }
        .btn-buscar:hover { background: #4F46E5; }
        .chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 50px;
          border: 1.5px solid #E5E7EB; background: #fff;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; cursor: pointer; transition: all 0.18s; white-space: nowrap;
        }
        .chip:hover { border-color: #3730A3; background: #EEF2FF; color: #3730A3; transform: translateY(-1px); }
        .chip.active { border-color: #3730A3; background: #EEF2FF; color: #3730A3; }
        .mcard {
          background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
          padding: 18px; transition: box-shadow 0.2s, transform 0.2s, border-color 0.2s;
          text-decoration: none; display: block; color: inherit;
        }
        .mcard:hover { box-shadow: 0 6px 24px #3730A314; transform: translateY(-2px); border-color: #3730A344; }
        .avatar {
          width: 48px; height: 48px; border-radius: 50%; background: #EEF2FF;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Fraunces', serif; font-size: 20px; font-weight: 900; color: #3730A3; flex-shrink: 0;
        }
        .nav-link {
          color: #1A1A2E; text-decoration: none; font-size: 15px; font-weight: 400;
          padding: 6px 2px; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s;
        }
        .nav-link:hover { color: #3730A3; border-color: #3730A3; }
        .btn-medico {
          background: #3730A3; color: #fff; text-decoration: none;
          padding: 10px 20px; border-radius: 50px; font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; transition: background 0.18s;
          display: inline-flex; align-items: center; gap: 7px;
        }
        .btn-medico:hover { background: #4F46E5; }
        .paso-num {
          width: 42px; height: 42px; border-radius: 50%; background: #3730A3; color: #fff;
          font-family: 'Fraunces', serif; font-size: 19px; font-weight: 900;
          display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
        }
        .priority-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 16px; border-radius: 50px;
          border: 1.5px solid #E5E7EB; background: #fff;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; cursor: pointer; transition: all 0.18s; white-space: nowrap;
          font-weight: 500;
        }
        .priority-chip:hover { border-color: #3730A3; background: #EEF2FF; color: #3730A3; }
        .priority-chip.active { border-color: #3730A3; background: #EEF2FF; color: #3730A3; }
        @media (max-width: 768px) {
          .dsk { display: none !important; }
          .mob-btn { display: flex !important; }
          .pasos-grid { grid-template-columns: 1fr !important; }
          .medicos-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .mob-btn { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #F3F4F6', padding: '0 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', letterSpacing: '-0.5px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, color: '#F4623A', letterSpacing: '-0.5px' }}>rama</span>
          </Link>
          <div className="dsk" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <Link href="/buscar" className="nav-link">Especialidades</Link>
            <Link href="/nosotros" className="nav-link">Nosotros</Link>
            <Link href="/registro" className="btn-medico">👨‍⚕️ Soy Médico</Link>
          </div>
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
          <div className="mob-menu" style={{ padding: '16px 20px 20px', borderTop: '1px solid #F3F4F6', background: '#fff' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Link href="/buscar" onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', borderRadius: 10, display: 'block' }}>
                Especialidades
              </Link>
              <Link href="/nosotros" onClick={() => setMobileMenuOpen(false)}
                style={{ fontSize: 16, color: '#1A1A2E', textDecoration: 'none', padding: '12px 8px', borderRadius: 10, display: 'block' }}>
                Nosotros
              </Link>
              <Link href="/registro" onClick={() => setMobileMenuOpen(false)}
                className="btn-medico"
                style={{ marginTop: 8, justifyContent: 'center', padding: '13px 20px', fontSize: 15 }}>
                👨‍⚕️ Soy Médico
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ padding: 'clamp(48px, 8vw, 80px) 20px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 11vw, 76px)', fontWeight: 900, color: '#3730A3', letterSpacing: '-2px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 11vw, 76px)', fontWeight: 600, color: '#F4623A', letterSpacing: '-2px' }}>rama</span>
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, color: '#3730A3', marginBottom: 10, lineHeight: 1.2 }}>
            Elige médico con certeza
          </h1>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 600, fontStyle: 'italic', color: '#4F46E5', marginBottom: 8 }}>
            Más que opiniones, evidencia.
          </p>
          <p style={{ fontSize: 'clamp(13px, 3vw, 15px)', color: '#6B7280', fontWeight: 300, marginBottom: 32 }}>
            Encuentra médicos verificados y decide con información real.
          </p>
          <div style={{ position: 'relative', maxWidth: 580, margin: '0 auto' }}>
            <input
              type="text" className="search-input"
              placeholder={placeholder} value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleBuscar()}
              autoComplete="off" aria-label="Buscar médico, especialidad o síntoma"
            />
            <button className="btn-buscar" onClick={handleBuscar}>Buscar</button>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10, fontWeight: 300 }}>
            Busca por especialidad, síntoma, nombre o ubicación
          </p>

          {/* PRIORIDADES - NUEVO */}
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, fontWeight: 500 }}>
              ¿Qué es importante para ti?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {PRIORIDADES.map(p => {
                const active = prioridades.includes(p.value)
                return (
                  <button
                    key={p.value}
                    onClick={() => togglePrioridad(p.value)}
                    className={'priority-chip' + (active ? ' active' : '')}
                  >
                    <p.icon size={14} />
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ESPECIALIDADES */}
      <section style={{ padding: '0 20px 48px' }}>
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

      {/* SECCIÓN EDUCATIVA - NUEVA */}
      <section style={{ padding: 'clamp(40px, 6vw, 56px) 20px', background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: '#3730A3', marginBottom: 12 }}>
            Elegir médico no es como elegir un restaurante
          </h2>
          <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: '#6B7280', lineHeight: 1.7, marginBottom: 24 }}>
            En un restaurante, una mala reseña arruina una cena. En la salud, una mala elección puede comprometer lo más valioso. 
            Por eso en Salurama te damos herramientas para verificar credenciales oficiales y decidir con información real, no solo opiniones.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, maxWidth: 700, margin: '0 auto' }}>
            {[
              { icon: CheckCircle, title: 'Verifica cédula', desc: 'Enlace directo a SEP' },
              { icon: CheckCircle, title: 'Certificación vigente', desc: 'Colegios de especialidad' },
              { icon: CheckCircle, title: 'Experiencia real', desc: 'Años documentados' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#fff', padding: 20, borderRadius: 14, border: '1px solid #E5E7EB' }}>
                <item.icon size={24} color="#3730A3" style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/nosotros" style={{ display: 'inline-block', marginTop: 24, fontSize: 14, color: '#3730A3', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid #3730A344' }}>
            Aprende a elegir médico →
          </Link>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section style={{ padding: 'clamp(40px, 6vw, 56px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: '#3730A3', textAlign: 'center', marginBottom: 8 }}>
            ¿Cómo funciona?
          </h2>
          <p style={{ textAlign: 'center', color: '#6B7280', marginBottom: 36, fontSize: 14 }}>
            Encuentra a tu médico en menos de 2 minutos
          </p>
          <div className="pasos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { n: '1', titulo: 'Busca', desc: 'Escribe la especialidad, un síntoma o el nombre de tu médico.' },
              { n: '2', titulo: 'Verifica', desc: 'Revisa credenciales verificadas con enlaces a fuentes oficiales.' },
              { n: '3', titulo: 'Contacta', desc: 'Llama o escribe directamente. Sin intermediarios. Sin costo.' },
            ].map(paso => (
              <div key={paso.n} style={{ textAlign: 'center', padding: 'clamp(20px, 4vw, 28px) 16px', background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB' }}>
                <div className="paso-num">{paso.n}</div>
                <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 }}>{paso.titulo}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, fontWeight: 300 }}>{paso.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MÉDICOS DESTACADOS */}
      <section style={{ padding: 'clamp(40px, 6vw, 56px) 20px 64px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: '#3730A3' }}>Especialistas verificados</h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3, fontWeight: 300 }}>Cédula profesional confirmada · Perfil completo</p>
            </div>
            <Link href="/buscar" style={{ fontSize: 13, color: '#3730A3', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid #3730A344' }}>Ver todos →</Link>
          </div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 110, borderRadius: 14, background: '#F3F4F6' }} />)}
            </div>
          ) : medicos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
              <p style={{ fontSize: 28, marginBottom: 10 }}>🩺</p>
              <p style={{ fontSize: 14 }}>Próximamente más especialistas verificados</p>
              <Link href="/registro" style={{ display: 'inline-block', marginTop: 14, color: '#3730A3', fontWeight: 500, fontSize: 13, textDecoration: 'none', borderBottom: '1px solid #3730A3' }}>
                ¿Eres médico? Regístrate gratis →
              </Link>
            </div>
          ) : (
            <div className="medicos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {medicos.map(m => (
                <Link key={m.id} href={`/doctor/${m.id}`} className="mcard">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div className="avatar">{(m.full_name || '?')[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: '#1A1A2E', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.full_name}</p>
                      <p style={{ fontSize: 13, color: '#4F46E5', fontWeight: 500, marginBottom: 6 }}>{m.specialty}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {m.license_verified && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#3730A3', background: '#EEF2FF', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>✓ Verificado</span>}
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

      {/* CTA MÉDICOS */}
      <section style={{ background: '#3730A3', padding: 'clamp(40px, 6vw, 52px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#F4623A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Para médicos</p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>
            Tus pacientes te están buscando
          </h2>
          <p style={{ color: '#A5B4FC', fontSize: 14, marginBottom: 24, fontWeight: 300 }}>Directorio básico gratuito · Sin comisiones por pacientes</p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4623A', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: '50px', fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            Registrarme gratis →
          </Link>
          <p style={{ marginTop: 12, fontSize: 12, color: '#A5B4FC', fontWeight: 300 }}>Herramientas premium opcionales disponibles</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#1E1B4B', padding: 'clamp(32px, 5vw, 40px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#fff' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </div>
          <p style={{ fontSize: 13, color: '#A5B4FC', fontStyle: 'italic', marginBottom: 16 }}>"Más que opiniones, evidencia"</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Especialidades', href: '/buscar' },
              { label: 'Registro médico', href: '/registro' },
              { label: 'Nosotros', href: '/nosotros' },
              { label: 'Términos y Condiciones', href: '/terminos-y-condiciones' },
              { label: 'Aviso de Privacidad', href: '/aviso-de-privacidad' },
              { label: 'Política de Cookies', href: '/politica-de-cookies' },
              { label: 'Términos Profesionales', href: '/terminos-profesionales' },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ fontSize: 13, color: '#A5B4FC', textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>© 2026 Salurama S.A.S. de C.V. (en constitución) · salurama.com · Hecho en México 🇲🇽</p>
        </div>
      </footer>
    </div>
  )
}