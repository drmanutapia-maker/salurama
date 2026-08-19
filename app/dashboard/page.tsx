'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  X, ZoomIn, Calendar, Edit2, Eye, Share2,
  Star, Users, MoreVertical, Lightbulb,
  CheckCircle, ArrowRight,
  PartyPopper, Sparkles, Megaphone, AlertCircle, Banknote
} from 'lucide-react'
import { calculateProfileCompletion } from '@/hooks/useProfileCompletion'
import { isManuelEmail } from '@/lib/manuelOnly'
import { fechaISOLocal } from '@/lib/citas/fechas'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'

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
  user_id?: string
  cofepris_aviso_numero: string | null
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
  ingresos_mes: number
  ingresos_total: number
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
  const [error, setError] = useState<PageErrorType | null>(null)
  const cancelRef = useRef(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [specialtyWarnings, setSpecialtyWarnings] = useState<string[]>([])

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

  // Permite cerrar el modal de foto con teclado (Escape) — antes solo se
  // podía cerrar haciendo clic, sin forma de salir sin mouse.
  useEffect(() => {
    if (!showPhotoModal) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPhotoModal(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showPhotoModal])

  // Se marca en true recién después de que getUser() resuelve la primera
  // vez — antes de eso, un evento INITIAL_SESSION con session=null (llega
  // mientras el cliente todavía está leyendo la cookie, justo después de un
  // window.location.href) causaba un rebote falso a /login.
  const initialCheckDoneRef = useRef(false)

  // Carga principal de datos — expuesta como función con useCallback (no
  // solo dentro del useEffect) para que el botón "Reintentar" del estado de
  // error pueda volver a llamarla sin duplicar toda la lógica.
  const load = useCallback(async () => {
    cancelRef.current = false
    setLoading(true)
    setError(null)
    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr) throw userErr
      initialCheckDoneRef.current = true
      if (!user) { router.replace('/login'); return }

      let { data: doctor, error: doctorErr } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (doctorErr) throw doctorErr

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

      if (cancelRef.current) return
      setMedico(doctor)

        const hoy = fechaISOLocal(new Date())
        const inicioMes = new Date()
        inicioMes.setDate(1)
        const inicioMesStr = inicioMes.toISOString().split('T')[0]

        const [citasHoyRes, completadasRes, eduRes, expRes, condRes, visitasRes, specialtyCredRes] = await Promise.all([
          supabase.from('citas')
            .select('id, paciente_nombre, fecha, hora, estado')
            .eq('medico_id', doctor.id)
            .gte('fecha', hoy)
            .in('estado', ['pending_verification', 'confirmed'])
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true })
            .limit(1),
          // Todas las citas completadas históricas -- de aquí se calculan los
          // "ingresos estimados". No hay columna de precio ni de tipo de cita
          // (primera vez / subsecuente) guardada en `citas`, así que se
          // aproxima con el precio ACTUAL del perfil y clasificando cada cita
          // como "primera vez" si es la primera completada de ese paciente
          // con este médico (por paciente_id), igual que hace el flujo de
          // agendar cuando el dato es ambiguo.
          supabase.from('citas')
            .select('id, paciente_id, fecha')
            .eq('medico_id', doctor.id)
            .eq('estado', 'completed'),
          supabase.from('doctor_education').select('id').eq('doctor_id', doctor.id),
          supabase.from('doctor_experience').select('id').eq('doctor_id', doctor.id),
          supabase.from('doctor_conditions').select('id').eq('doctor_id', doctor.id),
          fetch('/api/track-visit').then(r => r.ok ? r.json() : { count: 0 }).catch(() => ({ count: 0 })),
          supabase.from('doctor_specialty_credentials')
            .select('credentials_status, self_declared_not_current, specialty_granular_mapping(granular_name)')
            .eq('doctor_id', doctor.id),
        ])

        // Especialidades con el aviso de "certificación pendiente" — el médico
        // se auto-declaró "no vigente" al capturarla, o un admin la marcó
        // 'no_coincide' en /admin/medicos. Por especialidad, no por médico.
        setSpecialtyWarnings((specialtyCredRes.data || [])
          .filter((r: any) => r.self_declared_not_current || r.credentials_status === 'no_coincide')
          .map((r: any) => r.specialty_granular_mapping?.granular_name)
          .filter(Boolean))

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
        // Total histórico (no mesActual): el desglose mensual ya vive en
        // /dashboard/estadisticas, aquí no se duplica.
        const visitasMes = visitasRes.count || 0

        // Ingresos estimados: no hay precio ni tipo de cita (primera vez /
        // subsecuente) guardado por cita, solo el precio ACTUAL del perfil.
        // Se recorren las citas completadas en orden cronológico y, por
        // paciente, la primera que aparece se cuenta como "primera vez" y el
        // resto como "subsecuente" -- una aproximación, no el precio real
        // que se cobró en su momento. Citas sin paciente_id (registros
        // antiguos) se tratan como "primera vez" cada una, igual que el
        // criterio ya usado al agendar cuando el dato es ambiguo.
        const precioPrimera = doctor.consultation_price_first_time ?? doctor.consultation_price_general ?? 0
        const precioSubsecuente = doctor.consultation_price_general ?? doctor.consultation_price_first_time ?? 0
        const completadas = [...(completadasRes.data || [])].sort((a, b) => a.fecha.localeCompare(b.fecha))
        const pacientesVistos = new Set<string>()
        let ingresosMes = 0
        let ingresosTotal = 0
        for (const c of completadas) {
          const esPrimeraVez = !c.paciente_id || !pacientesVistos.has(c.paciente_id)
          if (c.paciente_id) pacientesVistos.add(c.paciente_id)
          const precio = esPrimeraVez ? precioPrimera : precioSubsecuente
          ingresosTotal += precio
          if (c.fecha >= inicioMesStr) ingresosMes += precio
        }

        setStats({
          visitas_mes: visitasMes,
          ingresos_mes: ingresosMes,
          ingresos_total: ingresosTotal,
          rating_promedio: parseFloat(Number(ratingData.promedio || 0).toFixed(1)),
          reseñas_count: ratingData.total || 0
        })

        // ✅ NUEVO CÓDIGO (10 checks unificados)
        const tieneHorarioActivo = !!(doctor.horario && Object.values(doctor.horario).some((d: any) => d?.activo || d?.abierto))
        const tieneUbicacionVerificada = !!(doctor.clinic_lat && doctor.clinic_lng)
        const tieneTelefono = !!(doctor.phone || doctor.clinic_phone || doctor.whatsapp_phone)

        const { percentage: pct } = calculateProfileCompletion({
          medico: doctor,
          experienceCount: expRes.data?.length || 0,
          educationCount: eduRes.data?.length || 0,
          conditionsCount: condRes.data?.length || 0,
        })
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
          // La bio siempre se muestra primero mientras esté incompleta — es
          // la señal más importante para que el perfil no se vea como
          // contenido genérico/duplicado ante buscadores, así que no debe
          // depender de la suerte del orden aleatorio como el resto.
          const bioConsejo = consejosDisponibles.find(c => c.id === 'bio')
          const otros = consejosDisponibles.filter(c => c.id !== 'bio')
          const shuffled = [...otros].sort(() => Math.random() - 0.5)
          setConsejo(bioConsejo || shuffled[0])
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
      if (!cancelRef.current) {
        console.error(err)
        setError(classifyError(err))
      }
    } finally {
      if (!cancelRef.current) setLoading(false)
    }
  }, [router])

  useEffect(() => {
    initialCheckDoneRef.current = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!initialCheckDoneRef.current) return
      if (!session) router.replace('/login')
    })
    load()
    return () => { cancelRef.current = true; subscription.unsubscribe() }
  }, [load, router])

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

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <PageErrorState type={error} onRetry={load} />
      </div>
    )
  }

  if (loading || !medico) {
    return <DashboardSkeleton isMobile={isMobile} />
  }

  const esPerfilCompleto = consejo?.id === 'completo'
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/doctor/${medico.id}`
  const fechaHoyLegible = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

  const formatProximaFecha = (fechaStr: string) => {
    const hoy = fechaISOLocal(new Date())
    const manana = fechaISOLocal(new Date(Date.now() + 86400000))
    if (fechaStr === hoy) return 'Hoy'
    if (fechaStr === manana) return 'Mañana'
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatMonto = (monto: number) => `$${monto.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

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
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              aria-label="Ver foto de perfil ampliada"
              style={{ width: 96, height: 96, borderRadius: '50%', padding: 0, border: '3px solid #E5E7EB', background: 'none', cursor: 'pointer', flexShrink: 0, overflow: 'hidden' }}
            >
              <img
                src={`${medico.photo_url}?t=${photoTs}`}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          ) : (
            <div aria-hidden="true" style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 36, fontFamily: 'Fraunces', fontWeight: 900, flexShrink: 0 }}>
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
                aria-label={copied ? 'Link copiado' : 'Compartir perfil'}
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
          AVISO DE CERTIFICACIÓN DE ESPECIALIDAD — privado, solo lo ve el
          propio médico. Fijo (no rota como los "consejos" de abajo). Ahora
          es por especialidad (doctor_specialty_credentials), no un solo
          campo por médico — se activa por cada especialidad donde el médico
          se auto-declaró "no vigente" al capturarla, o un admin la marcó
          'no_coincide' en /admin/medicos. Esas especialidades ya están
          ocultas del perfil público (ver DoctorProfileClient.tsx).
      ═══════════════════════════════════════════════════════════ */}
      {specialtyWarnings.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
          <div style={{
            background: '#FFFBEB',
            border: '1.5px solid #FEF3C7',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={20} color="#D97706" />
            </div>
            <div>
              <p style={{ fontFamily: 'Fraunces', fontWeight: 900, fontSize: 15, color: '#92400E', margin: '0 0 4px' }}>
                Certificación de especialidad pendiente
              </p>
              <p style={{ fontSize: 14, color: '#78350F', margin: 0, lineHeight: 1.5 }}>
                Aún no confirmas tu vigencia en: {specialtyWarnings.join(', ')}. Actualiza tu certificación para mantener tu perfil completo.
              </p>
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
          INVITACIÓN COFEPRIS — servicio opcional, independiente del
          "consejo" de arriba a propósito: no debe impedir que se
          muestre "¡Perfil completo!" ni contarse en profileCompletion,
          ya que no es parte de la completitud del perfil público.
      ═══════════════════════════════════════════════════════════ */}
      {medico && !medico.cofepris_aviso_numero && isManuelEmail(medico.email) && (
        <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
          <div className="fade-in" style={{
            background: 'linear-gradient(135deg, #E8F7F5 0%, #D1FAE5 100%)',
            border: '1.5px solid #9FD8CD',
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, width: '100%' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2A9D8F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Megaphone size={22} color="#fff" />
              </div>
              <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
                <p style={{ fontFamily: 'Fraunces', fontWeight: 900, fontSize: 16, color: '#1D6F65', margin: '0 0 6px' }}>
                  Formaliza tu Aviso de Publicidad ante COFEPRIS
                </p>
                <p style={{ fontSize: 14, color: '#4A5568', margin: 0, lineHeight: 1.5 }}>
                  Te ayudamos a preparar la documentación. Es un servicio opcional, no afecta tu perfil ni tu visibilidad.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/cofepris"
              prefetch={true}
              className="btn-hover"
              style={{
                background: '#2A9D8F', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                width: isMobile ? '100%' : 'auto', justifyContent: 'center', minHeight: 48,
              }}
            >
              Empezar <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          STATS CARDS (3 métricas clave)
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          
          {/* VISITAS */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>Vistas totales</p>
              <Eye size={18} color="#8B5CF6" />
            </div>
            <p style={{ fontSize: 32, fontFamily: 'Fraunces', fontWeight: 900, color: '#1E3A5F', margin: '8px 0', lineHeight: 1 }}>
              {stats?.visitas_mes || 0}
            </p>
            <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4, margin: 0 }}>
              Acumulando datos desde el {fechaHoyLegible}. La tendencia estará disponible próximamente
            </p>
          </div>

          {/* INGRESOS ESTIMADOS */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>Ingresos estimados</p>
              <Banknote size={18} color="#2A9D8F" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0' }}>
              <p style={{ fontSize: 32, fontFamily: 'Fraunces', fontWeight: 900, color: '#1E3A5F', lineHeight: 1 }}>
                {formatMonto(stats?.ingresos_mes || 0)}
              </p>
              <span style={{ color: '#6B7280', fontSize: 12 }}>este mes</span>
            </div>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>{formatMonto(stats?.ingresos_total || 0)}</span> acumulado desde siempre
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              Calculado según citas marcadas como completadas
            </p>
            <Link
              href="/dashboard/estadisticas"
              style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4, color: '#2A9D8F', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            >
              <ArrowRight size={14} aria-hidden="true" /> Ver estadísticas completas
            </Link>
          </div>

          {/* CALIFICACIÓN */}
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700, margin: 0, letterSpacing: '0.05em' }}>Calificación</p>
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '8px 0' }}>
              <p style={{ fontSize: 32, fontFamily: 'Fraunces', fontWeight: 900, color: '#1E3A5F', lineHeight: 1 }}>
                {stats?.rating_promedio || '0.0'}
              </p>
              <span style={{ color: '#6B7280', fontSize: 14 }}>/5</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: 12, marginTop: 8 }}>
              <Users size={14} />
              {stats?.reseñas_count ? `${stats.reseñas_count} reseñas` : 'Sin reseñas aún'}
            </div>
            <Link
              href="/dashboard/resenas"
              style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 4, color: '#2A9D8F', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
            >
              <ArrowRight size={14} aria-hidden="true" /> Ver reseñas
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ACTIVIDAD RECIENTE
      ═══════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 900, color: '#1E3A5F', margin: 0 }}>
              Actividad Reciente
            </h2>
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
              <p style={{ color: '#6B7280', fontSize: 13, margin: '4px 0 0' }}>Las solicitudes aparecerán aquí</p>
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
          role="dialog"
          aria-modal="true"
          aria-label="Foto de perfil ampliada"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}
        >
          <button
            type="button"
            onClick={() => setShowPhotoModal(false)}
            aria-label="Cerrar foto ampliada"
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex' }}
          >
            <X size={24} color="#fff" aria-hidden="true" />
          </button>
          <img src={`${medico.photo_url}?t=${photoTs}`} style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12 }} alt={`Foto de perfil de ${medico.full_name}`} />
        </div>
      )}
    </div>
  )
}

// Skeleton del dashboard principal — refleja la misma estructura de
// tarjetas que la página real (encabezado, progreso, tarjeta de consejo,
// 3 métricas, actividad reciente) para que la transición a los datos
// reales no salte ni cambie de layout.
function DashboardSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: isMobile ? 80 : 0 }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando tu panel…
      </span>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 20px' }}>
        {/* Encabezado */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', display: 'flex', gap: 20, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start' }}>
          <Skeleton width={96} height={96} radius={999} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: isMobile ? 'center' : 'flex-start' }}>
            <Skeleton width={220} height={26} />
            <Skeleton width={140} height={16} />
            <div style={{ display: 'flex', gap: 12, marginTop: 10, width: isMobile ? '100%' : 'auto' }}>
              <Skeleton width={isMobile ? '100%' : 150} height={44} radius={12} />
              <Skeleton width={isMobile ? '100%' : 120} height={44} radius={12} />
            </div>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <Skeleton width={140} height={16} />
            <Skeleton width={36} height={16} />
          </div>
          <Skeleton width="100%" height={8} radius={99} />
        </div>
      </div>

      {/* Tarjeta de consejo */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB', display: 'flex', gap: 14, alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
          <Skeleton width={44} height={44} radius={12} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skeleton width={200} height={16} />
            <Skeleton width="80%" height={14} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Skeleton width={80} height={11} />
                <Skeleton width={18} height={18} radius={4} />
              </div>
              <Skeleton width={70} height={32} style={{ marginBottom: 10 }} />
              <Skeleton width={110} height={12} />
            </div>
          ))}
        </div>
      </div>

      {/* Actividad reciente */}
      <div style={{ maxWidth: 1100, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, border: '1px solid #E5E7EB' }}>
          <Skeleton width={180} height={20} style={{ marginBottom: 20 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1].map(i => (
              <div key={i} style={{ background: '#F9FAFB', padding: 16, borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                <Skeleton width={44} height={44} radius={999} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton width="50%" height={14} />
                  <Skeleton width="70%" height={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}