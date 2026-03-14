'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Menu, X, Search, Stethoscope } from 'lucide-react'

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
    <div className="min-h-screen bg-white font-sans text-[#1A1A2E]">
      {/* ── Fuentes ──────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* ── NAVBAR ───────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/92 backdrop-blur-md border-b border-[#F0F4F2]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - HORIZONTAL (UNA LÍNEA) */}
            <Link href="/" className="flex items-center gap-0 flex-shrink-0">
              <span className="font-['Fraunces'] text-[22px] font-black text-[#0D5C4A] tracking-tight">Salu</span>
              <span className="font-['Fraunces'] text-[22px] font-semibold text-[#F59E0B] tracking-tight">rama</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-7">
              <Link href="/buscar" className="text-[15px] font-normal text-[#1A1A2E] hover:text-[#0D5C4A] border-b-2 border-transparent hover:border-[#0D5C4A] transition-colors pb-1">
                Especialidades
              </Link>
              <Link href="/nosotros" className="text-[15px] font-normal text-[#1A1A2E] hover:text-[#0D5C4A] border-b-2 border-transparent hover:border-[#0D5C4A] transition-colors pb-1">
                Nosotros
              </Link>
              <Link 
                href="/registro" 
                className="inline-flex items-center gap-2 bg-[#0D5C4A] text-white px-5 py-2.5 rounded-full text-[14px] font-medium hover:bg-[#1A7A62] transition-colors"
              >
                <span>👨‍⚕️</span> Soy Médico
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-[#E8F5F1] transition-colors"
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-[#0D5C4A]" />
              ) : (
                <Menu className="w-6 h-6 text-[#0D5C4A]" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#F0F4F2]">
              <div className="flex flex-col gap-4">
                <Link 
                  href="/buscar" 
                  className="text-[15px] font-normal text-[#1A1A2E] hover:text-[#0D5C4A] transition-colors px-2 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Especialidades
                </Link>
                <Link 
                  href="/nosotros" 
                  className="text-[15px] font-normal text-[#1A1A2E] hover:text-[#0D5C4A] transition-colors px-2 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Nosotros
                </Link>
                <Link 
                  href="/registro" 
                  className="inline-flex items-center justify-center gap-2 bg-[#0D5C4A] text-white px-5 py-3 rounded-full text-[14px] font-medium hover:bg-[#1A7A62] transition-colors mx-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>👨‍⚕️</span> Soy Médico
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 text-center">
        <div className="max-w-[680px] mx-auto">
          {/* Logo grande - HORIZONTAL (UNA LÍNEA) */}
          <div className="mb-3">
            <span className="font-['Fraunces'] text-[clamp(48px,10vw,72px)] font-black text-[#0D5C4A] tracking-tight inline-block">Salu</span>
            <span className="font-['Fraunces'] text-[clamp(48px,10vw,72px)] font-semibold text-[#F59E0B] tracking-tight inline-block ml-1">rama</span>
          </div>

          {/* Slogan oficial */}
          <p className="font-['Fraunces'] text-[clamp(16px,4vw,20px)] font-semibold italic text-[#1A7A62] mb-2 tracking-wide">
            Salud en tus manos
          </p>

          {/* Tagline */}
          <p className="text-[15px] text-[#6B7280] font-light mb-9">
            Tu médico de confianza, al alcance de tu mano 🩺
          </p>

          {/* Buscador */}
          <div className="relative max-w-[600px] mx-auto w-full">
            <input
              ref={inputRef}
              type="text"
              className="w-full px-6 py-4.5 pr-32 text-[16px] sm:text-[18px] font-normal font-sans text-[#1A1A2E] bg-white border-2 border-[#D1D9D6] rounded-full outline-none transition-all duration-200 focus:border-[#0D5C4A] focus:ring-4 focus:ring-[#0D5C4A]/10 placeholder:text-[#9CA3AF] placeholder:font-light caret-[#0D5C4A]"
              placeholder={placeholder}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              aria-label="Buscar médico, especialidad o síntoma"
            />
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0D5C4A] text-white border-none rounded-full px-6 py-2.5 text-[15px] font-medium hover:bg-[#1A7A62] transition-all active:scale-95"
              onClick={handleBuscar}
              aria-label="Buscar"
            >
              Buscar
            </button>
          </div>

          {/* Hint */}
          <p className="text-[13px] text-[#9CA3AF] font-light mt-3">
            Busca por especialidad, síntoma, nombre de médico o clínica
          </p>
        </div>
      </section>

      {/* ── ESPECIALIDADES ─────────────────────────────── */}
      <section className="py-5 px-4 bg-white">
        <div className="max-w-[860px] mx-auto">
          <p className="text-[13px] font-medium text-[#9CA3AF] uppercase tracking-widest text-center mb-5">
            Especialidades frecuentes
          </p>
          <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {ESPECIALIDADES.map(esp => (
              <button
                key={esp.nombre}
                onClick={() => handleEspecialidad(esp.nombre)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border-[1.5px] border-[#D1D9D6] bg-white text-[14px] font-normal text-[#1A1A2E] hover:border-[#0D5C4A] hover:bg-[#E8F5F1] hover:text-[#0D5C4A] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                aria-label={`Buscar ${esp.nombre}`}
              >
                <span>{esp.emoji}</span>
                <span>{esp.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────── */}
      <section className="py-16 px-4 bg-[#F9FAFB]">
        <div className="max-w-[860px] mx-auto">
          <h2 className="font-['Fraunces'] text-[clamp(22px,5vw,30px)] font-black text-[#0D5C4A] text-center mb-2">
            ¿Cómo funciona?
          </h2>
          <p className="text-center text-[#6B7280] mb-12 text-[15px]">
            Encuentra a tu médico en menos de 2 minutos
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: '1', titulo: 'Busca', desc: 'Escribe la especialidad, un síntoma o el nombre de tu médico en el buscador.' },
              { n: '2', titulo: 'Compara', desc: 'Revisa perfiles verificados con horarios, ubicación y teléfono de contacto.' },
              { n: '3', titulo: 'Contacta', desc: 'Llama o escribe por WhatsApp directamente. Sin intermediarios. Sin costo.' },
            ].map(paso => (
              <div key={paso.n} className="text-center p-8 bg-white rounded-2xl border-[1.5px] border-[#E5EAE8]">
                <div className="w-12 h-12 rounded-full bg-[#0D5C4A] text-white font-['Fraunces'] text-[20px] font-black flex items-center justify-center mx-auto mb-4">
                  {paso.n}
                </div>
                <h3 className="font-['Fraunces'] text-[20px] font-black text-[#1A1A2E] mb-2.5">
                  {paso.titulo}
                </h3>
                <p className="text-[14px] text-[#6B7280] leading-relaxed font-light">
                  {paso.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MÉDICOS DESTACADOS ─────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-3 mb-8">
            <div>
              <h2 className="font-['Fraunces'] text-[clamp(22px,5vw,28px)] font-black text-[#0D5C4A]">
                Especialistas verificados
              </h2>
              <p className="text-[14px] text-[#6B7280] mt-1 font-light">
                Cédula profesional confirmida · Perfil completo
              </p>
            </div>
            <Link 
              href="/buscar" 
              className="text-[14px] font-medium text-[#0D5C4A] hover:text-[#1A7A62] border-b border-[#0D5C4A]/25 hover:border-[#0D5C4A] transition-colors pb-0.5"
            >
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[140px] rounded-2xl bg-[#F3F4F6] animate-pulse" />
              ))}
            </div>
          ) : medicos.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-[32px] mb-3">🩺</p>
              <p className="text-[15px] text-[#9CA3AF] mb-4">Próximamente más especialistas verificados</p>
              <Link 
                href="/registro" 
                className="inline-block text-[#0D5C4A] font-medium text-[14px] hover:text-[#1A7A62] border-b border-[#0D5C4A] hover:border-[#1A7A62] transition-colors pb-0.5"
              >
                ¿Eres médico? Regístrate gratis →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {medicos.map(m => (
                <Link 
                  key={m.id} 
                  href={`/doctor/${m.id}`}
                  className="block bg-white border-[1.5px] border-[#E5EAE8] rounded-2xl p-6 hover:shadow-[0_8px_32px_#0D5C4A/8] hover:-translate-y-1 hover:border-[#0D5C4A]/25 transition-all duration-200"
                >
                  <div className="flex gap-4 items-start">
                    <div className="w-[52px] h-[52px] rounded-full bg-[#E8F5F1] font-['Fraunces'] text-[22px] font-black text-[#0D5C4A] flex items-center justify-center flex-shrink-0">
                      {(m.nombre_completo || m.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-['Fraunces'] text-[16px] font-semibold text-[#1A1A2E] mb-1 truncate">
                        {m.nombre_completo || m.full_name}
                      </p>
                      <p className="text-[13px] font-medium text-[#0D5C4A] mb-2">
                        {m.especialidad}
                      </p>
                      <div className="flex flex-wrap gap-2 items-center">
                        {m.licencia_verificada && (
                          <span className="inline-flex items-center gap-1 text-[12px] text-[#0D5C4A] bg-[#E8F5F1] rounded-full px-2.5 py-1 font-medium">
                            ✓ Verificado
                          </span>
                        )}
                        {(m.ubicacion_ciudad || m.ciudad) && (
                          <span className="text-[12px] text-[#9CA3AF]">
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

      {/* ── BANNER CTA MÉDICOS ─────────────────────────── */}
      <section className="bg-[#0D5C4A] py-14 px-4 text-center">
        <div className="max-w-[600px] mx-auto">
          <p className="text-[13px] font-medium text-[#F59E0B] uppercase tracking-widest mb-3">
            Para médicos
          </p>
          <h2 className="font-['Fraunces'] text-[clamp(22px,5vw,30px)] font-black text-white mb-3 leading-tight">
            ¿Eres médico? Tu perfil, gratis para siempre
          </h2>
          <p className="text-[#A7C4BB] text-[15px] mb-8 font-light">
            Sin suscripciones, sin comisiones. Solo más pacientes.
          </p>
          <Link 
            href="/registro" 
            className="inline-flex items-center justify-center gap-2 bg-[#F59E0B] text-white font-bold px-8 py-3.5 rounded-full text-[16px] hover:bg-[#F59E0B]/90 hover:scale-105 transition-all duration-200"
          >
            Registrarme gratis →
          </Link>
          <p className="mt-4 text-[12px] text-[#A7C4BB] font-light">
            Ya somos más de 2 especialistas verificados · Creciendo cada día
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="bg-[#111827] py-10 px-4 text-center">
        <div className="max-w-[860px] mx-auto">
          <div className="mb-4">
            <span className="font-['Fraunces'] text-[20px] font-black text-[#0D5C4A]">Salu</span>
            <span className="font-['Fraunces'] text-[20px] font-semibold text-[#F59E0B]">rama</span>
          </div>
          <p className="text-[13px] text-[#6B7280] italic mb-5">
            "Salud en tus manos"
          </p>
          <div className="flex justify-center gap-6 flex-wrap mb-6">
            {['Especialidades', 'Registro médico', 'Nosotros'].map(link => (
              <a 
                key={link} 
                href="#" 
                className="text-[13px] text-[#6B7280] hover:text-white transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
          <p className="text-[12px] text-[#374151]">
            © 2026 Salurama · salurama.com · Hecho en México 🇲🇽
          </p>
        </div>
      </footer>
    </div>
  )
}