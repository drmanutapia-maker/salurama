'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, MapPin, Star, Clock, Info, X, Copy, Check } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

if (typeof window !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
}

// 🧠 DICCIONARIO DE BÚSQUEDA INTELIGENTE
const DICCIONARIO_MEDICO: Record<string, string[]> = {
  'hematologia': ['hematólogo', 'hematologa', 'hematologo', 'sangre', 'hematología'],
  'neumologia': ['neumólogo', 'neumologa', 'neumologo', 'pulmón', 'pulmon', 'respiratorio', 'neumología'],
  'ginecologia': ['ginecólogo', 'ginecologa', 'ginecologo', 'mujer', 'ginecología'],
  'cardiologia': ['cardiólogo', 'cardiologa', 'cardiologo', 'corazón', 'corazon', 'cardio', 'cardiología'],
  'dermatologia': ['dermatólogo', 'dermatologa', 'dermatologo', 'piel', 'dermatología'],
  'pediatria': ['pediatra', 'niños', 'ninos', 'niño', 'niña', 'pediatría'],
  'traumatologia': ['traumatólogo', 'traumatologa', 'traumatologo', 'huesos', 'traumatología'],
  'oftalmologia': ['oftalmólogo', 'oftalmologa', 'oftalmologo', 'ojos', 'vista', 'oftalmología'],
  'gastroenterologia': ['gastroenterólogo', 'gastroenterologa', 'gastroenterologo', 'estómago', 'digestivo', 'gastroenterología'],
  'endocrinologia': ['endocrinólogo', 'endocrinologa', 'endocrinologo', 'diabetes', 'hormonas', 'endocrinología'],
  'neurologia': ['neurólogo', 'neurologa', 'neurologo', 'cerebro', 'neurología'],
  'psiquiatria': ['psiquiatra', 'mente', 'mental', 'psiquiatría'],
  'oncologia': ['oncólogo', 'oncologa', 'oncologo', 'cáncer', 'cancer', 'tumor', 'oncología'],
  'urologia': ['urólogo', 'urologa', 'urologo', 'riñón', 'rinon', 'urología'],
  'ortopedia': ['ortopedista', 'ortopedico', 'ortopédico', 'huesos', 'fracturas'],
  'otorrinolaringologia': ['otorrino', 'oído', 'oido', 'nariz', 'garganta', 'otorrinolaringología'],
  'anestesiologia': ['anestesiólogo', 'anestesiologa', 'anestesiologo', 'anestesia', 'anestesiología'],
  'cirugia general': ['cirujano', 'cirujana', 'operación', 'operacion', 'quirúrgico'],
  'medicina interna': ['internista', 'adultos', 'medicina interna'],
  'medicina familiar': ['médico familiar', 'medico familiar', 'familia', 'general'],
  'nutriologia': ['nutriólogo', 'nutriologa', 'nutriologo', 'nutricionista', 'dietista', 'nutriología'],
  'geriatria': ['geriatra', 'adulto mayor', 'tercera edad', 'geriatría'],
  'nefrologia': ['nefrólogo', 'nefrologa', 'nefrologo', 'riñones', 'nefrología'],
  'reumatologia': ['reumatólogo', 'reumatologa', 'reumatologo', 'articulaciones', 'reumatología'],
  'infectologia': ['infectólogo', 'infectologa', 'infectologo', 'infecciones', 'infectología'],
  'angiologia': ['angiólogo', 'angiologa', 'angiologo', 'vasos sanguíneos', 'angiología'],
  'cirugia plastica': ['cirujano plástico', 'cirugia estética', 'estética', 'plástico'],
  'cirugia cardiovascular': ['cirujano cardiovascular', 'corazón', 'cardiovascular'],
}

// 🎯 PRIORIDADES CON TOOLTIPS
const PRIORIDADES = [
  {
    label: 'Cerca de mí',
    value: 'ubicacion',
    icon: MapPin,
    tooltip: 'Ordena los médicos por distancia desde tu ubicación actual'
  },
  {
    label: 'Más experiencia',
    value: 'experiencia',
    icon: Clock,
    tooltip: 'Muestra primero a los médicos con más años de ejercicio profesional'
  },
  {
    label: 'Alta especialidad',
    value: 'especialidad',
    icon: Star,
    tooltip: 'Filtra médicos con subespecialidad o certificación vigente'
  },
  {
    label: 'Precio accesible',
    value: 'precio',
    icon: Star,
    tooltip: 'Ordena de menor a mayor costo de consulta'
  },
  {
    label: 'Mejor valorados',
    value: 'resenas',
    icon: Star,
    tooltip: 'Muestra primero a los médicos con mejores reseñas'
  },
  {
    label: 'Atiende niños',
    value: 'atiende_ninos',
    icon: Star,
    tooltip: 'Muestra médicos que atienden pacientes pediátricos'
  },
]

const COORDS: Record<string, [number, number]> = {
  'Ciudad de México': [-99.1332, 19.4326],
  'Guadalajara': [-103.3496, 20.6597],
  'Monterrey': [-100.3161, 25.6866],
  'Puebla': [-98.2063, 19.0414],
  'Toluca': [-99.6557, 19.2826],
  'Cancún': [-86.8515, 21.1619],
  'Mérida': [-89.5926, 20.9674],
}

interface Medico {
  id: string
  full_name: string
  specialty: string
  sub_specialty: string | null
  location_city: string
  consultation_price: number
  professional_license: string | null
  photo_url: string | null
  rating_avg: number
  rating_count: number
  latitude: number | null
  longitude: number | null
  years_experience: number | null
  atiende_ninos: boolean
}

interface Filtros {
  q: string
  especialidad: string
  ciudad: string
  precio_max: string
}

// Componente Tooltip
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  
  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1A1A2E',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.5,
          maxWidth: 220,
          textAlign: 'center',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          animation: 'fadeUp 0.2s ease-out'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1A1A2E'
          }} />
        </div>
      )}
    </div>
  )
}

// Calcular distancia entre dos coordenadas (km)
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return Math.round(R * c * 10) / 10
}

function BuscarContent() {
  // 🔄 RESET SCROLL AL MONTAR LA PÁGINA
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0)
    }
  }, [])

  const searchParams = useSearchParams()
  const mapRefD = useRef<HTMLDivElement>(null)
  const mapRefM = useRef<HTMLDivElement>(null)
  const mapD = useRef<mapboxgl.Map | null>(null)
  const mapM = useRef<mapboxgl.Map | null>(null)
  const mrkD = useRef<mapboxgl.Marker[]>([])
  const mrkM = useRef<mapboxgl.Marker[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [filtros, setFiltros] = useState<Filtros>({ q: '', especialidad: '', ciudad: '', precio_max: '' })
  const [prioridades, setPrioridades] = useState<string[]>([])
  const [tooltipAbierto, setTooltipAbierto] = useState<string | null>(null)
  const [copiedLicense, setCopiedLicense] = useState<string | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const q = searchParams.get('q') || ''
    const esp = searchParams.get('especialidad') || ''
    const ciudad = searchParams.get('ciudad') || ''
    const p = searchParams.get('p') || ''
    
    const init: Filtros = { q, especialidad: esp, ciudad, precio_max: '' }
    setFiltros(init)
    
    if (p) setPrioridades(p.split(','))
  }, [searchParams])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFiltrosOpen(false)
      }
      if (tooltipAbierto) setTooltipAbierto(null)
    }
    
    if (filtrosOpen || tooltipAbierto) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filtrosOpen, tooltipAbierto])

  // Obtener ubicación del usuario si selecciona "Cerca de mí"
  useEffect(() => {
    if (prioridades.includes('ubicacion') && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => console.log('No se pudo obtener ubicación')
      )
    }
  }, [prioridades])

  const normalizarTexto = (texto: string) => {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  }

  const buscarEspecialidadInteligente = (query: string): string => {
    const normalized = normalizarTexto(query)
    for (const [especialidad, sinonimos] of Object.entries(DICCIONARIO_MEDICO)) {
      if (sinonimos.some(s => normalizarTexto(s) === normalized || normalized.includes(normalizarTexto(s)))) {
        return especialidad
      }
    }
    return query
  }

  const addMarkers = useCallback((
    data: Medico[],
    ciudad: string,
    mapRef: React.MutableRefObject<mapboxgl.Map | null>,
    mrkRef: React.MutableRefObject<mapboxgl.Marker[]>
  ) => {
    if (!mapRef.current) return
    
    mrkRef.current.forEach(m => m.remove())
    mrkRef.current = []
    
    const withCoords = data.filter(m => m.latitude && m.longitude)
    
    if (withCoords.length === 0) {
      const c = COORDS[ciudad] || [-99.1332, 19.4326]
      mapRef.current.flyTo({ center: c, zoom: 11, duration: 800 })
      return
    }
    
    withCoords.forEach(medico => {
      const el = document.createElement('div')
      el.style.cssText = 'width:34px;height:34px;border-radius:50%;background:#3730A3;border:2.5px solid #fff;box-shadow:0 3px 10px rgba(55,48,163,0.35);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13px;font-family:serif;transition:transform 0.2s;'
      el.textContent = (medico.full_name || '?')[0].toUpperCase()
      el.onmouseenter = () => { el.style.transform = 'scale(1.2)' }
      el.onmouseleave = () => { el.style.transform = 'scale(1)' }
      
      const popup = new mapboxgl.Popup({ offset: 18, closeButton: false, maxWidth: '240px' })
        .setHTML(
          '<div style="font-family:sans-serif;padding:10px">' +
          '<p style="font-weight:900;font-size:14px;color:#1A1A2E;margin:0 0 2px">' + medico.full_name + '</p>' +
          '<p style="font-size:12px;color:#4F46E5;font-weight:600;margin:0 0 7px">' + medico.specialty + '</p>' +
          '<a href="/doctor/' + medico.id + '" style="display:inline-block;background:#3730A3;color:#fff;font-size:11px;padding:4px 12px;border-radius:20px;text-decoration:none;font-weight:600">Ver perfil</a>' +
          '</div>'
        )
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([medico.longitude!, medico.latitude!])
        .setPopup(popup)
        .addTo(mapRef.current!)
      
      el.addEventListener('click', () => { setSel(medico.id); marker.togglePopup() })
      mrkRef.current.push(marker)
    })
    
    const bounds = withCoords.reduce(
      (b, m) => b.extend([m.longitude!, m.latitude!]),
      new mapboxgl.LngLatBounds(
        [withCoords[0].longitude!, withCoords[0].latitude!],
        [withCoords[0].longitude!, withCoords[0].latitude!]
      )
    )
    
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 })
  }, [])

  const buscar = useCallback(async (f: Filtros) => {
    setLoading(true)
    try {
      let q = supabase.from('doctors').select('*', { count: 'exact' }).eq('is_active', true)
      
      // 🧠 BÚSQUEDA INTELIGENTE
      if (f.q) {
        const especialidadInteligente = buscarEspecialidadInteligente(f.q)
        const terminosBusqueda = [f.q, especialidadInteligente].filter(Boolean)
        
        q = q.or(
          terminosBusqueda.map(t =>
            `full_name.ilike.%${t}%,specialty.ilike.%${t}%,sub_specialty.ilike.%${t}%,description.ilike.%${t}%`
          ).join(',')
        )
      }
      
      if (f.especialidad) q = q.ilike('specialty', '%' + f.especialidad + '%')
      if (f.ciudad)       q = q.ilike('location_city', '%' + f.ciudad + '%')
      if (f.precio_max)   q = q.lte('consultation_price', parseFloat(f.precio_max))
      
      // 🎯 ORDENAR POR PRIORIDADES
      if (prioridades.includes('experiencia')) {
        q = q.order('years_experience', { ascending: false, nullsLast: true })
      } else if (prioridades.includes('resenas')) {
        q = q.order('rating_avg', { ascending: false, nullsLast: true })
      } else if (prioridades.includes('precio')) {
        q = q.order('consultation_price', { ascending: true })
      } else if (prioridades.includes('atiende_ninos')) {
        q = q.eq('atiende_ninos', true)
      } else {
        q = q.order('rating_avg', { ascending: false, nullsLast: true })
      }
      
      q = q.limit(50)
      
      const { data, count } = await q
      
      const unique = Array.from(
        new Map((data || []).map((m: Medico) => [m.id, m])).values()
      ) as Medico[]
      
      setMedicos(unique)
      setTotal(count || 0)
      
      addMarkers(unique, f.ciudad, mapD, mrkD)
      addMarkers(unique, f.ciudad, mapM, mrkM)
    } catch (e) {
      console.error(e)
      setMedicos([])
    } finally {
      setLoading(false)
    }
  }, [addMarkers, prioridades])

  useEffect(() => {
    const t = setTimeout(() => buscar(filtros), 300)
    return () => clearTimeout(t)
  }, [filtros, buscar])

  const initMap = useCallback((
    container: HTMLDivElement,
    mapRef: React.MutableRefObject<mapboxgl.Map | null>
  ) => {
    if (!mapboxgl.accessToken || mapRef.current) return
    
    try {
      mapRef.current = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-99.1332, 19.4326],
        zoom: 11
      })
      
      mapRef.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      mapRef.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false
      }), 'top-right')
    } catch (error) {
      console.error('Error inicializando mapa:', error)
    }
  }, [])

  useEffect(() => {
    if (!isMobile && mapRefD.current) initMap(mapRefD.current, mapD)
  }, [isMobile, initMap])

  useEffect(() => {
    if (isMobile && vista === 'mapa' && mapRefM.current) initMap(mapRefM.current, mapM)
  }, [isMobile, vista, initMap])

  const limpiar = () => {
    const l: Filtros = { q: '', especialidad: '', ciudad: '', precio_max: '' }
    setFiltros(l)
    setPrioridades([])
  }

  const togglePrioridad = (value: string) => {
    setPrioridades(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const handleCopyLicense = async (license: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(license)
      setCopiedLicense(license)
      setTimeout(() => setCopiedLicense(null), 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  const MedicoCard = ({ m }: { m: Medico }) => {
    const distancia = userLocation && m.latitude && m.longitude 
      ? calcularDistancia(userLocation.lat, userLocation.lng, m.latitude, m.longitude)
      : null

    return (
      <Link
        href={'/doctor/' + m.id}
        style={{ 
          display: 'block', 
          padding: '16px', 
          background: '#fff', 
          borderRadius: 12, 
          textDecoration: 'none', 
          color: 'inherit', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
          border: sel === m.id ? '2px solid #3730A3' : '1.5px solid #F3F4F6', 
          marginBottom: 10, 
          transition: 'all 0.18s' 
        }}
        onMouseEnter={() => setSel(m.id)}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {/* Foto */}
          {m.photo_url ? (
            <img 
              src={m.photo_url} 
              alt={m.full_name} 
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #EEF2FF' }} 
            />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#3730A3,#F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24, color: '#fff', flexShrink: 0 }}>
              {(m.full_name || '?')[0].toUpperCase()}
            </div>
          )}
          
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Nombre */}
            <p style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px', fontFamily: "'Fraunces', serif" }}>
              {m.full_name}
            </p>
            
            {/* Especialidad + Subespecialidad */}
            <p style={{ fontSize: 14, color: '#4F46E5', fontWeight: 600, margin: '0 0 8px' }}>
              {m.specialty}
              {m.sub_specialty && <span style={{ color: '#6B7280', fontWeight: 400 }}> · {m.sub_specialty}</span>}
            </p>
            
            {/* Cédula + Botón Copiar + Link SEP */}
            {m.professional_license && (
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>
                  📋 Cédula: {m.professional_license}
                </span>
                <button
                  onClick={(e) => handleCopyLicense(m.professional_license!, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    background: copiedLicense === m.professional_license ? '#DCFCE7' : '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    borderRadius: 4,
                    padding: '2px 8px',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: copiedLicense === m.professional_license ? '#059669' : '#3730A3',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                  title="Copiar número de cédula"
                >
                  {copiedLicense === m.professional_license ? (
                    <><Check size={10} /> Copiado</>
                  ) : (
                    <><Copy size={10} /> Copiar</>
                  )}
                </button>
                <a
                  href="https://www.cedulaprofesional.sep.gob.mx/cedula/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 12,
                    color: '#3730A3',
                    textDecoration: 'underline',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  Verificar en SEP →
                </a>
              </div>
            )}
            
            {/* Precio · Ubicación · Distancia · Rating · Atiende niños */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 }}>
              {m.consultation_price > 0 && (
                <span style={{ color: '#F4623A', fontWeight: 700 }}>
                  ${m.consultation_price.toLocaleString('es-MX')} MXN
                </span>
              )}
              
              {m.location_city && (
                <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} />
                  {m.location_city}
                </span>
              )}
              
              {distancia && (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  📍 {distancia} km
                </span>
              )}
              
              {(m.rating_avg || 0) > 0 && (
                <span style={{ color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
                  <Star size={13} fill="#F59E0B" color="#F59E0B" />
                  {m.rating_avg.toFixed(1)}
                  <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({m.rating_count})</span>
                </span>
              )}
              
              {m.atiende_ninos && (
                <span style={{ 
                  background: '#DCFCE7', 
                  color: '#059669', 
                  padding: '2px 8px', 
                  borderRadius: 12, 
                  fontSize: 11, 
                  fontWeight: 600 
                }}>
                  👶 Acepta niños
                </span>
              )}
            </div>
            
            {/* Años de experiencia (si es relevante) */}
            {m.years_experience && m.years_experience >= 5 && (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                {m.years_experience} años de experiencia
              </p>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', background: '#F9FAFB' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.18s ease-out; }
        .sbar { 
          flex:1; 
          padding:8px 48px 8px 14px; 
          border:1.5px solid #E5E7EB; 
          border-radius:50px; 
          font-size:14px; 
          font-family:'DM Sans',sans-serif; 
          color:#1A1A2E; 
          outline:none; 
          background:#fff; 
          transition:all 0.2s; 
          min-width:0; 
        }
        .sbar:focus { border-color:#3730A3; box-shadow:0 0 0 3px #3730A314; }
        .priority-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 16px; border-radius: 50px;
          border: 1.5px solid #E5E7EB; background: #fff;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; cursor: pointer; transition: all 0.25s;
          font-weight: 500; position: relative;
        }
        .priority-chip:hover { border-color: #3730A3; background: #EEF2FF; color: #3730A3; transform: translateY(-2px); }
        .priority-chip.active {
          border-color: #3730A3;
          background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
          color: #3730A3;
          box-shadow: 0 2px 8px #3730A322;
        }
        .priority-chip.active::after {
          content: '✓';
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          animation: fadeUp 0.2s ease-out;
        }
        .tab-mv { flex:1; padding:9px; border:none; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; min-height:44px; }
        .tab-mv.on { background:#3730A3; color:#fff; }
        .tab-mv.off { background:#fff; color:#6B7280; border:1.5px solid #E5E7EB; }
      `}</style>

      {/* 🔍 BARRA DE BÚSQUEDA - Más pequeña, a la izquierda, lupa a la derecha */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #E5E7EB',
        padding: '16px',
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto'
        }}>
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            maxWidth: 450,
            margin: '0 auto'
          }}>
            <input
              type="text"
              className="sbar"
              placeholder="Buscar por especialidad, síntoma o nombre..."
              value={filtros.q}
              onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
              style={{ width: '100%' }}
            />
            {/* X para limpiar a la derecha */}
            {filtros.q && (
              <button
                onClick={() => setFiltros({ ...filtros, q: '' })}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: '#9CA3AF'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 SECCIÓN DE PRIORIDADES */}
      <section style={{
        background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)',
        padding: '24px 16px',
        borderBottom: '1px solid #E5E7EB',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          {/* PREGUNTA CON COLORES OFICIALES */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(20px, 5vw, 26px)',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #3730A3 0%, #F4623A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 8
            }}>
              ¿Qué es lo más importante para ti?
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 400 }}>
              Selecciona una o varias opciones para personalizar tu búsqueda
            </p>
          </div>
          
          {/* CHIPS CON TOOLTIPS */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            maxWidth: 750,
            margin: '0 auto'
          }}>
            {PRIORIDADES.map(p => {
              const active = prioridades.includes(p.value)
              return (
                <Tooltip key={p.value} text={p.tooltip}>
                  <button
                    onClick={() => togglePrioridad(p.value)}
                    className={'priority-chip' + (active ? ' active' : '')}
                    style={{ cursor: 'help' }}
                  >
                    <p.icon size={14} />
                    {p.label}
                    <Info size={12} color={active ? '#3730A3' : '#9CA3AF'} style={{ marginLeft: 4 }} />
                  </button>
                </Tooltip>
              )
            })}
          </div>
          
          {/* MENSAJE DE CONFIRMACIÓN */}
          {prioridades.length > 0 && (
            <p style={{
              fontSize: 13,
              color: '#3730A3',
              marginTop: 16,
              fontWeight: 600,
              animation: 'fadeUp 0.3s ease-out'
            }}>
              ✓ Buscando por: {prioridades.map(p => PRIORIDADES.find(pr => pr.value === p)?.label).join(', ')}
            </p>
          )}
        </div>
      </section>

      {/* TABS MÓVIL */}
      {isMobile && (
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '10px 16px', gap: 8 }}>
          <button className={'tab-mv ' + (vista === 'lista' ? 'on' : 'off')} onClick={() => setVista('lista')}>
            📋 Lista ({total})
          </button>
          <button className={'tab-mv ' + (vista === 'mapa' ? 'on' : 'off')} onClick={() => setVista('mapa')}>
            🗺 Mapa
          </button>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* LISTA */}
        <div style={{ 
          width: isMobile ? '100%' : '60%', 
          overflowY: 'auto', 
          display: isMobile && vista === 'mapa' ? 'none' : 'flex', 
          flexDirection: 'column', 
          background: '#F9FAFB',
          padding: '12px'
        }}>
          {/* Contador */}
          <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 8, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
              {loading ? 'Buscando...' : total + ' especialista' + (total !== 1 ? 's' : '') + ' encontrado' + (total !== 1 ? 's' : '')}
            </p>
          </div>
          
          {/* Cards */}
          <div>
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: 16, marginBottom: 10, background: '#fff', borderRadius: 12 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 16, background: '#F3F4F6', borderRadius: 4, marginBottom: 8, width: '60%' }} />
                    <div style={{ height: 13, background: '#F3F4F6', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              ))
            ) : medicos.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
                <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 8 }}>Sin resultados</p>
                <p style={{ fontSize: 14, color: '#9CA3AF' }}>Intenta con otra especialidad o ciudad</p>
              </div>
            ) : (
              medicos.map(m => <MedicoCard key={m.id} m={m} />)
            )}
          </div>
        </div>

        {/* MAPA DESKTOP - 40% */}
        {!isMobile && (
          <div style={{ width: '40%', position: 'relative', background: '#F3F4F6', flexShrink: 0, borderLeft: '1px solid #E5E7EB' }}>
            <div ref={mapRefD} style={{ width: '100%', height: '100%' }} />
          </div>
        )}

        {/* MAPA MÓVIL - Fullscreen */}
        {isMobile && vista === 'mapa' && (
          <div style={{ width: '100%', flex: 1 }}>
            <div ref={mapRefM} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function BuscarPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <BuscarContent />
    </Suspense>
  )
}