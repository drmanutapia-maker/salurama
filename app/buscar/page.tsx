'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, MapPin, Brain, Hospital, DollarSign, Star, Filter,
         ChevronDown, ShieldCheck, X } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

if (typeof window !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
}

const ESPECIALIDADES = [
  'Alergología','Anestesiología','Angiología','Cardiología',
  'Cirugía Cardiovascular','Cirugía General','Cirugía Plástica','Dermatología',
  'Endocrinología','Gastroenterología','Geriatría','Ginecología y Obstetricia',
  'Hematología','Infectología','Medicina Familiar','Medicina Física y Rehabilitación',
  'Medicina Interna','Nefrología','Neumología','Neurología',
  'Neurocirugía','Nutriología','Oftalmología','Oncología',
  'Ortopedia y Traumatología','Otorrinolaringología','Pediatría',
  'Psiquiatría','Reumatología','Urología','Otra especialidad'
]

const COORDS: Record<string, [number, number]> = {
  'Ciudad de México': [-99.1332, 19.4326],
  'Guadalajara':      [-103.3496, 20.6597],
  'Monterrey':        [-100.3161, 25.6866],
  'Puebla':           [-98.2063,  19.0414],
  'Toluca':           [-99.6557,  19.2826],
  'Cancún':           [-86.8515,  21.1619],
  'Mérida':           [-89.5926,  20.9674],
}

// Prioridades alineadas con la narrativa de la plataforma
const PRIORIDADES = [
  { label: 'Cerca de mí',       icon: MapPin,     value: 'ubicacion',   order: 'location_city' },
  { label: 'Más experiencia',   icon: Brain,      value: 'experiencia', order: 'years_of_experience' },
  { label: 'Alta especialidad', icon: Hospital,   value: 'especialidad',order: null },
  { label: 'Precio accesible',  icon: DollarSign, value: 'precio',      order: 'consultation_price' },
  { label: 'Reseñas',           icon: Star,       value: 'resenas',     order: 'rating_avg' },
]

interface Medico {
  id: string
  full_name: string
  specialty: string
  sub_specialty: string | null
  location_city: string
  consultation_price: number
  license_verified: boolean
  photo_url: string | null
  rating_avg: number
  rating_count: number
  latitude: number | null
  longitude: number | null
  years_of_experience: number | null
  specialty_council: string | null
  specialty_council_url: string | null
  professional_license: string | null
}

interface Filtros {
  q: string
  especialidad: string
  ciudad: string
  precio_max: string
  prioridades: string[]
}

// ── Shuffle determinístico (aleatorio fijo por sesión) ────────────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Componente interno ────────────────────────────────────────────────────────
function BuscarContent() {
  const searchParams = useSearchParams()
  const mapRefD = useRef<HTMLDivElement>(null)
  const mapRefM = useRef<HTMLDivElement>(null)
  const mapD    = useRef<mapboxgl.Map | null>(null)
  const mapM    = useRef<mapboxgl.Map | null>(null)
  const mrkD    = useRef<mapboxgl.Marker[]>([])
  const mrkM    = useRef<mapboxgl.Marker[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

  const [medicos, setMedicos]         = useState<Medico[]>([])
  const [loading, setLoading]         = useState(false)
  const [total, setTotal]             = useState(0)
  const [vista, setVista]             = useState<'lista' | 'mapa'>('lista')
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [sel, setSel]                 = useState<string | null>(null)
  const [isMobile, setIsMobile]       = useState(false)
  const [filtros, setFiltros] = useState<Filtros>({
    q: '', especialidad: '', ciudad: '', precio_max: '', prioridades: []
  })
  const [tmp, setTmp] = useState<Filtros>({
    q: '', especialidad: '', ciudad: '', precio_max: '', prioridades: []
  })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const q         = searchParams.get('q') || ''
    const esp       = searchParams.get('especialidad') || ''
    const ciudad    = searchParams.get('ciudad') || ''
    const pStr      = searchParams.get('p') || ''
    const prioridades = pStr ? pStr.split(',').filter(Boolean) : []
    const init: Filtros = { q, especialidad: esp, ciudad, precio_max: '', prioridades }
    setFiltros(init)
    setTmp(init)
  }, [searchParams])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setFiltrosOpen(false)
      }
    }
    if (filtrosOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filtrosOpen])

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
      if (f.q)           q = q.or(`full_name.ilike.%${f.q}%,specialty.ilike.%${f.q}%,description.ilike.%${f.q}%`)
      if (f.especialidad) q = q.ilike('specialty', `%${f.especialidad}%`)
      if (f.ciudad)       q = q.ilike('location_city', `%${f.ciudad}%`)
      if (f.precio_max)   q = q.lte('consultation_price', parseFloat(f.precio_max))

      // Prioridad seleccionada → ordenamiento secundario
      // Por defecto: orden por created_at (más neutral — no favorece ratings ni verificación)
      const prioridad = f.prioridades[0]
      if (prioridad === 'experiencia') {
        q = q.order('years_of_experience', { ascending: false, nullsFirst: false })
      } else if (prioridad === 'precio') {
        q = q.order('consultation_price', { ascending: true, nullsFirst: false })
      } else if (prioridad === 'resenas') {
        q = q.order('rating_avg', { ascending: false, nullsFirst: false })
      } else {
        // Sin prioridad seleccionada: aleatorio (mezclamos en JS para no favorecer a nadie)
        q = q.order('created_at', { ascending: false })
      }

      q = q.limit(60)
      const { data, count } = await q

      let result = Array.from(
        new Map((data || []).map((m: Medico) => [m.id, m])).values()
      ) as Medico[]

      // Aleatorio cuando no hay prioridad explícita o es ubicación/especialidad
      if (!prioridad || prioridad === 'ubicacion' || prioridad === 'especialidad') {
        result = shuffleArray(result)
      }

      setMedicos(result)
      setTotal(count || 0)
      addMarkers(result, f.ciudad, mapD, mrkD)
      addMarkers(result, f.ciudad, mapM, mrkM)
    } catch (e) {
      console.error(e)
      setMedicos([])
    } finally {
      setLoading(false)
    }
  }, [addMarkers])

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

  const togglePrioridad = (value: string) => {
    setFiltros(prev => {
      const ya = prev.prioridades.includes(value)
      const nuevas = ya
        ? prev.prioridades.filter(v => v !== value)
        : [...prev.prioridades, value]
      return { ...prev, prioridades: nuevas }
    })
  }

  const filtrosAvanzadosActivos = [filtros.especialidad, filtros.ciudad, filtros.precio_max].filter(Boolean).length

  const limpiar = () => {
    const l: Filtros = { q: '', especialidad: '', ciudad: '', precio_max: '', prioridades: [] }
    setTmp(l); setFiltros(l); setFiltrosOpen(false)
  }

  // ── Card de médico ──────────────────────────────────────────────────────────
  const MedicoCard = ({ m }: { m: Medico }) => (
    <Link
      href={`/doctor/${m.id}`}
      style={{
        display: 'block', padding: '14px 16px', background: '#fff',
        borderRadius: 12, textDecoration: 'none', color: 'inherit',
        border: sel === m.id ? '2px solid #3730A3' : '1.5px solid #F3F4F6',
        marginBottom: 10, transition: 'all 0.18s',
        boxShadow: sel === m.id ? '0 4px 16px rgba(55,48,163,0.12)' : '0 1px 4px rgba(0,0,0,0.04)'
      }}
      onMouseEnter={() => setSel(m.id)}
      onMouseLeave={() => setSel(null)}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {m.photo_url
          ? <img src={m.photo_url} alt={m.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontWeight: 900, fontSize: 18, color: '#3730A3', flexShrink: 0 }}>
              {(m.full_name || '?')[0].toUpperCase()}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', margin: 0, fontFamily: "'Fraunces', serif" }}>
              {m.full_name}
            </p>
            {/* Badge: cédula verificable (no "verificado" por nosotros) */}
            {m.professional_license && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#EEF2FF', color: '#3730A3', borderRadius: 20, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                <ShieldCheck size={10} /> Cédula verificable
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#4F46E5', fontWeight: 600, margin: '0 0 6px' }}>
            {m.specialty}
            {m.sub_specialty ? <span style={{ color: '#9CA3AF', fontWeight: 400 }}> · {m.sub_specialty}</span> : null}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {m.location_city && (
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} />{m.location_city}
              </span>
            )}
            {m.years_of_experience != null && m.years_of_experience > 0 && (
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                · {m.years_of_experience} años exp.
              </span>
            )}
            {m.consultation_price > 0 && (
              <span style={{ fontSize: 12, color: '#F4623A', fontWeight: 600 }}>
                ${m.consultation_price.toLocaleString('es-MX')} MXN
              </span>
            )}
            {(m.rating_avg || 0) > 0 && (
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Star size={11} fill="#F59E0B" color="#F59E0B" />
                {m.rating_avg.toFixed(1)}
                <span style={{ color: '#9CA3AF' }}>({m.rating_count})</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', background: '#F9FAFB' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sbar {
          flex:1; padding:10px 14px 10px 42px;
          border:1.5px solid #E5E7EB; border-radius:50px;
          font-size:14px; font-family:'DM Sans',sans-serif; color:#1A1A2E;
          outline:none; background:#fff; transition:border-color 0.2s; min-width:0;
        }
        .sbar:focus { border-color:#3730A3; box-shadow:0 0 0 3px #3730A314; }
        .sbar::placeholder { color:#9CA3AF; }

        .fld {
          width:100%; padding:8px 12px;
          border:1.5px solid #E5E7EB; border-radius:8px;
          font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A2E;
          outline:none; background:#fff;
        }
        .fld:focus { border-color:#3730A3; }
        select.fld {
          appearance:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 10px center; padding-right:28px;
        }

        .pchip {
          display:inline-flex; align-items:center; gap:5px;
          padding:7px 13px; border-radius:50px;
          border:1.5px solid #E5E7EB; background:#fff;
          font-size:12px; font-family:'DM Sans',sans-serif; color:#6B7280;
          cursor:pointer; transition:all 0.18s; white-space:nowrap; font-weight:500;
          position:relative;
        }
        .pchip:hover { border-color:#3730A3; background:#EEF2FF; color:#3730A3; transform:translateY(-1px); }
        .pchip.on {
          border-color:#3730A3; background:#EEF2FF; color:#3730A3;
          padding-right:26px; box-shadow:0 2px 8px #3730A318;
        }
        .pchip.on::after {
          content:'✓'; position:absolute; right:8px; top:50%;
          transform:translateY(-50%); font-size:11px; font-weight:700;
          animation:checkPop 0.2s ease-out;
        }
        @keyframes checkPop {
          0%   { transform:translateY(-50%) scale(0); }
          70%  { transform:translateY(-50%) scale(1.3); }
          100% { transform:translateY(-50%) scale(1); }
        }

        .tab-mv { flex:1; padding:9px; border:none; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; min-height:44px; }
        .tab-mv.on  { background:#3730A3; color:#fff; }
        .tab-mv.off { background:#fff; color:#6B7280; border:1.5px solid #E5E7EB; }

        .mapboxgl-popup-content { border-radius:10px !important; padding:0 !important; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.1) !important; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.18s ease-out; }
        @keyframes slideInRight { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        .sir { animation:slideInRight 0.25s ease-out; }

        @media (max-width:768px) {
          .pchips-wrap { overflow-x:auto; flex-wrap:nowrap !important; padding-bottom:4px; -webkit-overflow-scrolling:touch; }
          .pchips-wrap::-webkit-scrollbar { display:none; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </Link>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, maxWidth: 680 }}>
            {/* Buscador */}
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="sbar"
                placeholder="Especialidad, síntoma o médico..."
                value={filtros.q}
                onChange={e => setFiltros(f => ({ ...f, q: e.target.value }))}
              />
            </div>

            {/* Filtros avanzados */}
            <div ref={panelRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setFiltrosOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: filtrosAvanzadosActivos > 0 ? '#3730A3' : '#F3F4F6', color: filtrosAvanzadosActivos > 0 ? '#fff' : '#374151', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', minHeight: 44 }}
              >
                <Filter size={13} />
                {'Filtros' + (filtrosAvanzadosActivos > 0 ? ` (${filtrosAvanzadosActivos})` : '')}
                <ChevronDown size={12} style={{ transform: filtrosOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {filtrosOpen && (
                <div className="fade-up" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 10px 36px rgba(0,0,0,0.12)', padding: 18, width: 300, maxWidth: 'calc(100vw - 32px)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Especialidad</label>
                      <select className="fld" value={tmp.especialidad} onChange={e => setTmp(f => ({ ...f, especialidad: e.target.value }))}>
                        <option value="">Todas</option>
                        {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Ciudad</label>
                      <input className="fld" placeholder="Ej: Monterrey" value={tmp.ciudad} onChange={e => setTmp(f => ({ ...f, ciudad: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Precio máximo (MXN)</label>
                      <input type="number" className="fld" placeholder="1500" value={tmp.precio_max} onChange={e => setTmp(f => ({ ...f, precio_max: e.target.value }))} min="0" step="100" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={limpiar} style={{ flex: 1, padding: '9px', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
                      Limpiar
                    </button>
                    <button onClick={() => { setFiltros(f => ({ ...f, ...tmp })); setFiltrosOpen(false) }} style={{ flex: 2, padding: '9px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CHIPS DE PRIORIDAD — visibles siempre bajo el navbar ── */}
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 10 }}>
          <div className="pchips-wrap" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
              Ordenar por:
            </span>
            {PRIORIDADES.map(p => {
              const on = filtros.prioridades.includes(p.value)
              return (
                <button
                  key={p.value}
                  onClick={() => togglePrioridad(p.value)}
                  className={`pchip${on ? ' on' : ''}`}
                  aria-pressed={on}
                >
                  <p.icon size={12} />
                  {p.label}
                </button>
              )
            })}
            {filtros.prioridades.length > 0 && (
              <button
                onClick={() => setFiltros(f => ({ ...f, prioridades: [] }))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', border: 'none', background: 'none', fontSize: 11, color: '#9CA3AF', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif' " }}
              >
                <X size={11} /> Limpiar
              </button>
            )}
          </div>
          {/* Feedback dinámico de prioridad */}
          {filtros.prioridades.length > 0 && (
            <p className="sir" style={{ fontSize: 11, color: '#3730A3', fontWeight: 500, marginTop: 4, paddingBottom: 2 }}>
              ✓ {filtros.prioridades.length === 1
                ? `Mostrando por: ${PRIORIDADES.find(p => p.value === filtros.prioridades[0])?.label}`
                : `${filtros.prioridades.length} prioridades activas`}
            </p>
          )}
        </div>
      </nav>

      {/* ── TABS MÓVIL ── */}
      {isMobile && (
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '10px 16px', gap: 8 }}>
          <button className={`tab-mv ${vista === 'lista' ? 'on' : 'off'}`} onClick={() => setVista('lista')}>
            {`Lista (${total})`}
          </button>
          <button className={`tab-mv ${vista === 'mapa' ? 'on' : 'off'}`} onClick={() => setVista('mapa')}>
            🗺 Mapa
          </button>
        </div>
      )}

      {/* ── CONTENIDO ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* LISTA */}
        <div style={{ width: isMobile ? '100%' : '55%', overflowY: 'auto', display: isMobile && vista === 'mapa' ? 'none' : 'flex', flexDirection: 'column', background: '#F9FAFB' }}>

          {/* Header de resultados */}
          <div style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
              {loading
                ? 'Buscando...'
                : `${total} especialista${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
            </p>
            {!filtros.prioridades.length && !loading && total > 0 && (
              <p style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>
                orden aleatorio — sin rankings pagados
              </p>
            )}
          </div>

          <div style={{ padding: 12, flex: 1 }}>
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: 14, marginBottom: 10, background: '#fff', borderRadius: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 13, background: '#F3F4F6', borderRadius: 4, marginBottom: 8, width: '55%' }} />
                    <div style={{ height: 11, background: '#F3F4F6', borderRadius: 4, width: '35%' }} />
                  </div>
                </div>
              ))
            ) : medicos.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
                <p style={{ fontSize: 16, color: '#374151', fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 6 }}>
                  Sin resultados
                </p>
                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
                  Intenta con otra especialidad, síntoma o ciudad
                </p>
                <button
                  onClick={limpiar}
                  style={{ fontSize: 13, color: '#3730A3', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Limpiar todos los filtros
                </button>
              </div>
            ) : (
              medicos.map(m => <MedicoCard key={m.id} m={m} />)
            )}
          </div>
        </div>

        {/* MAPA DESKTOP */}
        {!isMobile && (
          <div style={{ width: '45%', position: 'relative', background: '#F3F4F6', flexShrink: 0 }}>
            <div ref={mapRefD} style={{ width: '100%', height: '100%' }} />
          </div>
        )}

        {/* MAPA MÓVIL */}
        {isMobile && vista === 'mapa' && (
          <div style={{ width: '100%', flex: 1 }}>
            <div ref={mapRefM} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Export con Suspense ───────────────────────────────────────────────────────
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