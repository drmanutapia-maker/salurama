'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, MapPin, Filter, ChevronDown, CheckCircle, Star, Clock } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Proteger acceso a env vars durante SSR
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
  location_city: string
  consultation_price: number
  license_verified: boolean
  photo_url: string | null
  rating_avg: number
  rating_count: number
  latitude: number | null
  longitude: number | null
}

interface Filtros {
  q: string
  especialidad: string
  ciudad: string
  precio_max: string
}

// Componente que usa useSearchParams (envuelto en Suspense)
function BuscarContent() {
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
  const [filtros, setFiltros] = useState<Filtros>({ q: '', especialidad: '', ciudad: '', precio_max: '' })
  const [tmp, setTmp] = useState<Filtros>({ q: '', especialidad: '', ciudad: '', precio_max: '' })

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
    const init: Filtros = { q, especialidad: esp, ciudad, precio_max: '' }
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
      if (f.q)           q = q.or('full_name.ilike.%' + f.q + '%,specialty.ilike.%' + f.q + '%,description.ilike.%' + f.q + '%')
      if (f.especialidad) q = q.ilike('specialty', '%' + f.especialidad + '%')
      if (f.ciudad)       q = q.ilike('location_city', '%' + f.ciudad + '%')
      if (f.precio_max)   q = q.lte('consultation_price', parseFloat(f.precio_max))
      q = q.order('license_verified', { ascending: false })
           .order('rating_avg', { ascending: false })
           .limit(50)
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

  const filtrosActivos = Object.entries(filtros).filter(([k, v]) => v && k !== 'q').length

  const limpiar = () => {
    const l: Filtros = { q: '', especialidad: '', ciudad: '', precio_max: '' }
    setTmp(l)
    setFiltros(l)
    setFiltrosOpen(false)
  }

  const MedicoCard = ({ m }: { m: Medico }) => (
    <Link
      href={'/doctor/' + m.id}
      style={{ display: 'block', padding: '14px 16px', background: '#fff', borderRadius: 12, textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: sel === m.id ? '2px solid #3730A3' : '1.5px solid #F3F4F6', marginBottom: 10, transition: 'all 0.18s' }}
      onMouseEnter={() => setSel(m.id)}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {m.photo_url
          ? <img src={m.photo_url} alt={m.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#3730A3,#F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', flexShrink: 0 }}>
              {(m.full_name || '?')[0].toUpperCase()}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E', margin: 0, fontFamily: "'Fraunces', serif" }}>{m.full_name}</p>
            {m.license_verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#DCFCE7', color: '#059669', borderRadius: 20, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                <CheckCircle size={10} /> Verificado
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#4F46E5', fontWeight: 600, margin: '0 0 6px' }}>{m.specialty}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {m.location_city && (
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11} />{m.location_city}
              </span>
            )}
            {m.consultation_price > 0 && (
              <span style={{ fontSize: 12, color: '#F4623A', fontWeight: 600 }}>
                {'$' + m.consultation_price.toLocaleString('es-MX') + ' MXN'}
              </span>
            )}
            {(m.rating_avg || 0) > 0 && (
              <span style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Star size={11} fill="#F59E0B" color="#F59E0B" />{m.rating_avg.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', background: '#F9FAFB' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .sbar { flex:1; padding:10px 14px 10px 42px; border:1.5px solid #E5E7EB; border-radius:50px; font-size:14px; font-family:'DM Sans',sans-serif; color:#1A1A2E; outline:none; background:#fff; transition:border-color 0.2s; min-width:0; }
        .sbar:focus { border-color:#3730A3; box-shadow:0 0 0 3px #3730A314; }
        .sbar::placeholder { color:#9CA3AF; }
        .fld { width:100%; padding:8px 12px; border:1.5px solid #E5E7EB; border-radius:8px; font-size:13px; font-family:'DM Sans',sans-serif; color:#1A1A2E; outline:none; background:#fff; }
        .fld:focus { border-color:#3730A3; }
        select.fld { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:28px; }
        .tab-mv { flex:1; padding:9px; border:none; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.18s; min-height:44px; }
        .tab-mv.on { background:#3730A3; color:#fff; }
        .tab-mv.off { background:#fff; color:#6B7280; border:1.5px solid #E5E7EB; }
        .mapboxgl-popup-content { border-radius:10px !important; padding:0 !important; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.1) !important; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.18s ease-out; }
      `}</style>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </Link>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 680 }}>
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

            <div ref={panelRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setFiltrosOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: filtrosActivos > 0 ? '#3730A3' : '#F3F4F6', color: filtrosActivos > 0 ? '#fff' : '#374151', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', minHeight: 44 }}
              >
                <Filter size={13} />
                {'Filtros' + (filtrosActivos > 0 ? ' (' + filtrosActivos + ')' : '')}
                <ChevronDown size={12} />
              </button>

              {filtrosOpen && (
                <div
                  className="fade-up"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 200,
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: 14,
                    boxShadow: '0 10px 36px rgba(0,0,0,0.12)',
                    padding: 18,
                    width: 300,
                    maxWidth: 'calc(100vw - 32px)',
                  }}
                >
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
                    <button onClick={() => { setFiltros({ ...tmp }); setFiltrosOpen(false) }} style={{ flex: 2, padding: '9px', background: '#3730A3', color: '#fff', border: 'none', borderRadius: 50, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", minHeight: 44 }}>
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* TABS MÓVIL */}
      {isMobile && (
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '10px 16px', gap: 8 }}>
          <button className={'tab-mv ' + (vista === 'lista' ? 'on' : 'off')} onClick={() => setVista('lista')}>
            {'Lista (' + total + ')'}
          </button>
          <button className={'tab-mv ' + (vista === 'mapa' ? 'on' : 'off')} onClick={() => setVista('mapa')}>
            🗺 Mapa
          </button>
        </div>
      )}

      {/* CONTENIDO */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* LISTA */}
        <div style={{ width: isMobile ? '100%' : '55%', overflowY: 'auto', display: isMobile && vista === 'mapa' ? 'none' : 'flex', flexDirection: 'column', background: '#F9FAFB' }}>
          <div style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, zIndex: 10 }}>
            <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>
              {loading ? 'Buscando...' : total + ' especialista' + (total !== 1 ? 's' : '') + ' encontrado' + (total !== 1 ? 's' : '')}
            </p>
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
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>🔍</p>
                <p style={{ fontSize: 15, color: '#374151', fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 4 }}>Sin resultados</p>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Intenta con otra especialidad o ciudad</p>
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

// Componente principal que envuelve en Suspense
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