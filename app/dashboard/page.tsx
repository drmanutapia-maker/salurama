'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  X, Calendar, Edit2, TrendingUp, Users, Eye,
  ChevronRight, MoreVertical, Lightbulb, ArrowRight,
  Share2, Copy, MessageCircle, CheckCircle
} from 'lucide-react'

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  professional_title: string | null
  location_city: string
  photo_url: string | null
  phone: string
  clinic_lat: number | null
  clinic_lng: number | null
  whatsapp_available: boolean
  whatsapp_phone: string | null
  clinic_phone: string | null
  about_me: string | null
  horario: any
  languages: string[] | string | null
  consultation_price_first_time: number | null
  consultation_price_general: number | null
  user_id?: string
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
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [photoTs] = useState(() => Date.now())

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    let mounted = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session && mounted) router.replace('/login')
    })

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        let { data: doctor } = await supabase
      .from('doctors')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

        if (!doctor) {
          const { data: byEmail } = await supabase
        .from('doctors')
        .select('*')
        .ilike('email', user.email || '')
        .maybeSingle()

          if (byEmail) {
            await supabase.from('doctors').update({ user_id: user.id }).eq('id', byEmail.id)
            doctor = {...byEmail, user_id: user.id }
          }
        }

        if (!doctor) {
          router.replace('/dashboard/editar-perfil?onboarding=1')
          return
        }

        if (!mounted) return
        setMedico(doctor)

        const hoy = new Date().toISOString().split('T')[0]
        const inicioMes = new Date()
        inicioMes.setDate(1)
        const inicioMesStr = inicioMes.toISOString().split('T')[0]

        const [citasRes, totalesRes, mesRes, eduRes, expRes, condRes] = await Promise.all([
          supabase.from('appointment_requests')
        .select('id, patient_name, requested_date, requested_time, status')
        .eq('doctor_id', doctor.id).eq('requested_date', hoy)
        .in('status', ['solicitada','confirmada']).order('requested_time'),
          supabase.from('appointment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctor.id).eq('status', 'solicitada'),
          supabase.from('appointment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctor.id).eq('status', 'solicitada')
        .gte('requested_date', inicioMesStr),
          supabase.from('doctor_education').select('id').eq('doctor_id', doctor.id),
          supabase.from('doctor_experience').select('id').eq('doctor_id', doctor.id),
          supabase.from('doctor_conditions').select('id').eq('doctor_id', doctor.id),
        ])

        let ratingData = { promedio: 0, total: 0 }
        try {
          const r = await supabase.rpc('get_doctor_rating', { doctor_uuid: doctor.id })
          ratingData = r.data?.[0] || ratingData
        } catch {}

        setCitasHoy(citasRes.data || [])
        setStats({
          citas_solicitadas_totales: totalesRes.count || 0,
          citas_solicitadas_mes: mesRes.count || 0,
          rating_promedio: parseFloat(Number(ratingData.promedio || 0).toFixed(1)),
          reseñas_count: ratingData.total || 0
        })

        const tieneHorarioActivo =!!(doctor.horario && Object.values(doctor.horario).some((d: any) => d?.activo || d?.abierto))
        const checks = [
      !!doctor.photo_url,
      !!(doctor.about_me && doctor.about_me.length > 100),
      !!(doctor.clinic_lat && doctor.clinic_lng),
          tieneHorarioActivo,
      !!(doctor.consultation_price_first_time && doctor.consultation_price_general),
      !!(doctor.phone || doctor.whatsapp_phone || doctor.clinic_phone),
      !!(Array.isArray(doctor.languages) && doctor.languages.length >= 1),
          (expRes.data?.length || 0) > 0,
          (eduRes.data?.length || 0) > 0,
          (condRes.data?.length || 0) > 0,
        ]
        const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100)
        setProfileCompletion(pct)

        const consejos = []
        if (!tieneHorarioActivo) consejos.push({
          id: 'horario',
          titulo: 'Configura tu horario',
          descripcion: 'Los pacientes solo agendan cuando ven disponibilidad',
          impacto: '+35% más citas',
          cta: 'Configurar',
          link: '/dashboard/horario',
          color: '#8B5CF6'
        })
        if (!doctor.photo_url) consejos.push({
          id: 'foto',
          titulo: 'Sube tu foto profesional',
          descripcion: 'Perfiles con foto generan 3× más confianza',
          impacto: '+200% confianza',
          cta: 'Subir foto',
          link: '/dashboard/editar-perfil',
          color: '#1E3A5F'
        })
        if (!doctor.consultation_price_first_time ||!doctor.consultation_price_general) consejos.push({
          id: 'precios',
          titulo: 'Publica tus precios',
          descripcion: 'Transparencia aumenta las reservas',
          impacto: '+28% reservas',
          cta: 'Agregar precios',
          link: '/dashboard/editar-perfil',
          color: '#D97706'
        })
        if (!doctor.about_me || doctor.about_me.length < 100) consejos.push({
          id: 'bio',
          titulo: 'Escribe tu biografía',
          descripcion: 'Cuenta tu experiencia y enfoque',
          impacto: '+50% conversión',
          cta: 'Escribir',
          link: '/dashboard/editar-perfil',
          color: '#2A9D8F'
        })
        if (!(doctor.clinic_lat && doctor.clinic_lng)) consejos.push({
          id: 'ubicacion',
          titulo: 'Agrega tu ubicación exacta',
          descripcion: 'Pacientes buscan médicos cercanos con GPS',
          impacto: '+40% visibilidad',
          cta: 'Agregar',
          link: '/dashboard/editar-perfil',
          color: '#8B5CF6'
        })
        if (!(doctor.phone || doctor.whatsapp_phone || doctor.clinic_phone)) consejos.push({
          id: 'contacto',
          titulo: 'Agrega teléfono o WhatsApp',
          descripcion: 'Pacientes necesitan contactarte',
          impacto: '+60% contactos',
          cta: 'Agregar',
          link: '/dashboard/editar-perfil',
          color: '#DC2626'
        })
        if ((eduRes.data?.length || 0) === 0) consejos.push({
          id: 'educacion',
          titulo: 'Agrega tu formación',
          descripcion: 'Tu preparación genera confianza',
          impacto: '+25% credibilidad',
          cta: 'Agregar',
          link: '/dashboard/editar-perfil',
          color: '#1E3A5F'
        })

        if (consejos.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(3, consejos.length))
          setConsejo(consejos[randomIndex])
        } else {
          setConsejo(null)
        }

      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const handleCopyLink = async () => {
    if (!medico) return
    const url = `https://salurama.mx/doctor/${medico.id}`
    await navigator.clipboard.writeText(url)
    setShowShareMenu(false)
  }

  const handleShareWhatsApp = () => {
    if (!medico) return
    const url = `https://salurama.mx/doctor/${medico.id}`
    const titulo = medico.professional_title || 'Dr.'
    const nombre = medico.full_name
    const especialidad = medico.specialty
    const ciudad = medico.location_city
    const text = `Soy ${titulo} ${nombre}, ${especialidad} en ${ciudad}.\n\nAgenda tu cita en línea:\n${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    setShowShareMenu(false)
  }

  const saludo = () => {
    const h = new Date().getHours()
    return h < 12? 'Buenos días' : h < 19? 'Buenas tardes' : 'Buenas noches'
  }

  const nombreCorto = () => {
    if (!medico) return ''
    const p = medico.full_name.trim().split(/\s+/)
    return p.length === 1? p[0] : `${p[0]} ${p[p.length-1]}`
  }

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width:40, height:40, border:'3px solid #E5E7EB', borderTopColor:'#1E3A5F', borderRadius:'50%', animation:'s.8s linear infinite' }}/>
      </div>
    )
  }
  if (!medico) return null

  return (
    <div style={{ minHeight:'100vh', background:'#F9FAFB', fontFamily:"'DM Sans',sans-serif", paddingBottom: isMobile?80:0 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;600&display=swap');`}</style>

<div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px 0' }}>
  <div style={{ background:'#fff', borderRadius:16, padding:24, border:'1px solid #E5E7EB', display:'flex', gap:20, flexDirection: isMobile? 'column' : 'row', alignItems: isMobile? 'center' : 'center', textAlign: isMobile? 'center' : 'left' }}>
    {medico.photo_url? (
      <img onClick={()=>setShowPhotoModal(true)} src={`${medico.photo_url}?t=${photoTs}`} alt="" style={{ width:96, height:96, borderRadius:'50%', objectFit:'cover', cursor:'pointer', border:'3px solid #E5E7EB', flexShrink:0 }}/>
    ) : (
      <div style={{ width:96, height:96, borderRadius:'50%', background:'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:36, fontFamily:'Fraunces', flexShrink:0 }}>
        {medico.full_name[0]}
      </div>
    )}
    <div style={{ flex:1, width: '100%' }}>
      <h1 style={{ fontFamily:'Fraunces', fontSize:24, fontWeight:900, marginBottom:16 }}>{saludo()}, {nombreCorto()}</h1>

      <div style={{ display:'flex', gap:12, flexDirection: isMobile? 'column' : 'row', position:'relative' }}>
        <Link href="/dashboard/editar-perfil" style={{ background:'#1E3A5F', color:'#fff', padding:'10px 20px', borderRadius:12, fontSize:14, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, height:40, boxSizing:'border-box' }}>
          <Edit2 size={16}/>Editar perfil
        </Link>
        <button onClick={()=>router.push(`/doctor/${medico.id}`)} style={{ background:'#fff', color:'#1E3A5F', border:'1.5px solid #E5E7EB', padding:'10px 20px', borderRadius:12, fontSize:14, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', height:40, boxSizing:'border-box' }}>
          <Eye size={16}/>Ver perfil
        </button>
        <div style={{ position:'relative' }}>
          <button onClick={()=>setShowShareMenu(!showShareMenu)} style={{ background:'#fff', color:'#1E3A5F', border:'1.5px solid #E5E7EB', padding:'10px 20px', borderRadius:12, fontSize:14, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer', height:40, boxSizing:'border-box', width: isMobile? '100%' : 'auto' }}>
            <Share2 size={16}/>Compartir
          </button>
          {showShareMenu && (
            <div style={{ position:'absolute', top:'100%', right:0, marginTop:8, background:'#fff', border:'1px solid #E5E7EB', borderRadius:12, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:10, minWidth:200, overflow:'hidden' }}>
              <button onClick={handleShareWhatsApp} style={{ width:'100%', padding:'12px 16px', border:'none', background:'none', textAlign:'left', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8, borderBottom:'1px solid #F3F4F6' }}>
                <MessageCircle size={16} color="#25D366"/>WhatsApp
              </button>
              <button onClick={handleCopyLink} style={{ width:'100%', padding:'12px 16px', border:'none', background:'none', textAlign:'left', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                <Copy size={16}/>Copiar link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</div>

            <div style={{ maxWidth:1100, margin:'16px auto 0', padding:'0 16px' }}>
        <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>Perfil completado: {profileCompletion}%</span>
          </div>
          <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${profileCompletion}%`, background: profileCompletion >= 80? '#2A9D8F' : profileCompletion >= 50? '#F59E0B' : '#1E3A5F', transition: 'width 0.4s ease', borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {consejo && (
        <div style={{ maxWidth:1100, margin:'16px auto 0', padding:'0 16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
            border: '1.5px solid #DDD6FE',
            borderRadius:12,
            padding:16,
            display:'flex',
            alignItems:'flex-start',
            gap:12
          }}>
            <div style={{
              width:36,
              height:36,
              borderRadius:10,
              background: consejo.color,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              flexShrink:0
            }}>
              <Lightbulb size={18} color="#fff" />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                <p style={{ fontWeight:700, fontSize:14, color:'#1E3A5F' }}>{consejo.titulo}</p>
                <span style={{
                  fontSize:11,
                  fontWeight:700,
                  color:'#fff',
                  background: consejo.color,
                  padding:'2px 8px',
                  borderRadius:12,
                  whiteSpace:'nowrap'
                }}>
                  {consejo.impacto}
                </span>
              </div>
              <p style={{ fontSize:13, color:'#6B7280', marginBottom:8, lineHeight:1.4 }}>{consejo.descripcion}</p>
              <Link href={consejo.link} prefetch={true} style={{
                background:'none',
                border:'none',
                color: consejo.color,
                fontSize:13,
                fontWeight:600,
                textDecoration:'none',
                display:'inline-flex',
                alignItems:'center',
                gap:4,
                padding:0,
                fontFamily:"'DM Sans', sans-serif"
              }}>
                {consejo.cta} <ArrowRight size={14}/>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:1100, margin:'16px auto 0', padding:'0 16px' }}>
        <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(2,1fr)', gap:16 }}>
          <div style={{ background:'#fff', padding:24, borderRadius:16, border:'1px solid #E5E7EB' }}>
            <p style={{ fontSize:11, color:'#9CA3AF', textTransform:'uppercase', fontWeight:600 }}>Solicitudes</p>
            <p style={{ fontSize:32, fontFamily:'Fraunces', fontWeight:900, color:'#1E3A5F', margin:'8px 0' }}>{stats?.citas_solicitadas_totales || 0}</p>
            <div style={{ display:'flex', alignItems:'center', gap:4, color:'#059669', fontSize:12 }}><TrendingUp size={14}/>{stats?.citas_solicitadas_mes || 0} este mes</div>
          </div>
          <div style={{ background:'#fff', padding:24, borderRadius:16, border:'1px solid #E5E7EB' }}>
            <p style={{ fontSize:11, color:'#9CA3AF', textTransform:'uppercase', fontWeight:600 }}>Calificación</p>
            <div style={{ display:'flex', alignItems:'baseline', gap:6, margin:'8px 0' }}>
              <p style={{ fontSize:32, fontFamily:'Fraunces', fontWeight:900, color:'#1E3A5F' }}>{stats?.rating_promedio || '0.0'}</p>
              <span style={{ color:'#9CA3AF' }}>/5</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:4, color:'#6B7280', fontSize:12 }}><Users size={14}/>{stats?.reseñas_count? `${stats.reseñas_count} reseñas` : 'Sin reseñas'}</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'16px auto 20px', padding:'0 16px' }}>
        <div style={{ background:'#fff', padding:24, borderRadius:16, border:'1px solid #E5E7EB' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontFamily:'Fraunces', fontSize:20, fontWeight:900 }}>Citas de Hoy</h2>
            <Link href="/dashboard/citas" prefetch={true} style={{ color:'#1E3A5F', fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>Ver todas<ChevronRight size={14}/></Link>
          </div>
          {citasHoy.length? citasHoy.map(c => (
            <div key={c.id} style={{ background:'#F9FAFB', padding:16, borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, borderLeft:`4px solid ${c.status==='confirmada'?'#059669':'#F59E0B'}` }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:c.status==='confirmada'?'#059669':'#F59E0B', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{c.patient_name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                <div>
                  <p style={{ fontWeight:600, fontSize:14 }}>{c.patient_name}</p>
                  <p style={{ fontSize:13, color:'#6B7280' }}>{c.requested_time} • {c.status==='confirmada'?'Confirmada':'Por confirmar'}</p>
                </div>
              </div>
              <MoreVertical size={18} color="#9CA3AF"/>
            </div>
          )) : (
            <div style={{ textAlign:'center', padding:40, background:'#F9FAFB', borderRadius:12 }}>
              <Calendar size={40} color="#9CA3AF" style={{ margin:'0 auto 12px' }}/>
              <p style={{ color:'#6B7280' }}>Sin citas para hoy</p>
            </div>
          )}
        </div>
      </div>

      {showPhotoModal && medico.photo_url && (
        <div onClick={()=>setShowPhotoModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 }}>
          <X size={24} color="#fff" style={{ position:'absolute', top:20, right:20, cursor:'pointer' }}/>
          <img src={`${medico.photo_url}?t=${photoTs}`} style={{ maxWidth:'90%', maxHeight:'90%', borderRadius:12 }} alt=""/>
        </div>
      )}
    </div>
  )
}