'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Search, 
  Clock, 
  DollarSign, 
  Star, 
  Baby, 
  Calendar, 
  MapPin, 
  Shield,
  X,
  Info,
  ChevronDown,
  LogIn,
  UserPlus,
  HelpCircle
} from 'lucide-react'
import { STATES, CITIES_BY_STATE } from '@/lib/locations'
import StateCitySelector from '@/components/StateCitySelector'
import BottomNav from '@/components/BottomNav'

// TODAS LAS ESPECIALIDADES DE CONACEM
const ESPECIALIDADES_CONACEM = [
  'Alergología',
  'Anestesiología',
  'Angiología y Cirugía Vascular',
  'Cardiología',
  'Cardiología Pediátrica',
  'Cirugía Cardiovascular',
  'Cirugía General',
  'Cirugía Maxilofacial',
  'Cirugía Pediátrica',
  'Cirugía Plástica y Reconstructiva',
  'Dermatología',
  'Endocrinología',
  'Endocrinología Pediátrica',
  'Gastroenterología',
  'Gastroenterología y Endoscopia Pediátrica',
  'Geriatría',
  'Hematología',
  'Hematología Pediátrica',
  'Infectología',
  'Infectología Pediátrica',
  'Medicina Crítica',
  'Medicina Familiar',
  'Medicina Física y Rehabilitación',
  'Medicina Interna',
  'Nefrología',
  'Nefrología Pediátrica',
  'Neonatología',
  'Neumología',
  'Neumología Pediátrica',
  'Neurocirugía',
  'Neurología',
  'Neurología Pediátrica',
  'Oncología',
  'Oncología Pediátrica',
  'Oftalmología',
  'Ortopedia y Traumatología',
  'Otorrinolaringología',
  'Pediatría',
  'Psiquiatría',
  'Psiquiatría Infantil y de la Adolescencia',
  'Radiología e Imagen',
  'Reumatología',
  'Reumatología Pediátrica',
  'Urología',
  'Ginecología y Obstetricia',
  'Medicina General',
  'Nutrición',
  'Oncología Radioterápica',
  'Patología',
  'Pediatría del Desarrollo y Conducta',
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
}

type FiltroChip = {
  id: string
  label: string
  icon: React.ReactNode
  tooltip: string
  activo: boolean
}

// Función para normalizar texto (quitar acentos)
const normalizarTexto = (texto: string): string => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function BuscarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [filteredMedicos, setFilteredMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false)
  const [showCedulaModal, setShowCedulaModal] = useState<string | null>(null)
  const [showAyudaModal, setShowAyudaModal] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [userTyped, setUserTyped] = useState(false)
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)
  const [inputValue, setInputValue] = useState('')
  
  // ESTADOS CLAVE
  const [selectedState, setSelectedState] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')
  
  // Filtros activos
  const [filtros, setFiltros] = useState<string[]>([])
  
  // Especialidades disponibles
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<string[]>(ESPECIALIDADES_CONACEM)
  
  // Ciudades con médicos
  const [ciudadesConMedicos, setCiudadesConMedicos] = useState<string[]>([])
  
  // Flag para saber si ya se cargaron los params de la URL
  const [paramsLoaded, setParamsLoaded] = useState(false)

  // Detectar móvil
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 1. Cargar especialidades desde BD + CONACEM
  useEffect(() => {
    async function loadEspecialidades() {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('specialty')
          .not('specialty', 'is', null)
        if (error) throw error
        
        const especialidadesUnicas = Array.from(
          new Set(data.map(d => d.specialty).filter(Boolean))
        ) as string[]
        
        // Agregar especialidades de la BD que no estén en CONACEM
        const extras = especialidadesUnicas.filter(
          esp => !ESPECIALIDADES_CONACEM.includes(esp)
        )
        
        setEspecialidadesDisponibles([
          ...ESPECIALIDADES_CONACEM,
          ...extras.sort()
        ])
      } catch (error) {
        console.error('Error loading especialidades:', error)
      }
    }
    loadEspecialidades()
  }, [])

  // 2. Leer URL params AL INICIO y autollenar
  useEffect(() => {
    const especialidad = searchParams.get('especialidad')
    const estado = searchParams.get('estado')
    const ciudad = searchParams.get('ciudad')

    if (especialidad) {
      setBusqueda(especialidad)
      setInputValue(especialidad)
    }
    if (estado) {
      setSelectedState(estado)
    }
    if (ciudad) {
      setSelectedCity(ciudad)
    }
    
    setParamsLoaded(true)
  }, [searchParams])

  // 3. Cargar médicos de la BD
  useEffect(() => {
    async function loadMedicos() {
      try {
        const {  doctorsData, error: doctorsError } = await supabase
          .from('doctors')
          .select(`
            id,
            full_name,
            specialty,
            photo_url,
            location_city,
            location_state,
            consultation_price_general,
            years_experience,
            min_patient_age,
            max_patient_age
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50)

        if (doctorsError) throw doctorsError
        setMedicos(doctorsData || [])
        
        if (doctorsData) {
          const ciudades = Array.from(
            new Set(doctorsData.map(m => m.location_city).filter(Boolean))
          ) as string[]
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

  // 4. GENERAR SUGERENCIAS
  useEffect(() => {
    if (inputValue.trim().length >= 2 && userTyped) {
      const busquedaLower = inputValue.toLowerCase()
      const sugerenciasFiltradas = especialidadesDisponibles
        .filter(esp => normalizarTexto(esp).includes(normalizarTexto(busquedaLower)))
        .slice(0, 8)
      setSugerencias(sugerenciasFiltradas)
      setShowSugerencias(sugerenciasFiltradas.length > 0)
    } else {
      setShowSugerencias(false)
    }
  }, [inputValue, especialidadesDisponibles, userTyped])

  // 5. FILTRAR MÉDICOS
  useEffect(() => {
    if (!paramsLoaded || medicos.length === 0) return

    const timeoutId = setTimeout(() => {
      let resultados = [...medicos]

      // A. Filtrar por TEXTO
      if (busqueda.trim() && userTyped) {
        const busquedaLower = busqueda.toLowerCase()
        resultados = resultados.filter(medico => {
          const medicoSpecialties = medico.specialty.includes(' y ') 
            ? medico.specialty.split(' y ').map(s => s.trim().toLowerCase())
            : [medico.specialty.toLowerCase()]
          
          return (
            medico.full_name?.toLowerCase().includes(busquedaLower) ||
            medicoSpecialties.some(esp => esp.includes(busquedaLower))
          )
        })
      }

      // B. Filtrar por ESTADO
      if (selectedState) {
        const estadoNormalizado = normalizarTexto(selectedState)
        resultados = resultados.filter(medico => {
          const medicoEstado = normalizarTexto(medico.location_state || '')
          return medicoEstado.includes(estadoNormalizado) || estadoNormalizado.includes(medicoEstado)
        })
      }

      // C. Filtrar por CIUDAD
      if (selectedCity) {
        const ciudadNormalizada = normalizarTexto(selectedCity)
        resultados = resultados.filter(medico => {
          const medicoCiudad = normalizarTexto(medico.location_city || '')
          return medicoCiudad.includes(ciudadNormalizada) || ciudadNormalizada.includes(medicoCiudad)
        })
      }

      // D. Filtro "Atiende niños" - Lógica híbrida
      if (filtros.includes('ninos')) {
        resultados = resultados.filter(m => {
          const specialty = m.specialty.toLowerCase()
          
          // Coincidencias por palabras clave (pediatría y subespecialidades)
          const esPediatria = 
            specialty.includes('pediatría') ||
            specialty.includes('pediatric') ||
            specialty.includes('pediátrica') ||
            specialty.includes('neonatología') ||
            specialty.includes('infantil')
          
          // O por rango de edad (< 18 años)
          const atiendeNinosPorEdad = 
            (m.min_patient_age || 0) < 18 || 
            (m.max_patient_age || 100) >= 0
          
          return esPediatria || atiendeNinosPorEdad
        })
      }

      // E. Ordenamientos
      if (filtros.includes('experiencia')) {
        resultados.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0))
      } else if (filtros.includes('precio')) {
        resultados.sort((a, b) => (a.consultation_price_general || 0) - (b.consultation_price_general || 0))
      }

      setFilteredMedicos(resultados)
      
      // Actualizar URL
      const params = new URLSearchParams()
      if (busqueda && userTyped) params.set('especialidad', busqueda)
      if (selectedState) params.set('estado', selectedState)
      if (selectedCity) params.set('ciudad', selectedCity)
      
      const newUrl = `/buscar?${params.toString()}`
      if (window.location.search !== `?${params.toString()}`) {
        router.push(newUrl, { scroll: false })
      }

    }, 300)

    return () => clearTimeout(timeoutId)
  }, [busqueda, selectedState, selectedCity, filtros, medicos, router, paramsLoaded, userTyped])

  // Cerrar dropdowns al click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (!target.closest('.doctor-dropdown')) {
        setDoctorDropdownOpen(false)
      }
      if (!target.closest('.sugerencias-wrapper')) {
        setShowSugerencias(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleFiltro = (filtroId: string) => {
    setChips(chips.map(chip => 
      chip.id === filtroId ? { ...chip, activo: !chip.activo } : chip
    ))
    setFiltros(prev => 
      prev.includes(filtroId)
        ? prev.filter(f => f !== filtroId)
        : [...prev, filtroId]
    )
  }

  const limpiarFiltros = () => {
    setFiltros([])
    setChips(chips.map(chip => ({ ...chip, activo: false })))
  }

  const getCiudadesCercanas = (): string[] => {
    if (!selectedState) return []
    const ciudadesDelEstado = medicos
      .filter(m => normalizarTexto(m.location_state) === normalizarTexto(selectedState))
      .map(m => m.location_city)
      .filter(Boolean)
    return Array.from(new Set(ciudadesDelEstado)).slice(0, 3)
  }

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setBusqueda(value)
    setUserTyped(true)
  }

  const handleBuscarClick = () => {
    setUserTyped(true)
  }

  const handleSugerenciaClick = (sugerencia: string) => {
    setBusqueda(sugerencia)
    setInputValue(sugerencia)
    setUserTyped(true)
    setShowSugerencias(false)
  }

  const [chips, setChips] = useState<FiltroChip[]>([
    {
      id: 'experiencia',
      label: 'Más experiencia',
      icon: <Clock size={16} />,
      tooltip: 'Muestra primero a los médicos con más años de ejercicio profesional',
      activo: false
    },
    {
      id: 'precio',
      label: 'Precio accesible',
      icon: <DollarSign size={16} />,
      tooltip: 'Ordena de menor a mayor costo de consulta',
      activo: false
    },
    {
      id: 'valorados',
      label: 'Mejor valorados',
      icon: <Star size={16} />,
      tooltip: 'Muestra primero a los médicos con mejores reseñas',
      activo: false
    },
    {
      id: 'ninos',
      label: 'Atiende niños',
      icon: <Baby size={16} />,
      tooltip: 'Muestra médicos que atienden pacientes pediátricos',
      activo: false
    },
    {
      id: 'disponibilidad',
      label: 'Disponibilidad',
      icon: <Calendar size={16} />,
      tooltip: 'Muestra médicos con horarios disponibles para agendar',
      activo: false
    }
  ])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        h1, h2, h3 { font-family: 'Fraunces', serif; }
        
        .tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: #1E3A5F;
          color: white;
          padding: 10px 14px;
          borderRadius: 8px;
          fontSize: 12px;
          width: 220px;
          zIndex: 100;
          marginBottom: 8px;
          boxShadow: 0 4px 12px rgba(0,0,0,0.15);
          text-align: center;
          line-height: 1.4;
        }
        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
          background: #1E3A5F;
          transform: translateX(-50%) rotate(45deg);
        }
        
        @media (min-width: 768px) {
          .desktop-only { display: flex !important; }
          .mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
      `}</style>

      {/* HEADER - Desktop */}
      <header className="desktop-only" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E5E7EB',
        zIndex: 1000
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: '16px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 40
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#1E3A5F' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: '#2A9D8F' }}>rama</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <Link href="/buscar" style={{ color: '#8B5CF6', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              Especialidades
            </Link>
            <Link href="/como-elegir-medico" style={{ color: '#4A5568', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              ¿Cómo elegir médico?
            </Link>
            <button
              onClick={() => setShowAyudaModal(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#4A5568',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 14,
                fontWeight: 500
              }}
            >
              <HelpCircle size={18} />
              Ayuda
            </button>
          </nav>

          <div ref={dropdownRef} className="doctor-dropdown" style={{ position: 'relative' }}>
            <button
              onClick={() => setDoctorDropdownOpen(!doctorDropdownOpen)}
              style={{
                background: 'linear-gradient(135deg, #1E3A5F 0%, #1A3254 100%)',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: 50,
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              Soy Médico
              <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: doctorDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {doctorDropdownOpen && (
              <div className="fade-in" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
                boxShadow: '0 10px 40px rgba(30, 58, 95, 0.15)',
                minWidth: 200,
                overflow: 'hidden',
                zIndex: 1001
              }}>
                <Link
                  href="/login"
                  onClick={() => setDoctorDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    color: '#1E3A5F',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    borderBottom: '1px solid #F3F4F6',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5F3FF'
                    e.currentTarget.style.color = '#8B5CF6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.color = '#1E3A5F'
                  }}
                >
                  <LogIn size={18} />
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  onClick={() => setDoctorDropdownOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    color: '#1E3A5F',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F5F3FF'
                    e.currentTarget.style.color = '#8B5CF6'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.color = '#1E3A5F'
                  }}
                >
                  <UserPlus size={18} />
                  Registrarme
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ paddingTop: 120, paddingBottom: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          
          {/* SEARCH BAR */}
          <div style={{ marginBottom: 40 }}>
            <div className="sugerencias-wrapper" style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              maxWidth: 1000,
              margin: '0 auto'
            }}>
              {/* Input de Especialidad con Autocomplete */}
              <div style={{ flex: '1 1 300px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Especialidad o médico..."
                  value={inputValue}
                  onChange={handleBusquedaChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleBuscarClick()
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '18px 140px 18px 24px',
                    borderRadius: 16,
                    border: '1.5px solid #2A9D8F',
                    fontSize: 15,
                    background: '#fff',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={handleBuscarClick}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#8B5CF6',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 20px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Search size={18} />
                  Buscar
                </button>
                
                {/* Dropdown de sugerencias - marginTop: 0 para que esté PEGADO */}
                {showSugerencias && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 0,
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: 300,
                    overflow: 'auto'
                  }}>
                    {sugerencias.map((sugerencia, index) => (
                      <button
                        key={index}
                        onClick={() => handleSugerenciaClick(sugerencia)}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          handleSugerenciaClick(sugerencia)
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          borderBottom: index < sugerencias.length - 1 ? '1px solid #F3F4F6' : 'none'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F5F3FF'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      >
                        {sugerencia}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector de Estado y Ciudad */}
              <StateCitySelector
                onStateChange={setSelectedState}
                onCityChange={setSelectedCity}
                initialState={selectedState}
                initialCity={selectedCity}
                ciudadesConMedicos={ciudadesConMedicos}
              />
            </div>
          </div>

          {/* CHIPS DE FILTROS */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 900,
              color: '#1E3A5F',
              marginBottom: 8,
              textAlign: 'center'
            }}>
              ¿Qué es lo más importante para ti?
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center' }}>
              Selecciona una o varias opciones para personalizar tu búsqueda
            </p>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              justifyContent: 'center',
              marginBottom: 20
            }}>
              {chips.map((chip) => (
                <div key={chip.id} style={{ position: 'relative' }}>
                  {!isMobile && (
                    <button
                      onMouseEnter={() => setActiveTooltip(chip.id)}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onClick={() => toggleFiltro(chip.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 20px',
                        borderRadius: 50,
                        border: chip.activo ? '2px solid #8B5CF6' : '1.5px solid #2A9D8F',
                        background: chip.activo ? '#F5F3FF' : '#fff',
                        color: chip.activo ? '#8B5CF6' : '#4A5568',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {chip.icon}
                      {chip.label}
                    </button>
                  )}

                  {isMobile && (
                    <button
                      onClick={() => toggleFiltro(chip.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 20px',
                        borderRadius: 50,
                        border: chip.activo ? '2px solid #8B5CF6' : '1.5px solid #2A9D8F',
                        background: chip.activo ? '#F5F3FF' : '#fff',
                        color: chip.activo ? '#8B5CF6' : '#4A5568',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {chip.icon}
                      {chip.label}
                      <Info 
                        size={14} 
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveTooltip(activeTooltip === chip.id ? null : chip.id)
                        }}
                        style={{ cursor: 'help', opacity: 0.6 }}
                      />
                    </button>
                  )}
                  
                  {activeTooltip === chip.id && (
                    <div className="tooltip">
                      {chip.tooltip}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filtros.length > 0 && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={limpiarFiltros}
                  style={{
                    background: 'none',
                    border: '1.5px solid #8B5CF6',
                    color: '#8B5CF6',
                    padding: '10px 24px',
                    borderRadius: 50,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* RESULTADOS */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 32
            }}>
              <h2 style={{
                fontSize: 36,
                fontWeight: 900,
                color: '#1E3A5F'
              }}>
                Especialistas Disponibles
              </h2>
              <span style={{
                fontSize: 14,
                color: '#6B7280',
                fontWeight: 600
              }}>
                {filteredMedicos.length} resultados
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  border: '3px solid #E8ECF3',
                  borderTopColor: '#8B5CF6',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 16px'
                }} />
                <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando médicos...</p>
              </div>
            ) : filteredMedicos.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 80,
                background: '#F9FAFB',
                borderRadius: 24
              }}>
                <p style={{ color: '#6B7280', fontSize: 16, marginBottom: 12 }}>
                  No se encontraron médicos con estos filtros
                </p>
                {selectedCity && getCiudadesCercanas().length > 0 && (
                  <p style={{ color: '#4A5568', fontSize: 14 }}>
                    Intenta buscar en: {getCiudadesCercanas().join(', ')}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {filteredMedicos.map((medico) => (
                  <article
                    key={medico.id}
                    style={{
                      background: '#fff',
                      borderRadius: 24,
                      padding: 28,
                      boxShadow: '0 4px 12px rgba(17, 28, 44, 0.06)',
                      border: '1px solid #2A9D8F',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(42, 157, 143, 0.15)'
                      e.currentTarget.style.borderColor = '#8B5CF6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(17, 28, 44, 0.06)'
                      e.currentTarget.style.borderColor = '#2A9D8F'
                    }}
                  >
                    <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
                      <div style={{
                        width: 100,
                        height: 100,
                        borderRadius: 20,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 36,
                        fontWeight: 900,
                        color: '#fff'
                      }}>
                        {medico.photo_url ? (
                          <img
                            src={medico.photo_url}
                            alt={medico.full_name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              filter: 'grayscale(100%)',
                              transition: 'filter 0.5s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.filter = 'grayscale(0%)'}
                            onMouseLeave={(e) => e.currentTarget.style.filter = 'grayscale(100%)'}
                          />
                        ) : (
                          (medico.full_name || '?')[0].toUpperCase()
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                          <div>
                            <h3 style={{
                              fontSize: 22,
                              fontWeight: 900,
                              color: '#1E3A5F',
                              marginBottom: 6
                            }}>
                              {medico.full_name}
                            </h3>
                            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 8 }}>
                              {medico.specialty}
                            </p>
                            
                            <button
                              onClick={() => setShowCedulaModal(medico.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                background: '#ECFDF5',
                                color: '#059669',
                                padding: '6px 14px',
                                borderRadius: 50,
                                fontSize: 12,
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              <Shield size={14} />
                              Cédula verificable
                              <Info size={12} style={{ opacity: 0.6 }} />
                            </button>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#F59E0B'
                          }}>
                            <Star size={18} fill="#F59E0B" />
                            <span style={{ fontWeight: 700, fontSize: 16 }}>4.9</span>
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 14,
                          color: '#6B7280',
                          marginTop: 12
                        }}>
                          <MapPin size={16} />
                          {medico.location_city}, {medico.location_state}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      background: '#F9FAFB',
                      borderRadius: 16,
                      padding: 20,
                      marginBottom: 20,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <p style={{
                          fontSize: 10,
                          color: '#6B7280',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: 6
                        }}>
                          Próxima disponibilidad
                        </p>
                        <p style={{
                          fontSize: 15,
                          color: '#1E3A5F',
                          fontWeight: 600
                        }}>
                          Hoy, 14:30 - 17:00
                        </p>
                      </div>

                      <div style={{ width: 1, height: 48, background: '#E5E7EB' }} />

                      <div style={{ textAlign: 'right' }}>
                        <p style={{
                          fontSize: 10,
                          color: '#6B7280',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: 6
                        }}>
                          Consulta
                        </p>
                        <p style={{
                          fontSize: 18,
                          color: '#1E3A5F',
                          fontWeight: 700
                        }}>
                          ${medico.consultation_price_general || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/doctor/${medico.id}`}
                      style={{
                        display: 'block',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                        color: '#fff',
                        padding: 18,
                        borderRadius: 16,
                        textAlign: 'center',
                        fontSize: 15,
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      Agendar Cita
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL CÉDULA VERIFICABLE */}
      {showCedulaModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 36,
            maxWidth: 500,
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowCedulaModal(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6B7280'
              }}
            >
              <X size={20} />
            </button>

            <div style={{
              width: 56,
              height: 56,
              background: '#F5F3FF',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <Shield size={28} color="#8B5CF6" />
            </div>

            <h3 style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#1E3A5F',
              marginBottom: 16
            }}>
              Cédula Verificable
            </h3>

            <p style={{
              fontSize: 14,
              color: '#6B7280',
              marginBottom: 24,
              lineHeight: 1.6
            }}>
              Puedes verificar credenciales en portales oficiales:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              <a
                href="https://www.gob.mx/cedulaprofesional"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#F9FAFB',
                  padding: 14,
                  borderRadius: 10,
                  color: '#1E3A5F',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                Ver en SEP (Secretaría de Educación)
              </a>
              <a
                href="https://www.conacem.org.mx/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#F9FAFB',
                  padding: 14,
                  borderRadius: 10,
                  color: '#1E3A5F',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                Ver en CONACEM (Consejo de Especialidades)
              </a>
            </div>

            <button
              onClick={() => setShowCedulaModal(null)}
              style={{
                width: '100%',
                padding: 14,
                background: '#1E3A5F',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL AYUDA */}
      {showAyudaModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 20
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: 36,
            maxWidth: 600,
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAyudaModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6B7280'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{
              fontSize: 26,
              fontWeight: 900,
              color: '#1E3A5F',
              marginBottom: 24
            }}>
              ¿Cómo elegir médico?
            </h3>

            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
                Usa los filtros para encontrar lo que necesitas:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 14 }}>
                  <Clock size={22} color="#8B5CF6" />
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                      Más experiencia
                    </h4>
                    <p style={{ fontSize: 14, color: '#6B7280' }}>
                      Médicos con más años de ejercicio profesional
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'start', gap: 14 }}>
                  <DollarSign size={22} color="#8B5CF6" />
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                      Precio accesible
                    </h4>
                    <p style={{ fontSize: 14, color: '#6B7280' }}>
                      Ordenado de menor a mayor costo
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'start', gap: 14 }}>
                  <Star size={22} color="#8B5CF6" />
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                      Mejor valorados
                    </h4>
                    <p style={{ fontSize: 14, color: '#6B7280' }}>
                      Mejores reseñas de pacientes
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'start', gap: 14 }}>
                  <Baby size={22} color="#8B5CF6" />
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                      Atiende niños
                    </h4>
                    <p style={{ fontSize: 14, color: '#6B7280' }}>
                      Especialistas en pediatría y pacientes menores de 18 años
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'start', gap: 14 }}>
                  <Calendar size={22} color="#8B5CF6" />
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                      Disponibilidad
                    </h4>
                    <p style={{ fontSize: 14, color: '#6B7280' }}>
                      Horarios disponibles para agendar
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAyudaModal(false)}
              style={{
                width: '100%',
                padding: 14,
                background: '#8B5CF6',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION - Mobile */}
      <BottomNav />
    </div>
  )
}