'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, X, ZoomIn, Calendar, MessageCircle, Edit2,
  TrendingUp, Star, Users, Eye, Settings, BarChart3,
  ChevronRight, MoreVertical
} from 'lucide-react'

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  photo_url: string | null
  phone: string
  location_city: string
  clinic_name: string | null
  clinic_address: string | null
  whatsapp_available: boolean
  whatsapp: string | null
  is_active: boolean
  professional_license: string | null
  about_me: string | null
  availability_schedule: any
  languages: string[] | string | null
}

interface Cita {
  id: string
  patient_name: string
  requested_date: string
  requested_time: string
  status: 'solicitada' | 'confirmada' | 'terminada' | 'cancelada'
}

interface StatsResumen {
  citas_solicitadas_totales: number
  citas_solicitadas_mes: number
  rating_promedio: number
  reseñas_count: number
}

export default function DashboardMedico() {
  const router = useRouter()
  const [medico, setMedico] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [citasHoy, setCitasHoy] = useState<Cita[]>([])
  const [stats, setStats] = useState<StatsResumen | null>(null)
  const [consejo, setConsejo] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('email', user.email)
        .single()

      if (error || !data) {
        router.push('/login')
        return
      }

      setMedico(data)

      const hoy = new Date().toISOString().split('T')[0]
      const { data: citasData } = await supabase
        .from('appointment_requests')
        .select('id, patient_name, requested_date, requested_time, status')
        .eq('doctor_id', data.id)
        .eq('requested_date', hoy)
        .in('status', ['solicitada', 'confirmada'])
        .order('requested_time', { ascending: true })

      setCitasHoy(citasData || [])

      const { count: countTotales } = await supabase
        .from('appointment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', data.id)
        .eq('status', 'solicitada')

      const inicioMes = new Date()
      inicioMes.setDate(1)
      const { count: countMes } = await supabase
        .from('appointment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', data.id)
        .eq('status', 'solicitada')
        .gte('requested_date', inicioMes.toISOString().split('T')[0])

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('doctor_id', data.id)
        .eq('is_visible', true)

      const ratingPromedio = reviewsData && reviewsData.length > 0
        ? reviewsData.reduce((acc, r) => acc + r.rating, 0) / reviewsData.length
        : 0

      setStats({
        citas_solicitadas_totales: countTotales || 0,
        citas_solicitadas_mes: countMes || 0,
        rating_promedio: parseFloat(ratingPromedio.toFixed(1)),
        reseñas_count: reviewsData?.length || 0
      })

      const consejosPendientes = [
        {
          id: 'foto',
          titulo: '📸 Completa tu foto de perfil',
          descripcion: 'Los médicos con foto reciben 40% más citas.',
          cta: 'Subir foto',
          link: '/dashboard/editar-perfil',
          mostrar: !data.photo_url,
          impacto: '+40% más citas'
        },
        {
          id: 'cedula',
          titulo: '🎓 Agrega tu cédula profesional',
          descripcion: 'Médicos con cédula verificada reciben 60% más solicitudes.',
          cta: 'Agregar cédula',
          link: '/dashboard/editar-perfil',
          mostrar: !data.professional_license,
          impacto: '+60% más confianza'
        },
        {
          id: 'about',
          titulo: '📝 Escribe una introducción',
          descripcion: 'Perfiles con introducción generan 35% más confianza.',
          cta: 'Escribir',
          link: '/dashboard/editar-perfil',
          mostrar: !data.about_me,
          impacto: '+35% más confianza'
        },
        {
          id: 'horarios',
          titulo: '🏥 Configura tus horarios',
          descripcion: 'Perfiles con disponibilidad reciben 70% más conversiones.',
          cta: 'Configurar',
          link: '/dashboard/editar-perfil',
          mostrar: !data.availability_schedule,
          impacto: '+70% más conversiones'
        }
      ]

      const pendientes = consejosPendientes.filter(c => c.mostrar)

      if (pendientes.length === 0) {
        setConsejo({
          id: 'completo',
          titulo: '🎉 ¡Perfil 100% completo!',
          descripcion: 'Tu perfil recibe 3.2x más solicitudes que perfiles incompletos.',
          cta: 'Ver perfil público',
          link: `/doctor/${data.id}`,
          impacto: '3.2x más solicitudes',
          completo: true
        })
      } else {
        const randomIndex = Math.floor(Math.random() * pendientes.length)
        setConsejo(pendientes[randomIndex])
      }

      setLoading(false)
    }
    load()
  }, [router])

  const obtenerSaludo = () => {
    const hora = new Date().getHours()
    if (hora >= 5 && hora < 12) return 'Buenos días'
    if (hora >= 12 && hora < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const obtenerNombreCorto = () => {
    if (!medico) return ''
    const partes = medico.full_name.split(' ')
    const primerNombre = partes[0]
    const primerApellido = partes.length > 2 ? partes[partes.length - 2] : (partes[1] || '')
    return `${primerNombre} ${primerApellido}`.trim()
  }

  const obtenerGenero = () => {
    if (!medico) return 'Dr.'
    const nombre = medico.full_name.toLowerCase()
    return nombre.includes('dra') || nombre.includes('maría') || nombre.includes('ana') ? 'Dra.' : 'Dr.'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!medico) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E', paddingBottom: isMobile ? 80 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-in { animation: fadeIn 0.2s ease-out; }
      `}</style>

      {/* HEADER */}
      <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto', padding: '100px 16px 20px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            
            {/* Foto */}
            <div style={{ position: 'relative' }}>
              {medico.photo_url ? (
                <div onClick={() => setShowPhotoModal(true)} style={{ cursor: 'pointer', position: 'relative' }}>
                  <img 
                    src={`${medico.photo_url}?t=${Date.now()}`} 
                    alt={medico.full_name} 
                    style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #E5E7EB' }} 
                  />
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(30, 58, 95, 0.9)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <ZoomIn size={16} color="#fff" />
                  </div>
                </div>
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 900, color: '#fff', border: '3px solid #E5E7EB' }}>
                  {(medico.full_name || '?')[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 250 }}>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 900, color: '#1A1A2E', marginBottom: 4 }}>
                {obtenerSaludo()}, {obtenerGenero()} {obtenerNombreCorto()}
              </h1>
              <p style={{ fontSize: 15, color: '#1E3A5F', fontWeight: 600, marginBottom: 4 }}>{medico.specialty}</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{medico.location_city}</p>
              
              {/* Botones de acción */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <Link 
                  href="/dashboard/editar-perfil" 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#1E3A5F',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Edit2 size={14} /> Editar Perfil
                </Link>
                <button
                  onClick={() => window.location.href = `/doctor/${medico.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#F5F3FF',
                    color: '#1E3A5F',
                    border: '1.5px solid #C7D2FE',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Ver como me ven los pacientes"
                >
                  <Eye size={14} /> Ver perfil público
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONSEJO DEL DÍA */}
      {consejo && (
        <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
          <div style={{ 
            background: consejo.completo ? '#F0FDF4' : '#FEF3C7', 
            border: consejo.completo ? '1px solid #86EFAC' : '1px solid #FCD34D', 
            borderRadius: 12, 
            padding: '16px 18px', 
            display: 'flex', 
            gap: 12, 
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: consejo.completo ? '#059669' : '#92400E', marginBottom: 4 }}>
                {consejo.titulo}
              </p>
              <p style={{ fontSize: 13, color: consejo.completo ? '#059669' : '#92400E', lineHeight: 1.6 }}>
                {consejo.descripcion}
              </p>
              {consejo.impacto && (
                <p style={{ fontSize: 12, color: consejo.completo ? '#059669' : '#92400E', fontWeight: 600, marginTop: 6 }}>
                  📊 {consejo.impacto}
                </p>
              )}
            </div>
            <Link 
              href={consejo.link}
              style={{
                background: consejo.completo ? '#059669' : '#92400E',
                color: '#fff',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              {consejo.cta} <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* STATS BENTO GRID */}
      <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          
          {/* Citas Totales */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Citas Totales</p>
                <p style={{ fontSize: 32, fontFamily: "'Fraunces', serif", fontWeight: 900, color: '#1E3A5F', lineHeight: 1, marginTop: 8 }}>
                  {stats?.citas_solicitadas_totales || 0}
                </p>
              </div>
              <div style={{ width: 40, height: 40, background: '#F5F3FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} color="#1E3A5F" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={14} color="#059669" />
              <p style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                {stats?.citas_solicitadas_mes || 0} este mes
              </p>
            </div>
          </div>

          {/* Rating Promedio */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating Promedio</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
                  <p style={{ fontSize: 32, fontFamily: "'Fraunces', serif", fontWeight: 900, color: '#1E3A5F', lineHeight: 1 }}>
                    {stats?.rating_promedio || 0}
                  </p>
                  <p style={{ fontSize: 14, color: '#9CA3AF' }}>/ 5.0</p>
                </div>
              </div>
              <div style={{ width: 40, height: 40, background: '#F5F3FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={20} color="#1E3A5F" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={14} color="#6B7280" />
              <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>
                {stats?.reseñas_count || 0} reseñas
              </p>
            </div>
          </div>

          {/* Analytics */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Métricas</p>
                <p style={{ fontSize: 18, fontFamily: "'Fraunces', serif", fontWeight: 900, color: '#1E3A5F', lineHeight: 1, marginTop: 8 }}>
                  Analytics
                </p>
              </div>
              <div style={{ width: 40, height: 40, background: '#FEF3C7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={20} color="#92400E" />
              </div>
            </div>
            <Link
              href="/dashboard/analytics"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #1E3A5F 0%, #1A3254 100%)',
                color: '#fff',
                borderRadius: 8,
                padding: '10px',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                marginTop: 8
              }}
            >
              <BarChart3 size={14} /> Ver métricas completas
            </Link>
          </div>
        </div>
      </div>

      {/* CITAS DE HOY */}
      <div className="fade-up" style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#1A1A2E', marginBottom: 4 }}>
                Citas de Hoy
              </h2>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <Link
              href="/dashboard/citas"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: '#1E3A5F',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          {citasHoy.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {citasHoy.map(cita => (
                <div 
                  key={cita.id} 
                  style={{ 
                    background: '#F9FAFB', 
                    borderRadius: 12, 
                    padding: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    border: cita.status === 'confirmada' ? '2px solid #059669' : '2px solid #F59E0B'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: '50%', 
                      background: cita.status === 'confirmada' ? '#059669' : '#F59E0B', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 16
                    }}>
                      {cita.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 2 }}>
                        {cita.patient_name}
                      </p>
                      <p style={{ fontSize: 13, color: '#6B7280' }}>
                        {cita.requested_time} • {cita.status === 'confirmada' ? 'Confirmada' : 'Por Confirmar'}
                      </p>
                    </div>
                  </div>
                  <button 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: '#9CA3AF',
                      padding: 8
                    }}
                    title="Más opciones"
                  >
                    <MoreVertical size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F9FAFB', borderRadius: 12 }}>
              <Calendar size={40} color="#9CA3AF" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>Sin citas para hoy</p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>Cuando los pacientes agenden citas, aparecerán aquí</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE FOTO */}
      {showPhotoModal && medico.photo_url && (
        <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <button 
            onClick={() => setShowPhotoModal(false)} 
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={24} color="#fff" />
          </button>
          <img 
            src={`${medico.photo_url}?t=${Date.now()}`} 
            alt={medico.full_name} 
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} 
          />
        </div>
      )}

      {/* BOTTOM NAV - SOLO MÓVIL */}
      {isMobile && (
        <nav style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          background: 'rgba(255,255,255,0.95)', 
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #E5E7EB',
          zIndex: 1000,
          padding: '12px 0',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
        }}>
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <Link 
              href="/dashboard" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 4, 
                padding: '8px 16px',
                background: '#1E3A5F',
                color: '#fff',
                borderRadius: 12,
                textDecoration: 'none',
                minWidth: 80
              }}
            >
              <Settings size={20} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Perfil</span>
            </Link>
            <Link 
              href="/dashboard/citas" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 4, 
                padding: '8px 16px',
                color: '#9CA3AF',
                textDecoration: 'none',
                minWidth: 80,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1E3A5F'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
            >
              <Calendar size={20} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Citas</span>
            </Link>
            <Link 
              href="/dashboard/analytics" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: 4, 
                padding: '8px 16px',
                color: '#9CA3AF',
                textDecoration: 'none',
                minWidth: 80,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#1E3A5F'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
            >
              <BarChart3 size={20} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>Analytics</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  )
}