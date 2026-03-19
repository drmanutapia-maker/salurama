'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Search, MapPin, Filter, X, ChevronDown, CheckCircle, Star, Clock } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// ✅ ESPECIALIDADES COMPLETAS
const ESPECIALIDADES = [
  'Alergología', 'Anestesiología', 'Angiología', 'Cardiología',
  'Cirugía Cardiovascular', 'Cirugía General', 'Cirugía Plástica', 'Dermatología',
  'Endocrinología', 'Gastroenterología', 'Geriatría', 'Ginecología y Obstetricia',
  'Hematología', 'Infectología', 'Medicina Familiar', 'Medicina Física y Rehabilitación',
  'Medicina Interna', 'Nefrología', 'Neumología', 'Neurología',
  'Neurocirugía', 'Nutriología', 'Oftalmología', 'Oncología',
  'Ortopedia y Traumatología', 'Otorrinolaringología', 'Pediatría', 'Psiquiatría',
  'Radiología', 'Reumatología', 'Urología', 'Otra especialidad'
]

// ✅ 32 ESTADOS DE MÉXICO
const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'México', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León',
  'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala',
  'Veracruz', 'Yucatán', 'Zacatecas'
]

// ✅ CIUDADES POR ESTADO
const CIUDADES_POR_ESTADO: Record<string, string[]> = {
  'Aguascalientes': ['Aguascalientes', 'Calvillo', 'Rincón de Romos'],
  'Baja California': ['Tijuana', 'Mexicali', 'Ensenada', 'Playas de Rosarito', 'Tecate'],
  'Baja California Sur': ['La Paz', 'Los Cabos', 'Loreto', 'Comondú'],
  'Campeche': ['Campeche', 'Ciudad del Carmen', 'Champotón'],
  'Chiapas': ['Tuxtla Gutiérrez', 'Tapachula', 'San Cristóbal de las Casas', 'Comitán'],
  'Chihuahua': ['Chihuahua', 'Ciudad Juárez', 'Delicias', 'Cuauhtémoc', 'Parral'],
  'Ciudad de México': ['Ciudad de México'],
  'Coahuila': ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras', 'Acuña'],
  'Colima': ['Colima', 'Manzanillo', 'Tecomán', 'Villa de Álvarez'],
  'Durango': ['Durango', 'Gómez Palacio', 'Lerdo', 'Santiago Papasquiaro'],
  'Guanajuato': ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato', 'Silao'],
  'Guerrero': ['Acapulco', 'Chilpancingo', 'Iguala', 'Taxco', 'Zihuatanejo'],
  'Hidalgo': ['Pachuca', 'Tulancingo', 'Huejutla', 'Ixmiquilpan'],
  'Jalisco': ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta', 'Tlajomulco'],
  'México': ['Toluca', 'Ecatepec', 'Nezahualcóyotl', 'Naucalpan', 'Tlalnepantla', 'Cuautitlán Izcalli'],
  'Michoacán': ['Morelia', 'Uruapan', 'Zamora', 'Lázaro Cárdenas', 'Apatzingán'],
  'Morelos': ['Cuernavaca', 'Jiutepec', 'Temixco', 'Cuautla'],
  'Nayarit': ['Tepic', 'Bahía de Banderas', 'Santiago Ixcuintla'],
  'Nuevo León': ['Monterrey', 'Guadalupe', 'San Nicolás de los Garza', 'Apodaca', 'Santa Catarina', 'San Pedro Garza García'],
  'Oaxaca': ['Oaxaca de Juárez', 'Salina Cruz', 'Tuxtepec', 'Juchitán'],
  'Puebla': ['Puebla', 'Tehuacán', 'San Martín Texmelucan', 'Atlixco', 'Cholula'],
  'Querétaro': ['Querétaro', 'San Juan del Río', 'Corregidora', 'El Marqués'],
  'Quintana Roo': ['Cancún', 'Playa del Carmen', 'Chetumal', 'Cozumel', 'Tulum'],
  'San Luis Potosí': ['San Luis Potosí', 'Soledad de Graciano Sánchez', 'Ciudad Valles', 'Matehuala'],
  'Sinaloa': ['Culiacán', 'Mazatlán', 'Los Mochis', 'Guasave', 'Guamúchil'],
  'Sonora': ['Hermosillo', 'Ciudad Obregón', 'Nogales', 'San Luis Río Colorado', 'Navojoa'],
  'Tabasco': ['Villahermosa', 'Cárdenas', 'Comalcalco', 'Huimanguillo'],
  'Tamaulipas': ['Ciudad Victoria', 'Reynosa', 'Matamoros', 'Tampico', 'Nuevo Laredo', 'Madero'],
  'Tlaxcala': ['Tlaxcala', 'Huamantla', 'Apizaco', 'Chiautempan'],
  'Veracruz': ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Poza Rica', 'Córdoba', 'Orizaba', 'Minatitlán'],
  'Yucatán': ['Mérida', 'Valladolid', 'Tizimín', 'Progreso', 'Ticul'],
  'Zacatecas': ['Zacatecas', 'Fresnillo', 'Guadalupe', 'Jerez']
}

const COORDS_CIUDADES: Record<string, [number, number]> = {
  'Ciudad de México': [-99.1332, 19.4326],
  'Guadalajara': [-103.3496, 20.6597],
  'Monterrey': [-100.3161, 25.6866],
  'Puebla': [-98.2063, 19.0414],
  'Tijuana': [-117.0382, 32.5149],
  'Toluca': [-99.6557, 19.2826],
  'Querétaro': [-100.3899, 20.5888],
  'Cancún': [-86.8515, 21.1619],
  'Mérida': [-89.5926, 20.9674],
  'León': [-101.6869, 21.1221],
}

const HORARIOS_DISPONIBLES: Record<string, string[]> = {
  'monday': ['09:00', '10:00', '11:00', '16:00', '17:00'],
  'tuesday': ['10:00', '12:00', '17:00', '18:00'],
  'wednesday': ['09:00', '11:00', '16:00'],
  'thursday': ['10:00', '13:00', '17:00'],
  'friday': ['09:00', '11:00', '15:00'],
}

interface Medico {
  id: string
  full_name: string
  specialty: string
  location_city: string
  location_neighborhood: string
  address: string
  consultation_price: number
  phone: string
  license_verified: boolean
  photo_url: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  rating_avg: number
  rating_count: number
}

export default function BuscarPage() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [vistaMovil, setVistaMovil] = useState<'lista' | 'mapa'>('lista')
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [medicoSeleccionado, setMedicoSeleccionado] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(true)
  const [mapError, setMapError] = useState(false)

  const [filtros, setFiltros] = useState({
    q: '',
    especialidad: '',
    estado: '',
    ciudad: '',
    precio_max: '',
  })
  const [filtrosTmp, setFiltrosTmp] = useState({ ...filtros })
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([])

  // ✅ 1. FUNCIÓN BUSCAR (DEFINIDA PRIMERO)
  const buscar = useCallback(async (f: typeof filtros) => {
    setLoading(true)
    try {
      let query = supabase
        .from('doctors')
        .select('*', { count: 'exact' })
        .eq('is_active', true)

      if (f.q) {
        query = query.or(
          `full_name.ilike.%${f.q}%,specialty.ilike.%${f.q}%,description.ilike.%${f.q}%`
        )
      }
      if (f.especialidad) {
        query = query.ilike('specialty', `%${f.especialidad}%`)
      }
      if (f.ciudad) {
        query = query.ilike('location_city', `%${f.ciudad}%`)
      }
      if (f.precio_max) {
        query = query.lte('consultation_price', parseFloat(f.precio_max))
      }

      query = query
        .eq('license_verified', true)
        .order('rating_avg', { ascending: false })
        .limit(50)

      const { data, count } = await query
      setMedicos(data || [])
      setTotalCount(count || 0)
      
      if (map.current) {
        actualizarMapa(data || [], f.ciudad)
      }
    } catch (error) {
      console.error('Error buscando:', error)
      setMedicos([])
    } finally {
      setLoading(false)
    }
  }, [])

  // ✅ 2. FUNCIÓN ACTUALIZAR MAPA
  function actualizarMapa(data: Medico[], ciudad: string) {
    if (!map.current) return
    
    markers.current.forEach(m => m.remove())
    markers.current = []

    const coords = data
      .filter(m => m.latitude && m.longitude)
      .map(m => [m.longitude!, m.latitude!] as [number, number])

    if (coords.length === 0) {
      const center = COORDS_CIUDADES[ciudad] || [-99.1332, 19.4326]
      map.current.flyTo({ center, zoom: 12, duration: 1000 })
      return
    }

    data.forEach((medico) => {
      if (!medico.latitude || !medico.longitude) return

      const el = document.createElement('div')
      el.style.cssText = `
        width:40px;height:40px;border-radius:50%;
        background:linear-gradient(135deg, #3730A3 0%, #F4623A 100%);
        border:3px solid #fff;
        box-shadow:0 4px 12px rgba(55,48,163,0.4);
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        color:#fff;font-weight:900;font-size:14px;font-family:'Fraunces',serif;
        transition:transform 0.2s;
      `
      el.textContent = (medico.full_name || '?')[0].toUpperCase()
      el.onmouseenter = () => { el.style.transform = 'scale(1.25)' }
      el.onmouseleave = () => { el.style.transform = 'scale(1)' }

      const popupContent = `
        <div style="font-family:'DM Sans',sans-serif;padding:8px;max-width:280px">
          <p style="font-family:'Fraunces',serif;font-weight:900;font-size:16px;color:#1A1A2E;margin:0 0 4px">${medico.full_name}</p>
          <p style="font-size:13px;color:#4F46E5;font-weight:600;margin:0 0 8px">${medico.specialty}</p>
          ${medico.consultation_price > 0 ? `<p style="font-size:13px;color:#6B7280;margin:0 0 8px">$${medico.consultation_price.toLocaleString('es-MX')} MXN</p>` : ''}
          <a href="/doctor/${medico.id}" style="display:inline-block;background:#3730A3;color:#fff;font-size:13px;padding:6px 16px;border-radius:20px;text-decoration:none;font-weight:600">Ver perfil</a>
        </div>
      `

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false, maxWidth: '300px' })
        .setHTML(popupContent)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([medico.longitude, medico.latitude])
        .setPopup(popup)
        .addTo(map.current!)

      el.addEventListener('click', () => {
        setMedicoSeleccionado(medico.id)
        marker.togglePopup()
      })

      markers.current.push(marker)
    })

    if (coords.length > 0) {
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      )
      map.current.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 1000 })
    }
  }

  // ✅ 3. USEEFFECTS (AHORA SÍ PUEDEN USAR `buscar`)
  useEffect(() => {
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  useEffect(() => {
    if (filtrosTmp.estado && CIUDADES_POR_ESTADO[filtrosTmp.estado]) {
      setCiudadesDisponibles(CIUDADES_POR_ESTADO[filtrosTmp.estado])
      if (!CIUDADES_POR_ESTADO[filtrosTmp.estado].includes(filtrosTmp.ciudad)) {
        setFiltrosTmp(f => ({ ...f, ciudad: '' }))
      }
    } else {
      setCiudadesDisponibles([])
    }
  }, [filtrosTmp.estado, filtrosTmp.ciudad])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q') || ''
    const especialidad = params.get('especialidad') || ''
    const ciudad = params.get('ciudad') || ''
    
    const nuevosFiltros = { q, especialidad, estado: '', ciudad, precio_max: '' }
    setFiltros(nuevosFiltros)
    setFiltrosTmp(nuevosFiltros)
  }, [])

  // ✅ BÚSQUEDA EN TIEMPO REAL
  useEffect(() => {
    const timer = setTimeout(() => {
      buscar(filtros)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [filtros, buscar])

  // ✅ INICIALIZAR MAPA
  useEffect(() => {
    if (!mapboxgl.accessToken) {
      console.error('⚠️ Mapbox token no configurado')
      setMapError(true)
      return
    }
    
    if (!mapContainer.current || map.current) return
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-99.1332, 19.4326],
        zoom: 12,
      })
      
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
      map.current.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }), 'top-right')
    } catch (error) {
      console.error('Error inicializando mapa:', error)
      setMapError(true)
    }
  }, [])

  function aplicarFiltros() {
    setFiltros({ ...filtrosTmp })
    setFiltrosAbiertos(false)
  }

  function limpiarFiltros() {
    const limpio = { q: '', especialidad: '', estado: '', ciudad: '', precio_max: '' }
    setFiltrosTmp(limpio)
    setFiltros(limpio)
    setFiltrosAbiertos(false)
  }

  function getDiasDisponibles() {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const hoy = new Date()
    const resultado = []
    
    for (let i = 0; i < 3; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() + i)
      const diaNombre = dias[fecha.getDay()]
      
      if (HORARIOS_DISPONIBLES[diaNombre]) {
        resultado.push({
          nombre: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1),
          fecha: fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
          diaKey: diaNombre,
        })
      }
    }
    return resultado
  }
    const filtrosActivos = Object.entries(filtros).filter(([k, v]) => v && k !== 'q').length
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', background: '#FAFAFA' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .search-bar {
          flex: 1; padding: 12px 18px; border: 2px solid #E5E7EB;
          border-radius: 50px; font-size: 15px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; outline: none; background: #fff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-bar:focus { border-color: #3730A3; box-shadow: 0 0 0 4px #3730A314; }
        .search-bar::placeholder { color: #9CA3AF; }

        .field-sm {
          width: 100%; padding: 10px 14px; border: 1.5px solid #E5E7EB;
          border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif;
          color: #1A1A2E; outline: none; background: #fff;
          transition: border-color 0.18s;
        }
        .field-sm:focus { border-color: #3730A3; }

        select.field-sm {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px;
        }

        .medico-card {
          padding: 20px; background: #fff; border-radius: 16px;
          cursor: pointer; transition: all 0.2s; display: block; 
          text-decoration: none; color: inherit;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          border: 1px solid #F3F4F6;
        }
        .medico-card:hover { 
          box-shadow: 0 8px 24px rgba(55,48,163,0.12);
          transform: translateY(-2px);
          border-color: #3730A344;
        }
        .medico-card.selected { 
          background: #EEF2FF; 
          border: 2px solid #3730A3;
        }

        .avatar-md {
          width: 64px; height: 64px; border-radius: 50%;
          background: linear-gradient(135deg, #3730A3 0%, #F4623A 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Fraunces', serif; font-size: 24px; font-weight: 900;
          color: #fff; flex-shrink: 0; box-shadow: 0 4px 12px rgba(55,48,163,0.2);
        }

        .badge { display: inline-flex; align-items: center; gap: 4px; background: #EEF2FF; color: #3730A3; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
        .badge-coral { background: #FFF0EB; color: #F4623A; }
        .badge-verificado { background: #DCFCE7; color: #059669; }

        .btn-tab { padding: 10px 24px; border-radius: 50px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.18s; }
        .btn-tab.active { background: #3730A3; color: #fff; box-shadow: 0 4px 12px rgba(55,48,163,0.3); }
        .btn-tab.inactive { background: #F3F4F6; color: #6B7280; }

        .filter-panel {
          position: absolute; top: 100%; right: 0; z-index: 100;
          background: #fff; border: 1px solid #E5E7EB; border-radius: 16px;
          box-shadow: 0 12px 48px rgba(0,0,0,0.15); padding: 24px; margin-top: 8px;
          width: 420px;
        }

        .mapboxgl-popup-content { 
          border-radius: 12px !important; 
          padding: 0 !important; 
          box-shadow: 0 8px 32px rgba(0,0,0,0.15) !important;
          overflow: hidden;
        }

        .horario-slot {
          padding: 6px 12px;
          background: #fff;
          border: 1.5px solid #E5E7EB;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #3730A3;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .horario-slot:hover {
          background: #EEF2FF;
          border-color: #3730A3;
          transform: scale(1.05);
        }

        @media (min-width: 768px) {
          .mobile-tabs { display: none !important; }
          .mobile-only { display: none !important; }
          .desktop-only { display: flex !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
      `}</style>

      <nav style={{ background: '#fff', borderBottom: '2px solid #F3F4F6', padding: '0 20px', flexShrink: 0, zIndex: 50, position: 'sticky', top: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </Link>

          <div style={{ flex: 1, position: 'relative', maxWidth: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="search-bar"
                  style={{ paddingLeft: 48 }}
                  placeholder="Especialidad, síntoma o médico..."
                  value={filtros.q}
                  onChange={e => setFiltros(f => ({ ...f, q: e.target.value }))}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setFiltrosAbiertos(f => !f)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '12px 20px', 
                    background: filtrosActivos > 0 ? '#3730A3' : '#F3F4F6', 
                    color: filtrosActivos > 0 ? '#fff' : '#374151', 
                    border: 'none', 
                    borderRadius: 50, 
                    fontSize: 14, 
                    fontWeight: 600, 
                    cursor: 'pointer', 
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  <Filter size={16} />
                  Filtros {filtrosActivos > 0 && `(${filtrosActivos})`}
                  <ChevronDown size={16} />
                </button>

                {filtrosAbiertos && (
                  <div className="filter-panel">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Especialidad</label>
                        <select 
                          className="field-sm" 
                          value={filtrosTmp.especialidad} 
                          onChange={e => setFiltrosTmp(f => ({ ...f, especialidad: e.target.value }))}
                        >
                          <option value="">Todas</option>
                          {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Estado</label>
                        <select 
                          className="field-sm" 
                          value={filtrosTmp.estado} 
                          onChange={e => setFiltrosTmp(f => ({ ...f, estado: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {ESTADOS_MEXICO.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Ciudad</label>
                        <select 
                          className="field-sm" 
                          value={filtrosTmp.ciudad} 
                          onChange={e => setFiltrosTmp(f => ({ ...f, ciudad: e.target.value }))}
                          disabled={!filtrosTmp.estado}
                        >
                          <option value="">Todas</option>
                          {ciudadesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Precio máximo (MXN)</label>
                        <input 
                          type="number" 
                          className="field-sm" 
                          placeholder="ej. 1500" 
                          value={filtrosTmp.precio_max} 
                          onChange={e => setFiltrosTmp(f => ({ ...f, precio_max: e.target.value }))} 
                          min="0" 
                          step="100" 
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button 
                        onClick={limpiarFiltros} 
                        style={{ 
                          flex: 1, 
                          padding: '12px', 
                          background: '#F3F4F6', 
                          color: '#6B7280', 
                          border: 'none', 
                          borderRadius: 50, 
                          fontSize: 14, 
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          fontFamily: "'DM Sans', sans-serif",
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#E5E7EB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#F3F4F6'}
                      >
                        Limpiar
                      </button>
                      <button 
                        onClick={aplicarFiltros} 
                        style={{ 
                          flex: 2, 
                          padding: '12px', 
                          background: '#3730A3', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 50, 
                          fontSize: 14, 
                          fontWeight: 700, 
                          cursor: 'pointer', 
                          fontFamily: "'DM Sans', sans-serif",
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#4F46E5'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#3730A3'}
                      >
                        Aplicar filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="mobile-tabs mobile-only" style={{ display: 'flex', background: '#fff', borderBottom: '2px solid #F3F4F6', padding: '12px 16px', gap: 12, flexShrink: 0 }}>
        <button 
          className={`btn-tab ${vistaMovil === 'lista' ? 'active' : 'inactive'}`} 
          onClick={() => setVistaMovil('lista')} 
          style={{ flex: 1 }}
        >
          Lista ({totalCount})
        </button>
        <button 
          className={`btn-tab ${vistaMovil === 'mapa' ? 'active' : 'inactive'}`} 
          onClick={() => setVistaMovil('mapa')} 
          style={{ flex: 1 }}
        >
          Mapa
        </button>
      </div>

      {mapError && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', padding: '12px 20px', textAlign: 'center', fontSize: 13, color: '#993C1D' }}>
          ⚠️ Mapa no disponible. Verifica la configuración de Mapbox.
        </div>
      )}

      <div className="desktop-only" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: isDesktop ? '60%' : '100%', flexShrink: 0, overflowY: 'auto', background: '#FAFAFA' }}>
          <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '2px solid #F3F4F6', position: 'sticky', top: 0, zIndex: 10 }}>
            <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>
              {loading ? 'Buscando...' : `${totalCount} especialista${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>

          {loading ? (
            <div style={{ padding: 24 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '20px', marginBottom: 16, background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 16, background: '#F3F4F6', borderRadius: 4, marginBottom: 12, width: '60%' }} />
                    <div style={{ height: 14, background: '#F3F4F6', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : medicos.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
              <p style={{ fontSize: 18, color: '#374151', fontWeight: 700, marginBottom: 8, fontFamily: "'Fraunces', serif" }}>Sin resultados</p>
              <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 24 }}>Intenta con otra especialidad o ciudad</p>
              <button 
                onClick={limpiarFiltros} 
                style={{ 
                  padding: '12px 28px', 
                  background: '#EEF2FF', 
                  color: '#3730A3', 
                  border: 'none', 
                  borderRadius: 50, 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: 'pointer', 
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#DDD6FE'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#EEF2FF'}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              {medicos.map(m => (
                <Link
                  key={m.id}
                  href={`/doctor/${m.id}`}
                  className={`medico-card ${medicoSeleccionado === m.id ? 'selected' : ''}`}
                  onMouseEnter={() => setMedicoSeleccionado(m.id)}
                  style={{ marginBottom: 16 }}
                >
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    {m.photo_url ? (
                      <img 
                        src={m.photo_url} 
                        alt={m.full_name} 
                        style={{ 
                          width: 64, 
                          height: 64, 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          flexShrink: 0,
                          border: '3px solid #fff',
                          boxShadow: '0 4px 12px rgba(55,48,163,0.15)'
                        }} 
                      />
                    ) : (
                      <div className="avatar-md">
                        {(m.full_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <p style={{ fontSize: 18, fontWeight: 900, color: '#1A1A2E', fontFamily: "'Fraunces', serif", margin: 0 }}>
                          {m.full_name}
                        </p>
                        {m.license_verified && (
                          <span className="badge badge-verificado">
                            <CheckCircle size={12} /> 
                            Verificado
                          </span>
                        )}
                      </div>
                      
                      <p style={{ fontSize: 14, color: '#4F46E5', fontWeight: 600, marginBottom: 8, margin: 0 }}>
                        {m.specialty}
                      </p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {[1,2,3,4,5].map(star => (
                            <Star 
                              key={star} 
                              size={14} 
                              fill={star <= Math.round(m.rating_avg || 0) ? '#F59E0B' : 'none'} 
                              color={star <= Math.round(m.rating_avg || 0) ? '#F59E0B' : '#E5E7EB'}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
                          {m.rating_avg?.toFixed(1) || '0.0'} ({m.rating_count || 0} opiniones)
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                        {m.location_city && (
                          <span style={{ fontSize: 13, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={14} /> 
                            {m.location_city}
                          </span>
                        )}
                        {m.consultation_price > 0 && (
                          <span className="badge badge-coral">
                            ${m.consultation_price.toLocaleString('es-MX')} MXN
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={14} />
                          Disponibilidad esta semana:
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {getDiasDisponibles().slice(0, 3).map((dia, idx) => (
                            <div key={idx} style={{ background: '#F9FAFB', borderRadius: 12, padding: 12, minWidth: 100 }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' }}>
                                {dia.nombre}
                              </p>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {HORARIOS_DISPONIBLES[dia.diaKey]?.slice(0, 2).map((hora, hidx) => (
                                  <div 
                                    key={hidx} 
                                    className="horario-slot"
                                    style={{ fontSize: 12, padding: '4px 8px' }}
                                  >
                                    {hora}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: '40%', position: 'relative', background: '#F3F4F6' }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          {medicos.length === 0 && !loading && (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%,-50%)', 
              background: '#fff', 
              borderRadius: 16, 
              padding: '20px 32px', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', 
              textAlign: 'center' 
            }}>
              <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Sin médicos en esta área</p>
            </div>
          )}
        </div>
      </div>

      <div className="mobile-only" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ 
          width: '100%', 
          overflowY: 'auto', 
          display: vistaMovil === 'lista' ? 'block' : 'none',
          background: '#FAFAFA'
        }}>
          {loading ? (
            <div style={{ padding: 16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '20px', marginBottom: 16, background: '#fff', borderRadius: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 16, background: '#F3F4F6', borderRadius: 4, marginBottom: 12, width: '60%' }} />
                    <div style={{ height: 14, background: '#F3F4F6', borderRadius: 4, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : medicos.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ fontSize: 48, marginBottom: 12 }}>🔍</p>
              <p style={{ fontSize: 16, color: '#374151', fontWeight: 700 }}>Sin resultados</p>
              <button 
                onClick={limpiarFiltros} 
                style={{ 
                  marginTop: 20, 
                  padding: '10px 24px', 
                  background: '#EEF2FF', 
                  color: '#3730A3', 
                  border: 'none', 
                  borderRadius: 50, 
                  fontSize: 14, 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              {medicos.map(m => (
                <Link 
                  key={m.id} 
                  href={`/doctor/${m.id}`} 
                  className="medico-card"
                  style={{ marginBottom: 16, padding: 16 }}
                >
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {m.photo_url ? (
                      <img 
                        src={m.photo_url} 
                        alt={m.full_name} 
                        style={{ 
                          width: 56, 
                          height: 56, 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          flexShrink: 0 
                        }} 
                      />
                    ) : (
                      <div className="avatar-md" style={{ width: 56, height: 56, fontSize: 20 }}>
                        {(m.full_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: '#1A1A2E', fontFamily: "'Fraunces', serif", margin: 0 }}>
                          {m.full_name}
                        </p>
                        {m.license_verified && (
                          <span className="badge badge-verificado" style={{ fontSize: 10, padding: '2px 6px' }}>
                            <CheckCircle size={10} />
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: '#4F46E5', fontWeight: 600, marginBottom: 6, margin: 0 }}>
                        {m.specialty}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {m.location_city && (
                          <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={12} /> {m.location_city}
                          </span>
                        )}
                        {m.consultation_price > 0 && (
                          <span className="badge badge-coral" style={{ fontSize: 11 }}>
                            ${m.consultation_price} MXN
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

        {vistaMovil === 'mapa' && (
          <div style={{ width: '100%', height: '100%' }}>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>
    </div>
  )
}