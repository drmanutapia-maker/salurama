'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import {
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
  Eye, EyeOff, AlertCircle, ChevronDown, ExternalLink, ArrowUp, ArrowDown,
  Users, UserCheck, UserX, Gauge, Clock3, Megaphone, TrendingUp, CalendarCheck,
  Upload, FileText, X, Trash2, Star, MessageSquare,
} from 'lucide-react'
import { PLAN_NAME } from '@/lib/pricingTiers'
import { resumenCredenciales, type CredResumen } from '@/lib/credenciales'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  professional_license: string | null
  created_at: string
  review_status: 'pendiente' | 'revisado' | 'rechazado'
  is_active: boolean
  verification_status: 'pendiente' | 'verificado' | 'revision_manual'
  license_verified: boolean
}

// Una fila por cada especialidad certificable del médico (principal y
// adicionales tratadas igual) — reemplaza el credentials_status único que
// vivía en doctors.
interface SpecialtyCredentialRow {
  id: string
  specialty_mapping_id: string
  granular_name: string
  council_name: string | null
  credentials_status: 'pendiente' | 'verificado' | 'no_coincide'
  credentials_verified_at: string | null
  numero_certificacion: string | null
  vigencia_hasta: string | null
  self_declared_not_current: boolean
}

interface FlaggedItem {
  tipo: 'review' | 'review_response'
  id: string
  doctorId: string
  doctorName: string
  texto: string
  reason: string | null
  flaggedBy: 'ia' | 'usuario' | null
  reviewedAt: string | null
}

interface ReviewAdminRow {
  id: string
  rating: number
  comment: string | null
  created_at: string
  is_visible: boolean
  respuesta: { id: string; respuesta: string; created_at: string; updated_at: string } | null
}

interface ConstanciaLog {
  id: string
  folio: string | null
  pdf_url: string | null
  pdf_filename: string | null
  admin_notas: string | null
  created_at: string
}

type ReviewFilter = 'todos' | 'pendiente' | 'revisado' | 'rechazado'
type CredencialesFilter = 'todos' | 'pendiente' | 'verificado' | 'no_coincide' | 'sin_especialidad'

const TIER_LABEL: Record<string, string> = {
  gratis: 'Gratis',
  '349': PLAN_NAME.profesional,
  '799': PLAN_NAME.premium,
  '1999': PLAN_NAME.clinica,
}

interface Estadisticas {
  salud: {
    total: number
    activos: number
    inactivos: number
    porPlan: { tier: string; label: string; count: number }[]
  }
  calidad: {
    promedioPct: number
    al100: number
    bajoUmbral: number
  }
  cola: {
    pendientesCedula: number
    antiguedadPromedioCedula: number
    antiguedadMaxCedula: number
    pendientesCofepris: number
  }
  actividad: {
    citasTotales: number
    citasConfirmadas: number
    tasaConfirmacion: number
    registrosUltimos30Dias: number
    registrosUltimos7Dias: number
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function statusBadge(s: string) {
  if (s === 'revisado')  return { bg:'#ECFDF5', color:'#059669', border:'#D1FAE5', label:'Cuenta activa' }
  if (s === 'rechazado') return { bg:'#FEF2F2', color:'#DC2626', border:'#FEE2E2', label:'Rechazado' }
  return                        { bg:'#FFFBEB', color:'#D97706', border:'#FEF3C7', label:'Pendiente' }
}

// Resumen de credentials_status de TODAS las filas de doctor_specialty_credentials
// del médico (una por especialidad certificable) — decide la visibilidad
// pública de cédula + cada especialidad. Reemplaza el credentials_status
// único que antes vivía en doctors.
function credencialesBadge(resumen: CredResumen, rows?: SpecialtyCredentialRow[]) {
  if (resumen === 'sin_especialidad') return { bg:'#F3F4F6', color:'#9CA3AF', border:'#E5E7EB', label:'Sin especialidad certificable' }
  if (resumen === 'verificado')       return { bg:'#ECFDF5', color:'#059669', border:'#D1FAE5', label:'Verificado con constancia SEP' }
  if (resumen === 'no_coincide')      return { bg:'#FEF2F2', color:'#DC2626', border:'#FEE2E2', label:'No coincide' }
  const verificadas = rows?.filter(r => r.credentials_status === 'verificado').length ?? 0
  const total = rows?.length ?? 0
  return { bg:'#FFFBEB', color:'#D97706', border:'#FEF3C7', label: total > 1 ? `Pendiente (${verificadas}/${total})` : 'Pendiente' }
}

// estado individual de una credencial (dentro del modal, por tarjeta)
function estadoCredencialBadge(s: 'pendiente' | 'verificado' | 'no_coincide') {
  if (s === 'verificado')  return { bg:'#ECFDF5', color:'#059669', border:'#D1FAE5', label:'Verificado' }
  if (s === 'no_coincide') return { bg:'#FEF2F2', color:'#DC2626', border:'#FEE2E2', label:'No coincide' }
  return                          { bg:'#FFFBEB', color:'#D97706', border:'#FEF3C7', label:'Pendiente' }
}

type EstadoConstancia = 'subir' | 'revisar' | 'ver'

const DIAS_AVISO_VIGENCIA = 30

// Decide qué dice/cómo se ve el botón de constancia en la tabla (aprobado
// por Manuel 2026-07-23):
// - 'subir'   : nunca se subió ningún documento para este médico, O el
//               médico no tiene ninguna especialidad con consejo CONACEM
//               (no hay nada que verificar, aunque haya subido algo).
// - 'revisar' : ya hay documento y algo necesita atención — una fila sigue
//               'pendiente' sin revisar, alguna 'no_coincide', o alguna
//               vigencia ya venció o vence en menos de 30 días.
// - 'ver'     : ya hay documento y TODO está 'verificado' con vigencia sana.
function estadoConstancia(tieneDocumentos: boolean, credRows: SpecialtyCredentialRow[] | undefined): EstadoConstancia {
  const rows = credRows || []
  if (!tieneDocumentos || rows.length === 0) return 'subir'

  const limite = new Date()
  limite.setDate(limite.getDate() + DIAS_AVISO_VIGENCIA)

  const necesitaAtencion = rows.some(r =>
    r.credentials_status === 'pendiente' ||
    r.credentials_status === 'no_coincide' ||
    (!!r.vigencia_hasta && new Date(r.vigencia_hasta) <= limite)
  )
  return necesitaAtencion ? 'revisar' : 'ver'
}

function constanciaBotonEstilo(estado: EstadoConstancia) {
  if (estado === 'ver')      return { label: 'Ver constancia',       bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
  if (estado === 'revisar')  return { label: 'Revisar constancia',   bg: '#FFFBEB', color: '#D97706', border: '#FEF3C7' }
  return                            { label: 'Subir constancia SEP', bg: '#F5F3FF', color: '#8B5CF6', border: '#DDD6FE' }
}

function medicoInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}

function StatTile({ label, value, color, bg, border, icon }: { label: string; value: string | number; color: string; bg: string; border: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:'12px 14px' }}>
      <p style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:900, color, lineHeight:1, display:'flex', alignItems:'center', gap:6 }}>
        {icon}{value}
      </p>
      <p style={{ fontSize:11, color, fontWeight:600, marginTop:4, opacity:0.85 }}>{label}</p>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────

export default function AdminMedicos() {
  const [autenticado, setAutenticado]   = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loginEmail, setLoginEmail]     = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPass, setShowPass]         = useState(false)
  const [loginError, setLoginError]     = useState('')
  const [loggingIn, setLoggingIn]       = useState(false)
  const [resetMessage, setResetMessage] = useState<{ text: string; isSuccess?: boolean } | null>(null)
  const [sendingReset, setSendingReset] = useState(false)
  const [adminEmail, setAdminEmail]     = useState('')

  const [medicos, setMedicos]       = useState<Medico[]>([])
  const [loading, setLoading]       = useState(false)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [toast, setToast]           = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [statsAbiertas, setStatsAbiertas] = useState(false)

  const [fechaSortAsc, setFechaSortAsc] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('todos')
  const [credFilter, setCredFilter]     = useState<CredencialesFilter>('todos')
  const [espFilter, setEspFilter]       = useState('todas')

  // Credenciales por especialidad de TODOS los médicos (para el resumen de
  // la columna "Credenciales" en la tabla) — doctor_id -> sus filas.
  const [credentialsByDoctor, setCredentialsByDoctor] = useState<Record<string, SpecialtyCredentialRow[]>>({})
  const [historialCountByDoctor, setHistorialCountByDoctor] = useState<Record<string, number>>({})

  // ── Constancia SEP (multi-especialidad) ─────────────────────────────────────
  const [constanciaModalDoctor, setConstanciaModalDoctor] = useState<Medico | null>(null)
  const [modalCredentials, setModalCredentials]           = useState<SpecialtyCredentialRow[]>([])
  const [cargandoModalCredentials, setCargandoModalCredentials] = useState(false)
  const [cardInputs, setCardInputs] = useState<Record<string, { numero: string; vigencia: string }>>({})
  const [constanciaHistorial, setConstanciaHistorial]     = useState<ConstanciaLog[]>([])
  const [cargandoHistorial, setCargandoHistorial]         = useState(false)
  const [constanciaFile, setConstanciaFile]               = useState<File | null>(null)
  const [constanciaFolio, setConstanciaFolio]             = useState('')
  const [constanciaNotas, setConstanciaNotas]             = useState('')
  const [currentAuditLogId, setCurrentAuditLogId]         = useState<string | null>(null)
  const [subiendoDocumento, setSubiendoDocumento]         = useState(false)
  const [constanciaError, setConstanciaError]             = useState('')
  const [guardandoCardId, setGuardandoCardId]             = useState<string | null>(null)
  const [constanciaPdfUrls, setConstanciaPdfUrls]         = useState<Record<string, string>>({})
  const [extrayendo, setExtrayendo]                       = useState(false)
  const [extraccionAvisos, setExtraccionAvisos]           = useState<string[]>([])

  // ── Reseñas y respuestas (moderación, Parte 3) ──────────────────────────────
  const [resenasModalDoctor, setResenasModalDoctor]       = useState<Medico | null>(null)
  const [resenasDelDoctor, setResenasDelDoctor]           = useState<ReviewAdminRow[]>([])
  const [cargandoResenas, setCargandoResenas]             = useState(false)
  const [eliminandoResenaId, setEliminandoResenaId]       = useState<string | null>(null)
  const [eliminandoRespuestaId, setEliminandoRespuestaId] = useState<string | null>(null)

  // ── Contenido señalado (IA + reportes de usuarios) ──────────────────────────
  const [flaggedAbierta, setFlaggedAbierta]           = useState(false)
  const [flaggedItems, setFlaggedItems]               = useState<FlaggedItem[]>([])
  const [loadingFlagged, setLoadingFlagged]           = useState(false)
  const [procesandoFlaggedId, setProcesandoFlaggedId] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId]                   = useState<string | null>(null)

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: adminRow } = await supabase.from('admins').select('id').eq('user_id', user.id).maybeSingle()
        if (adminRow) {
          setAutenticado(true)
          setAdminEmail(user.email || '')
        }
      }
      setCheckingAuth(false)
    }
    checkSession()
  }, [])

  useEffect(() => { if (autenticado) { cargarMedicos(); cargarEstadisticas(); cargarContenidoSenalado() } }, [autenticado])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  // ── Data ────────────────────────────────────────────────────────────────────

  async function cargarMedicos() {
    setLoading(true)
    try {
      const [{ data, error }, credRes, historialRes] = await Promise.all([
        supabase
          .from('doctors')
          .select('id, full_name, email, specialty, professional_license, created_at, review_status, is_active, verification_status, license_verified')
          .order('created_at', { ascending: false }),
        supabase
          .from('doctor_specialty_credentials')
          .select('id, doctor_id, specialty_mapping_id, credentials_status, credentials_verified_at, numero_certificacion, vigencia_hasta, self_declared_not_current, specialty_granular_mapping(granular_name, conacem_councils(council_name))'),
        supabase
          .from('doctor_constancia_audit_log')
          .select('doctor_id'),
      ])
      if (error) throw error
      setMedicos(data || [])

      const grouped: Record<string, SpecialtyCredentialRow[]> = {}
      for (const r of (credRes.data || []) as any[]) {
        const row: SpecialtyCredentialRow = {
          id: r.id,
          specialty_mapping_id: r.specialty_mapping_id,
          granular_name: r.specialty_granular_mapping?.granular_name,
          council_name: r.specialty_granular_mapping?.conacem_councils?.council_name ?? null,
          credentials_status: r.credentials_status,
          credentials_verified_at: r.credentials_verified_at,
          numero_certificacion: r.numero_certificacion,
          vigencia_hasta: r.vigencia_hasta,
          self_declared_not_current: r.self_declared_not_current,
        }
        if (!grouped[r.doctor_id]) grouped[r.doctor_id] = []
        grouped[r.doctor_id].push(row)
      }
      setCredentialsByDoctor(grouped)

      // Cuántos documentos de constancia tiene cada médico — solo el conteo,
      // decide el estado del botón "Subir/Revisar/Ver constancia" en la tabla
      // (ver estadoConstancia más abajo). El detalle completo de cada
      // documento sigue viviendo solo en el modal (cargarHistorialConstancias).
      const historialCount: Record<string, number> = {}
      for (const r of (historialRes.data || []) as any[]) {
        historialCount[r.doctor_id] = (historialCount[r.doctor_id] || 0) + 1
      }
      setHistorialCountByDoctor(historialCount)
    } catch {
      setToast({ msg: 'Error al cargar médicos', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function cargarEstadisticas() {
    setLoadingStats(true)
    try {
      const { data: docs, error } = await supabase
        .from('doctors')
        .select('id, is_active, pricing_tier, verification_status, has_aviso_funcionamiento, cofepris_aviso_numero, created_at, photo_url, about_me, clinic_lat, clinic_lng, horario, consultation_price_first_time, consultation_price_general, phone, clinic_phone, whatsapp_phone, languages')
      if (error) throw error
      const doctors = docs || []

      const [expRes, eduRes, condRes, citasRes] = await Promise.all([
        supabase.from('doctor_experience').select('doctor_id'),
        supabase.from('doctor_education').select('doctor_id'),
        supabase.from('doctor_conditions').select('doctor_id'),
        supabase.from('citas').select('estado'),
      ])
      const expSet = new Set((expRes.data || []).map(r => r.doctor_id))
      const eduSet = new Set((eduRes.data || []).map(r => r.doctor_id))
      const condSet = new Set((condRes.data || []).map(r => r.doctor_id))

      // ── Salud del directorio ──
      const activos = doctors.filter(d => d.is_active).length
      const porPlanMap: Record<string, number> = {}
      doctors.forEach(d => {
        const tier = d.pricing_tier || 'gratis'
        porPlanMap[tier] = (porPlanMap[tier] || 0) + 1
      })
      const porPlan = Object.entries(porPlanMap).map(([tier, count]) => ({
        tier, label: TIER_LABEL[tier] || tier, count,
      }))

      // ── Calidad de perfiles — MISMA fórmula de 10 checks que app/dashboard/page.tsx ──
      const porcentajes = doctors.map(d => {
        const tieneHorarioActivo = !!(d.horario && Object.values(d.horario).some((h: any) => h?.activo || h?.abierto))
        const tieneUbicacion = !!(d.clinic_lat && d.clinic_lng)
        const tieneTelefono = !!(d.phone || d.clinic_phone || d.whatsapp_phone)
        const checks = [
          !!d.photo_url,
          !!(d.about_me && d.about_me.length > 100),
          tieneUbicacion,
          tieneHorarioActivo,
          !!(d.consultation_price_first_time && d.consultation_price_general),
          tieneTelefono,
          !!(Array.isArray(d.languages) && d.languages.length >= 1),
          expSet.has(d.id),
          eduSet.has(d.id),
          condSet.has(d.id),
        ]
        return Math.round((checks.filter(Boolean).length / checks.length) * 100)
      })
      const promedioPct = porcentajes.length ? Math.round(porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length) : 0
      const al100 = porcentajes.filter(p => p === 100).length
      const bajoUmbral = porcentajes.filter(p => p < 50).length

      // ── Cola de verificación ──
      const pendientesCedulaDocs = doctors.filter(d => d.verification_status === 'pendiente')
      const ahora = Date.now()
      const antiguedadesDias = pendientesCedulaDocs.map(d => (ahora - new Date(d.created_at).getTime()) / 86400000)
      const antiguedadPromedioCedula = antiguedadesDias.length ? Math.round(antiguedadesDias.reduce((a, b) => a + b, 0) / antiguedadesDias.length) : 0
      const antiguedadMaxCedula = antiguedadesDias.length ? Math.round(Math.max(...antiguedadesDias)) : 0
      // "Pendientes de COFEPRIS" = ya declararon tener Aviso de Funcionamiento
      // y empezaron el trámite, pero no han terminado (sin número de aviso aún)
      const pendientesCofepris = doctors.filter(d => d.has_aviso_funcionamiento === true && !d.cofepris_aviso_numero).length

      // ── Actividad ──
      const citas = citasRes.data || []
      const citasConfirmadas = citas.filter(c => c.estado === 'confirmed' || c.estado === 'completed').length
      const tasaConfirmacion = citas.length ? Math.round((citasConfirmadas / citas.length) * 100) : 0
      const hace30 = ahora - 30 * 86400000
      const hace7 = ahora - 7 * 86400000
      const registrosUltimos30Dias = doctors.filter(d => new Date(d.created_at).getTime() >= hace30).length
      const registrosUltimos7Dias = doctors.filter(d => new Date(d.created_at).getTime() >= hace7).length

      setEstadisticas({
        salud: { total: doctors.length, activos, inactivos: doctors.length - activos, porPlan },
        calidad: { promedioPct, al100, bajoUmbral },
        cola: { pendientesCedula: pendientesCedulaDocs.length, antiguedadPromedioCedula, antiguedadMaxCedula, pendientesCofepris },
        actividad: { citasTotales: citas.length, citasConfirmadas, tasaConfirmacion, registrosUltimos30Dias, registrosUltimos7Dias },
      })
    } catch (e) {
      console.error('Error cargando estadísticas:', e)
    } finally {
      setLoadingStats(false)
    }
  }

  const especialidades = useMemo(() => {
    return Array.from(new Set(medicos.map(m => m.specialty).filter(Boolean))).sort()
  }, [medicos])

  const medicosVisibles = useMemo(() => {
    return medicos
      .filter(m => {
        if (reviewFilter !== 'todos' && m.review_status !== reviewFilter) return false
        if (credFilter !== 'todos' && resumenCredenciales(credentialsByDoctor[m.id]) !== credFilter) return false
        if (espFilter !== 'todas' && m.specialty !== espFilter) return false
        return true
      })
      .sort((a, b) => {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return fechaSortAsc ? diff : -diff
      })
  }, [medicos, reviewFilter, credFilter, espFilter, fechaSortAsc, credentialsByDoctor])

  // ── Acciones ────────────────────────────────────────────────────────────────

  async function setReviewStatus(m: Medico, status: 'revisado' | 'rechazado') {
    const label = status === 'revisado' ? `aprobar cédula de ${m.full_name}` : `rechazar a ${m.full_name}`
    if (!confirm(`¿Confirmas ${label}?`)) return
    setProcesando(m.id + '_review')
    try {
      const { error } = await supabase
        .from('doctors').update({
          review_status: status,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: adminEmail || 'admin@salurama.com',
        }).eq('id', m.id)
      if (error) throw error
      setMedicos(prev => prev.map(x => x.id === m.id ? { ...x, review_status: status } : x))
      setToast({ msg: `${m.full_name}: ${status === 'revisado' ? 'cédula aprobada ✓' : 'rechazado'}`, type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar. Revisa permisos RLS.', type: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  // Combina en un solo clic lo que antes eran 2 botones separados
  // ("Marcar verificada" + "Aprobar cédula") — Manuel confirmó que siempre
  // quiere ambos pasos juntos, nunca uno sin el otro. Actualiza los 3 campos
  // explícitamente (no confía solo en el trigger trg_sync_verification_status
  // de la base de datos) porque cuando un médico ya aprobado cambia su cédula,
  // review_status se queda en 'revisado' pero verification_status vuelve a
  // 'pendiente' — en ese caso el trigger no dispara (review_status no cambia
  // de valor), así que hay que fijar verification_status a mano también.
  async function verificarYAprobar(m: Medico) {
    if (!confirm(`¿Confirmas verificar y aprobar la cédula de ${m.full_name}?`)) return
    setProcesando(m.id + '_review')
    try {
      const { error } = await supabase
        .from('doctors')
        .update({
          review_status: 'revisado', verification_status: 'verificado', license_verified: true,
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: adminEmail || 'admin@salurama.com',
        })
        .eq('id', m.id)
      if (error) throw error
      setMedicos(prev => prev.map(x => x.id === m.id
        ? { ...x, review_status: 'revisado', verification_status: 'verificado', license_verified: true }
        : x))
      setToast({ msg: `${m.full_name}: verificada y cédula aprobada ✓`, type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar. Revisa permisos RLS.', type: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  // ── Constancia SEP (Parte B) — sube el PDF oficial, guarda folio/vigencias
  // y decide credentials_status, el único campo que controla la visibilidad
  // pública de cédula + especialidad (Parte A). ──────────────────────────────

  async function abrirConstanciaModal(m: Medico) {
    setConstanciaModalDoctor(m)
    setConstanciaFile(null)
    setConstanciaFolio('')
    setConstanciaNotas('')
    setConstanciaError('')
    setCurrentAuditLogId(null)
    setExtraccionAvisos([])
    cargarHistorialConstancias(m.id)
    await cargarModalCredentials(m.id)
  }

  function cerrarConstanciaModal() {
    setConstanciaModalDoctor(null)
    setConstanciaHistorial([])
    setModalCredentials([])
    setCardInputs({})
  }

  async function cargarModalCredentials(doctorId: string) {
    setCargandoModalCredentials(true)
    try {
      const { data, error } = await supabase
        .from('doctor_specialty_credentials')
        .select('id, specialty_mapping_id, credentials_status, credentials_verified_at, numero_certificacion, vigencia_hasta, self_declared_not_current, specialty_granular_mapping(granular_name, conacem_councils(council_name))')
        .eq('doctor_id', doctorId)
      if (error) throw error
      const rows: SpecialtyCredentialRow[] = (data || []).map((r: any) => ({
        id: r.id,
        specialty_mapping_id: r.specialty_mapping_id,
        granular_name: r.specialty_granular_mapping?.granular_name,
        council_name: r.specialty_granular_mapping?.conacem_councils?.council_name ?? null,
        credentials_status: r.credentials_status,
        credentials_verified_at: r.credentials_verified_at,
        numero_certificacion: r.numero_certificacion,
        vigencia_hasta: r.vigencia_hasta,
        self_declared_not_current: r.self_declared_not_current,
      }))
      setModalCredentials(rows)
      const inputs: Record<string, { numero: string; vigencia: string }> = {}
      rows.forEach(r => { inputs[r.id] = { numero: r.numero_certificacion || '', vigencia: r.vigencia_hasta || '' } })
      setCardInputs(inputs)
    } catch {
      setToast({ msg: 'Error al cargar las especialidades del médico', type: 'error' })
    } finally {
      setCargandoModalCredentials(false)
    }
  }

  async function cargarHistorialConstancias(doctorId: string) {
    setCargandoHistorial(true)
    try {
      const { data, error } = await supabase
        .from('doctor_constancia_audit_log')
        .select('id, folio, pdf_url, pdf_filename, admin_notas, created_at')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setConstanciaHistorial(data || [])
    } catch {
      setToast({ msg: 'Error al cargar historial de constancias', type: 'error' })
    } finally {
      setCargandoHistorial(false)
    }
  }

  async function verPdfConstancia(path: string) {
    if (constanciaPdfUrls[path]) return
    const { data } = await supabase.storage.from('admin-documents').createSignedUrl(path, 3600)
    if (data?.signedUrl) setConstanciaPdfUrls(prev => ({ ...prev, [path]: data.signedUrl }))
  }

  // Borra una entrada del historial (documento subido por error, duplicado,
  // etc.) — primero la fila de la base, luego el archivo, nunca al revés: si
  // esta constancia respalda una especialidad ya verificada
  // (doctor_specialty_credentials.source_constancia_id), el FOREIGN KEY sin
  // ON DELETE la protege y el borrado de la fila falla ANTES de tocar el
  // archivo — así nunca queda un PDF borrado con una fila que ya no existe,
  // ni una verificación pública sin su documento de respaldo.
  async function eliminarConstancia(c: ConstanciaLog) {
    if (!confirm('¿Eliminar este documento de forma permanente? Esta acción no se puede deshacer.')) return
    setEliminandoId(c.id)
    try {
      const { error } = await supabase.from('doctor_constancia_audit_log').delete().eq('id', c.id)
      if (error) {
        if (error.code === '23503') {
          setToast({ msg: 'No se puede borrar: esta constancia respalda una especialidad ya verificada. Cambia esa especialidad a otro estado primero si de verdad quieres borrar el documento.', type: 'error' })
        } else {
          throw error
        }
        return
      }
      if (c.pdf_url) {
        await supabase.storage.from('admin-documents').remove([c.pdf_url])
      }
      setConstanciaHistorial(prev => prev.filter(h => h.id !== c.id))
      if (currentAuditLogId === c.id) setCurrentAuditLogId(null)
      setToast({ msg: 'Documento eliminado', type: 'success' })
    } catch (e) {
      console.error('[eliminarConstancia]', e)
      setToast({ msg: 'Error al eliminar el documento', type: 'error' })
    } finally {
      setEliminandoId(null)
    }
  }

  // ── Reseñas y respuestas (moderación, Parte 3) ──────────────────────────────
  // select('*') vía RLS de admin (reviews_admin_all) trae TODAS las reseñas,
  // no solo is_visible=true — el admin necesita ver también las que ya están
  // ocultas para poder moderarlas igual.
  async function abrirResenasModal(m: Medico) {
    setResenasModalDoctor(m)
    setResenasDelDoctor([])
    setCargandoResenas(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, is_visible, review_responses(id, respuesta, created_at, updated_at)')
        .eq('doctor_id', m.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows: ReviewAdminRow[] = (data || []).map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        is_visible: r.is_visible,
        respuesta: Array.isArray(r.review_responses) ? (r.review_responses[0] ?? null) : (r.review_responses ?? null),
      }))
      setResenasDelDoctor(rows)
    } catch (e) {
      console.error('[abrirResenasModal]', e)
      setToast({ msg: 'Error al cargar las reseñas', type: 'error' })
    } finally {
      setCargandoResenas(false)
    }
  }

  function cerrarResenasModal() {
    setResenasModalDoctor(null)
    setResenasDelDoctor([])
  }

  // Borra la reseña completa — review_responses tiene ON DELETE CASCADE hacia
  // reviews, así que la respuesta del médico (si existe) se va con ella. No
  // hace falta borrarla aparte.
  async function eliminarResena(r: ReviewAdminRow) {
    if (!confirm('¿Eliminar esta reseña de forma permanente? Si tiene una respuesta del médico, también se borrará. Esta acción no se puede deshacer.')) return
    setEliminandoResenaId(r.id)
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', r.id)
      if (error) throw error
      setResenasDelDoctor(prev => prev.filter(x => x.id !== r.id))
      setToast({ msg: 'Reseña eliminada', type: 'success' })
    } catch (e) {
      console.error('[eliminarResena]', e)
      setToast({ msg: 'Error al eliminar la reseña', type: 'error' })
    } finally {
      setEliminandoResenaId(null)
    }
  }

  // Borra solo la respuesta del médico, la reseña del paciente se conserva.
  async function eliminarRespuesta(r: ReviewAdminRow) {
    if (!r.respuesta) return
    if (!confirm('¿Eliminar solo la respuesta del médico a esta reseña? La reseña del paciente se conserva. Esta acción no se puede deshacer.')) return
    setEliminandoRespuestaId(r.respuesta.id)
    try {
      const { error } = await supabase.from('review_responses').delete().eq('id', r.respuesta.id)
      if (error) throw error
      setResenasDelDoctor(prev => prev.map(x => x.id === r.id ? { ...x, respuesta: null } : x))
      setToast({ msg: 'Respuesta eliminada', type: 'success' })
    } catch (e) {
      console.error('[eliminarRespuesta]', e)
      setToast({ msg: 'Error al eliminar la respuesta', type: 'error' })
    } finally {
      setEliminandoRespuestaId(null)
    }
  }

  // ── Contenido señalado (IA en la creación + reportes manuales) ─────────────
  // Consulta transversal (no por médico, a diferencia del modal de Reseñas de
  // la Parte 3) — junta reviews y review_responses con moderation_status =
  // 'señalado' de CUALQUIER médico en una sola bandeja de trabajo.
  async function cargarContenidoSenalado() {
    setLoadingFlagged(true)
    try {
      const [revRes, respRes] = await Promise.all([
        supabase.from('reviews')
          .select('id, comment, doctor_id, moderation_reason, moderation_flagged_by, moderation_reviewed_at, doctors(full_name)')
          .eq('moderation_status', 'señalado'),
        supabase.from('review_responses')
          .select('id, respuesta, doctor_id, moderation_reason, moderation_flagged_by, moderation_reviewed_at, doctors(full_name)')
          .eq('moderation_status', 'señalado'),
      ])
      if (revRes.error) throw revRes.error
      if (respRes.error) throw respRes.error

      const items: FlaggedItem[] = [
        ...(revRes.data || []).map((r: any) => ({
          tipo: 'review' as const, id: r.id, doctorId: r.doctor_id,
          doctorName: r.doctors?.full_name || '—', texto: r.comment || '(reseña sin texto)',
          reason: r.moderation_reason, flaggedBy: r.moderation_flagged_by, reviewedAt: r.moderation_reviewed_at,
        })),
        ...(respRes.data || []).map((r: any) => ({
          tipo: 'review_response' as const, id: r.id, doctorId: r.doctor_id,
          doctorName: r.doctors?.full_name || '—', texto: r.respuesta,
          reason: r.moderation_reason, flaggedBy: r.moderation_flagged_by, reviewedAt: r.moderation_reviewed_at,
        })),
      ].sort((a, b) => new Date(b.reviewedAt || 0).getTime() - new Date(a.reviewedAt || 0).getTime())

      setFlaggedItems(items)
    } catch (e) {
      console.error('[cargarContenidoSenalado]', e)
    } finally {
      setLoadingFlagged(false)
    }
  }

  // "Dejar" — descarta la bandera, el contenido se queda como está.
  async function aprobarSenalado(item: FlaggedItem) {
    setProcesandoFlaggedId(item.id)
    try {
      const tabla = item.tipo === 'review' ? 'reviews' : 'review_responses'
      const { error } = await supabase.from(tabla).update({ moderation_status: 'aprobado' }).eq('id', item.id)
      if (error) throw error
      setFlaggedItems(prev => prev.filter(x => x.id !== item.id))
      setToast({ msg: 'Contenido aprobado', type: 'success' })
    } catch (e) {
      console.error('[aprobarSenalado]', e)
      setToast({ msg: 'Error al aprobar', type: 'error' })
    } finally {
      setProcesandoFlaggedId(null)
    }
  }

  async function eliminarSenalado(item: FlaggedItem) {
    const label = item.tipo === 'review' ? 'esta reseña' : 'esta respuesta'
    if (!confirm(`¿Eliminar ${label} de forma permanente? ${item.tipo === 'review' ? 'Si tiene una respuesta del médico, también se borrará. ' : ''}Esta acción no se puede deshacer.`)) return
    setProcesandoFlaggedId(item.id)
    try {
      const tabla = item.tipo === 'review' ? 'reviews' : 'review_responses'
      const { error } = await supabase.from(tabla).delete().eq('id', item.id)
      if (error) throw error
      setFlaggedItems(prev => prev.filter(x => x.id !== item.id))
      setToast({ msg: item.tipo === 'review' ? 'Reseña eliminada' : 'Respuesta eliminada', type: 'success' })
    } catch (e) {
      console.error('[eliminarSenalado]', e)
      setToast({ msg: 'Error al eliminar', type: 'error' })
    } finally {
      setProcesandoFlaggedId(null)
    }
  }

  // Registra el documento (un PDF por médico, puede certificar varias
  // especialidades) — se hace una sola vez por sesión del modal, antes de
  // poder aprobar cualquier tarjeta, para que cada credencial quede ligada a
  // su documento de origen (source_constancia_id).
  async function guardarDocumento() {
    if (!constanciaModalDoctor) return
    if (!constanciaFile) { setConstanciaError('Sube el PDF de la constancia'); return }
    if (!constanciaFolio.trim()) { setConstanciaError('Captura el folio de la constancia'); return }

    setConstanciaError('')
    setSubiendoDocumento(true)
    const doctorId = constanciaModalDoctor.id
    try {
      const path = `constancia/${doctorId}/${Date.now()}-${constanciaFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('admin-documents')
        .upload(path, constanciaFile, { contentType: 'application/pdf' })
      if (uploadError) throw uploadError

      const { data: logRow, error: logError } = await supabase.from('doctor_constancia_audit_log').insert({
        doctor_id: doctorId,
        folio: constanciaFolio.trim(),
        pdf_url: path,
        pdf_filename: constanciaFile.name,
        admin_notas: constanciaNotas.trim() || null,
      }).select('*').single()
      if (logError) throw logError

      setCurrentAuditLogId(logRow.id)
      setToast({ msg: 'Documento guardado: ya puedes aprobar cada especialidad', type: 'success' })
      await cargarHistorialConstancias(doctorId)
    } catch (e) {
      console.error('[guardarDocumento]', e)
      setConstanciaError('Error al subir el documento. Revisa permisos o el tamaño del PDF (máx. 5MB).')
    } finally {
      setSubiendoDocumento(false)
    }
  }

  // Extracción automática (Parte 2 del sistema de credenciales): lee el
  // folio y las certificaciones del PDF vía /api/admin/extraer-constancia, y
  // solo prellena una tarjeta cuando el emparejamiento contra las
  // especialidades REALES del médico es único — nunca a medias, nunca
  // adivinando. Se ejecuta automáticamente al elegir el PDF, antes de subirlo.
  async function extraerYPrellenar(file: File) {
    if (!constanciaModalDoctor) return
    setExtrayendo(true)
    setExtraccionAvisos([])
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('doctorId', constanciaModalDoctor.id)
      const res = await fetch('/api/admin/extraer-constancia', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al extraer datos del PDF')

      const avisos: string[] = []

      if (data.warning) {
        avisos.push(data.warning)
      } else {
        if (data.documentFolio && !data.folioConsistente) {
          avisos.push('El folio del encabezado y el pie del documento no coinciden: verifica el folio a mano.')
        } else if (data.documentFolio) {
          setConstanciaFolio(prev => prev || data.documentFolio)
        }

        for (const cert of data.certifications || []) {
          if (cert.matchStatus === 'exacto' && cert.matchedCredentialId) {
            setCardInputs(prev => ({
              ...prev,
              [cert.matchedCredentialId]: {
                numero: cert.numeroCertificacion,
                vigencia: cert.vigenciaFecha || '',
              },
            }))
            if (!cert.vigenciaFecha && cert.vigenciaRaw) {
              avisos.push(`${cert.matchedGranularName}: vigencia "${cert.vigenciaRaw}" no es una fecha, captúrala a mano si aplica.`)
            }
          } else if (cert.matchStatus === 'sin_match') {
            avisos.push(`No se pudo emparejar la certificación de "${cert.especialidadTexto}" (${cert.organismoCertificador}) con ninguna especialidad de este médico. Revisa el PDF.`)
          } else if (cert.matchStatus === 'ambiguo') {
            avisos.push(`La certificación de "${cert.especialidadTexto}" coincide con más de una especialidad del médico. Captúrala a mano.`)
          }
        }

        if ((data.certifications || []).length === 0) {
          avisos.push('El PDF no tiene ninguna certificación de consejo registrada. Captura folio y vigencia a mano si el médico la tiene.')
        }
      }

      setExtraccionAvisos(avisos)
    } catch (e: any) {
      setExtraccionAvisos([e.message || 'Error al extraer datos del PDF. Captura todo a mano.'])
    } finally {
      setExtrayendo(false)
    }
  }

  // Aprueba/rechaza UNA especialidad (tarjeta) del médico — requiere que ya
  // se haya guardado el documento en esta sesión del modal.
  async function guardarCredencial(credentialId: string, estadoFinal: 'verificado' | 'no_coincide') {
    if (!constanciaModalDoctor || !currentAuditLogId) {
      setToast({ msg: 'Primero sube y guarda el documento', type: 'error' })
      return
    }
    setGuardandoCardId(credentialId)
    try {
      const ahora = new Date().toISOString()
      const input = cardInputs[credentialId] || { numero: '', vigencia: '' }
      const { error } = await supabase
        .from('doctor_specialty_credentials')
        .update({
          credentials_status: estadoFinal,
          credentials_verified_at: estadoFinal === 'verificado' ? ahora : null,
          numero_certificacion: input.numero.trim() || null,
          vigencia_hasta: input.vigencia || null,
          source_constancia_id: currentAuditLogId,
        })
        .eq('id', credentialId)
      if (error) throw error

      setModalCredentials(prev => prev.map(r => r.id === credentialId
        ? { ...r, credentials_status: estadoFinal, credentials_verified_at: estadoFinal === 'verificado' ? ahora : null, numero_certificacion: input.numero.trim() || null, vigencia_hasta: input.vigencia || null }
        : r))
      if (constanciaModalDoctor) {
        setCredentialsByDoctor(prev => ({
          ...prev,
          [constanciaModalDoctor.id]: (prev[constanciaModalDoctor.id] || []).map(r => r.id === credentialId
            ? { ...r, credentials_status: estadoFinal, credentials_verified_at: estadoFinal === 'verificado' ? ahora : null, numero_certificacion: input.numero.trim() || null, vigencia_hasta: input.vigencia || null }
            : r),
        }))
      }
      setToast({ msg: `Especialidad ${estadoFinal === 'verificado' ? 'verificada ✓' : 'marcada como no coincidente'}`, type: 'success' })
    } catch (e) {
      console.error('[guardarCredencial]', e)
      setToast({ msg: 'Error al actualizar la especialidad', type: 'error' })
    } finally {
      setGuardandoCardId(null)
    }
  }

  async function toggleActivo(m: Medico) {
    setProcesando(m.id + '_activo')
    try {
      const { error } = await supabase
        .from('doctors').update({ is_active: !m.is_active }).eq('id', m.id)
      if (error) throw error
      setMedicos(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x))
      setToast({ msg: `${m.full_name}: ${!m.is_active ? 'activado' : 'desactivado'}`, type: 'success' })
    } catch {
      setToast({ msg: 'Error al actualizar estado', type: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  // ── Login (cuenta real de Supabase + verificación de admins) ────────────────

  async function login() {
    setLoggingIn(true)
    setLoginError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
      if (error || !data.user) {
        setLoginError('Correo o contraseña incorrectos')
        return
      }
      const { data: adminRow } = await supabase.from('admins').select('id').eq('user_id', data.user.id).maybeSingle()
      if (!adminRow) {
        await supabase.auth.signOut()
        setLoginError('Esta cuenta no tiene permisos de administrador')
        return
      }
      setAutenticado(true)
      setAdminEmail(data.user.email || '')
    } catch {
      setLoginError('Error de conexión')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleForgotPassword() {
    if (!loginEmail.trim()) {
      setResetMessage({ text: 'Ingresa tu correo para recuperar tu contraseña' })
      return
    }
    setSendingReset(true)
    setResetMessage(null)
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}/auth/confirm/callback`,
    })
    setSendingReset(false)
    if (error) {
      setResetMessage({ text: error.message })
    } else {
      setResetMessage({ text: 'Te enviamos un link de recuperación. Revisa tu correo.', isSuccess: true })
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    setAutenticado(false)
    setAdminEmail('')
  }

  // ── Render: gate de login ────────────────────────────────────────────────────

  if (checkingAuth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:'3px solid #E5E7EB', borderTopColor:'#1E3A5F', borderRadius:'50%' }} />
    </div>
  )

  if (!autenticado) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#E8ECF3 0%,#F9FAFB 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;500;700&display=swap'); *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ background:'#fff', borderRadius:20, padding:'clamp(28px,6vw,44px)', maxWidth:420, width:'100%', boxShadow:'0 16px 48px rgba(30,58,95,0.12)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ marginBottom:12 }}>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:32, fontWeight:900, color:'#1E3A5F' }}>Salu</span>
            <span style={{ fontFamily:"'Fraunces',serif", fontSize:32, fontWeight:600, color:'#2A9D8F' }}>rama</span>
          </div>
          <p style={{ fontSize:13, color:'#6B7280' }}>Administración · Médicos</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <input
            type="email"
            placeholder="Correo de administrador"
            value={loginEmail}
            onChange={e => { setLoginEmail(e.target.value); setLoginError('') }}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ width:'100%', padding:'13px 16px', border:`1.5px solid ${loginError ? '#DC2626' : '#E5E7EB'}`, borderRadius:10, fontSize:15, fontFamily:"'DM Sans',sans-serif", outline:'none', color:'#111827' }}
          />
          <div style={{ position:'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Contraseña"
              value={loginPassword}
              onChange={e => { setLoginPassword(e.target.value); setLoginError('') }}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{ width:'100%', padding:'13px 44px 13px 16px', border:`1.5px solid ${loginError ? '#DC2626' : '#E5E7EB'}`, borderRadius:10, fontSize:15, fontFamily:"'DM Sans',sans-serif", outline:'none', color:'#111827' }}
            />
            <button type="button" onClick={() => setShowPass(p => !p)}
              style={{ position:'absolute', right:13, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {loginError && <p style={{ fontSize:13, color:'#DC2626', textAlign:'center' }}>{loginError}</p>}
          <div style={{ textAlign:'right' }}>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={sendingReset}
              style={{ fontSize:13, color:'#1E3A5F', fontWeight:500, background:'none', border:'none', cursor: sendingReset ? 'not-allowed' : 'pointer', fontFamily:"'DM Sans',sans-serif", padding:0, opacity: sendingReset ? 0.6 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              {sendingReset ? 'Enviando...' : '¿Olvidaste tu contraseña?'}
            </button>
          </div>
          {resetMessage && (
            <p style={{ fontSize:13, color: resetMessage.isSuccess ? '#059669' : '#DC2626', textAlign:'center' }}>
              {resetMessage.text}
            </p>
          )}
          <button onClick={login} disabled={loggingIn}
            style={{ width:'100%', background:'#1E3A5F', color:'#fff', border:'none', borderRadius:50, padding:'13px', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", opacity: loggingIn ? 0.6 : 1 }}>
            {loggingIn ? 'Entrando...' : 'Entrar'}
          </button>
          <Link href="/admin" style={{ textAlign:'center', fontSize:13, color:'#9CA3AF', textDecoration:'none' }}>← Admin principal</Link>
        </div>
      </div>
    </div>
  )

  // ── Render: panel ────────────────────────────────────────────────────────────

  const counts = {
    total:     medicos.length,
    pendiente: medicos.filter(m => m.review_status === 'pendiente').length,
    revisado:  medicos.filter(m => m.review_status === 'revisado').length,
    rechazado: medicos.filter(m => m.review_status === 'rechazado').length,
  }

  const credCounts = {
    pendiente:        medicos.filter(m => resumenCredenciales(credentialsByDoctor[m.id]) === 'pendiente').length,
    verificado:       medicos.filter(m => resumenCredenciales(credentialsByDoctor[m.id]) === 'verificado').length,
    no_coincide:      medicos.filter(m => resumenCredenciales(credentialsByDoctor[m.id]) === 'no_coincide').length,
    sin_especialidad: medicos.filter(m => resumenCredenciales(credentialsByDoctor[m.id]) === 'sin_especialidad').length,
  }

  return (
    <>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999,
          background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          color:      toast.type === 'success' ? '#059669' : '#DC2626',
          border:    `1px solid ${toast.type === 'success' ? '#D1FAE5' : '#FEE2E2'}`,
          borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:500,
          display:'flex', alignItems:'center', gap:8,
          boxShadow:'0 4px 12px rgba(0,0,0,0.1)', pointerEvents:'none',
        }}>
          {toast.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div style={{ minHeight:'100vh', background:'#F9FAFB', fontFamily:"'DM Sans',sans-serif", color:'#111827' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .spin { animation: spin 0.7s linear infinite; display:inline-block; }
          .act-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 11px; border-radius:50px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid; font-family:'DM Sans',sans-serif; transition:opacity 0.15s; white-space:nowrap; }
          .act-btn:disabled { opacity:0.45; cursor:not-allowed; }
          .fpill { padding:7px 15px; border:1.5px solid; border-radius:50px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        `}</style>

        <div style={{ maxWidth:1240, margin:'0 auto', padding:'24px 16px 60px' }}>

          <div style={{ marginBottom: 8 }}>
            <BackButton fallback="/dashboard" label="Volver" />
          </div>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ fontFamily:"'Fraunces',serif", fontSize:'clamp(20px,4vw,28px)', fontWeight:900, color:'#0D1829' }}>
                Médicos registrados
              </h1>
              <p style={{ fontSize:13, color:'#6B7280', marginTop:3 }}>
                {counts.total} en total · mostrando {medicosVisibles.length}
              </p>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <button onClick={cargarMedicos}
                style={{ padding:'9px 18px', background:'#E8ECF3', color:'#1E3A5F', border:'1px solid #C5D0E0', borderRadius:50, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Actualizar
              </button>
              <button onClick={logout}
                style={{ padding:'9px 18px', background:'#FEF2F2', color:'#DC2626', border:'1px solid #FEE2E2', borderRadius:50, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Estadísticas generales */}
          <div style={{ background:'#fff', border:'1px solid #E8ECF3', borderRadius:16, marginBottom:24, overflow:'hidden' }}>
            <button onClick={() => setStatsAbiertas(v => !v)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              <span style={{ display:'flex', alignItems:'center', gap:8, fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:'#1E3A5F' }}>
                <Gauge size={18} color="#2A9D8F" /> Estadísticas generales
              </span>
              <ChevronDown size={16} color="#6B7280" style={{ transform: statsAbiertas ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }} />
            </button>

            {statsAbiertas && (
              <div style={{ padding:'0 20px 20px' }}>
                {loadingStats || !estadisticas ? (
                  <p style={{ fontSize:13, color:'#9CA3AF', padding:'12px 0' }}>Cargando estadísticas...</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                    {/* Salud del directorio */}
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                        <Users size={13} /> Salud del directorio
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                        <StatTile label="Total médicos" value={estadisticas.salud.total} color="#1E3A5F" bg="#E8ECF3" border="#C5D0E0" />
                        <StatTile label="Activos" value={estadisticas.salud.activos} color="#059669" bg="#ECFDF5" border="#D1FAE5" />
                        <StatTile label="Inactivos" value={estadisticas.salud.inactivos} color="#6B7280" bg="#F3F4F6" border="#E5E7EB" />
                        {estadisticas.salud.porPlan.map(p => (
                          <StatTile key={p.tier} label={p.label} value={p.count} color="#8B5CF6" bg="#F5F3FF" border="#DDD6FE" />
                        ))}
                      </div>
                    </div>

                    {/* Calidad de perfiles */}
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                        <UserCheck size={13} /> Calidad de perfiles
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                        <StatTile label="% completitud promedio" value={`${estadisticas.calidad.promedioPct}%`} color="#1E3A5F" bg="#E8ECF3" border="#C5D0E0" />
                        <StatTile label="Al 100%" value={estadisticas.calidad.al100} color="#059669" bg="#ECFDF5" border="#D1FAE5" />
                        <StatTile label="Por debajo de 50%" value={estadisticas.calidad.bajoUmbral} color="#DC2626" bg="#FEF2F2" border="#FEE2E2" />
                      </div>
                    </div>

                    {/* Cola de verificación */}
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                        <Clock3 size={13} /> Cola de verificación
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                        <StatTile label="Pendientes cédula SEP" value={estadisticas.cola.pendientesCedula} color="#D97706" bg="#FFFBEB" border="#FEF3C7" />
                        <StatTile label="Antigüedad prom. (días)" value={estadisticas.cola.antiguedadPromedioCedula} color="#D97706" bg="#FFFBEB" border="#FEF3C7" />
                        <StatTile label="Antigüedad máx. (días)" value={estadisticas.cola.antiguedadMaxCedula} color="#DC2626" bg="#FEF2F2" border="#FEE2E2" />
                        <StatTile label="En progreso COFEPRIS" value={estadisticas.cola.pendientesCofepris} color="#8B5CF6" bg="#F5F3FF" border="#DDD6FE" icon={<Megaphone size={12} />} />
                      </div>
                      <p style={{ fontSize:11, color:'#9CA3AF', marginTop:8 }}>
                        "En progreso COFEPRIS" cuenta médicos que ya declararon tener Aviso de Funcionamiento pero aún no capturan su número de aviso.
                      </p>
                    </div>

                    {/* Actividad */}
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                        <TrendingUp size={13} /> Actividad
                      </p>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
                        <StatTile label="Citas totales" value={estadisticas.actividad.citasTotales} color="#1E3A5F" bg="#E8ECF3" border="#C5D0E0" icon={<CalendarCheck size={12} />} />
                        <StatTile label="Tasa de confirmación" value={`${estadisticas.actividad.tasaConfirmacion}%`} color="#059669" bg="#ECFDF5" border="#D1FAE5" />
                        <StatTile label="Registros (7 días)" value={estadisticas.actividad.registrosUltimos7Dias} color="#2A9D8F" bg="#E8F7F5" border="#9FD8CD" />
                        <StatTile label="Registros (30 días)" value={estadisticas.actividad.registrosUltimos30Dias} color="#2A9D8F" bg="#E8F7F5" border="#9FD8CD" />
                      </div>
                      <p style={{ fontSize:11, color:'#9CA3AF', marginTop:8 }}>
                        Tasa de confirmación = citas confirmadas o completadas / total de citas ({estadisticas.actividad.citasConfirmadas} de {estadisticas.actividad.citasTotales}).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contenido señalado — IA en creación + reportes manuales, de cualquier médico */}
          <div style={{ background:'#fff', border:'1px solid #E8ECF3', borderRadius:16, marginBottom:24, overflow:'hidden' }}>
            <button onClick={() => setFlaggedAbierta(v => !v)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
              <span style={{ display:'flex', alignItems:'center', gap:8, fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:900, color:'#1E3A5F' }}>
                <AlertCircle size={18} color="#DC2626" /> Contenido señalado
                {flaggedItems.length > 0 && (
                  <span style={{ background:'#FEF2F2', color:'#DC2626', border:'1px solid #FEE2E2', borderRadius:20, padding:'2px 9px', fontSize:12, fontWeight:700 }}>
                    {flaggedItems.length}
                  </span>
                )}
              </span>
              <ChevronDown size={16} color="#6B7280" style={{ transform: flaggedAbierta ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }} />
            </button>

            {flaggedAbierta && (
              <div style={{ padding:'0 20px 20px' }}>
                {loadingFlagged ? (
                  <p style={{ fontSize:13, color:'#9CA3AF', padding:'12px 0' }}>Cargando...</p>
                ) : flaggedItems.length === 0 ? (
                  <p style={{ fontSize:13, color:'#9CA3AF', padding:'12px 0' }}>No hay contenido señalado por revisar.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {flaggedItems.map(item => {
                      const procesando = procesandoFlaggedId === item.id
                      return (
                        <div key={`${item.tipo}-${item.id}`} style={{ border:'1px solid #FEE2E2', background:'#FFFBFB', borderRadius:8, padding:12 }}>
                          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                              <span style={{ fontSize:12, fontWeight:700, color:'#1E3A5F' }}>{item.doctorName}</span>
                              <span style={{ fontSize:10, fontWeight:700, color:'#6B7280', background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:20, padding:'2px 8px' }}>
                                {item.tipo === 'review' ? 'Reseña' : 'Respuesta del médico'}
                              </span>
                              <span style={{ fontSize:10, fontWeight:700, borderRadius:20, padding:'2px 8px', border:'1px solid', ...(item.flaggedBy === 'usuario'
                                ? { color:'#D97706', background:'#FFFBEB', borderColor:'#FEF3C7' }
                                : { color:'#7C3AED', background:'#F5F3FF', borderColor:'#DDD6FE' }) }}>
                                {item.flaggedBy === 'usuario' ? 'Reportado por un usuario' : 'Señalado por IA'}
                              </span>
                            </div>
                            <div style={{ display:'flex', gap:12, flexShrink:0 }}>
                              <button onClick={() => aprobarSenalado(item)} disabled={procesando}
                                style={{ background:'none', border:'none', cursor: procesando ? 'not-allowed' : 'pointer', color:'#059669', fontSize:12, fontWeight:700, padding:0, opacity: procesando ? 0.5 : 1 }}>
                                Dejar
                              </button>
                              <button onClick={() => eliminarSenalado(item)} disabled={procesando}
                                title="Eliminar"
                                style={{ background:'none', border:'none', cursor: procesando ? 'not-allowed' : 'pointer', color:'#DC2626', padding:0, opacity: procesando ? 0.5 : 1 }}>
                                {procesando
                                  ? <span className="spin" style={{ width:13, height:13, border:'2px solid #DC262640', borderTopColor:'#DC2626', borderRadius:'50%', display:'inline-block' }} />
                                  : <Trash2 size={14} />}
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize:13, color:'#374151', lineHeight:1.5, marginBottom:6, whiteSpace:'pre-wrap' }}>{item.texto}</p>
                          {item.reason && (
                            <p style={{ fontSize:11, color:'#9CA3AF', fontStyle:'italic' }}>Motivo: {item.reason}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filtros — Estado de cuenta */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Estado de cuenta:
            </span>
            {(['todos','pendiente','revisado','rechazado'] as const).map(f => {
              const active = reviewFilter === f
              const map = {
                todos:    { label:'Todos',                              onBg:'#1E3A5F', offBg:'#F9FAFB', offColor:'#1E3A5F', border:'#C5D0E0' },
                pendiente:{ label:`Pendientes (${counts.pendiente})`,  onBg:'#D97706', offBg:'#FFFBEB', offColor:'#D97706', border:'#FEF3C7' },
                revisado: { label:`Cuenta activa (${counts.revisado})`, onBg:'#059669', offBg:'#ECFDF5', offColor:'#059669', border:'#D1FAE5' },
                rechazado:{ label:`Rechazados (${counts.rechazado})`,  onBg:'#DC2626', offBg:'#FEF2F2', offColor:'#DC2626', border:'#FEE2E2' },
              }[f]
              return (
                <button key={f} className="fpill" onClick={() => setReviewFilter(f)}
                  style={{ background: active ? map.onBg : map.offBg, color: active ? '#fff' : map.offColor, borderColor: map.border }}>
                  {map.label}
                </button>
              )
            })}

            <div style={{ display:'flex', gap:10, alignItems:'center', marginLeft:'auto', flexWrap:'wrap' }}>
              <button className="fpill" onClick={() => setFechaSortAsc(v => !v)}
                style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#F9FAFB', color:'#1E3A5F', borderColor:'#C5D0E0' }}>
                {fechaSortAsc ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                {fechaSortAsc ? 'Más antiguos primero' : 'Más recientes primero'}
              </button>
              <div style={{ position:'relative' }}>
                <select value={espFilter} onChange={e => setEspFilter(e.target.value)}
                  style={{ appearance:'none', background:'#fff', border:'1.5px solid #C5D0E0', borderRadius:50, padding:'8px 36px 8px 16px', fontSize:13, fontWeight:600, color:'#1E3A5F', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                  <option value="todas">Todas las especialidades</option>
                  {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <ChevronDown size={14} color="#1E3A5F" style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>
            </div>
          </div>

          {/* Filtros de Credenciales (credentials_status — Parte A/C) */}
          <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Credenciales:
            </span>
            {(['todos','pendiente','verificado','no_coincide','sin_especialidad'] as const).map(f => {
              const active = credFilter === f
              const map = {
                todos:            { label:'Todas',                                              onBg:'#1E3A5F', offBg:'#F9FAFB', offColor:'#1E3A5F', border:'#C5D0E0' },
                pendiente:        { label:`Pendientes (${credCounts.pendiente})`,                onBg:'#D97706', offBg:'#FFFBEB', offColor:'#D97706', border:'#FEF3C7' },
                verificado:       { label:`Verificadas (${credCounts.verificado})`,              onBg:'#059669', offBg:'#ECFDF5', offColor:'#059669', border:'#D1FAE5' },
                no_coincide:      { label:`No coinciden (${credCounts.no_coincide})`,            onBg:'#DC2626', offBg:'#FEF2F2', offColor:'#DC2626', border:'#FEE2E2' },
                sin_especialidad: { label:`Sin especialidad (${credCounts.sin_especialidad})`,   onBg:'#6B7280', offBg:'#F3F4F6', offColor:'#6B7280', border:'#E5E7EB' },
              }[f]
              return (
                <button key={f} className="fpill" onClick={() => setCredFilter(f)}
                  style={{ background: active ? map.onBg : map.offBg, color: active ? '#fff' : map.offColor, borderColor: map.border }}>
                  {map.label}
                </button>
              )
            })}
          </div>

          {/* Médicos — tarjetas (misma estructura en celular y escritorio; la rejilla se reacomoda sola) */}
          {loading ? (
            <div style={{ textAlign:'center', padding:64 }}>
              <div style={{ width:36, height:36, border:'3px solid #E8ECF3', borderTopColor:'#1E3A5F', borderRadius:'50%', margin:'0 auto 12px' }} className="spin" />
              <p style={{ color:'#9CA3AF', fontSize:14 }}>Cargando médicos...</p>
            </div>
          ) : medicosVisibles.length === 0 ? (
            <div style={{ textAlign:'center', padding:64, background:'#fff', borderRadius:16, border:'1px solid #E8ECF3' }}>
              <p style={{ fontSize:15, color:'#6B7280' }}>Sin médicos con ese filtro.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
              {medicosVisibles.map(m => {
                const badge          = statusBadge(m.review_status)
                const credRows       = credentialsByDoctor[m.id]
                const credBadge      = credencialesBadge(resumenCredenciales(credRows), credRows)
                const constanciaEstado = estadoConstancia((historialCountByDoctor[m.id] || 0) > 0, credRows)
                const constanciaBoton  = constanciaBotonEstilo(constanciaEstado)
                const procReview     = procesando === m.id + '_review'
                const procActivo     = procesando === m.id + '_activo'

                const acciones: { key: string; node: React.ReactNode }[] = []
                if (!(m.review_status === 'revisado' && m.verification_status === 'verificado')) {
                  acciones.push({ key:'verificar', node: (
                    <button className="act-btn" disabled={procReview}
                      onClick={() => verificarYAprobar(m)}
                      style={{ width:'100%', justifyContent:'center', background:'#ECFDF5', color:'#059669', borderColor:'#D1FAE5' }}>
                      {procReview
                        ? <span className="spin" style={{ width:12, height:12, border:'2px solid #05966940', borderTopColor:'#059669', borderRadius:'50%' }} />
                        : <CheckCircle size={13} />}
                      Verificar y aprobar
                    </button>
                  )})
                }
                if (m.review_status !== 'rechazado') {
                  acciones.push({ key:'rechazar', node: (
                    <button className="act-btn" disabled={procReview}
                      onClick={() => setReviewStatus(m, 'rechazado')}
                      style={{ width:'100%', justifyContent:'center', background:'#FEF2F2', color:'#DC2626', borderColor:'#FEE2E2' }}>
                      {procReview
                        ? <span className="spin" style={{ width:12, height:12, border:'2px solid #DC262640', borderTopColor:'#DC2626', borderRadius:'50%' }} />
                        : <XCircle size={13} />}
                      Rechazar
                    </button>
                  )})
                }
                acciones.push({ key:'activo', node: (
                  <button className="act-btn" disabled={procActivo}
                    onClick={() => toggleActivo(m)}
                    style={{ width:'100%', justifyContent:'center', background:'#E8ECF3', color:'#1E3A5F', borderColor:'#C5D0E0' }}>
                    {procActivo
                      ? <span className="spin" style={{ width:12, height:12, border:'2px solid #1E3A5F40', borderTopColor:'#1E3A5F', borderRadius:'50%' }} />
                      : m.is_active ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}
                    {m.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                )})
                acciones.push({ key:'perfil', node: (
                  <Link href={`/doctor/${m.id}`} target="_blank" rel="noopener noreferrer"
                    className="act-btn" style={{ width:'100%', justifyContent:'center', background:'#F9FAFB', color:'#6B7280', borderColor:'#E5E7EB', textDecoration:'none' }}>
                    <ExternalLink size={13} />
                    Ver perfil
                  </Link>
                )})
                acciones.push({ key:'resenas', node: (
                  <button className="act-btn"
                    onClick={() => abrirResenasModal(m)}
                    style={{ width:'100%', justifyContent:'center', background:'#F9FAFB', color:'#6B7280', borderColor:'#E5E7EB' }}>
                    <MessageSquare size={13} />
                    Reseñas
                  </button>
                )})

                return (
                  <div key={m.id} style={{ background:'#fff', border:'1px solid #E8ECF3', borderRadius:16, padding:16, display:'flex', flexDirection:'column', gap:12 }}>

                    {/* Médico */}
                    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background:'#E8ECF3', color:'#1E3A5F', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, fontFamily:"'Fraunces',serif", flexShrink:0 }}>
                        {medicoInitials(m.full_name)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, color:'#0D1829', fontSize:15, marginBottom:2, overflowWrap:'break-word' }}>{m.full_name}</p>
                        <p style={{ fontSize:12, color:'#2A9D8F', fontWeight:600, marginBottom:2 }}>{m.specialty}</p>
                        <p style={{ fontSize:12, color:'#6B7280', overflowWrap:'break-word' }}>{m.email}</p>
                      </div>
                    </div>

                    {/* Estado + Credenciales — Parte A/C, deciden visibilidad pública */}
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <span style={{ background:badge.bg, color:badge.color, border:`1px solid ${badge.border}`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, display:'inline-block' }}>
                        {badge.label}
                      </span>
                      <span style={{
                        background: m.is_active ? '#ECFDF5' : '#F3F4F6',
                        color:      m.is_active ? '#059669' : '#9CA3AF',
                        border:    `1px solid ${m.is_active ? '#D1FAE5' : '#E5E7EB'}`,
                        borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, display:'inline-block',
                      }}>
                        {m.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span style={{ background:credBadge.bg, color:credBadge.color, border:`1px solid ${credBadge.border}`, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, display:'inline-block' }}>
                        {credBadge.label}
                      </span>
                    </div>

                    {/* Cédula + fecha de registro */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 16px', fontSize:12, color:'#6B7280', paddingTop:10, borderTop:'1px solid #F3F4F6' }}>
                      <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                        Cédula:
                        <code style={{ fontSize:12, background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:6, padding:'2px 7px', color:'#111827' }}>
                          {m.professional_license || '—'}
                        </code>
                        {m.professional_license && (
                          <a
                            href="https://cedulaprofesional.sep.gob.mx/"
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir portal de la SEP para verificar esta cédula"
                            style={{ display:'inline-flex', color:'#1E3A5F' }}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </span>
                      <span>Registrado: {formatFecha(m.created_at)}</span>
                    </div>

                    {/* Constancia — ancho completo, siempre visible */}
                    <button className="act-btn"
                      onClick={() => abrirConstanciaModal(m)}
                      style={{ width:'100%', justifyContent:'center', background:constanciaBoton.bg, color:constanciaBoton.color, borderColor:constanciaBoton.border, padding:'9px' }}>
                      <FileText size={13} />
                      {constanciaBoton.label}
                    </button>

                    {/* Acciones secundarias — 2 por fila; si sobra una sola, ocupa el ancho completo */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {acciones.map((a, idx) => (
                        <div key={a.key} style={ idx === acciones.length - 1 && acciones.length % 2 === 1 ? { gridColumn:'1 / -1' } : undefined }>
                          {a.node}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: subir constancia SEP (Parte B) */}
      {constanciaModalDoctor && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,24,41,0.55)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={cerrarConstanciaModal}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:560, width:'100%', maxHeight:'88vh', overflowY:'auto', fontFamily:"'DM Sans',sans-serif" }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:900, color:'#1E3A5F' }}>Constancia SEP</h2>
                <p style={{ fontSize:13, color:'#6B7280', marginTop:2 }}>{constanciaModalDoctor.full_name}</p>
              </div>
              <button onClick={cerrarConstanciaModal} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:14, marginBottom:16 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
                Documento {currentAuditLogId && <span style={{ color:'#059669' }}>· guardado ✓</span>}
              </p>

              <label style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center', border:'1.5px dashed #C5D0E0', borderRadius:8, padding:'14px', cursor:'pointer', marginBottom:10, background:'#fff' }}>
                <Upload size={15} color="#1E3A5F" />
                <span style={{ fontSize:13, color:'#1E3A5F', fontWeight:600 }}>
                  {extrayendo ? 'Leyendo PDF...' : constanciaFile ? constanciaFile.name : 'Elegir PDF de la constancia'}
                </span>
                <input type="file" accept="application/pdf" style={{ display:'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0] || null
                    setConstanciaFile(f)
                    setCurrentAuditLogId(null)
                    setExtraccionAvisos([])
                    if (f) extraerYPrellenar(f)
                  }} />
              </label>

              {extraccionAvisos.length > 0 && (
                <div style={{ background:'#FFFBEB', border:'1px solid #FEF3C7', borderRadius:8, padding:10, marginBottom:10 }}>
                  {extraccionAvisos.map((a, i) => (
                    <p key={i} style={{ fontSize:11, color:'#92400E', margin: i > 0 ? '4px 0 0' : 0 }}>⚠ {a}</p>
                  ))}
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:8 }}>
                <input type="text" placeholder="Folio de la constancia (documento)" value={constanciaFolio}
                  onChange={e => { setConstanciaFolio(e.target.value); setCurrentAuditLogId(null) }}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif" }} />
                <textarea placeholder="Notas (opcional)" value={constanciaNotas} rows={2}
                  onChange={e => setConstanciaNotas(e.target.value)}
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, fontFamily:"'DM Sans',sans-serif", resize:'vertical' }} />
              </div>

              {constanciaError && <p style={{ fontSize:12, color:'#DC2626', marginBottom:8 }}>{constanciaError}</p>}

              <button
                disabled={subiendoDocumento || !!currentAuditLogId}
                onClick={guardarDocumento}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, background: currentAuditLogId ? '#ECFDF5' : '#1E3A5F', color: currentAuditLogId ? '#059669' : '#fff', border:'none', borderRadius:8, padding:'10px', fontSize:13, fontWeight:700, cursor: currentAuditLogId ? 'default' : 'pointer', opacity: subiendoDocumento ? 0.6 : 1 }}>
                {subiendoDocumento
                  ? <span className="spin" style={{ width:13, height:13, border:'2px solid #ffffff60', borderTopColor:'#fff', borderRadius:'50%' }} />
                  : currentAuditLogId ? <CheckCircle size={14} /> : <Upload size={14} />}
                {currentAuditLogId ? 'Documento guardado' : 'Guardar documento'}
              </button>
            </div>

            <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
              Especialidades certificables
            </p>
            {cargandoModalCredentials ? (
              <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:16 }}>Cargando...</p>
            ) : modalCredentials.length === 0 ? (
              <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:16 }}>Este médico no tiene especialidades certificables (ej. su especialidad es Medicina General).</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {modalCredentials.map(cred => {
                  const eb = estadoCredencialBadge(cred.credentials_status)
                  const input = cardInputs[cred.id] || { numero: '', vigencia: '' }
                  const guardandoEsta = guardandoCardId === cred.id
                  return (
                    <div key={cred.id} style={{ border:'1px solid #E5E7EB', borderRadius:8, padding:12 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                        <div>
                          <p style={{ fontSize:13, fontWeight:700, color:'#1E3A5F', margin:0 }}>{cred.granular_name}</p>
                          <p style={{ fontSize:11, color:'#6B7280', margin:0 }}>{cred.council_name}</p>
                        </div>
                        <span style={{ background:eb.bg, color:eb.color, border:`1px solid ${eb.border}`, borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>{eb.label}</span>
                      </div>
                      {cred.self_declared_not_current && (
                        <p style={{ fontSize:11, color:'#D97706', marginBottom:8 }}>⚠ El médico declaró que no está vigente</p>
                      )}
                      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                        <input type="text" placeholder="No. de certificación" value={input.numero}
                          onChange={e => setCardInputs(prev => ({ ...prev, [cred.id]: { ...prev[cred.id], numero: e.target.value, vigencia: prev[cred.id]?.vigencia || '' } }))}
                          style={{ flex:1, padding:'7px 10px', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12 }} />
                        <input type="date" value={input.vigencia}
                          onChange={e => setCardInputs(prev => ({ ...prev, [cred.id]: { numero: prev[cred.id]?.numero || '', vigencia: e.target.value } }))}
                          style={{ flex:1, padding:'7px 10px', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12 }} />
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button
                          disabled={guardandoCardId !== null || !currentAuditLogId}
                          onClick={() => guardarCredencial(cred.id, 'verificado')}
                          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'#059669', color:'#fff', border:'none', borderRadius:6, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer', opacity: (guardandoCardId !== null || !currentAuditLogId) ? 0.5 : 1 }}>
                          {guardandoEsta ? <span className="spin" style={{ width:11, height:11, border:'2px solid #ffffff60', borderTopColor:'#fff', borderRadius:'50%' }} /> : <CheckCircle size={12} />}
                          Verificar y aprobar
                        </button>
                        <button
                          disabled={guardandoCardId !== null || !currentAuditLogId}
                          onClick={() => guardarCredencial(cred.id, 'no_coincide')}
                          style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, background:'#FEF2F2', color:'#DC2626', border:'1px solid #FEE2E2', borderRadius:6, padding:'8px', fontSize:12, fontWeight:700, cursor:'pointer', opacity: (guardandoCardId !== null || !currentAuditLogId) ? 0.5 : 1 }}>
                          {guardandoEsta ? <span className="spin" style={{ width:11, height:11, border:'2px solid #DC262640', borderTopColor:'#DC2626', borderRadius:'50%' }} /> : <XCircle size={12} />}
                          No coincide
                        </button>
                      </div>
                    </div>
                  )
                })}
                {!currentAuditLogId && (
                  <p style={{ fontSize:11, color:'#9CA3AF' }}>Sube y guarda el documento arriba para poder aprobar las especialidades.</p>
                )}
              </div>
            )}

            <p style={{ fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Historial de documentos</p>
            {cargandoHistorial ? (
              <p style={{ fontSize:13, color:'#9CA3AF' }}>Cargando...</p>
            ) : constanciaHistorial.length === 0 ? (
              <p style={{ fontSize:13, color:'#9CA3AF' }}>Aún no se ha subido ninguna constancia.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {constanciaHistorial.map(c => (
                  <div key={c.id} style={{ border:'1px solid #E5E7EB', borderRadius:8, padding:10 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'#1E3A5F' }}>Folio: {c.folio || '—'}</span>
                      <button
                        onClick={() => eliminarConstancia(c)}
                        disabled={eliminandoId === c.id}
                        title="Eliminar este documento"
                        style={{ background:'none', border:'none', cursor: eliminandoId === c.id ? 'not-allowed' : 'pointer', color:'#DC2626', padding:2, opacity: eliminandoId === c.id ? 0.5 : 1, flexShrink:0 }}>
                        {eliminandoId === c.id
                          ? <span className="spin" style={{ width:13, height:13, border:'2px solid #DC262640', borderTopColor:'#DC2626', borderRadius:'50%', display:'inline-block' }} />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                    <p style={{ fontSize:11, color:'#6B7280', margin:'2px 0' }}>Subido: {formatFecha(c.created_at)}</p>
                    {c.admin_notas && <p style={{ fontSize:11, color:'#6B7280', marginBottom:4, fontStyle:'italic' }}>{c.admin_notas}</p>}
                    {c.pdf_url && (
                      constanciaPdfUrls[c.pdf_url] ? (
                        <a href={constanciaPdfUrls[c.pdf_url]} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:'#1E3A5F', fontWeight:600 }}>
                          Abrir PDF ↗
                        </a>
                      ) : (
                        <button onClick={() => verPdfConstancia(c.pdf_url!)} style={{ background:'none', border:'none', color:'#1E3A5F', fontSize:12, fontWeight:600, cursor:'pointer', padding:0 }}>
                          Ver PDF
                        </button>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: reseñas y respuestas (Parte 3, moderación) */}
      {resenasModalDoctor && (
        <div style={{ position:'fixed', inset:0, background:'rgba(13,24,41,0.55)', zIndex:5000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={cerrarResenasModal}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:560, width:'100%', maxHeight:'88vh', overflowY:'auto', fontFamily:"'DM Sans',sans-serif" }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:900, color:'#1E3A5F' }}>Reseñas</h2>
                <p style={{ fontSize:13, color:'#6B7280', marginTop:2 }}>{resenasModalDoctor.full_name}</p>
              </div>
              <button onClick={cerrarResenasModal} style={{ background:'none', border:'none', cursor:'pointer', color:'#9CA3AF' }}>
                <X size={20} />
              </button>
            </div>

            {cargandoResenas ? (
              <p style={{ fontSize:13, color:'#9CA3AF' }}>Cargando...</p>
            ) : resenasDelDoctor.length === 0 ? (
              <p style={{ fontSize:13, color:'#9CA3AF' }}>Este médico no tiene reseñas.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {resenasDelDoctor.map(r => (
                  <div key={r.id} style={{ border:'1px solid #E5E7EB', borderRadius:8, padding:12 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                      <div style={{ display:'flex', gap:2 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={13} color="#F59E0B" fill={i <= r.rating ? '#F59E0B' : 'none'} />
                        ))}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        {!r.is_visible && (
                          <span style={{ background:'#F3F4F6', color:'#9CA3AF', border:'1px solid #E5E7EB', borderRadius:20, padding:'2px 8px', fontSize:10, fontWeight:700 }}>Oculta</span>
                        )}
                        <button
                          onClick={() => eliminarResena(r)}
                          disabled={eliminandoResenaId === r.id}
                          title="Eliminar esta reseña (y su respuesta, si tiene)"
                          style={{ background:'none', border:'none', cursor: eliminandoResenaId === r.id ? 'not-allowed' : 'pointer', color:'#DC2626', padding:2, opacity: eliminandoResenaId === r.id ? 0.5 : 1 }}>
                          {eliminandoResenaId === r.id
                            ? <span className="spin" style={{ width:13, height:13, border:'2px solid #DC262640', borderTopColor:'#DC2626', borderRadius:'50%', display:'inline-block' }} />
                            : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize:11, color:'#6B7280', marginBottom:4 }}>{formatFecha(r.created_at)}</p>
                    {r.comment && <p style={{ fontSize:13, color:'#374151', lineHeight:1.5, marginBottom:8 }}>{r.comment}</p>}

                    {r.respuesta && (
                      <div style={{ background:'#F0F4F8', borderRadius:8, padding:10, borderLeft:'3px solid #1E3A5F' }}>
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:'#1E3A5F', textTransform:'uppercase', letterSpacing:'0.04em' }}>Respuesta del médico</span>
                          <button
                            onClick={() => eliminarRespuesta(r)}
                            disabled={eliminandoRespuestaId === r.respuesta.id}
                            title="Eliminar solo la respuesta"
                            style={{ background:'none', border:'none', cursor: eliminandoRespuestaId === r.respuesta.id ? 'not-allowed' : 'pointer', color:'#DC2626', padding:2, opacity: eliminandoRespuestaId === r.respuesta.id ? 0.5 : 1, flexShrink:0 }}>
                            {eliminandoRespuestaId === r.respuesta.id
                              ? <span className="spin" style={{ width:12, height:12, border:'2px solid #DC262640', borderTopColor:'#DC2626', borderRadius:'50%', display:'inline-block' }} />
                              : <Trash2 size={12} />}
                          </button>
                        </div>
                        <p style={{ fontSize:13, color:'#374151', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{r.respuesta.respuesta}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
