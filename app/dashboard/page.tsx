'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  X, ZoomIn, Calendar, Edit2, Eye, Share2,
  Star, Users, MoreVertical, Lightbulb,
  CheckCircle, ArrowRight,
  PartyPopper, Sparkles
} from 'lucide-react'
import { PLAN_TO_TIER_CODE } from '@/lib/pricingTiers'

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  photo_url: string | null
  phone: string | null
  whatsapp_phone: string | null
  whatsapp_available: boolean
  is_active: boolean
  professional_license: string | null
  about_me: string | null
  horario: any
  languages: string[] | string | null
  consultation_price_first_time: number | null
  consultation_price_general: number | null
  clinic_address: string | null
  ciudad: string | null
  estado: string | null
  pricing_tier: string | null
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
  visitas_mes: number
  citas_solicitadas_totales: number
  citas_solicitadas_mes: number
  citas_pendientes: number
  rating_promedio: number
  reseñas_count: number
}

interface Consejo {
  id: string
  titulo: string
  descripcion: string
  impacto: string
  cta?: string
  link?: string
  color: string
  completo?: boolean
}

export default function DashboardMedico() {
  const router = useRouter()
  const [medico, setMedico] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPhotoModal, setShowPhotoModal] = useState(false)

  const [copied, setCopied] = useState(false)
  const [citasHoy, setCitasHoy] = useState<Cita[]>([])
  const [stats, setStats] = useState<StatsResumen | null>(null)
  const [consejo, setConsejo] = useState<Consejo | null>(null)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [photoTs] = useState(() => Date.now())
  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Carga principal de datos
  useEffect(() => {
    let mounted = true
    // El evento INITIAL_SESSION puede llegar con session=null mientras el
    // cliente todavía está leyendo la cookie (justo después de un
    // window.location.href), antes de que getUser() confirme la sesión real
    // más abajo — eso causaba un rebote falso a /login. Se ignora ese evento
    // y no se reacciona a ningún evento hasta que la carga inicial resuelva.
    let initialCheckDone = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!initialCheckDone) return
      if (!session && mounted) router.replace('/login')
    })

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        initialCheckDone = true
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
            doctor = { ...byEmail, user_id: user.id }
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

        const inicioMesAnterior = new Date()
        inicioMesAnterior.setMonth(inicioMesAnterior.getMonth() - 1)
        const inicioMesAnteriorStr = inicioMesAnterior.toISOString().split('T')[0]

        const [citasHoyRes, totalesRes, mesRes, mesAnteriorRes, pendientesRes, eduRes, expRes, condRes, visitasRes] = await Promise.all([
          supabase.from('citas')
            .select('id, paciente_nombre, fecha, hora, estado')
            .eq('medico_id', doctor.id)
            .gte('fecha', hoy)
            .in('estado', ['pending_verification', 'confirmed'])
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true })
            .limit(1),
          supabase.from('citas')
            .select('*', { count: 'exact', head: true })
            .eq('medico_id', doctor.id)
            .eq('estado', 'pending_verification'),
          supabase.from('citas')
            .select('*', { count: 'exact', head: true })
            .eq('medico_id', doctor.id)
            .eq('estado', 'pending_verification')
            .gte('fecha', inicioMesStr),
          supabase.from('citas')
            .select('*', { count: 'exact', head: true })
            .eq('medico_id', doctor.id)
            .eq('estado', 'pending_verification')
            .gte('fecha', inicioMesAnteriorStr)
            .lt('fecha', inicioMesStr),
          supabase.from('citas')
            .select('*', { count: 'exact', head: true })
            .eq('medico_id', doctor.id)
            .in('estado', ['pending_verification', 'confirmed'])
            .gte('fecha', hoy),
          supabase.from('doctor_education').select('id').eq('doctor_id', doctor.id),
          supabase.from('doctor_experience').select('id').eq('doctor_id', doctor.id),
          supabase.from('doctor_conditions').select('id').eq('doctor_id', doctor.id),
          fetch('/api/track-visit').then(r => r.ok ? r.json() : { count: 0 }).catch(() => ({ count: 0 })),
        ])

        setCitasHoy((citasHoyRes.data || []).map((c: any) => ({
          id: c.id,
          patient_name: c.paciente_nombre,
          requested_date: c.fecha,
          requested_time: c.hora?.slice(0, 5),
          status: c.estado === 'pending_verification' ? 'solicitada' : c.estado === 'confirmed' ? 'confirmada' : c.estado,
        })))

        // Rating
        let ratingData = { promedio: 0, total: 0 }
        try {
          const r = await supabase.rpc('get_doctor_rating', { doctor_uuid: doctor.id })
          ratingData = r.data?.[0] || ratingData
        } catch {}

        // Visitas — cuenta real desde profile_views (tabla), no el viejo
        // contador doctors.profile_views (columna): ese solo se incrementaba
        // cuando el propio médico veía su perfil, por RLS (auth.uid()=user_id
        // / auth.email()=email en las políticas de UPDATE de doctors) — un
        // visitante real nunca pudo escribirlo. profile_views (tabla) sí
        // excluye auto-visitas correctamente vía app/api/track-visit.
        const visitasMes = visitasRes.count || 0

        setStats({
          visitas_mes: visitasMes,
          citas_solicitadas_totales: totalesRes.count || 0,
          citas_solicitadas_mes: mesRes.count || 0,
          citas_pendientes: pendientesRes.count || 0,
          rating_promedio: parseFloat(Number(ratingData.promedio || 0).toFixed(1)),
          reseñas_count: ratingData.total || 0
        })

        // ✅ NUEVO CÓDIGO (10 checks unificados)
        const tieneHorarioActivo = !!(doctor.horario && Object.values(doctor.horario).some((d: any) => d?.activo || d?.abierto))
        const tieneUbicacionVerificada = !!(doctor.clinic_lat && doctor.clinic_lng)
        const tieneTelefono = !!(doctor.phone || doctor.clinic_phone || doctor.whatsapp_phone)

        const checks = [
          !!doctor.photo_url,
          !!(doctor.about_me && doctor.about_me.length > 100),
          tieneUbicacionVerificada,
          tieneHorarioActivo,
          !!(doctor.consultation_price_first_time && doctor.consultation_price_general),
          tieneTelefono,
          !!(Array.isArray(doctor.languages) && doctor.languages.length >= 1),
          (expRes.data?.length || 0) > 0,
          (eduRes.data?.length || 0) > 0,
          (condRes.data?.length || 0) > 0,
        ]
        const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100)
        setProfileCompletion(pct)

        // CONSEJOS INTELIGENTES (basados en los 10 checks unificados)
        const consejosDisponibles: Consejo[] = []
        
        // 1. Foto
        if (!doctor.photo_url) consejosDisponibles.push({
          id: 'foto',
          titulo: 'Sube tu foto profesional',
          descripcion: 'Perfiles con foto generan 3× más confianza',
          impacto: '+200% confianza',
          cta: 'Subir foto',
          link: '/dashboard/editar-perfil',
          color: '#1E3A5F'
        })
        // 2. Biografía
        if (!doctor.about_me || doctor.about_me.length < 100) consejosDisponibles.push({
          id: 'bio',
          titulo: 'Escribe tu biografía',
          descripcion: 'Cuenta tu experiencia y enfoque profesional',
          impacto: '+50% conversión',
          cta: 'Escribir',
          link: '/dashboard/editar-perfil',
          color: '#2A9D8F'
        })
        // 3. Ubicación verificada
        if (!tieneUbicacionVerificada) consejosDisponibles.push({
          id: 'ubicacion',
          titulo: 'Verifica tu ubicación',
          descripcion: 'Sin coordenadas exactas no apareces en "Cerca de mí"',
          impacto: '+40% visibilidad',
          cta: 'Agregar dirección',
          link: '/dashboard/editar-perfil',
          color: '#8B5CF6'
        })
        // 4. Horario
        if (!tieneHorarioActivo) consejosDisponibles.push({
          id: 'horario',
          titulo: 'Configura tu horario',
          descripcion: 'Los pacientes solo agendan cuando ven disponibilidad',
          impacto: '+35% más citas',
          cta: 'Configurar',
          link: '/dashboard/horario',
          color: '#8B5CF6'
        })
        // 5. Precios
        if (!doctor.consultation_price_first_time || !doctor.consultation_price_general) consejosDisponibles.push({
          id: 'precios',
          titulo: 'Publica tus precios',
          descripcion: 'Transparencia aumenta las reservas',
          impacto: '+28% reservas',
          cta: 'Agregar precios',
          link: '/dashboard/editar-perfil',
          color: '#D97706'
        })
        // 6. Teléfono
        if (!tieneTelefono) consejosDisponibles.push({
          id: 'telefono',
          titulo: 'Agrega tu teléfono',
          descripcion: 'Pacientes necesitan contactarte directamente',
          impacto: '+30% contacto',
          cta: 'Agregar teléfono',
          link: '/dashboard/editar-perfil',
          color: '#1E3A5F'
        })
        // 7. Idiomas
        if (!(Array.isArray(doctor.languages) && doctor.languages.length >= 1)) consejosDisponibles.push({
          id: 'idiomas',
          titulo: 'Agrega idiomas',
          descripcion: 'Amplía tu alcance a pacientes extranjeros',
          impacto: '+20% alcance',
          cta: 'Agregar idiomas',
          link: '/dashboard/editar-perfil',
          color: '#2A9D8F'
        })
        // 8. Experiencia
        if ((expRes.data?.length || 0) === 0) consejosDisponibles.push({
          id: 'experiencia',
          titulo: 'Agrega tu experiencia',
          descripcion: 'Tus años de práctica y hospitales generan confianza',
          impacto: '+20% preferencia',
          cta: 'Agregar experiencia',
          link: '/dashboard/editar-perfil',
          color: '#2A9D8F'
        })
        // 9. Educación
        if ((eduRes.data?.length || 0) === 0) consejosDisponibles.push({
          id: 'educacion',
          titulo: 'Agrega tu formación',
          descripcion: 'Tu preparación académica genera credibilidad',
          impacto: '+25% credibilidad',
          cta: 'Agregar formación',
          link: '/dashboard/editar-perfil',
          color: '#1E3A5F'
        })
        // 10. Condiciones
        if ((condRes.data?.length || 0) === 0) consejosDisponibles.push({
          id: 'condiciones',
          titulo: 'Agrega enfermedades que tratas',
          descripcion: 'Pacientes te encuentran por padecimientos específicos',
          impacto: '+35% búsquedas',
          cta: 'Agregar condiciones',
          link: '/dashboard/editar-perfil',
          color: '#8B5CF6'
        })

        if (consejosDisponibles.length > 0) {
          // Orden aleatorio
          const shuffled = [...consejosDisponibles].sort(() => Math.random() - 0.5)
          setConsejo(shuffled[0])
        } else {
          // Perfil 100% completado
          setConsejo({
            id: 'completo',
            titulo: '¡Perfil completo!',
            descripcion: 'Tienes máxima visibilidad en búsquedas. Los pacientes te encuentran más fácil.',
            impacto: '',
            completo: true,
            color: '#2A9D8F'
          })
        }

      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false; subscription.unsubscribe() }
  }, [router])

  const saludo = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  }

  const nombreCorto = () => {
    if (!medico) return ''
    const p = medico.full_name.trim().split(/\s+/)
    return p.length === 1 ? p[0] : `${p[0]} ${p[p.length - 2] || p[1]}`
  }

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/doctor/${medico?.id}`
    const shareText = `Te recomiendo al Dr. ${medico?.full_name} - ${medico?.specialty} en Salurama. Verifica sus credenciales y agenda aquí:`
    if (navigator.share) {
      try {
        await navigator.share({ title: `Dr. ${medico?.full_name} en Salurama`, text: shareText, url: profileUrl })
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${profileUrl}`)
      } catch {
        const ta = document.createElement('textarea')
        ta.value = `${shareText} ${profileUrl}`
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 's .8s linear infinite' }} />
      </div>
    )
  }
  if (!medico) return null

  const esPerfilCompleto = consejo?.id === 'completo'
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/doctor/${medico.id}`
  const esProfesionalOMas = medico.pricing_tier === PLAN_TO_TIER_CODE.profesional
    || medico.pricing_tier === PLAN_TO_TIER_CODE.premium
    || medico.pricing_tier === PLAN_TO_TIER_CODE.clinica
  const fechaHoyLegible = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  const formatProximaFecha = (fechaStr: string) => {
    const hoy = new Date().toISOString().split('T')[0]
    const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    if (fechaStr === hoy) return 'Hoy'
    if (fechaStr === manana) return 'Mañana'
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", paddingBottom: isMobile ? 80 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes confetti { 0% { transform: translateY(0) rotate(0); opacity: 1; } 100% { transform: translateY(-20px) rotate(360deg); opacity: 0; } }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        .confetti-anim { animation: confetti 1s ease-out; }

        .btn-hover { transition: all 0.2s ease; }
        .btn-hover:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-hover:active { transform: translateY(0); }
        
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .header-buttons { flex-direction: column !important; width: 100%; }
          .header-buttons > * { width: 100% !important; justify-content: center; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 20px' }}>
        
        {/* ══════════════════════════════════════════════════════════
            HEADER MINIMALISTA
        ═══════════════════════════════════════════════════════════ */}
        <div className="fade-in" style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', textAlign: isMobile ? 'center' : 'left' }}>
          {medico.photo_url ? (
            <img
              onClick={() => setShowPhotoModal(true)}
              src={`${medico.photo_url}?t=${photoTs}`}
              alt=""
              style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: '3px solid #E5E7EB', flexShrink: 0 }}
            />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36, fontFamily: 'Fraunces', fontWeight: 900, flexShrink: 0 }}>
              {medico.full_name[0]}
            </div>
          )}
          <div style={{ flex: 1, width: '100%' }}>
            <h1 style={{ fontFamily: 'Fraunces', fontSize: 26, fontWeight: 900, marginBottom: 4, color: '#1E3A5F' }}>
              {saludo()}, {nombreCorto()}
            </h1>
            <p style={{ color: '#6B7280', fontSize: 14 }}>
              {medico.ciudad && medico.estado ? `${medico.ciudad}, ${medico.estado}` : 'Ubicación no disponible'}
            </p>
            <div className="header-buttons" style={{ display: 'flex', gap: 12, marginTop: 16, flexDirection: isMobile ? 'column' : 'row' }}>
              <Link
                href="/dashboard/editar-perfil"
                className="btn-hover"
                style={{ background: '#1E3A5F', color: '#fff', padding: isMobile ? '14px 20px' : '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 }}
              >
                <Edit2 size={16} /> Editar Perfil
              </Link>
              <button
                onClick={() => router.push(`/doctor/${medico.id}`)}
                className="btn-hover"
                style={{ background: '#fff', color: '#1E3A5F', border: '1.5px solid #E5E7EB', padding: isMobile ? '14px 20px' : '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 48 }}
              >
                <Eye size={16} /> Ver perfil
              </button>
              <button
                onClick={handleShare}
                className="btn-hover"
                style={isMobile
                  ? { background: '#fff', color: '#1E3A5F', border: '1.5px solid #E5E7EB', padding: '14px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 48 }
                  : { width: 36, height: 36, borderRadius: '50%', background: '#F5F3FF', border: '1.5px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#7C3AED', flexShrink: 0 }
                }
                title={copied ? '¡Link copiado!' : 'Compartir perfil'}
              >
                {isMobile
                  ? <>{copied ? '¡Link copiado!' : <><Share2 size={16} /> Compartir</>}</>
                  : <Share2 size={15} />
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          BARRA DE PROGRESO
          Oculta cuando el perfil ya está al 100% — a esa altura el
          banner verde de abajo ("¡Perfil completo!") ya lo comunica,
          mostrar ambos era redundante.
      ═══════════════════════════════════════════════════════════ */}
      {!esPerfilCompleto && (
        <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 900, color: '#1E3A5F', margin: 0 }}>
                Perfil completo
              </h3>
              <span style={{ fontSize: 14, fontWeight: 700, color: profileCompletion >= 80 ? '#2A9D8F' : profileCompletion >= 50 ? '#D97706' : '#1E3A5F' }}>
                {profileCompletion}%
              </span>
            </div>
            <div style={{ height: 8, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${profileCompletion}%`,
                  background: profileCompletion >= 80 ? 'linear-gradient(90deg, #2A9D8F, #059669)' : profileCompletion >= 50 ? 'linear-gradient(90deg, #D97706, #F59E0B)' : 'linear-gradient(90deg, #1E3A5F, #3B82F6)',
                  borderRadius: 99,
                  transition: 'width 0.6s ease-out'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TARJETA INTELIGENTE (consejo o festejo)
      ═══════════════════════════════════════════════════════════ */}
      {consejo && (
        <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
          <div className="fade-in" style={{
            background: esPerfilCompleto
              ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)'
              : 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
            border: `1.5px solid ${esPerfilCompleto ? '#A7F3D0' : '#DDD6FE'}`,
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 16,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {esPerfilCompleto && (
              <div style={{ position: 'absolute', top: 10, right: 20, fontSize: 24, opacity: 0.3 }}>
                🎉
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, width: '100%' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: consejo.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {esPerfilCompleto ? <PartyPopper size={22} color="#fff" /> : <Lightbulb size={22} color="#fff" />}
              </div>
              <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
                  <p style={{ fontFamily: 'Fraunces', fontWeight: 900, fontSize: 16, color: esPerfilCompleto ? '#065F46' : '#1E3A5F', margin: 0 }}>
                    {consejo.titulo}
                  </p>
                  {!esPerfilCompleto && consejo.impacto && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
                      background: consejo.color,
                      padding: '3px 10px',
                      borderRadius: 99
                    }}>
                      {consejo.impacto}
                    </span>
                  )}
                  {esPerfilCompleto && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#065F46',
                      background: '#A7F3D0',
                      padding: '3px 10px',
                      borderRadius: 99,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Sparkles size={12} /> 100%
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 14, color: esPerfilCompleto ? '#047857' : '#6B7280', margin: 0, lineHeight: 1.5 }}>
                  {consejo.descripcion}
                </p>
              </div>
            </div>
            {!esPerfilCompleto && (
              <Link
                href={consejo.link || '/dashboard'}
                prefetch={true}
                className="btn-hover"
                style={{
                  background: consejo.color,
                  color: '#fff',
                  padding: '12px 20px',
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: 'center',
                  minHeight: 48
                }}
              >
                {consejo.cta}
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STATS CARDS (3 métricas clave)
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          
          {/* VISITAS */}
          <Link
            href="/dashboard/estadisticas"
            className="card-hover"
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB', textDecoration: 'none', display: 'block', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>Visitas</p>
              <Eye size={18} color="#8B5CF6" />
            </div>
            <p style={{ fontSize: 32, fontFamily: 'Fraunces', fontWeight: 900, color: '#1E3A5F', margin: '8px 0', lineHeight: 1 }}>
              {stats?.visitas_mes || 0}
            </p>
            {esProfesionalOMas && (
              <p style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.4, margin: 0 }}>
                Acumulando datos desde el {fechaHoyLegible} — la tendencia estará disponible próximamente
              </p>
            )}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4, color: '#8B5CF6', fontSize: 13, fontWeight: 600 }}>
              Ver detalles <ArrowRight size={14} />
            </div>
          </Link>

          {/* SOLICITUDES */}
          <Link
            href="/dashboard/citas"
            className="card-hover"
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB', textDecoration: 'none', display: 'block', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>Solicitudes</p>
              <Calendar size={18} color="#2A9D8F" />
            </div>
            {(stats?.citas_solicitadas_totales ?? 0) === 0 ? (
              <>
                <p style={{ fontSize: 16, fontFamily: 'Fraunces', fontWeight: 900, color: '#1E3A5F', margin: '8px 0 4px', lineHeight: 1.3 }}>
                  Aún no tienes solicitudes
                </p>
                <div style={{ color: '#6B7280', fontSize: 12 }}>
                  Comparte tu perfil para conseguir la primera
                </div>
                <div
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare() }}
                  style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4, color: '#2A9D8F', fontSize: 13, fontWeight: 600 }}
                >
                  <Share2 size={14} /> Compartir perfil
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 32, fontFamily: 'Fraunces', fontWeight: 900, color: '#1E3A5F', margin: '8px 0', lineHeight: 1 }}>
                  {stats?.citas_pendientes || 0}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: 12, marginTop: 8 }}>
                  <Users size={14} />
                  <span style={{ fontWeight: 600 }}>{stats?.citas_solicitadas_mes || 0}</span>
                  <span style={{ color: '#9CA3AF', marginLeft: 4 }}>este mes</span>
                </div>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4, color: '#2A9D8F', fontSize: 13, fontWeight: 600 }}>
                  {(stats?.citas_pendientes ?? 0) > 0 ? 'Responder ahora' : 'Ver historial'} <ArrowRight size={14} />
                </div>
              </>
            )}
          </Link>

          {/* CALIFICACIÓN */}
          <div
            className="card-hover"
            style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB', cursor: 'pointer' }}
            onClick={() => router.push(`/doctor/${medico.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>Calificación</p>
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0' }}>
              <p style={{ fontSize: 32, fontFamily: 'Fraunces', fontWeight: 900, color: '#1E3A5F', lineHeight: 1 }}>
                {stats?.rating_promedio || '0.0'}
              </p>
              <span style={{ color: '#9CA3AF', fontSize: 14 }}>/5</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: 12, marginTop: 8 }}>
              <Users size={14} />
              {stats?.reseñas_count ? `${stats.reseñas_count} reseñas` : 'Sin reseñas aún'}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B', fontSize: 13, fontWeight: 600 }}>
              {stats?.reseñas_count === 0 ? 'Cómo conseguirlas' : 'Ver reseñas'} <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ACTIVIDAD RECIENTE
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 900, color: '#1E3A5F', margin: 0 }}>
              Actividad Reciente
            </h2>
            <Link href="/dashboard/estadisticas" style={{ color: '#1E3A5F', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver más <ArrowRight size={14} />
            </Link>
          </div>

          {citasHoy.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {citasHoy.map(c => (
                <div key={c.id} style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${c.status === 'confirmada' ? '#059669' : '#F59E0B'}` }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.status === 'confirmada' ? '#059669' : '#F59E0B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                      {c.patient_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.patient_name}</p>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: '2px 0 0' }}>
                        {formatProximaFecha(c.requested_date)} · {c.requested_time} • {c.status === 'confirmada' ? 'Confirmada' : 'Por confirmar'}
                      </p>
                    </div>
                  </div>
                  <MoreVertical size={18} color="#9CA3AF" style={{ flexShrink: 0, marginLeft: 8 }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, background: '#F9FAFB', borderRadius: 12 }}>
              <Calendar size={40} color="#9CA3AF" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>Sin próximas citas</p>
              <p style={{ color: '#9CA3AF', fontSize: 13, margin: '4px 0 0' }}>Las solicitudes aparecerán aquí</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MODAL DE FOTO
      ═══════════════════════════════════════════════════════════ */}
      {showPhotoModal && medico.photo_url && (
        <div
          onClick={() => setShowPhotoModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
        >
          <X size={24} color="#fff" style={{ position: 'absolute', top: 20, right: 20, cursor: 'pointer' }} />
          <img src={`${medico.photo_url}?t=${photoTs}`} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12 }} alt="" />
        </div>
      )}
    </div>
  )
}