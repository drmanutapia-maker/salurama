'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Menu, X, ShieldCheck, GraduationCap, Clock, ArrowRight } from 'lucide-react'

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
  const [query, setQuery]               = useState('')
  const [medicos, setMedicos]           = useState<Medico[]>([])
  const [loading, setLoading]           = useState(true)
  const [placeholder, setPlaceholder]   = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  const handleBuscar = () => {
    if (!query.trim()) return
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`)
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
          padding: 9px 22px; font-size: 14px; font-family: 'DM Sans', sans-serif;
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
        .trust-card {
          background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
          padding: 20px 18px; display: flex; flex-direction: column; gap: 8px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .trust-card:hover { border-color: #3730A344; box-shadow: 0 4px 16px #3730A30D; }
        @media (max-width: 768px) {
          .dsk           { display: none !important; }
          .mob-btn       { display: flex !important; }
          .pasos-grid    { grid-template-columns: 1fr !important; }
          .medicos-grid  { grid-template-columns: 1fr !important; }
          .trust-grid    { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .mob-btn  { display: none !important; }
          .mob-menu { display: none !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ padding: 'clamp(48px, 8vw, 80px) 20px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Logotipo grande */}
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 11vw, 76px)', fontWeight: 900, color: '#3730A3', letterSpacing: '-2px' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 11vw, 76px)', fontWeight: 600, color: '#F4623A', letterSpacing: '-2px' }}>rama</span>
          </div>

          {/* Slogan Principal */}
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, color: '#3730A3', marginBottom: 6, lineHeight: 1.2 }}>
            Verifico, luego elijo
          </h1>

          {/* Tagline Secundario */}
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(16px, 3.5vw, 20px)', fontWeight: 600, fontStyle: 'italic', color: '#4F46E5', marginBottom: 28 }}>
            Más que opiniones, evidencia.
          </p>

          {/* Buscador */}
          <div style={{ position: 'relative', maxWidth: 580, margin: '0 auto' }}>
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

          {/* ── LÍNEA DE CONFIANZA ── */}
          <div style={{
            marginTop: 28,
            padding: '20px 24px',
            background: '#F9FAFB',
            borderRadius: 16,
            border: '1px solid #E5E7EB',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 'clamp(13px, 2.5vw, 15px)', color: '#374151', lineHeight: 1.75, fontWeight: 400 }}>
              Herramientas reales para elegir con certeza. Verifica antes de confiar.
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#4F46E5', background: '#EEF2FF', borderRadius: 20, padding: '4px 12px', fontWeight: 500 }}>
                📍 Ubicación
              </span>
              <span style={{ fontSize: 12, color: '#4F46E5', background: '#EEF2FF', borderRadius: 20, padding: '4px 12px', fontWeight: 500 }}>
                🎓 Experiencia
              </span>
              <span style={{ fontSize: 12, color: '#4F46E5', background: '#EEF2FF', borderRadius: 20, padding: '4px 12px', fontWeight: 500 }}>
                💰 Costo
              </span>
              <span style={{ fontSize: 12, color: '#4F46E5', background: '#EEF2FF', borderRadius: 20, padding: '4px 12px', fontWeight: 500 }}>
                ⭐ Reseñas
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ESPECIALIDADES ── */}
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

      {/* ── SECCIÓN: HERRAMIENTAS DE CONFIANZA ── */}
      <section style={{ padding: 'clamp(40px, 6vw, 60px) 20px', background: 'linear-gradient(160deg, #EEF2FF 0%, #F9FAFB 100%)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: 10 }}>
            Tu herramienta de decisión
          </p>

          {/* Título Actualizado */}
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#3730A3', textAlign: 'center', marginBottom: 10, lineHeight: 1.25 }}>
            Encuentra, verifica y haz cita con tu médico en minutos
          </h2>

          <div className="trust-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 32 }}>
            <div className="trust-card">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="#3730A3" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Cédula profesional</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, fontWeight: 300 }}>
                Cada perfil tiene un botón que te lleva directo al registro oficial de la SEP.
                Tú verificas, tú decides.
              </p>
            </div>
            <div className="trust-card">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={20} color="#3730A3" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Certificación vigente</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, fontWeight: 300 }}>
                Acceso directo a CONACEM para confirmar que la certificación
                está activa y al día.
              </p>
            </div>
            <div className="trust-card">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} color="#3730A3" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Filtros que importan</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, fontWeight: 300 }}>
                Ordena por lo que es importante para ti: ubicación, experiencia, costo o reseñas.
                No por quién pagó más.
              </p>
            </div>
          </div>

          {/* Link Actualizado */}
          <div style={{ textAlign: 'center', marginTop: 28 }}>
            <Link href="/como-elegir-medico" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, color: '#3730A3', fontWeight: 600,
              textDecoration: 'none', borderBottom: '1px solid #3730A344', paddingBottom: 2
            }}>
              Aprende a elegir médico <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
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
              {
                n: '1',
                titulo: 'Busca',
                desc: 'Escribe la especialidad, un síntoma o el nombre de tu médico.',
              },
              {
                n: '2',
                titulo: 'Verifica tú mismo',
                desc: 'Desde el perfil del médico, accede con un clic a la SEP y a CONACEM. La verificación la haces tú, con fuentes oficiales.',
              },
              {
                n: '3',
                titulo: 'Contacta',
                desc: 'Llama o escribe directamente. Sin intermediarios. Sin costo.',
              },
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

      {/* ── ESPECIALISTAS VERIFICADOS ── */}
      <section style={{ padding: 'clamp(40px, 6vw, 56px) 20px 64px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: '#3730A3' }}>
                Especialistas registrados
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 3, fontWeight: 300 }}>
                Cédula verificable en SEP · Perfil completo
              </p>
            </div>
            <Link href="/buscar" style={{ fontSize: 13, color: '#3730A3', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid #3730A344' }}>
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {[1, 2, 3].map(i => <div key={i} style={{ height: 110, borderRadius: 14, background: '#F3F4F6' }} />)}
            </div>
          ) : medicos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
              <p style={{ fontSize: 28, marginBottom: 10 }}>🩺</p>
              <p style={{ fontSize: 14 }}>Próximamente más especialistas registrados</p>
              <Link href="/registro" style={{ display: 'inline-block', marginTop: 14, color: '#3730A3', fontWeight: 500, fontSize: 13, textDecoration: 'none', borderBottom: '1px solid #3730A3' }}>
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
                      <p style={{ fontSize: 13, color: '#4F46E5', fontWeight: 500, marginBottom: 6 }}>{m.specialty}</p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {m.license_verified && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#3730A3', background: '#EEF2FF', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>
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

      {/* ── CTA MÉDICOS ── */}
      <section style={{ background: '#3730A3', padding: 'clamp(40px, 6vw, 52px) 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#F4623A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Para médicos
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: '#fff', marginBottom: 10, lineHeight: 1.3 }}>
            Tus pacientes te están buscando
          </h2>
          <p style={{ color: '#A5B4FC', fontSize: 14, marginBottom: 24, fontWeight: 300 }}>
            Registro gratuito · Visibilidad basada en tus méritos · Sin comisiones por paciente
          </p>
          <Link href="/registro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4623A', color: '#fff', fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: '50px', fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
            Registrarme →
          </Link>
          <p style={{ marginTop: 12, fontSize: 12, color: '#A5B4FC', fontWeight: 300 }}>
            Tu perfil aparece por lo que sabes, no por lo que pagas.
          </p>
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
              { label: 'Especialidades',        href: '/buscar'                   },
              { label: '¿Cómo elegir médico?',  href: '/como-elegir-medico'       },
              { label: 'Registro médico',        href: '/registro'                 },
              { label: 'Nosotros',               href: '/nosotros'                 },
              { label: 'Términos y Condiciones', href: '/terminos-y-condiciones'   },
              { label: 'Aviso de Privacidad',    href: '/aviso-de-privacidad'      },
              { label: 'Política de Cookies',    href: '/politica-de-cookies'      },
              { label: 'Términos Profesionales', href: '/terminos-profesionales'   },
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