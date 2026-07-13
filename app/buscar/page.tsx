'use client'

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Clock, DollarSign, Star, Baby, Calendar, MapPin, Shield,
  X, Navigation, GraduationCap, Globe, Loader2, Filter,
} from 'lucide-react'
import { STATES, getStateLabel } from '@/lib/locations'
import BottomNav from '@/components/BottomNav'

export const dynamic = 'force-dynamic'

// ─── Constantes ────────────────────────────────────────────────────────────────

const ESPECIALIDADES_CONACEM: string[] = [
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

const CHIPS_CONFIG = [
  { id: 'cerca', label: 'Cerca de mí', icon: <Navigation size={15} />, tooltip: 'Usa tu ubicación para mostrar médicos más cercanos primero' },
  { id: 'experiencia', label: 'Más experiencia', icon: <Clock size={15} />, tooltip: 'Muestra primero a los médicos con más años de ejercicio profesional' },
  { id: 'precio', label: 'Precio accesible', icon: <DollarSign size={15} />, tooltip: 'Ordena de menor a mayor costo de consulta' },
  { id: 'valorados', label: 'Mejor valorados', icon: <Star size={15} />, tooltip: 'Muestra primero a los médicos con mejores reseñas' },
  { id: 'ninos', label: 'Atiende niños', icon: <Baby size={15} />, tooltip: 'Muestra médicos que atienden pacientes pediátricos' },
  { id: 'disponibilidad', label: 'Disponibilidad', icon: <Calendar size={15} />, tooltip: 'Muestra médicos con horarios disponibles' },
] as const

type FiltroId = typeof CHIPS_CONFIG[number]['id']

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Medico {
  id: string
  slug: string | null
  full_name: string
  specialty: string
  photo_url: string | null
  ciudad: string | null
  estado: string | null
  consultation_price_general: number | null
  years_experience: number | null
  min_patient_age: number | null
  max_patient_age: number | null
  clinic_lat: number | null
  clinic_lng: number | null
  distance?: number
  hospital_affiliation: string | null
  languages: string | null
  insurance_accepted: string | null
  professional_license: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const norm = (t: string | null | undefined): string =>
  t ? t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : ''

const haversine = (la1: number, lo1: number, la2: number, lo2: number): number => {
  const R = 6371
  const dL = (la2 - la1) * Math.PI / 180
  const dO = (lo2 - lo1) * Math.PI / 180
  const a = Math.sin(dL / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dO / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─── Estilos globales ──────────────────────────────────────────────────────────

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,900&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  h1, h2, h3, h4 { font-family: 'Fraunces', serif; }
  body { font-family: 'DM Sans', sans-serif; }

  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes shimmer { 0% { background-position: -600px 0 } 100% { background-position: 600px 0 } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }

.fade-up { animation: fadeUp 0.4s ease-out both }
.fade-in { animation: fadeIn 0.25s ease-out both }
.scale-in { animation: scaleIn 0.25s ease-out both }
.delay-1 { animation-delay: 0.06s }
.delay-2 { animation-delay: 0.12s }
.delay-3 { animation-delay: 0.18s }

  /* ── Search input ── */
.buscar-input {
    width: 100%;
    padding: 18px 48px 18px 48px;
    border-radius: 16px;
    border: 1.5px solid #2A9D8F;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    color: #111827;
    outline: none;
    transition: border-color .18s, box-shadow .18s;
    box-shadow: 0 2px 8px rgba(42,157,143,.08);
  }
.buscar-input::placeholder { color: #9CA3AF; }
.buscar-input:focus {
    border-color: #8B5CF6;
    box-shadow: 0 0 3px rgba(139,92,246,.12), 0 2px 8px rgba(42,157,143,.08);
  }

  /* ── Chip filtro ── */
.chip-filtro {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 50px;
    border: 1.5px solid #2A9D8F;
    background: #fff;
    color: #4A5568;
    font-size: 13.5px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
.chip-filtro:hover {
    border-color: #8B5CF6;
    background: #F5F3FF;
    color: #7C3AED;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(139,92,246,.12);
  }
.chip-filtro.activo {
    background: #8B5CF6;
    border-color: #8B5CF6;
    color: #fff;
    box-shadow: 0 4px 14px rgba(139,92,246,.35);
  }
.chip-filtro:disabled {
    opacity:.6;
    cursor: not-allowed;
    transform: none;
  }

  /* ── Card médico ── */
.card-medico {
    background: #fff;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(17,28,44,.06);
    border: 1px solid #E5E7EB;
    transition: border-color .2s, box-shadow .2s, transform .2s;
    cursor: pointer;
  }
.card-medico:hover {
    border-color: #C4B5FD;
    box-shadow: 0 8px 28px rgba(139,92,246,.1), 0 2px 8px rgba(17,28,44,.06);
    transform: translateY(-2px);
  }

  /* ── Skeleton ── */
.skeleton {
    background: linear-gradient(90deg, #F1F5F9 25%, #E8EFF5 50%, #F1F5F9 75%);
    background-size: 600px 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 10px;
  }

  /* ── Tag badge ── */
.tag-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
    background: #F3F4F6;
    color: #4B5563;
  }

  /* ── Tooltip ── */
.tooltip-burbuja {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: #1E3A5F;
    color: #fff;
    padding: 8px 13px;
    border-radius: 9px;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    width: min(210px, 85vw);
    max-width: 210px;
    z-index: 9999;
    box-shadow: 0 6px 20px rgba(0,0,0,.18);
    text-align: center;
    line-height: 1.45;
    pointer-events: none;
    white-space: normal;
  }
.tooltip-burbuja::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 8px;
    height: 8px;
    background: #1E3A5F;
    margin-top: -4px;
  }

  /* ── Sugerencias dropdown ── */
.sugerencia-item {
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    border-bottom: 1px solid #F3F4F6;
    text-align: left;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background .12s;
  }
.sugerencia-item:last-child { border-bottom: none; }
.sugerencia-item:hover { background: #F5F3FF; color: #7C3AED; }

  /* ── Botón Ver perfil ── */
.btn-ver-perfil {
    background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
    color: #fff;
    padding: 10px 18px;
    border-radius: 12px;
    text-decoration: none;
    font-size: 13.5px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: opacity .15s, transform .15s, box-shadow .15s;
    box-shadow: 0 2px 8px rgba(139,92,246,.3);
  }
.btn-ver-perfil:hover {
    opacity:.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(139,92,246,.4);
  }

  /* ── Botón mapa ── */
.btn-mapa {
    padding: 10px 14px;
    background: #fff;
    border: 1.5px solid #E5E7EB;
    color: #4B5563;
    border-radius: 12px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13.5px;
    transition: border-color .15s, background .15s;
  }
.btn-mapa:hover {
    border-color: #2A9D8F;
    background: #F0FDFA;
    color: #2A9D8F;
  }

  /* ── Modal overlay ── */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
    animation: fadeIn .2s ease-out;
    backdrop-filter: blur(3px);
  }

  @media (max-width: 640px) {
.buscar-input { padding: 16px 16px 16px 44px; font-size: 14px; }
.card-footer-btns { flex-direction: column; gap: 8px; }
.card-footer-btns a,.card-footer-btns button { justify-content: center; width: 100%; }
  }
`

// ─── Componente principal ──────────────────────────────────────────────────────

function BuscarContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Data
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(true)

  // Búsqueda
  const [busqueda, setBusqueda] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [sugerencias, setSugerencias] = useState<string[]>([])
  const [showSugerencias,setShowSugerencias]= useState(false)

  // Ubicación / filtros
  const [selectedState, setSelectedState] = useState('')
  const [filtros, setFiltros] = useState<FiltroId[]>([])
  const [userLocation, setUserLocation] = useState<{lat:number;lng:number}|null>(null)
  const [locating, setLocating] = useState(false)

  // UI
  const [activeTooltip, setActiveTooltip] = useState<string|null>(null)
  const [showMapModal, setShowMapModal] = useState<Medico|null>(null)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const sugerenciasRef = useRef<HTMLDivElement>(null)

  // ── Cerrar sugerencias al clic fuera ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(e.target as Node))
        setShowSugerencias(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Cerrar modal con Escape ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowMapModal(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Params URL ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const esp = searchParams.get('especialidad')
    const est = searchParams.get('estado')
    if (esp) { setBusqueda(esp); setInputValue(esp) }
    if (est) setSelectedState(est)
  }, [searchParams])

  // ── Carga de médicos ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    supabase
      .from('doctors')
      .select(`id, slug, full_name, specialty, photo_url, ciudad, estado,
             consultation_price_general, years_experience, min_patient_age, max_patient_age,
             clinic_lat, clinic_lng, hospital_affiliation, languages, insurance_accepted, professional_license`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!error && data) {
          setMedicos(data)
        }
        setLoading(false)
      })
  }, [])

  // ── Sugerencias con debounce 200ms (DB + fallback CONACEM) ──────────────────
  useEffect(() => {
    if (inputValue.trim().length < 2) { setShowSugerencias(false); return }

    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('doctors')
          .select('specialty')
          .ilike('specialty', `%${inputValue.trim()}%`)
          .eq('is_active', true)
          .not('specialty', 'is', null)
          .limit(50)
          .abortSignal(controller.signal)

        const dbMatches = data
          ? (Array.from(new Set(data.map(d => d.specialty).filter(Boolean))) as string[])
          : []
        const conacemMatches = ESPECIALIDADES_CONACEM.filter(e => norm(e).includes(norm(inputValue)))
        const merged = Array.from(new Set([...conacemMatches,...dbMatches])).slice(0, 9)

        setSugerencias(merged)
        setShowSugerencias(merged.length > 0)
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error(e)
      }
    }, 200)

    return () => { clearTimeout(t); controller.abort() }
  }, [inputValue])

  // ── Filtrado con useMemo ─────────────────────────────────────────────────────
  const filteredMedicos = useMemo(() => {
    let r = [...medicos]

    if (busqueda.trim()) {
      const t = norm(busqueda)
      r = r.filter(m => norm(m.full_name).includes(t) || norm(m.specialty).includes(t))
    }
    if (selectedState) { 
      const s = norm(selectedState); 
      r = r.filter(m => m.estado && norm(m.estado).includes(s)) 
    }

    if (filtros.includes('ninos')) {
      r = r.filter(m => {
        const s = norm(m.specialty)
        return s.includes('pediatr') || s.includes('neonat') || s.includes('infantil') || (m.min_patient_age ?? 0) < 18
      })
    }

    if (filtros.includes('cerca') && userLocation) {
      r = r
        .map(m => ({
          ...m,
          distance: (m.clinic_lat !== null && m.clinic_lng !== null)
            ? haversine(userLocation.lat, userLocation.lng, m.clinic_lat, m.clinic_lng)
            : 9999,
        }))
        .sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999))
    } else if (filtros.includes('experiencia')) {
      r.sort((a, b) => (b.years_experience ?? 0) - (a.years_experience ?? 0))
    } else if (filtros.includes('precio')) {
      r.sort((a, b) => (a.consultation_price_general ?? 99999) - (b.consultation_price_general ?? 99999))
    }

    return r
  }, [medicos, busqueda, selectedState, filtros, userLocation])

  // ── Toggle filtro ─────────────────────────────────────────────────────────────
  const toggleFiltro = useCallback(async (id: FiltroId) => {
    if (filtros.includes(id)) {
      setFiltros(prev => prev.filter(f => f !== id))
      if (id === 'cerca') setUserLocation(null)
      return
    }

    if (id === 'cerca') {
      if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización')
        return
      }
      setLocating(true)
      const timeoutId = setTimeout(() => setLocating(false), 10000)

      navigator.geolocation.getCurrentPosition(
        async pos => {
          clearTimeout(timeoutId)
          const userLat = pos.coords.latitude
          const userLng = pos.coords.longitude

          setUserLocation({ lat: userLat, lng: userLng })

          // Llamar a la función de Supabase para búsqueda por proximidad
          try {
            const { data, error } = await supabase.rpc('nearby_doctors', {
              user_lat: userLat,
              user_lng: userLng,
              radius_km: 50
            })

            if (!error && data) {
              setMedicos(data)
            }
          } catch (err) {
            console.error('Error buscando doctores cercanos:', err)
          }

          setFiltros(prev => [...prev.filter(f => f !== 'precio' && f !== 'experiencia'), 'cerca'])
          setLocating(false)
        },
        (err) => {
          clearTimeout(timeoutId)
          setLocating(false)
          const msg = err.code === 1 ? 'Permiso denegado. Activa la ubicación en tu navegador.' : 'No pudimos obtener tu ubicación'
          alert(msg)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      )
      return
    }

    setFiltros(prev => [...prev.filter(f => f !== 'cerca'), id])
  }, [filtros])

  // ── Limpiar todo — sin reload ─────────────────────────────────────────────────
  const limpiarFiltros = useCallback(() => {
    setFiltros([])
    setUserLocation(null)
    setBusqueda('')
    setInputValue('')
    setSelectedState('')
  }, [])

  const hayFiltros = filtros.length > 0 || busqueda || selectedState

  // Función para navegar al perfil preservando búsqueda
  const navigateToDoctor = useCallback((doctorSlugOrId: string) => {
    const params = new URLSearchParams()
    if (busqueda) params.set('from', 'buscar')
    if (busqueda) params.set('q', busqueda)
    if (selectedState) params.set('estado', selectedState)

    const queryString = params.toString()
    router.push(`/doctor/${doctorSlugOrId}${queryString ? `?${queryString}` : ''}`)
  }, [busqueda, selectedState, router])

  const handleSearch = useCallback(() => {
    setBusqueda(inputValue)
    setShowSugerencias(false)
  }, [inputValue])

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{PAGE_STYLES}</style>

      <main style={{ paddingTop: 120, paddingBottom: 100 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

          {/* ── BARRA DE BÚSQUEDA ─────────────────────────────────────────── */}
          <div className="fade-up" style={{ marginBottom: 40, position: 'relative', zIndex: 100 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', maxWidth: 1000, margin: '0 auto', alignItems: 'stretch' }}>

              {/* Input + sugerencias */}
              <div ref={sugerenciasRef} style={{ flex: '1 1 400px', position: 'relative', minWidth: 280, zIndex: 1000 }}>
                <Search
                  size={18}
                  style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none', zIndex: 2 }}
                />
                <input
                  type="text"
                  placeholder="Especialidad o médico..."
                  value={inputValue}
                  onChange={e => { setInputValue(e.target.value); setBusqueda(e.target.value) }}
                  onFocus={() => inputValue.length >= 2 && setShowSugerencias(true)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') setShowSugerencias(false)
                    if (e.key === 'Enter') handleSearch()
                  }}
                  className="buscar-input"
                />

                {/* Dropdown de sugerencias */}
                {showSugerencias && sugerencias.length > 0 && (
                  <div className="scale-in" style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                    background: '#fff', borderRadius: 14,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 12px 36px rgba(0,0,0,.12)',
                    zIndex: 100, overflow: 'hidden',
                  }}>
                    {sugerencias.map((s, i) => (
                      <button
                        key={i}
                        className="sugerencia-item"
                        onMouseDown={e => { e.preventDefault(); setBusqueda(s); setInputValue(s); setShowSugerencias(false) }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Search size={12} color="#8B5CF6" />
                        </div>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selector estado - COMPACTO 200px */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  height: 56,
                  width: '100%',
                  maxWidth: 200,
                  padding: '0 36px 0 16px',
                  borderRadius: 16,
                  border: '1.5px solid #2A9D8F',
                  background: '#fff',
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#374151',
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px',
                  boxShadow: '0 2px 8px rgba(42,157,143,.08)',
                  flexShrink: 0,
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#8B5CF6'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,.12), 0 2px 8px rgba(42,157,143,.08)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#2A9D8F'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(42,157,143,.08)'
                }}
              >
                <option value="">Todos los estados</option>
                {STATES.map(state => (
                  <option key={state} value={state}>
                    {getStateLabel(state)}
                  </option>
                ))}
              </select>

              {/* Botón buscar */}
              <button
                onClick={handleSearch}
                style={{
                  height: 56,
                  padding: '0 28px',
                  background: '#8B5CF6',
                  border: 'none',
                  borderRadius: 16,
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background .15s, transform .15s',
                  boxShadow: '0 2px 8px rgba(139,92,246,.3)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#7C3AED'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#8B5CF6'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <Search size={18} /> Buscar
              </button>
            </div>
          </div>

          {/* ── CHIPS DE FILTRO ────────────────────────────────────────────── */}
          <div className="fade-up delay-1" style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1E3A5F', marginBottom: 6, textAlign: 'center' }}>
              ¿Qué es lo más importante para ti?
            </h2>
            <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 24, textAlign: 'center' }}>
              Selecciona una o varias opciones
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              {CHIPS_CONFIG.map(chip => (
                <div key={chip.id} style={{ position: 'relative' }}
                  onMouseEnter={() => setActiveTooltip(chip.id)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <button
                    className={`chip-filtro${filtros.includes(chip.id) ? ' activo' : ''}`}
                    onClick={() => toggleFiltro(chip.id)}
                    disabled={chip.id === 'cerca' && locating}
                    aria-pressed={filtros.includes(chip.id)}
                  >
                    {chip.id === 'cerca' && locating
                      ? <Loader2 size={15} style={{ animation: 'spin .7s linear infinite' }} />
                      : chip.icon
                    }
                    {chip.label}
                  </button>
                  {activeTooltip === chip.id && (
                    <div className="tooltip-burbuja">{chip.tooltip}</div>
                  )}
                </div>
              ))}
            </div>

            {userLocation && filtros.includes('cerca') && (
              <div style={{
                textAlign: 'center', marginTop: 12, fontSize: 12, color: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}>
                <Navigation size={12} /> Usando tu ubicación actual
              </div>
            )}

            {/* Limpiar filtros — sólo visible si hay algo activo */}
            {hayFiltros && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  onClick={limpiarFiltros}
                  style={{
                    background: 'none', border: '1.5px solid #8B5CF6', color: '#8B5CF6',
                    padding: '9px 24px', borderRadius: 50, fontSize: 13.5, fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    transition: 'background .15s, color .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#8B5CF6'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#8B5CF6' }}
                >
                  <X size={14} /> Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* ── RESULTADOS ─────────────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#1E3A5F' }}>
                Especialistas Disponibles
              </h2>
              {!loading && (
                <span style={{
                  fontSize: 13, color: '#6B7280', fontWeight: 600,
                  background: '#F3F4F6', padding: '5px 12px', borderRadius: 99,
                }}>
                  {filteredMedicos.length} resultado{filteredMedicos.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* ── Skeleton ── */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ background: '#fff', borderRadius: 20, padding: 20, border: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 16, flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="skeleton" style={{ height: 18, width: '50%' }} />
                        <div className="skeleton" style={{ height: 13, width: '30%' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div className="skeleton" style={{ height: 22, width: 90 }} />
                          <div className="skeleton" style={{ height: 22, width: 70 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Sin resultados ── */}
            {!loading && filteredMedicos.length === 0 && (
              <div className="fade-in" style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 24, border: '1px solid #E5E7EB' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Filter size={28} color="#9CA3AF" />
                </div>
                <p style={{ color: '#374151', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                  {medicos.length === 0 ? 'Pronto habrá especialistas aquí' : 'Sin resultados para tu búsqueda'}
                </p>
                <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 20, maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.6 }}>
                  {medicos.length === 0
                    ? 'Estamos incorporando médicos verificados. Si eres médico, únete ahora sin costo.'
                    : 'Intenta con otra especialidad o quita algún filtro.'}
                </p>
                {hayFiltros && (
                  <button
                    onClick={limpiarFiltros}
                    style={{
                      background: '#1E3A5F', color: '#fff', border: 'none',
                      borderRadius: 12, padding: '11px 24px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}

            {/* ── Lista de médicos ── */}
            {!loading && filteredMedicos.length > 0 && (
              <div className="fade-up delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredMedicos.map(medico => (
                  <article
                    key={medico.id}
                    className="card-medico"
                    onClick={() => navigateToDoctor(medico.slug ?? medico.id)}
                  >
                    <div style={{ display: 'flex', gap: 16 }}>

                      {/* Avatar */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{
                          width: 80, height: 80, borderRadius: 16, overflow: 'hidden',
                          background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 28, fontWeight: 900, color: '#fff',
                        }}>
                          {medico.photo_url
                            ? <img src={medico.photo_url} alt={medico.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (medico.full_name || '?')[0].toUpperCase()
                          }
                        </div>
                        {/* Badge cédula sobre avatar */}
                        {medico.professional_license && (
                          <div style={{
                            position: 'absolute', bottom: -4, right: -4,
                            width: 22, height: 22, borderRadius: '50%',
                            background: '#10B981', border: '2px solid #fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                            title="Consulta cédula profesional"
                          >
                            <Shield size={11} color="#fff" />
                          </div>
                        )}
                      </div>

                      {/* Datos */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{
                              fontSize: 17, fontWeight: 900, color: '#1E3A5F',
                              marginBottom: 3, lineHeight: 1.2,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {medico.full_name}
                            </h3>
                            <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 8 }}>
                              {medico.specialty}
                            </p>
                          </div>
                          {/* Rating placeholder */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            flexShrink: 0, background: '#FFFBEB',
                            borderRadius: 8, padding: '4px 8px',
                            border: '1px solid #FDE68A',
                          }}>
                            <Star size={13} color="#F59E0B" fill="#F59E0B" />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Nuevo</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {medico.years_experience && (
                            <span className="tag-badge">
                              <Clock size={11} /> {medico.years_experience} años exp.
                            </span>
                          )}
                          {medico.languages && (
                            <span className="tag-badge">
                              <Globe size={11} />
                              {Array.isArray(medico.languages)
                                ? medico.languages[0]
                                : String(medico.languages).split(',')[0].trim()
                              }
                            </span>
                          )}
                          {medico.distance !== undefined && medico.distance < 9999 && (
                            <span className="tag-badge" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                              <Navigation size={11} /> {medico.distance.toFixed(1)} km
                            </span>
                          )}
                          {medico.professional_license && (
                            <span className="tag-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
                              <Shield size={11} /> Consulta cédula
                            </span>
                          )}
                        </div>

                        {/* Ubicación + hospital */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, fontSize: 12.5, color: '#6B7280' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={13} color="#9CA3AF" />
                            {medico.ciudad && medico.estado 
                              ? `${medico.ciudad}, ${medico.estado}`
                              : medico.ciudad || medico.estado || 'Ubicación no disponible'}
                          </span>
                          {medico.hospital_affiliation && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                              <GraduationCap size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                                {medico.hospital_affiliation}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer card */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 16, paddingTop: 14,
                      borderTop: '1px solid #F3F4F6',
                      gap: 12, flexWrap: 'wrap',
                    }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
                          Consulta desde
                        </p>
                        <p style={{ fontSize: 18, color: '#1E3A5F', fontWeight: 900, lineHeight: 1 }}>
                          {medico.consultation_price_general
                            ? <>${medico.consultation_price_general.toLocaleString('es-MX')} <span style={{ fontSize: 12, fontWeight: 400, color: '#6B7280' }}>MXN</span></>
                            : <span style={{ fontSize: 14, color: '#9CA3AF' }}>Consultar precio</span>
                          }
                        </p>
                      </div>

                      <div className="card-footer-btns" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn-mapa"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMapModal(medico)
                          }}
                          aria-label={`Ver ubicación de ${medico.full_name} en mapa`}
                        >
                          <MapPin size={15} /> Mapa
                        </button>
                        <Link
                          href={`/doctor/${medico.slug ?? medico.id}`}
                          className="btn-ver-perfil"
                          onClick={(e) => e.stopPropagation()}
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

{/* ── MODAL MAPA ─────────────────────────────────────────────────────── */}
      {showMapModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowMapModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Ubicación de ${showMapModal.full_name}`}
        >
          <div
            className="scale-in"
            style={{
              background: '#fff', borderRadius: 20,
              width: '100%', maxWidth: 900, height: '85vh',
              position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header limpio */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: 16, fontWeight: 800, color: '#1E3A5F',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  margin: 0,
                }}>
                  {showMapModal.full_name}
                </h3>
                <p style={{ 
                  fontSize: 12, color: '#6B7280', margin: '2px 0 0',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {showMapModal.ciudad && showMapModal.estado 
                    ? `${showMapModal.ciudad}, ${showMapModal.estado}`
                    : showMapModal.ciudad || showMapModal.estado || 'Ubicación no disponible'}
                </p>
              </div>
              <button
                onClick={() => setShowMapModal(null)}
                aria-label="Cerrar"
                style={{
                  background: '#F3F4F6', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <X size={18} color="#4B5563" />
              </button>
            </div>

            {/* Mapa */}
            <div style={{ flex: 1 }}>
              <iframe
                src={showMapModal.clinic_lat && showMapModal.clinic_lng
                  ? `https://www.openstreetmap.org/export/embed.html?bbox=${Number(showMapModal.clinic_lng) - 0.005},${Number(showMapModal.clinic_lat) - 0.005},${Number(showMapModal.clinic_lng) + 0.005},${Number(showMapModal.clinic_lat) + 0.005}&layer=mapnik&marker=${showMapModal.clinic_lat},${showMapModal.clinic_lng}`
                  : `https://www.openstreetmap.org/export/embed.html?bbox=-99.2,19.3,-99.0,19.5&layer=mapnik`
                }
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                title={`Mapa de ${showMapModal.full_name}`}
              />
            </div>

            {/* Botón sticky abajo */}
            <div style={{
              padding: '12px 16px', background: '#fff',
              borderTop: '1px solid #E5E7EB',
            }}>
              <button
                onClick={() => {
                  setShowMapModal(null)
                  setTimeout(() => setShowActionSheet(true), 150)
                }}
                style={{
                  width: '100%', padding: '14px',
                  background: '#2A9D8F', color: 'white',
                  border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer',
                }}
              >
                <Navigation size={18} /> Cómo llegar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet */}
      {showActionSheet && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end',
          }}
          onClick={() => setShowActionSheet(false)}
        >
          <div
            style={{
              background: '#fff', width: '100%', maxWidth: 500, margin: '0 auto',
              borderRadius: '20px 20px 0 0', padding: '20px 16px 24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 16px' }}>Abrir con</h4>
            
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${showMapModal?.clinic_lat},${showMapModal?.clinic_lng}`} target="_blank" onClick={() => setShowActionSheet(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:'#F9FAFB',borderRadius:12,textDecoration:'none',color:'#1F2937',fontWeight:600,marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:8,background:'#4285F4',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>→</div>Google Maps
            </a>
            
            <a href={`https://waze.com/ul?ll=${showMapModal?.clinic_lat},${showMapModal?.clinic_lng}&navigate=yes`} target="_blank" onClick={() => setShowActionSheet(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:'#F9FAFB',borderRadius:12,textDecoration:'none',color:'#1F2937',fontWeight:600,marginBottom:8}}>
              <div style={{width:32,height:32,borderRadius:8,background:'#33CCFF',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>→</div>Waze
            </a>
            
            <a href={`http://maps.apple.com/?daddr=${showMapModal?.clinic_lat},${showMapModal?.clinic_lng}`} target="_blank" onClick={() => setShowActionSheet(false)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:'#F9FAFB',borderRadius:12,textDecoration:'none',color:'#1F2937',fontWeight:600,marginBottom:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:'#000',display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>→</div>Apple Maps
            </a>
            
            <button onClick={() => setShowActionSheet(false)} style={{width:'100%',padding:'14px',background:'#F3F4F6',border:'none',borderRadius:12,fontWeight:600,color:'#4B5563',cursor:'pointer'}}>Cancelar</button>
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
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} color="#1E3A5F" style={{ animation: 'spin .8s linear infinite' }} />
      </div>
    }>
      <BuscarContent />
    </Suspense>
  )
}