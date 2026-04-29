'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  MapPin, 
  Stethoscope, 
  Shield, 
  Star, 
  MessageCircle, 
  ChevronDown, 
  LogIn, 
  UserPlus, 
  HelpCircle 
} from 'lucide-react'
import { STATES } from '@/lib/locations'
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
  clinic_name: string | null
  consultation_price_general: number | null
  whatsapp_available: boolean
}

// Función para normalizar texto
const normalizarTexto = (texto: string): string => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function HomePage() {
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [especialidades, setEspecialidades] = useState<string[]>(ESPECIALIDADES_CONACEM)
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false)
  const [showAyudaModal, setShowAyudaModal] = useState(false)
  
  // Para autocomplete
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [showSugerencias, setShowSugerencias] = useState(false)
  const [userTyped, setUserTyped] = useState(false)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDoctorDropdownOpen(false)
      }
      // Cerrar sugerencias si click fuera
      if (!dropdownRef.current?.closest('.sugerencias-wrapper')) {
        setShowSugerencias(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        
        setEspecialidades([
          ...ESPECIALIDADES_CONACEM,
          ...extras.sort()
        ])
      } catch (error) {
        console.error('Error loading especialidades:', error)
      }
    }
    loadEspecialidades()
  }, [])

  useEffect(() => {
    async function loadMedicos() {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select(`
            id, full_name, specialty, photo_url, location_city, location_state,
            clinic_name, consultation_price_general, whatsapp_available
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(50)
        
        if (error) throw error
        setMedicos(data || [])
      } catch (error) {
        console.error('Error loading medicos:', error)
        setMedicos([])
      } finally {
        setLoading(false)
      }
    }
    loadMedicos()
  }, [])

  // Generar sugerencias
  useEffect(() => {
    if (inputValue.trim().length >= 2 && userTyped) {
      const busquedaLower = inputValue.toLowerCase()
      const sugerenciasFiltradas = especialidades
        .filter(esp => normalizarTexto(esp).includes(normalizarTexto(busquedaLower)))
        .slice(0, 8)
      setSugerencias(sugerenciasFiltradas)
      setShowSugerencias(sugerenciasFiltradas.length > 0)
    } else {
      setShowSugerencias(false)
    }
  }, [inputValue, especialidades, userTyped])

  const handleSearch = () => {
    const params = new URLSearchParams()
    // Usar inputValue (lo que está escrito) o selectedSpecialty (lo seleccionado)
    const especialidadFinal = selectedSpecialty || inputValue
    if (especialidadFinal) params.set('especialidad', especialidadFinal)
    if (selectedState) params.set('estado', selectedState)
    router.push(`/buscar?${params.toString()}`)
  }

  const handleSugerenciaClick = (sugerencia: string) => {
    setSelectedSpecialty(sugerencia)
    setInputValue(sugerencia)  // ✅ ACTUALIZAR EL INPUT
    setUserTyped(true)
    setShowSugerencias(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setSelectedSpecialty('')  // Limpiar selección si escribe
    setUserTyped(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Fraunces', serif; }
        
        .nav-link:hover { color: #8B5CF6; }
        
        .btn-violeta {
          background: #8B5CF6;
          color: white;
          border: none;
          transition: all 0.2s ease;
        }
        .btn-violeta:hover {
          background: #7C3AED;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
        }
        
        .chip:hover {
          background: #8B5CF6;
          color: white;
          border-color: #8B5CF6;
          transform: translateY(-2px);
        }
        
        .card-medico {
          transition: all 0.3s ease;
          border: 1px solid #2A9D8F;
        }
        .card-medico:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(42, 157, 143, 0.15);
          border-color: #8B5CF6;
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

      {/* HEADER */}
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
            <Link href="/buscar" className="nav-link" style={{ color: '#4A5568', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              Especialidades
            </Link>
            <Link href="/como-elegir-medico" className="nav-link" style={{ color: '#4A5568', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
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

      {/* MAIN */}
      <main style={{ paddingTop: 120, paddingBottom: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          
          {/* HERO */}
          <section className="fade-up" style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '60px 20px 40px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 900, color: '#1E3A5F' }}>Salu</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(48px, 10vw, 72px)', fontWeight: 600, color: '#2A9D8F' }}>rama</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(24px, 5vw, 40px)',
              fontWeight: 900,
              color: '#1E3A5F',
              marginBottom: 40,
              lineHeight: 1.2
            }}>
              Verifica credenciales y agenda con confianza
            </h1>

            {/* SEARCH BAR */}
            <div className="sugerencias-wrapper" style={{
              maxWidth: 800,
              margin: '0 auto 48px',
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap'
            }}>
              {/* Input Especialidad */}
              <div style={{ flex: '1 1 300px', position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Especialidad o médico..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
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
                  onClick={handleSearch}
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
                
                {/* Sugerencias */}
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
                          e.preventDefault()  // ✅ PREVENIR PÉRDIDA DE FOCO
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

              {/* Selector Estado */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  flex: '0 1 250px',
                  padding: '18px 24px',
                  borderRadius: 16,
                  border: '1.5px solid #2A9D8F',
                  fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  background: '#fff',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Todos los estados</option>
                {STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* Chips */}
            <div>
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                Especialidades más buscadas:
              </p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'center',
                maxWidth: 900,
                margin: '0 auto'
              }}>
                {ESPECIALIDADES_CONACEM.slice(0, 10).map((esp) => (
                  <button
                    key={esp}
                    onClick={() => {
                      const params = new URLSearchParams()
                      params.set('especialidad', esp)
                      if (selectedState) params.set('estado', selectedState)
                      router.push(`/buscar?${params.toString()}`)
                    }}
                    className="chip"
                    style={{
                      background: '#fff',
                      border: '1px solid #2A9D8F',
                      borderRadius: 50,
                      padding: '8px 16px',
                      fontSize: 13,
                      color: '#4A5568',
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif"
                    }}
                  >
                    {esp}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ESPECIALISTAS */}
          <section className="fade-up" style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '60px 20px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <div style={{ marginBottom: 40 }}>
              <h2 style={{
                fontSize: 'clamp(24px, 4vw, 36px)',
                fontWeight: 900,
                color: '#1E3A5F',
                marginBottom: 8
              }}>
                Nuestros especialistas
              </h2>
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
            ) : medicos.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 24
              }}>
                {medicos.map((medico) => (
                  <Link
                    key={medico.id}
                    href={`/doctor/${medico.id}`}
                    className="card-medico"
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: 20,
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16
                    }}
                  >
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {medico.photo_url ? (
                        <img
                          src={medico.photo_url}
                          alt={medico.full_name}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: 24,
                          color: '#fff'
                        }}>
                          {(medico.full_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                          {medico.full_name}
                        </h3>
                        <p style={{ fontSize: 14, color: '#6B7280' }}>{medico.specialty}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6B7280' }}>
                      <MapPin size={14} />
                      {medico.location_city}, {medico.location_state}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: '#F9FAFB',
                borderRadius: 16,
                border: '1px dashed #D1D5DB'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  background: '#F5F3FF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Stethoscope size={32} color="#8B5CF6" />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1E3A5F', marginBottom: 8 }}>
                  Aún no hay médicos registrados
                </h3>
                <p style={{ fontSize: 15, color: '#6B7280', maxWidth: 500, margin: '0 auto' }}>
                  Sé el primero en unirte a nuestra plataforma
                </p>
                <Link
                  href="/registro"
                  className="btn-violeta"
                  style={{
                    display: 'inline-block',
                    marginTop: 20,
                    padding: '12px 32px',
                    borderRadius: 50,
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Registrarme como médico
                </Link>
              </div>
            )}
          </section>

          {/* ¿POR QUÉ SALURAMA? */}
          <section className="fade-up" style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '60px 20px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <h2 style={{
                fontSize: 'clamp(24px, 4vw, 36px)',
                fontWeight: 900,
                color: '#1E3A5F',
                marginBottom: 8
              }}>
                ¿Por qué <span style={{ color: '#2A9D8F' }}>Salurama</span>?
              </h2>
              <p style={{ fontSize: 15, color: '#6B7280' }}>
                Herramientas para tomar decisiones informadas
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 32
            }}>
              <div className="card-medico" style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  background: '#F5F3FF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Shield size={32} color="#8B5CF6" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>
                  Verifica en SEP/CONACEM
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  Accede a portales oficiales para verificar credenciales antes de agendar
                </p>
              </div>

              <div className="card-medico" style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  background: '#FEF3C7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Star size={32} color="#F59E0B" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>
                  Reseñas de pacientes reales
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  Solo pacientes que agendaron cita pueden dejar reseñas verificadas
                </p>
              </div>

              <div className="card-medico" style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                textAlign: 'center'
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  background: '#ECFDF5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <MessageCircle size={32} color="#059669" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>
                  Contacto directo
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  Sin intermediarios, sin costos adicionales. Habla directo con el consultorio
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{
        background: '#1E3A5F',
        color: '#fff',
        padding: '60px 20px 40px',
        marginTop: 80
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 40,
          marginBottom: 40
        }}>
          <div>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#FFFFFF' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: '#2A9D8F' }}>rama</span>
            <p style={{ fontSize: 14, color: '#C5D0E0', marginTop: 16, lineHeight: 1.6 }}>
              Verifico, luego elijo. Herramientas para verificar credenciales antes de agendar.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#FFFFFF' }}>Plataforma</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/buscar" className="nav-link" style={{ color: '#C5D0E0', textDecoration: 'none', fontSize: 14 }}>Buscar médico</Link>
              <Link href="/como-elegir-medico" className="nav-link" style={{ color: '#C5D0E0', textDecoration: 'none', fontSize: 14 }}>¿Cómo elegir médico?</Link>
              <Link href="/registro" className="nav-link" style={{ color: '#C5D0E0', textDecoration: 'none', fontSize: 14 }}>Soy Médico</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#FFFFFF' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href="/terminos-y-condiciones" className="nav-link" style={{ color: '#C5D0E0', textDecoration: 'none', fontSize: 14 }}>Términos y condiciones</Link>
              <Link href="/politica-de-cookies" className="nav-link" style={{ color: '#C5D0E0', textDecoration: 'none', fontSize: 14 }}>Política de cookies</Link>
              <Link href="/aviso-de-privacidad" className="nav-link" style={{ color: '#C5D0E0', textDecoration: 'none', fontSize: 14 }}>Aviso de privacidad</Link>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#FFFFFF' }}>Contacto</h4>
            <p style={{ fontSize: 14, color: '#C5D0E0', marginBottom: 8 }}>
              ¿Tienes dudas? Escríbenos:
            </p>
            <a href="mailto:hola@salurama.com" className="nav-link" style={{ color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              hola@salurama.com
            </a>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: 24,
          textAlign: 'center',
          fontSize: 13,
          color: '#9CA3AF'
        }}>
          © 2026 Salurama. Todos los derechos reservados.
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}