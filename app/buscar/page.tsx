'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Search, Clock, DollarSign, Star, Baby, Calendar, MapPin, Shield,
  X, Navigation, GraduationCap, Globe
} from 'lucide-react'
import StateCitySelector from '@/components/StateCitySelector'
import BottomNav from '@/components/BottomNav'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

const ESPECIALIDADES_CONACEM = [
  'Alergología','Anestesiología','Angiología y Cirugía Vascular','Cardiología','Cardiología Pediátrica',
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

type FiltroChip = {
  id: string
  label: string
  icon: React.ReactNode
  tooltip: string
  activo: boolean
}

const normalizarTexto = (texto: string): string => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export default function BuscarPage() {
  const searchParams = useSearchParams()
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [filteredMedicos, setFilteredMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [showMapModal, setShowMapModal] = useState<Medico | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)

  const [busqueda, setBusqueda] = useState('')
  const [userTyped, setUserTyped] = useState(false)
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [filtros, setFiltros] = useState<string[]>([])
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<string[]>(ESPECIALIDADES_CONACEM)
  const [ciudadesConMedicos, setCiudadesConMedicos] = useState<string[]>([])
  const [paramsLoaded, setParamsLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

  useEffect(() => {
    async function loadEspecialidades() {
      try {
        const { data, error } = await supabase.from('doctors').select('specialty').not('specialty', 'is', null)
        if (error) throw error
        const especialidadesUnicas = Array.from(new Set(data.map(d => d.specialty).filter(Boolean))) as string[]
        const extras = especialidadesUnicas.filter(esp =>!ESPECIALIDADES_CONACEM.includes(esp))
        setEspecialidadesDisponibles([...ESPECIALIDADES_CONACEM,...extras.sort()])
      } catch (error) {
        console.error('Error loading especialidades:', error)
      }
    }
    loadEspecialidades()
  }, [])

  useEffect(() => {
    const especialidad = searchParams.get('especialidad')
    const estado = searchParams.get('estado')
    const ciudad = searchParams.get('ciudad')
    if (especialidad) {
      setBusqueda(especialidad)
      setInputValue(especialidad)
    }
    if (estado) setSelectedState(estado)
    if (ciudad) setSelectedCity(ciudad)
    setParamsLoaded(true)
    setShowSugerencias(false)
  }, [searchParams])

  useEffect(() => {
    async function loadMedicos() {
      try {
        const { data, error } = await supabase
     .from('doctors')
     .select(`id, full_name, specialty, photo_url, location_city, location_state, consultation_price_general, years_experience, min_patient_age, max_patient_age, latitude, longitude, hospital_affiliation, languages, insurance_accepted, professional_license`)
     .eq('is_active', true)
     .order('created_at', { ascending: false })
     .limit(100)
        if (error) throw error
        setMedicos(data || [])
        if (data) {
          const ciudades = Array.from(new Set(data.map(m => m.location_city).filter(Boolean))) as string[]
          setCiudadesConMedicos(ciudades)
        }
      } catch (error) {
        console.error('Error loading medicos:', error)
        setMedicos([])
      } finally {
        setLoading(false)
      }
    }
    loadMedicos()
  }, [])

  useEffect(() => {
    if (inputValue.trim().length >= 2 && userTyped) {
      const sugerenciasFiltradas = especialidadesDisponibles.filter(esp => normalizarTexto(esp).includes(normalizarTexto(inputValue))).slice(0, 8)
      setSugerencias(sugerenciasFiltradas)
      setShowSugerencias(sugerenciasFiltradas.length > 0)
    } else {
      setShowSugerencias(false)
    }
  }, [inputValue, especialidadesDisponibles, userTyped])

  useEffect(() => {
    if (!paramsLoaded) return
    let resultados = [...medicos]
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase()
      resultados = resultados.filter(medico => {
        const medicoSpecialties = medico.specialty.includes(' y ')
     ? medico.specialty.split(' y ').map(s => s.trim().toLowerCase())
          : [medico.specialty.toLowerCase()]
        return medico.full_name?.toLowerCase().includes(busquedaLower) || medicoSpecialties.some(esp => esp.includes(busquedaLower))
      })
    }
    if (selectedState) {
      const estadoNormalizado = normalizarTexto(selectedState)
      resultados = resultados.filter(medico => normalizarTexto(medico.location_state || '').includes(estadoNormalizado))
    }
    if (selectedCity) {
      const ciudadNormalizada = normalizarTexto(selectedCity)
      resultados = resultados.filter(medico => normalizarTexto(medico.location_city || '').includes(ciudadNormalizada))
    }
    if (filtros.includes('ninos')) {
      resultados = resultados.filter(m => {
        const specialty = m.specialty.toLowerCase()
        const esPediatria = specialty.includes('pediatr') || specialty.includes('neonat') || specialty.includes('infantil')
        const atiendeNinosPorEdad = (m.min_patient_age || 0) < 18
        return esPediatria || atiendeNinosPorEdad
      })
    }
    if (filtros.includes('cerca') && userLocation) {
      resultados = resultados
   .map(m => ({...m, distance: m.latitude && m.longitude? calcularDistancia(userLocation.lat, userLocation.lng, m.latitude, m.longitude) : 9999 }))
   .sort((a, b) => (a.distance || 9999) - (b.distance || 9999))
    } else if (filtros.includes('experiencia')) {
      resultados.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0))
    } else if (filtros.includes('precio')) {
      resultados.sort((a, b) => (a.consultation_price_general || 0) - (b.consultation_price_general || 0))
    }
    setFilteredMedicos(resultados)
  }, [busqueda, selectedState, selectedCity, filtros, medicos, paramsLoaded, userLocation])

  const toggleFiltro = async (filtroId: string) => {
    if (filtroId === 'cerca' &&!filtros.includes('cerca')) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude
            const lng = pos.coords.longitude
            setUserLocation({ lat, lng })
            const { data } = await supabase.rpc('nearby_doctors', { user_lat: lat, user_lng: lng, radius_km: 50 })
            if (data && data.length > 0) {
              const withDistance = data.map((m: any) => ({...m, distance: calcularDistancia(lat, lng, m.latitude, m.longitude) }))
              setMedicos(withDistance)
            }
            setFiltros(prev => [...prev, filtroId])
            setChips(chips.map(c => c.id === filtroId? {...c, activo: true } : c))
          },
          () => alert('Activa la ubicación para usar "Cerca de mí"')
        )
      }
      return
    }
    setFiltros(prev => prev.includes(filtroId)? prev.filter(f => f!== filtroId) : [...prev, filtroId])
    setChips(chips.map(chip => chip.id === filtroId? {...chip, activo:!chip.activo } : chip))
  }

  const limpiarFiltros = () => {
    setFiltros([])
    setChips(chips.map(chip => ({...chip, activo: false })))
    setUserLocation(null)
    window.location.reload()
  }

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setBusqueda(value)
    setUserTyped(true)
  }

  const handleSugerenciaClick = (sugerencia: string) => {
    setBusqueda(sugerencia)
    setInputValue(sugerencia)
    setUserTyped(false)
    setShowSugerencias(false)
  }

  const [chips, setChips] = useState<FiltroChip[]>([
    { id: 'cerca', label: 'Cerca de mí', icon: <Navigation size={16} />, tooltip: 'Usa tu ubicación para mostrar médicos más cercanos primero', activo: false },
    { id: 'experiencia', label: 'Más experiencia', icon: <Clock size={16} />, tooltip: 'Muestra primero a los médicos con más años de ejercicio profesional', activo: false },
    { id: 'precio', label: 'Precio accesible', icon: <DollarSign size={16} />, tooltip: 'Ordena de menor a mayor costo de consulta', activo: false },
    { id: 'valorados', label: 'Mejor valorados', icon: <Star size={16} />, tooltip: 'Muestra primero a los médicos con mejores reseñas', activo: false },
    { id: 'ninos', label: 'Atiende niños', icon: <Baby size={16} />, tooltip: 'Muestra médicos que atienden pacientes pediátricos', activo: false },
    { id: 'disponibilidad', label: 'Disponibilidad', icon: <Calendar size={16} />, tooltip: 'Muestra médicos con horarios disponibles', activo: false }
  ])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      .fade-up { animation: fadeUp 0.4s ease-out; }
        h1, h2, h3 { font-family: 'Fraunces', serif; }
      .tooltip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: #1E3A5F; color: white; padding: 10px 14px; border-radius: 8px; font-size: 12px; width: 220px; z-index: 100; margin-bottom: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); text-align: center; line-height: 1.4; }
      .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #1E3A5F; transform: translateX(-50%) rotate(45deg); }
        @media (min-width: 768px) {.desktop-only { display: flex!important; }.mobile-only { display: none!important; } }
        @media (max-width: 767px) {.desktop-only { display: none!important; }.mobile-only { display: flex!important; } }
      `}</style>

      <Navbar />

      <main style={{ paddingTop: 120, paddingBottom: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          <div style={{ marginBottom: 40 }}>
            <div className="sugerencias-wrapper" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 1000, margin: '0 auto' }}>
              <div style={{ flex: '1 300px', position: 'relative' }}>
                <input type="text" placeholder="Especialidad o médico..." value={inputValue} onChange={handleBusquedaChange} onFocus={() => inputValue.length >= 2 && setShowSugerencias(true)} style={{ width: '100%', padding: '18px 140px 18px 24px', borderRadius: 16, border: '1.5px solid #2A9D8F', fontSize: 15, background: '#fff', outline: 'none' }} />
                <button onClick={() => setUserTyped(true)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#8B5CF6', border: 'none', borderRadius: 12, padding: '10px 20px', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={18} />Buscar
                </button>
                {showSugerencias && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 300, overflow: 'auto' }}>
                    {sugerencias.map((sugerencia, index) => (
                      <button key={index} onClick={() => handleSugerenciaClick(sugerencia)} onMouseDown={(e) => { e.preventDefault(); handleSugerenciaClick(sugerencia) }} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, cursor: 'pointer', borderBottom: index < sugerencias.length - 1? '1px solid #F3F4F6' : 'none' }} onMouseEnter={(e) => e.currentTarget.style.background = '#F5F3FF'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>
                        {sugerencia}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <StateCitySelector onStateChange={setSelectedState} onCityChange={setSelectedCity} initialState={selectedState} initialCity={selectedCity} ciudadesConMedicos={ciudadesConMedicos} />
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#1E3A5F', marginBottom: 8, textAlign: 'center' }}>¿Qué es lo más importante para ti?</h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center' }}>Selecciona una o varias opciones</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
              {chips.map((chip) => (
                <div key={chip.id} style={{ position: 'relative' }}>
                  <button onMouseEnter={() => setActiveTooltip(chip.id)} onMouseLeave={() => setActiveTooltip(null)} onClick={() => toggleFiltro(chip.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 50, border: chip.activo? '2px solid #8B5CF6' : '1.5px solid #2A9D8F', background: chip.activo? '#F5F3FF' : '#fff', color: chip.activo? '#8B5CF6' : '#4A5568', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {chip.icon}{chip.label}
                  </button>
                  {activeTooltip === chip.id && (<div className="tooltip">{chip.tooltip}</div>)}
                </div>
              ))}
            </div>
            {filtros.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <button onClick={limpiarFiltros} style={{ background: 'none', border: '1.5px solid #8B5CF6', color: '#8B5CF6', padding: '10px 24px', borderRadius: 50, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Limpiar filtros</button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 36, fontWeight: 900, color: '#1E3A5F' }}>Especialistas Disponibles</h2>
              <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 600 }}>{filteredMedicos.length} resultados</span>
            </div>

            {loading? (
              <div style={{ textAlign: 'center', padding: 60 }}><p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando médicos...</p></div>
            ) : filteredMedicos.length === 0? (
              <div style={{ textAlign: 'center', padding: 80, background: '#F9FAFB', borderRadius: 24 }}>
                <p style={{ color: '#6B7280', fontSize: 16 }}>No se encontraron médicos con estos filtros</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredMedicos.map((medico) => (
                  <article key={medico.id} style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: '0 2px 8px rgba(17, 28, 44, 0.06)', border: '1px solid #E5E7EB', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ width: 80, height: 80, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff' }}>
                        {medico.photo_url? (<img src={medico.photo_url} alt={medico.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : (medico.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1E3A5F', marginBottom: 4, lineHeight: 1.2 }}>{medico.full_name}</h3>
                            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>{medico.specialty}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B', flexShrink: 0 }}>
                            <Star size={16} fill="#F59E0B" /><span style={{ fontWeight: 700, fontSize: 14 }}>4.9</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                          {medico.professional_license && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#ECFDF5', color: '#059669', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              <Shield size={12} />Cédula verificada
                            </span>
                          )}
                          {medico.years_experience && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F3F4F6', color: '#4B5563', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                              <Clock size={12} />{medico.years_experience} años
                            </span>
                          )}
                          {medico.languages && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F3F4F6', color: '#4B5563', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                              <Globe size={12} />{medico.languages}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#6B7280', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={14} />{medico.location_city}, {medico.location_state}
                          </span>
                          {medico.distance && (<span style={{ color: '#8B5CF6', fontWeight: 600 }}>• {medico.distance.toFixed(1)} km</span>)}
                          {medico.hospital_affiliation && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <GraduationCap size={14} />{medico.hospital_affiliation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F3F4F6' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Consulta desde</p>
                        <p style={{ fontSize: 16, color: '#1E3A5F', fontWeight: 700 }}>${medico.consultation_price_general || 'N/A'}</p>
                      </div>
                      <Link href={`/doctor/${medico.id}`} style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: '#fff', padding: '10px 20px', borderRadius: 12, textAlign: 'center', fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        Ver perfil
                      </Link>
                      {medico.latitude && medico.longitude && (
                        <button onClick={() => setShowMapModal(medico)} style={{ padding: '10px 16px', background: '#fff', border: '1.5px solid #E5E7EB', color: '#4B5563', borderRadius: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14 }}>
                          <MapPin size={16} />Mapa
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showMapModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }} onClick={() => setShowMapModal(null)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 900, height: '85vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F' }}>{showMapModal.full_name}</h3>
                <p style={{ fontSize: 13, color: '#6B7280' }}>{showMapModal.location_city}, {showMapModal.location_state}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${showMapModal.latitude},${showMapModal.longitude}`} target="_blank" style={{ padding: '8px 16px', background: '#2A9D8F', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Navigation size={14} />Cómo llegar
                </a>
                <button onClick={() => setShowMapModal(null)} style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
              </div>
            </div>
            <iframe src={`https://www.google.com/maps?q=${showMapModal.latitude},${showMapModal.longitude}&z=16&output=embed`} width="100%" height="100%" style={{ border: 0, flex: 1 }} allowFullScreen loading="lazy" />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}