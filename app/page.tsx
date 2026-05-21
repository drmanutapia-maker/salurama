'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, MapPin, Stethoscope, Shield, Star,
  MessageCircle, ChevronDown, LogIn, UserPlus, Sparkles
} from 'lucide-react'
import { STATES } from '@/lib/locations'
import BottomNav from '@/components/BottomNav'

const MAS_BUSCADAS = [
  'Oncología', 'Cardiología', 'Dermatología', 'Psiquiatría',
  'Ginecología y Obstetricia', 'Pediatría', 'Cirugía Plástica y Reconstructiva',
  'Oftalmología', 'Geriatría', 'Gastroenterología',
] as const

const ESPECIALIDADES_BASE = [
  'Alergología', 'Anestesiología', 'Angiología y Cirugía Vascular', 'Cardiología',
  'Cirugía General', 'Cirugía Plástica y Reconstructiva', 'Dermatología',
  'Endocrinología', 'Gastroenterología', 'Geriatría', 'Ginecología y Obstetricia',
  'Medicina Interna', 'Neurología', 'Oftalmología', 'Oncología', 'Ortopedia y Traumatología',
  'Otorrinolaringología', 'Pediatría', 'Psiquiatría', 'Radiología e Imagen',
  'Urología', 'Medicina Familiar', 'Medicina General', 'Nutrición',
] as const

interface Doctor {
  id: string
  full_name: string
  specialty: string
  photo_url: string | null
  location_city: string
  location_state: string
  clinic_name: string | null
  consultation_price_general: number | null
  whatsapp_available: boolean
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function HomePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const searchRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [state, setState] = useState('')
  const [specialties, setSpecialties] = useState<string[]>([...ESPECIALIDADES_BASE])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current &&!dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (searchRef.current &&!searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load specialties (cached)
  useEffect(() => {
    let mounted = true
    supabase
     .from('doctors')
     .select('specialty')
     .not('specialty', 'is', null)
     .then(({ data, error }) => {
        if (!mounted || error ||!data) return
        const unique = Array.from(new Set(data.map(d => d.specialty).filter(Boolean)))
        const extras = unique.filter(s =>!ESPECIALIDADES_BASE.includes(s as any))
        setSpecialties([...ESPECIALIDADES_BASE,...extras.sort()])
      })
    return () => { mounted = false }
  }, [supabase])

  // Load doctors
  useEffect(() => {
    let mounted = true
    supabase
     .from('doctors')
     .select('id, full_name, specialty, photo_url, location_city, location_state, clinic_name, consultation_price_general, whatsapp_available')
     .order('created_at', { ascending: false })
     .limit(12)
     .then(({ data, error }) => {
        if (!mounted) return
        if (!error) setDoctors(data || [])
        setLoading(false)
      })
    return () => { mounted = false }
  }, [supabase])

  // Debounced suggestions
  useEffect(() => {
    if (query.length < 2) {
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(() => {
      const filtered = specialties
       .filter(s => normalize(s).includes(normalize(query)))
       .slice(0, 6)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    }, 150)
    return () => clearTimeout(timer)
  }, [query, specialties])

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams()
    if (query) params.set('especialidad', query)
    if (state) params.set('estado', state)
    router.push(`/buscar?${params}`)
  }, [query, state, router])

  const selectSuggestion = useCallback((suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
  }, [])

  return (
    <div className="min-h-screen bg-[#FCFCFD] text-[#0F172A] antialiased">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,800&family=Inter:wght@400;500;600&display=swap');
        * { font-variant-ligatures: common-ligatures; }
        ::selection { background: #8B5CF6; color: white; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-zinc-100">
        <div className="mx-auto max-w- px-6 h- flex items-center justify-between">
          <Link href="/" className="flex items-baseline gap-0.5">
            <span className="font-[Fraunces] text- font-extrabold tracking-tight text-[#0F172A]">Salu</span>
            <span className="font-[Fraunces] text- font-semibold tracking-tight text-[#0D9488]">rama</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {['Especialidades', 'Cómo elegir', 'Nosotros'].map((item, i) => (
              <Link
                key={item}
                href={['/buscar', '/como-elegir-medico', '/nosotros'][i]}
                className="text- font-medium text-zinc-600 hover:text-[#0D9488] transition-colors"
              >
                {item}
              </Link>
            ))}
          </nav>

          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="group flex items-center gap-2 rounded-full bg-[#0F172A] px-5 h-10 text- font-medium text-white transition-all hover:bg-[#1E293B] hover:shadow-lg hover:shadow-black/10"
            >
              Soy Médico
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-52 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-xl shadow-black/5 animate-in fade-in slide-in-from-top-1">
                <Link href="/login" className="flex items-center gap-3 px-4 h-11 text- hover:bg-zinc-50 transition-colors">
                  <LogIn className="w-4 h-4 text-zinc-500" />Iniciar sesión
                </Link>
                <Link href="/registro" className="flex items-center gap-3 px-4 h-11 text- hover:bg-zinc-50 transition-colors border-t border-zinc-100">
                  <UserPlus className="w-4 h-4 text-zinc-500" />Registrarme
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pb-24">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-[-10%] right-[-5%] w- h- rounded-full bg-gradient-to-br from-violet-100/40 to-teal-100/40 blur-3xl" />
          </div>

          <div className="mx-auto max-w- px-6 pt-16 pb-12 md:pt-24 md:pb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/50 bg-violet-50/50 px-3 py-1 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span className="text- font-medium text-violet-700">Verificación SEP • CONACEM</span>
            </div>

            <h1 className="font-[Fraunces] text-[clamp(36px,6vw,56px)] font-extrabold leading-[1.1] tracking-[-0.02em] text-[#0F172A]">
              Encuentra médicos
              <br />
              <span className="text-[#0D9488]">verificados</span> en México
            </h1>

            <p className="mt-4 text- leading-relaxed text-zinc-600 max-w- mx-auto">
              Verifica cédulas, lee reseñas reales y agenda directo. Sin comisiones.
            </p>

            {/* Search */}
            <div ref={searchRef} className="mt-10 mx-auto max-w-">
              <div className="flex flex-col sm:flex-row gap-3 p-1.5 rounded- bg-white shadow-[0_8px_40px_-12px_rgba(0,0,0,0.12)] ring-1 ring-zinc-900/5">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Oncología, Cardiología, Dermatología..."
                    className="w-full h- pl-11 pr-4 rounded- bg-zinc-50/50 text- placeholder:text-zinc-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-violet-500/20"
                  />
                  {showSuggestions && (
                    <div className="absolute top-[calc(100%+8px)] inset-x-0 z-20 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-xl">
                      {suggestions.map(s => (
                        <button
                          key={s}
                          onMouseDown={() => selectSuggestion(s)}
                          className="w-full px-4 h-11 text-left text- hover:bg-zinc-50 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="h- sm:w- px-4 rounded- bg-zinc-50/50 text- outline-none cursor-pointer transition-all focus:bg-white focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">Todo México</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <button
                  onClick={handleSearch}
                  className="h- px-6 rounded- bg-[#0F172A] text-white text- font-medium transition-all hover:bg-[#1E293B] hover:shadow-lg active:scale-[0.98]"
                >
                  Buscar
                </button>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {MAS_BUSCADAS.slice(0, 6).map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); router.push(`/buscar?especialidad=${encodeURIComponent(s)}`) }}
                    className="px-3.5 h-7 rounded-full bg-zinc-100 text- font-medium text-zinc-700 transition-all hover:bg-zinc-200 hover:-translate-y-0.5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Doctors */}
        <section className="mx-auto max-w- px-6 mt-16">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="font-[Fraunces] text- font-bold tracking-tight">Especialistas destacados</h2>
            <Link href="/buscar" className="text- font-medium text-zinc-600 hover:text-[#0F172A] transition-colors">
              Ver todos →
            </Link>
          </div>

          {loading? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h- rounded- bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : doctors.length > 0? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {doctors.map(doc => (
                <Link
                  key={doc.id}
                  href={`/doctor/${doc.id}`}
                  className="group relative overflow-hidden rounded- border border-zinc-200 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.04] hover:border-zinc-300"
                >
                  <div className="flex items-start gap-4">
                    {doc.photo_url? (
                      <img src={doc.photo_url} alt="" className="w-14 h-14 rounded-2xl object-cover ring-1 ring-zinc-900/5" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#0D9488] grid place-items-center text-white font-semibold">
                        {doc.full_name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium leading-snug line-clamp-1 group-hover:text-[#0D9488] transition-colors">
                        {doc.full_name}
                      </h3>
                      <p className="mt-0.5 text- text-zinc-600 line-clamp-1">{doc.specialty}</p>
                      <div className="mt-2 flex items-center gap-1.5 text- text-zinc-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{doc.location_city}</span>
                      </div>
                    </div>
                  </div>
                  {doc.consultation_price_general && (
                    <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                      <span className="text- text-zinc-500">Consulta</span>
                      <span className="text- font-semibold">${doc.consultation_price_general.toLocaleString('es-MX')}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded- border border-dashed border-zinc-300 bg-zinc-50/50 py-16 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-white shadow-sm grid place-items-center mb-4">
                <Stethoscope className="w-6 h-6 text-zinc-400" />
              </div>
              <h3 className="font-medium">Aún no hay médicos</h3>
              <p className="mt-1 text- text-zinc-600">Sé el primero en registrarte</p>
              <Link href="/registro" className="mt-4 inline-flex h-9 items-center rounded-full bg-[#0F172A] px-5 text- font-medium text-white hover:bg-[#1E293B] transition-colors">
                Registrarme
              </Link>
            </div>
          )}
        </section>

        {/* Features */}
        <section className="mx-auto max-w- px-6 mt-24">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Verificación oficial', desc: 'Cédulas SEP y consejos CONACEM validados', color: 'violet' },
              { icon: Star, title: 'Reseñas verificadas', desc: 'Solo pacientes con cita confirmada', color: 'amber' },
              { icon: MessageCircle, title: 'Sin intermediarios', desc: 'Contacto directo, sin comisiones', color: 'emerald' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="group rounded- border border-zinc-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/[0.04]">
                <div className={`w-12 h-12 rounded-2xl bg-${color}-50 grid place-items-center mb-5 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                <h3 className="font-[Fraunces] text- font-semibold">{title}</h3>
                <p className="mt-2 text- leading-relaxed text-zinc-600">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}