'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Search, Clock, DollarSign, Star, Baby, Calendar, MapPin, Shield,
  X, Navigation, GraduationCap, Globe, Loader2, Filter, SlidersHorizontal
} from 'lucide-react'
import StateCitySelector from '@/components/StateCitySelector'
import BottomNav from '@/components/BottomNav'
import Navbar from '@/components/Navbar'

const ESPECIALIDADES_CONACEM = [
  'Alergología','Anestesiología','Angiología y Cirugía Vascular','Cardiología Pediátrica',
  'Cirugía Cardiovascular','Cirugía General','Cirugía Maxilofacial','Cirugía Pediátrica',
  'Cirugía Plástica y Reconstructiva','Dermatología','Endocrinología','Endocrinología Pediátrica',
  'Gastroenterología','Gastroenterología y Endoscopia Pediátrica','Geriatría','Hematología',
  'Hematología Pediátrica','Infectología','Infectología Pediátrica','Medicina Crítica','Medicina Familiar',
  'Medicina Física y Rehabilitación','Medicina Interna','Nefrología','Nefrología Pediátrica','Neonatología',
  'Neumología','Neumología Pediátrica','Neurocirugía','Neurología','Neurología Pediátrica','Oncología',
  'Oncología Pediátrica','Oftalmología','Ortopedia y Traumatología','Otorrinolaringología','Pediatría',
  'Psiquiatría','Psiquiatría Infantil y de la Adolescencia','Radiología e Imagen','Reumatología',
  'Reumatología Pediátrica','Urología','Ginecología y Obstetricia','Medicina General','Nutrición',
]

interface Medico {
  id: string
  full_name: string
  specialty: string
  photo_url: string | null
  location_city: string
  location_state: string
  consultation_price_general: number | null
  years_experience: number | null
  min_patient_age: number | null
  max_patient_age: number | null
  latitude: number | null
  longitude: number | null
  distance?: number
  hospital_affiliation: string | null
  languages: string | null
  insurance_accepted: string | null
  professional_license: string | null
}

type FiltroId = 'cerca' | 'experiencia' | 'precio' | 'valorados' | 'ninos' | 'disponibilidad'

const normalizarTexto = (texto: string | null | undefined): string => {
  if (!texto) return ''
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function BuscarContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [showMapModal, setShowMapModal] = useState<Medico | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)

  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [filtros, setFiltros] = useState<FiltroId[]>([])
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<string[]>(ESPECIALIDADES_CONACEM)
  const [ciudadesConMedicos, setCiudadesConMedicos] = useState<string[]>([])
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [locating, setLocating] = useState(false)

  // Load especialidades
  useEffect(() => {
    supabase.from('doctors').select('specialty').not('specialty', 'is', null)
     .then(({ data }) => {
        if (data) {
          const unicas = Array.from(new Set(data.map(d => d.specialty).filter(Boolean))) as string[]
          const extras = unicas.filter(esp =>!ESPECIALIDADES_CONACEM.includes(esp))
          setEspecialidadesDisponibles([...ESPECIALIDADES_CONACEM,...extras.sort()])
        }
      })
  }, [supabase])

  // Load params
  useEffect(() => {
    const esp = searchParams.get('especialidad')
    const est = searchParams.get('estado')
    const ciu = searchParams.get('ciudad')
    if (esp) { setBusqueda(esp); setInputValue(esp) }
    if (est) setSelectedState(est)
    if (ciu) setSelectedCity(ciu)
  }, [searchParams])

  // Load medicos
  useEffect(() => {
    setLoading(true)
    supabase.from('doctors')
     .select(`id, full_name, specialty, photo_url, location_city, location_state, consultation_price_general, years_experience, min_patient_age, max_patient_age, latitude, longitude, hospital_affiliation, languages, insurance_accepted, professional_license`)
     .eq('is_active', true)
     .order('created_at', { ascending: false })
     .limit(100)
     .then(({ data, error }) => {
        if (!error && data) {
          setMedicos(data)
          setCiudadesConMedicos(Array.from(new Set(data.map(m => m.location_city).filter(Boolean))) as string[])
        }
        setLoading(false)
      })
  }, [supabase])

  // Sugerencias con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim().length >= 2) {
        const filtered = especialidadesDisponibles
         .filter(esp => normalizarTexto(esp).includes(normalizarTexto(inputValue)))
         .slice(0, 8)
        setSugerencias(filtered)
        setShowSugerencias(filtered.length > 0)
      } else {
        setShowSugerencias(false)
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [inputValue, especialidadesDisponibles])

  // Filtrado memoizado
  const filteredMedicos = useMemo(() => {
    let resultados = [...medicos]

    if (busqueda.trim()) {
      const term = normalizarTexto(busqueda)
      resultados = resultados.filter(m =>
        normalizarTexto(m.full_name).includes(term) ||
        normalizarTexto(m.specialty).includes(term)
      )
    }

    if (selectedState) {
      const estado = normalizarTexto(selectedState)
      resultados = resultados.filter(m => normalizarTexto(m.location_state).includes(estado))
    }

    if (selectedCity) {
      const ciudad = normalizarTexto(selectedCity)
      resultados = resultados.filter(m => normalizarTexto(m.location_city).includes(ciudad))
    }

    if (filtros.includes('ninos')) {
      resultados = resultados.filter(m => {
        const spec = normalizarTexto(m.specialty)
        return spec.includes('pediatr') || spec.includes('neonat') || spec.includes('infantil') || (m.min_patient_age || 0) < 18
      })
    }

    if (filtros.includes('cerca') && userLocation) {
      resultados = resultados
       .map(m => ({...m, distance: m.latitude && m.longitude? calcularDistancia(userLocation.lat, userLocation.lng, m.latitude, m.longitude) : 9999 }))
       .sort((a, b) => (a.distance || 9999) - (b.distance || 9999))
    } else if (filtros.includes('experiencia')) {
      resultados.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0))
    } else if (filtros.includes('precio')) {
      resultados.sort((a, b) => (a.consultation_price_general || 99999) - (b.consultation_price_general || 99999))
    }

    return resultados
  }, [medicos, busqueda, selectedState, selectedCity, filtros, userLocation])

  const toggleFiltro = useCallback(async (filtroId: FiltroId) => {
    if (filtroId === 'cerca' &&!filtros.includes('cerca')) {
      if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización')
        return
      }
      setLocating(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setFiltros(prev => [...prev, filtroId])
          setLocating(false)
        },
        () => {
          alert('Activa la ubicación para usar "Cerca de mí"')
          setLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
      return
    }

    setFiltros(prev =>
      prev.includes(filtroId)
       ? prev.filter(f => f!== filtroId)
        : [...prev, filtroId]
    )

    if (filtroId === 'cerca') setUserLocation(null)
  }, [filtros])

  const limpiarFiltros = useCallback(() => {
    setFiltros([])
    setUserLocation(null)
    setBusqueda('')
    setInputValue('')
    setSelectedState('')
    setSelectedCity('')
  }, [])

  const chips = [
    { id: 'cerca' as FiltroId, label: 'Cerca de mí', icon: <Navigation size={16} />, tooltip: 'Ordena por distancia usando tu ubicación' },
    { id: 'experiencia' as FiltroId, label: 'Más experiencia', icon: <Clock size={16} />, tooltip: 'Médicos con más años de práctica' },
    { id: 'precio' as FiltroId, label: 'Mejor precio', icon: <DollarSign size={16} />, tooltip: 'De menor a mayor costo' },
    { id: 'valorados' as FiltroId, label: 'Mejor valorados', icon: <Star size={16} />, tooltip: 'Con mejores reseñas' },
    { id: 'ninos' as FiltroId, label: 'Atiende niños', icon: <Baby size={16} />, tooltip: 'Pediatras y especialistas infantiles' },
    { id: 'disponibilidad' as FiltroId, label: 'Disponible hoy', icon: <Calendar size={16} />, tooltip: 'Con citas disponibles' },
  ]

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap');
        h1, h2, h3 { font-family: 'Fraunces', serif; }
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      <Navbar />

      <main className="pt- pb-24 lg:pb-8">
        <div className="max-w- mx-auto px-4 sm:px-6">

          {/* Search Bar 2026 */}
          <div className="mb-8">
            <div className="relative max-w- mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    placeholder="Busca especialidad, médico o síntoma..."
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setBusqueda(e.target.value) }}
                    onFocus={() => inputValue.length >= 2 && setShowSugerencias(true)}
                    onBlur={() => setTimeout(() => setShowSugerencias(false), 150)}
                    className="w-full h- pl-12 pr-4 bg-white border border-[#E2E8F0] rounded-2xl text- placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition-all shadow-sm hover:shadow"
                  />
                  {showSugerencias && sugerencias.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-xl z-50 overflow-hidden">
                      {sugerencias.map((s, i) => (
                        <button
                          key={s}
                          onMouseDown={() => { setBusqueda(s); setInputValue(s); setShowSugerencias(false) }}
                          className="w-full px-4 py-3 text-left text- hover:bg-[#F8FAFC] transition-colors flex items-center gap-3 border-b border-[#F1F5F9] last:border-0"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#F5F3FF] flex items-center justify-center flex-shrink-0">
                            <Search size={14} className="text-[#8B5CF6]" />
                          </div>
                          <span className="text-[#334155]">{s}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sm:w-">
                  <StateCitySelector
                    onStateChange={setSelectedState}
                    onCityChange={setSelectedCity}
                    initialState={selectedState}
                    initialCity={selectedCity}
                    ciudadesConMedicos={ciudadesConMedicos}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filters 2026 */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text- sm:text- font-bold text-[#0F172A] tracking-tight">¿Qué priorizas?</h2>
                <p className="text- text-[#64748B] mt-0.5">Filtra por lo que más te importa</p>
              </div>
              {filtros.length > 0 && (
                <button onClick={limpiarFiltros} className="text- font-medium text-[#8B5CF6] hover:text-[#7C3AED] flex items-center gap-1.5">
                  <X size={14} /> Limpiar
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {chips.map((chip) => {
                const activo = filtros.includes(chip.id)
                return (
                  <div key={chip.id} className="relative" onMouseEnter={() => setActiveTooltip(chip.id)} onMouseLeave={() => setActiveTooltip(null)}>
                    <button
                      onClick={() => toggleFiltro(chip.id)}
                      disabled={chip.id === 'cerca' && locating}
                      className={`group relative flex items-center gap-2 px-4 h-10 rounded-full border text- font-medium transition-all ${
                        activo
                         ? 'bg-[#1E3A5F] border-[#1E3A5F] text-white shadow-md shadow-[#1E3A5F]/20'
                          : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                      } disabled:opacity-60`}
                    >
                      <span className={activo? 'text-white' : 'text-[#64748B] group-hover:text-[#334155]'}>
                        {chip.id === 'cerca' && locating? <Loader2 size={16} className="animate-spin" /> : chip.icon}
                      </span>
                      {chip.label}
                    </button>
                    {activeTooltip === chip.id && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#0F172A] text-white text- rounded-lg whitespace-nowrap pointer-events-none z-10 shadow-lg">
                        {chip.tooltip}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0F172A] rotate-45 -mt-1" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Results */}
          <div>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text- sm:text- font-bold text-[#0F172A] tracking-tight">
                Especialistas
              </h2>
              <div className="flex items-center gap-3">
                <span className="text- text-[#64748B] font-medium">
                  {loading? '...' : `${filteredMedicos.length} encontrados`}
                </span>
                <button className="lg:hidden p-2 rounded-xl border border-[#E2E8F0] bg-white">
                  <SlidersHorizontal size={16} className="text-[#64748B]" />
                </button>
              </div>
            </div>

            {loading? (
              <div className="grid gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-[#E2E8F0] animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-[#F1F5F9]" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-48 bg-[#F1F5F9] rounded-lg" />
                        <div className="h-4 w-32 bg-[#F1F5F9] rounded-lg" />
                        <div className="h-3 w-64 bg-[#F1F5F9] rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMedicos.length === 0? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#E2E8F0]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                  <Filter size={28} className="text-[#94A3B8]" />
                </div>
                <h3 className="text- font-semibold text-[#0F172A] mb-1">Sin resultados</h3>
                <p className="text- text-[#64748B] mb-6 max-w-sm mx-auto">Intenta ajustar tus filtros o buscar otra especialidad</p>
                <button onClick={limpiarFiltros} className="px-5 h-10 bg-[#1E3A5F] text-white rounded-xl text- font-medium hover:bg-[#172E4D] transition-colors">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredMedicos.map((medico) => (
                  <article key={medico.id} className="group bg-white rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-lg hover:shadow-[#0F172A]/[0.04] transition-all">
                    <div className="flex gap-4 sm:gap-5">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w- h- sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1E3A5F] to-[#2A9D8F] flex items-center justify-center ring-1 ring-black/5">
                          {medico.photo_url? (
                            <img src={medico.photo_url} alt={medico.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text- font-bold text-white">
                              {(medico.full_name?.[0] || '?').toUpperCase()}
                            </span>
                          )}
                        </div>
                        {medico.professional_license && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#10B981] rounded-full border-2 border-white flex items-center justify-center">
                            <Shield size={12} className="text-white" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="text- sm:text- font-semibold text-[#0F172A] leading-snug group-hover:text-[#1E3A5F] transition-colors">
                              {medico.full_name}
                            </h3>
                            <p className="text- text-[#64748B] mt-0.5">{medico.specialty}</p>
                          </div>
                          <div className="flex items-center gap-1 text-[#F59E0B] flex-shrink-0">
                            <Star size={15} fill="currentColor" />
                            <span className="text- font-semibold">4.9</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {medico.years_experience && (
                            <span className="inline-flex items-center gap-1 px-2.5 h-6 bg-[#F8FAFC] text-[#475569] rounded-full text- font-medium border border-[#E2E8F0]">
                              <Clock size={12} /> {medico.years_experience} años
                            </span>
                          )}
                          {medico.languages && (
                            <span className="inline-flex items-center gap-1 px-2.5 h-6 bg-[#F8FAFC] text-[#475569] rounded-full text- font-medium border border-[#E2E8F0]">
                              <Globe size={12} /> {medico.languages.split(',')[0]}
                            </span>
                          )}
                          {medico.distance && medico.distance < 9999 && (
                            <span className="inline-flex items-center gap-1 px-2.5 h-6 bg-[#F5F3FF] text-[#7C3AED] rounded-full text- font-medium border border-[#E9D5FF]">
                              <Navigation size={12} /> {medico.distance.toFixed(1)} km
                            </span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text- text-[#64748B]">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} className="text-[#94A3B8]" />
                            {medico.location_city}, {medico.location_state}
                          </span>
                          {medico.hospital_affiliation && (
                            <span className="inline-flex items-center gap-1.5 truncate max-w-">
                              <GraduationCap size={14} className="text-[#94A3B8] flex-shrink-0" />
                              <span className="truncate">{medico.hospital_affiliation}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F1F5F9]">
                      <div>
                        <div className="text- text-[#94A3B8] uppercase tracking-wide font-medium mb-0.5">Desde</div>
                        <div className="text- font-semibold text-[#0F172A] leading-none">
                          ${medico.consultation_price_general?.toLocaleString('es-MX') || '—'}
                          <span className="text- font-normal text-[#64748B] ml-1">MXN</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {medico.latitude && medico.longitude && (
                          <button
                            onClick={() => setShowMapModal(medico)}
                            className="h-10 px-3.5 bg-white border border-[#E2E8F0] rounded-xl text- font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors hidden sm:flex items-center gap-1.5"
                          >
                            <MapPin size={16} /> Mapa
                          </button>
                        )}
                        <Link
                          href={`/doctor/${medico.id}`}
                          className="h-10 px-5 bg-[#0F172A] text-white rounded-xl text- font-medium hover:bg-[#1E293B] active:bg-black transition-colors flex items-center"
                        >
                          Ver perfil
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowMapModal(null)}>
          <div className="bg-white rounded- w-full max-w- h- flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text- font-semibold text-[#0F172A]">{showMapModal.full_name}</h3>
                <p className="text- text-[#64748B] mt-0.5">{showMapModal.location_city}, {showMapModal.location_state}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${showMapModal.latitude},${showMapModal.longitude}`}
                  target="_blank"
                  className="h-9 px-3.5 bg-[#0F172A] text-white rounded-xl text- font-medium hover:bg-[#1E293B] transition-colors inline-flex items-center gap-1.5"
                >
                  <Navigation size={14} /> Ruta
                </a>
                <button onClick={() => setShowMapModal(null)} className="w-9 h-9 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center transition-colors">
                  <X size={18} className="text-[#475569]" />
                </button>
              </div>
            </div>
            <iframe
              src={`https://www.google.com/maps?q=${showMapModal.latitude},${showMapModal.longitude}&z=16&output=embed`}
              className="flex-1 w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default function BuscarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
      </div>
    }>
      <BuscarContent />
    </Suspense>
  )
}