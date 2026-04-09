'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, MapPin, Star, Clock, Info, X, Copy, Check, Calendar, MessageCircle } from 'lucide-react'
import GoogleMapsModal from '@/components/GoogleMapsModal'

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
}

// 🎯 PRIORIDADES (SIN "Cerca de mí" y SIN "Alta especialidad")
const PRIORIDADES = [
  {
    label: 'Más experiencia',
    value: 'experiencia',
    icon: Clock,
    tooltip: 'Muestra primero a los médicos con más años de ejercicio profesional'
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
    icon: Check,
    tooltip: 'Muestra médicos que atienden pacientes pediátricos'
  },
  {
    label: 'Disponibilidad',
    value: 'disponibilidad',
    icon: Calendar,
    tooltip: 'Muestra médicos con horarios disponibles para agendar'
  },
]

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
  years_experience: number | null
  atiende_ninos: boolean
  clinic_name: string | null
  clinic_address: string | null
  whatsapp_available: boolean
  availability_schedule: any
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
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#1A1A2E', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5, maxWidth: 220, textAlign: 'center', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'none', animation: 'fadeUp 0.2s ease-out' }}>
          {text}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1A1A2E' }} />
        </div>
      )}
    </div>
  )
}

function BuscarContent() {
  useEffect(() => { if (typeof window !== 'undefined') { window.scrollTo(0, 0) } }, [])

  const searchParams = useSearchParams()
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [sel, setSel] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [filtros, setFiltros] = useState<Filtros>({ q: '', especialidad: '', ciudad: '', precio_max: '' })
  const [prioridades, setPrioridades] = useState<string[]>([])
  const [copiedLicense, setCopiedLicense] = useState<string | null>(null)
  const [showMapModal, setShowMapModal] = useState<{address: string, city: string} | null>(null)

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

  const normalizarTexto = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

  const buscarEspecialidadInteligente = (query: string): string => {
    const normalized = normalizarTexto(query)
    for (const [especialidad, sinonimos] of Object.entries(DICCIONARIO_MEDICO)) {
      if (sinonimos.some(s => normalizarTexto(s) === normalized || normalized.includes(normalizarTexto(s)))) {
        return especialidad
      }
    }
    return query
  }

  const buscar = useCallback(async (f: Filtros) => {
    setLoading(true)
    try {
      let q = supabase.from('doctors').select('*', { count: 'exact' }).eq('is_active', true)
      if (f.q) {
        const especialidadInteligente = buscarEspecialidadInteligente(f.q)
        const terminosBusqueda = [f.q, especialidadInteligente].filter(Boolean)
        q = q.or(terminosBusqueda.map(t => `full_name.ilike.%${t}%,specialty.ilike.%${t}%,sub_specialty.ilike.%${t}%,description.ilike.%${t}%`).join(','))
      }
      if (f.especialidad) q = q.ilike('specialty', '%' + f.especialidad + '%')
      if (f.ciudad) q = q.ilike('location_city', '%' + f.ciudad + '%')
      if (f.precio_max) q = q.lte('consultation_price', parseFloat(f.precio_max))
      if (prioridades.includes('experiencia')) {
        q = q.order('years_experience', { ascending: false, nullsLast: true })
      } else if (prioridades.includes('resenas')) {
        q = q.order('rating_avg', { ascending: false, nullsLast: true })
      } else if (prioridades.includes('precio')) {
        q = q.order('consultation_price', { ascending: true })
      } else if (prioridades.includes('atiende_ninos')) {
        q = q.eq('atiende_ninos', true)
      } else if (prioridades.includes('disponibilidad')) {
        q = q.not('availability_schedule', 'is', null)
      } else {
        q = q.order('rating_avg', { ascending: false, nullsLast: true })
      }
      q = q.limit(50)
      const { data, count } = await q
      const unique = Array.from(new Map((data || []).map((m: Medico) => [m.id, m])).values()) as Medico[]
      setMedicos(unique)
      setTotal(count || 0)
    } catch (e) {
      console.error(e)
      setMedicos([])
    } finally {
      setLoading(false)
    }
  }, [prioridades])

  useEffect(() => {
    const t = setTimeout(() => buscar(filtros), 300)
    return () => clearTimeout(t)
  }, [filtros, buscar])

  const togglePrioridad = (value: string) => {
    setPrioridades(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
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

  const MedicoCard = ({ m }: { m: Medico }) => (
    <Link
      href={'/doctor/' + m.id}
      style={{
        display: 'block',
        padding: '20px',
        background: '#fff',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        border: sel === m.id ? '2px solid #3730A3' : '1.5px solid #F3F4F6',
        marginBottom: 12,
        transition: 'all 0.18s'
      }}
      onMouseEnter={() => setSel(m.id)}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Foto */}
        {m.photo_url ? (
          <img src={m.photo_url} alt={m.full_name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #EEF2FF' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#3730A3,#F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, color: '#fff', flexShrink: 0 }}>
            {(m.full_name || '?')[0].toUpperCase()}
          </div>
        )}
        
        {/* Info */}
        <div style={{ flex: 1, minWidth: 280 }}>
          {/* Nombre + Especialidad */}
          <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: '0 0 4px', fontFamily: "'Fraunces', serif" }}>{m.full_name}</p>
          <p style={{ fontSize: 14, color: '#4F46E5', fontWeight: 600, margin: '0 0 10px' }}>{m.specialty}</p>
          
          {/* Dirección con Link a Mapa */}
          {(m.clinic_name || m.clinic_address || m.location_city) && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
              <MapPin size={14} color="#6B7280" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                {m.clinic_name && <p style={{ fontSize: 13, color: '#1A1A2E', fontWeight: 600, margin: '0 0 2px' }}>{m.clinic_name}</p>}
                {(m.clinic_address || m.location_city) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                      {[m.clinic_address, m.location_city].filter(Boolean).join(', ')}
                    </p>
                    {m.clinic_address && (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowMapModal({ address: m.clinic_address!, city: m.location_city || 'México' })
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3730A3',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}
                      >
                        Ver mapa →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Cédula + Copiar + SEP */}
          {m.professional_license && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#F9FAFB', padding: '6px 10px', borderRadius: 6 }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>📋 Cédula: {m.professional_license}</span>
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
              >
                {copiedLicense === m.professional_license ? <><Check size={10} /> Copiado</> : <><Copy size={10} /> Copiar</>}
              </button>
              <button
  onClick={(e) => {
    e.stopPropagation()
    window.open('https://www.cedulaprofesional.sep.gob.mx/cedula/', '_blank', 'noopener,noreferrer')
  }}
  style={{
    fontSize: 11,
    color: '#3730A3',
    textDecoration: 'underline',
    fontWeight: 500,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit'
  }}
>
  Verificar en SEP →
</button>
            </div>
          )}
          
          {/* Badges + Rating + Precio */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            {(m.rating_avg || 0) > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>
                <Star size={14} fill="#F59E0B" color="#F59E0B" />
                {m.rating_avg.toFixed(1)}
                <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({m.rating_count})</span>
              </span>
            )}
            {m.whatsapp_available && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#059669', borderRadius: 12, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
                <MessageCircle size={12} /> WhatsApp
              </span>
            )}
            {m.atiende_ninos && (
              <span style={{ background: '#DCFCE7', color: '#059669', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                👶 Acepta niños
              </span>
            )}
            {m.availability_schedule && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', color: '#3730A3', borderRadius: 12, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
                <Calendar size={12} /> Disponible
              </span>
            )}
          </div>
          
          {/* Precio + CTA */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {m.consultation_price > 0 && (
              <span style={{ fontSize: 15, color: '#F4623A', fontWeight: 700 }}>
                ${m.consultation_price.toLocaleString('es-MX')} MXN
              </span>
            )}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)',
                color: '#fff',
                borderRadius: 8,
                padding: '9px 16px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif"
              }}
            >
              <Calendar size={14} />
              Agenda cita
            </span>
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
        @keyframes fadeUp { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp 0.18s ease-out; }
        .priority-chip { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 50px; border: 1.5px solid #E5E7EB; background: #fff; font-size: 13px; font-family: 'DM Sans', sans-serif; color: #1A1A2E; cursor: pointer; transition: all 0.25s; font-weight: 500; position: relative; }
        .priority-chip:hover { border-color: #3730A3; background: #EEF2FF; color: #3730A3; transform: translateY(-2px); }
        .priority-chip.active { border-color: #3730A3; background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); color: #3730A3; box-shadow: 0 2px 8px #3730A322; }
        .priority-chip.active::after { content: '✓'; position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; animation: fadeUp 0.2s ease-out; }
        .sbar { flex:1; padding:8px 48px 8px 14px; border:1.5px solid #E5E7EB; border-radius:50px; font-size:14px; font-family:'DM Sans',sans-serif; color:#1A1A2E; outline:none; background:#fff; transition:all 0.2s; min-width:0; }
        .sbar:focus { border-color:#3730A3; box-shadow:0 0 0 3px #3730A314; }
      `}</style>

      {/* 🔍 BARRA DE BÚSQUEDA */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '16px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', maxWidth: 450, margin: '0 auto' }}>
            <input
              type="text"
              className="sbar"
              placeholder="Buscar por especialidad, síntoma o nombre..."
              value={filtros.q}
              onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
              style={{ width: '100%' }}
            />
            {filtros.q && (
              <button
                onClick={() => setFiltros({ ...filtros, q: '' })}
                style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9CA3AF' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 SECCIÓN DE PRIORIDADES */}
      <section style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)', padding: '24px 16px', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 900, color: '#1A1A2E', marginBottom: 6 }}>¿Qué es lo más importante para ti?</h2>
          <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 400, marginBottom: 16 }}>Selecciona una o varias opciones para personalizar tu búsqueda</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 700, margin: '0 auto' }}>
            {PRIORIDADES.map(p => {
              const active = prioridades.includes(p.value)
              return (
                <Tooltip key={p.value} text={p.tooltip}>
                  <button onClick={() => togglePrioridad(p.value)} className={'priority-chip' + (active ? ' active' : '')} style={{ cursor: 'help' }}>
                    <p.icon size={14} />
                    {p.label}
                    <Info size={12} color={active ? '#3730A3' : '#9CA3AF'} style={{ marginLeft: 4 }} />
                  </button>
                </Tooltip>
              )
            })}
          </div>
          {prioridades.length > 0 && (
            <p style={{ fontSize: 13, color: '#3730A3', marginTop: 14, fontWeight: 600, animation: 'fadeUp 0.3s ease-out' }}>
              ✓ Buscando por: {prioridades.map(p => PRIORIDADES.find(pr => pr.value === p)?.label).join(', ')}
            </p>
          )}
        </div>
      </section>

      {/* CONTENIDO - 100% ANCHO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {/* LISTA - 100% ANCHO */}
        <div style={{ width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#F9FAFB' }}>
          <div style={{ padding: '10px 14px', background: '#fff', borderBottom: '1px solid #F3F4F6', position: 'sticky', top: 0, zIndex: 10 }}>
            <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 500 }}>{loading ? 'Buscando...' : total + ' especialista' + (total !== 1 ? 's' : '') + ' encontrado' + (total !== 1 ? 's' : '')}</p>
          </div>
          <div style={{ padding: 12, flex: 1, maxWidth: 900, margin: '0 auto', width: '100%' }}>
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: 16, marginBottom: 10, background: '#fff', borderRadius: 12 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F3F4F6', flexShrink: 0 }} />
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
      </div>

      {/* MODAL DE GOOGLE MAPS */}
      {showMapModal && (
        <GoogleMapsModal
          address={showMapModal.address}
          city={showMapModal.city}
          onClose={() => setShowMapModal(null)}
        />
      )}
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