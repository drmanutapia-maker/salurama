'use client'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Turnstile } from '@marsidev/react-turnstile'
import { fraunces, dmSans } from '@/lib/fonts'
import {
  MapPin, Star, ShieldCheck, Shield, ExternalLink, Copy, CheckCircle, X,
  ChevronDown, ChevronLeft, ChevronRight, Briefcase, GraduationCap, Heart, Calendar, DollarSign, Info,
  Clock, Navigation, Phone, MessageCircle, Globe, Share2, Image as ImageIcon, Flag
} from 'lucide-react'
import BackButton from '@/components/BackButton'
import InstalarAppBanner from '@/components/InstalarAppBanner'
import { jsonLdSeguro } from '@/lib/sanitizarTextoLibre'
import { useInstalarAppElegibilidad } from '@/hooks/useInstalarAppElegibilidad'
import { getStateLabel } from '@/lib/locations'
import { calculateProfileCompletion } from '@/hooks/useProfileCompletion'
import BaculoEsculapio from '@/components/icons/BaculoEsculapio'

export interface Medico {
  id: string
  slug: string | null
  is_active: boolean
  full_name: string
  display_name: string | null
  professional_title: string | null
  email: string
  specialty: string
  sub_specialty: string | null
  ciudad: string | null
  estado: string | null
  colonia: string | null
  cp: string | null
  street: string | null
  ext_number: string | null
  int_number: string | null
  floor: string | null
  clinic_type: string | null
  address: string
  consultation_price_general: number | null
  consultation_price_first_time: number | null
  consultation_price_followup: number | null
  photo_url: string | null
  about_me: string | null
  rating_avg: number
  rating_count: number
  years_experience: number | null
  years_of_experience: number | null
  hospital_affiliation: string | null
  languages: string[] | string | null
  insurance_names: string[] | null
  accepts_insurance: boolean
  payment_methods: string[] | null
  clinic_name: string | null
  clinic_lat: number | null
  clinic_lng: number | null
  clinic_address: string | null
  clinic_phone: string | null
  whatsapp_available: boolean
  whatsapp_phone: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  professional_license: string | null
  review_status: string | null
  min_patient_age: number | null
  max_patient_age: number | null
  horario: Record<string, any> | null
  duracion_cita_minutos: number | null
  pricing_tier: string
}

export interface GalleryPhoto {
  id: string
  photo_url: string
  caption: string | null
}

export interface License {
  id: string
  license_number: string
  license_type: string
  institution: string
}

export interface EducationItem {
  id: string
  institution: string
  degree: string
  field_of_study: string
  graduation_year: number
}

export interface ExperienceItem {
  id: string
  institution_name: string
  position: string
  location: string
  start_date?: string | null
  end_date?: string | null
  is_current: boolean
}

export interface Condition {
  id: string
  condition_name: string
  category: string
}

export interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
  respuesta: string | null
  respuestaId: string | null
}

export interface SpecialtyCredential {
  id: string
  credentials_status: 'pendiente' | 'verificado' | 'no_coincide'
  granular_name: string
  council_name: string | null
}

const normalizarTexto = (texto: string): string => {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

const parseLangs = (raw: string[] | string | null): string[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [raw] }
}

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LABELS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const identLabelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' } as const
const identAvisoStyle = { fontSize: 12, color: '#6B7280', background: '#F9FAFB', padding: '8px 12px', borderRadius: 8, margin: 0, lineHeight: 1.5 } as const

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }
  return (
    <button
      onClick={handleCopy}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#10B981' : '#9CA3AF', padding: 4, display: 'flex', alignItems: 'center' }}
      type="button"
    >
      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
    </button>
  )
}

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 500, width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AppointmentModal({
  medico,
  onClose,
}: {
  medico: Medico
  onClose: () => void
}) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [pacienteIdReserva, setPacienteIdReserva] = useState<string | null>(null)
  const [mostrarInstalarBannerPaciente, setMostrarInstalarBannerPaciente] = useState(false)
  const { modo: modoInstalarApp, deferredPrompt: deferredInstalarApp } = useInstalarAppElegibilidad()
  const [turnstileToken, setTurnstileToken] = useState('')
  const [formLoadTime] = useState(Date.now())
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    requested_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }),
    requested_time: '',
    patient_name: '',
    patient_email: '',
    patient_phone: '',
    reason: '',
    honeypot: ''
  })

  const [modoPaciente, setModoPaciente] = useState<'primera' | 'existente' | null>(null)
  const [contactoBusqueda, setContactoBusqueda] = useState('')
  const [buscandoPaciente, setBuscandoPaciente] = useState(false)
  // Ya no existe 'no_encontrado' — la respuesta de buscar-paciente nunca
  // revela si hubo coincidencia (ver auditoría del flujo de citas,
  // 2026-07-28), así que siempre se pasa a pedir el código.
  const [resultadoBusqueda, setResultadoBusqueda] = useState<'idle' | 'codigo_enviado' | 'encontrado' | 'codigo_invalido' | 'limite' | 'error'>('idle')
  const [minutosEspera, setMinutosEspera] = useState<number | null>(null)
  const [codigoOtp, setCodigoOtp] = useState('')
  const [verificandoCodigo, setVerificandoCodigo] = useState(false)
  const [pacienteId, setPacienteId] = useState<string | null>(null)
  const [actualizarDatos, setActualizarDatos] = useState(false)
  const [ocupadas, setOcupadas] = useState<string[]>([])
  const [fechasBloqueadas, setFechasBloqueadas] = useState<Set<string>>(new Set())
  const [mesCalendario, setMesCalendario] = useState(() => {
    const d = new Date(formData.requested_date + 'T00:00:00')
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [mostrarAyudaOtp, setMostrarAyudaOtp] = useState(false)

  // Los horarios que arma getTimeSlotsForDate salen solo de la agenda
  // general del médico — no sabían nada de las citas ya existentes. Esto
  // los cruza contra las que ya están vivas (pending_verification o
  // confirmed) para no ofrecer como "disponible" un horario ya tomado. El
  // índice único en la base de datos es la protección real contra doble
  // reserva; esto es solo para que el paciente casi nunca choque contra
  // ese error en el flujo normal.
  useEffect(() => {
    let cancelado = false
    fetch(`/api/citas/disponibilidad?medicoId=${medico.id}&fecha=${formData.requested_date}`)
      .then(res => res.ok ? res.json() : { ocupadas: [] })
      .then(data => { if (!cancelado) setOcupadas(data.ocupadas || []) })
      .catch(() => { if (!cancelado) setOcupadas([]) })
    return () => { cancelado = true }
  }, [medico.id, formData.requested_date])

  // Fechas puntuales que el médico bloqueó (ej. vacaciones) desde
  // /dashboard/horario -- se piden todas de una vez (no por fecha, como
  // `ocupadas`) porque también las necesita el calendario para deshabilitar
  // esas celdas, no solo el día seleccionado.
  useEffect(() => {
    let cancelado = false
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    supabase
      .from('doctor_blocked_dates')
      .select('fecha')
      .eq('doctor_id', medico.id)
      .gte('fecha', hoy)
      .then(({ data }) => { if (!cancelado) setFechasBloqueadas(new Set((data || []).map(b => b.fecha))) })
    return () => { cancelado = true }
  }, [medico.id])

  // El mensaje de ayuda "¿no te llegó el código?" no puede depender de si
  // hubo coincidencia real (eso filtraría la misma información que el
  // diseño de seguridad ya decidió no revelar). Por eso aparece siempre
  // igual tras un tiempo prudente de espera, sin importar si el contacto
  // tenía o no una cita previa.
  useEffect(() => {
    if (resultadoBusqueda !== 'codigo_enviado') {
      setMostrarAyudaOtp(false)
      return
    }
    const timer = setTimeout(() => setMostrarAyudaOtp(true), 20000)
    return () => clearTimeout(timer)
  }, [resultadoBusqueda])

  const campoIdentidadBloqueado = resultadoBusqueda === 'encontrado' && !actualizarDatos

  // "existente" (marcó "ya he tenido cita") usa el precio de subsecuente;
  // "primera" o sin marcar (ambiguo, no se le puede negar el paso) usa el
  // de primera vez. Ver bug reportado: el resumen mostraba siempre el
  // precio de primera vez sin importar esta selección.
  const precioMostrado = modoPaciente === 'existente'
    ? (medico.consultation_price_general ?? medico.consultation_price_first_time)
    : (medico.consultation_price_first_time ?? medico.consultation_price_general)

  const seleccionarModoPaciente = (nuevoModo: 'primera' | 'existente') => {
    setModoPaciente(actual => (actual === nuevoModo ? null : nuevoModo))
    setResultadoBusqueda('idle')
    setMinutosEspera(null)
    setCodigoOtp('')
    setPacienteId(null)
    setActualizarDatos(false)
    setContactoBusqueda('')
  }

  const handleBuscarPaciente = async () => {
    if (!contactoBusqueda.trim()) return
    setBuscandoPaciente(true)
    setCodigoOtp('')
    try {
      const res = await fetch('/api/citas/buscar-paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicoId: medico.id, contacto: contactoBusqueda }),
      })
      if (res.status === 429) {
        const retryAfterSeg = Number(res.headers.get('Retry-After')) || 3600
        setMinutosEspera(Math.ceil(retryAfterSeg / 60))
        setResultadoBusqueda('limite')
        return
      }
      // Sin importar si hubo o no coincidencia real, la respuesta es la
      // misma: pasamos a pedir el código que, si existía un paciente, ya
      // le llegó a su correo.
      setPacienteId(null)
      setResultadoBusqueda('codigo_enviado')
    } catch {
      setResultadoBusqueda('error')
    } finally {
      setBuscandoPaciente(false)
    }
  }

  const handleVerificarCodigo = async () => {
    if (!codigoOtp.trim()) return
    setVerificandoCodigo(true)
    try {
      const res = await fetch('/api/citas/verificar-codigo-paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicoId: medico.id, contacto: contactoBusqueda, code: codigoOtp.trim() }),
      })
      if (res.status === 429) {
        const retryAfterSeg = Number(res.headers.get('Retry-After')) || 3600
        setMinutosEspera(Math.ceil(retryAfterSeg / 60))
        setResultadoBusqueda('limite')
        return
      }
      if (!res.ok) {
        setResultadoBusqueda('codigo_invalido')
        return
      }
      const data = await res.json()
      setPacienteId(data.pacienteId)
      setFormData(f => ({ ...f, patient_name: data.nombre || '', patient_email: data.email || '', patient_phone: data.telefono || '' }))
      setResultadoBusqueda('encontrado')
    } catch {
      setResultadoBusqueda('codigo_invalido')
    } finally {
      setVerificandoCodigo(false)
    }
  }

  const horarioParsed = (() => {
    if (!medico?.horario) return null
    let horario = medico.horario
    if (typeof horario === 'string') {
      try { horario = JSON.parse(horario) } catch { return null }
    }
    const normalizado: Record<string, any> = {}
    Object.keys(horario).forEach(key => {
      const keyNormalizada = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      normalizado[keyNormalizada] = horario[key]
    })
    return normalizado
  })()

  const fmtDateMX = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Única fuente de verdad de "¿el médico atiende este día de la semana?" —
  // la usan tanto el cálculo de horarios como el calendario del paso 1,
  // para que nunca queden desincronizados entre sí.
  const diaEstaAbierto = (dayIndex: number) => {
    if (!horarioParsed) return false
    const horarioDia = horarioParsed[DIAS_SEMANA[dayIndex]]
    if (!horarioDia) return false
    const inicio = horarioDia.inicio || horarioDia.start
    const fin = horarioDia.fin || horarioDia.end
    const abierto = horarioDia.abierto ?? horarioDia.open ?? horarioDia.activo ?? !!(inicio && fin)
    return !!(abierto && inicio && fin)
  }

  const diasAtencionTexto = (() => {
    const abiertosIdx = DIAS_SEMANA.map((_, idx) => idx).filter(diaEstaAbierto)
    if (abiertosIdx.length === 0) return 'Este médico todavía no tiene días de atención configurados.'
    if (abiertosIdx.length === 1) return `Atiende: ${DIAS_LABELS_FULL[abiertosIdx[0]]}.`

    // Para detectar si es un bloque continuo (ej. lunes a viernes) la
    // semana se reordena empezando en lunes — es el criterio habitual al
    // describir un horario médico, aunque DIAS_SEMANA empiece en domingo.
    const ordenLunesPrimero = [1, 2, 3, 4, 5, 6, 0]
    const posiciones = abiertosIdx.map(idx => ordenLunesPrimero.indexOf(idx)).sort((a, b) => a - b)
    const esRangoContinuo = posiciones.every((pos, i) => i === 0 || pos === posiciones[i - 1] + 1)

    if (esRangoContinuo) {
      const inicio = DIAS_LABELS_FULL[ordenLunesPrimero[posiciones[0]]]
      const fin = DIAS_LABELS_FULL[ordenLunesPrimero[posiciones[posiciones.length - 1]]]
      return `Atiende de ${inicio} a ${fin}.`
    }

    const nombres = abiertosIdx.map(idx => DIAS_LABELS_FULL[idx])
    return `Atiende: ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}.`
  })()

  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const mesActualInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const puedeRetrocederMes = mesCalendario.getFullYear() > mesActualInicio.getFullYear() ||
    (mesCalendario.getFullYear() === mesActualInicio.getFullYear() && mesCalendario.getMonth() > mesActualInicio.getMonth())
  const diasEnMesCalendario = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 0).getDate()
  const celdasCalendario: (string | null)[] = [
    ...Array(mesCalendario.getDay()).fill(null),
    ...Array.from({ length: diasEnMesCalendario }, (_, i) => {
      const y = mesCalendario.getFullYear()
      const m = String(mesCalendario.getMonth() + 1).padStart(2, '0')
      const d = String(i + 1).padStart(2, '0')
      return `${y}-${m}-${d}`
    }),
  ]

  // Si la fecha inicial (hoy) cae en un día que el médico tiene cerrado, o
  // en una fecha que bloqueó puntualmente, no la dejamos como "seleccionada"
  // sin más — eso era justo el bug: el paciente elegía sin saberlo un día
  // inválido y se enteraba hasta después. Se adelanta sola a la primera
  // fecha disponible.
  useEffect(() => {
    const actual = new Date(formData.requested_date + 'T00:00:00')
    if (diaEstaAbierto(actual.getDay()) && !fechasBloqueadas.has(formData.requested_date)) return
    for (let i = 1; i <= 60; i++) {
      const candidato = new Date(actual)
      candidato.setDate(candidato.getDate() + i)
      const y = candidato.getFullYear()
      const m = String(candidato.getMonth() + 1).padStart(2, '0')
      const d = String(candidato.getDate()).padStart(2, '0')
      const candidatoISO = `${y}-${m}-${d}`
      if (diaEstaAbierto(candidato.getDay()) && !fechasBloqueadas.has(candidatoISO)) {
        setFormData(f => ({ ...f, requested_date: candidatoISO, requested_time: '' }))
        setMesCalendario(new Date(candidato.getFullYear(), candidato.getMonth(), 1))
        break
      }
    }
    // Depende de fechasBloqueadas (no de formData.requested_date) a
    // propósito: debe correr al montar y de nuevo cuando llegan los
    // bloqueos (piden una consulta aparte, async), pero NO cada vez que el
    // paciente elige una fecha nueva a mano.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechasBloqueadas])

  // Antes el paso entre horarios estaba fijo en 30 min sin importar lo que
  // el médico configuró en /dashboard/horario -- duracion_cita_minutos se
  // guardaba pero nunca se leía aquí. Con valor no configurado (perfiles
  // viejos) se conserva el mismo comportamiento de siempre (30 min).
  const duracionSlot = medico.duracion_cita_minutos || 30

  const getTimeSlotsForDate = (dateStr: string) => {
    if (!horarioParsed) return []
    const date = new Date(dateStr + 'T00:00:00')
    const dayIndex = date.getDay()
    const diaNombre = DIAS_SEMANA[dayIndex]
    if (!diaEstaAbierto(dayIndex) || fechasBloqueadas.has(dateStr)) return []
    const horarioDia = horarioParsed[diaNombre]
    const inicio = horarioDia.inicio || horarioDia.start
    const fin = horarioDia.fin || horarioDia.end
    const slots: string[] = []
    const [startH, startM] = inicio.split(':').map(Number)
    const [endH, endM] = fin.split(':').map(Number)
    const lunchStart = horarioDia.comida_inicio || horarioDia.lunch_start || horarioDia.inicio_comida || horarioDia.descanso_inicio
    const lunchEnd = horarioDia.comida_fin || horarioDia.lunch_end || horarioDia.fin_comida || horarioDia.descanso_fin
    const tieneComida = horarioDia.tiene_comida || horarioDia.has_lunch || (!!lunchStart && !!lunchEnd)
    let currentH = startH
    let currentM = startM
    while (currentH < endH || (currentH === endH && currentM < endM)) {
      const timeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`
      let enComida = false
      if (tieneComida && lunchStart && lunchEnd) {
        const [lunchSH, lunchSM] = lunchStart.split(':').map(Number)
        const [lunchEH, lunchEM] = lunchEnd.split(':').map(Number)
        const currentMinutes = currentH * 60 + currentM
        const lunchStartMinutes = lunchSH * 60 + lunchSM
        const lunchEndMinutes = lunchEH * 60 + lunchEM
        if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
          enComida = true
        }
      }
      if (!enComida) {
        slots.push(timeStr)
      }
      currentM += duracionSlot
      while (currentM >= 60) {
        currentM -= 60
        currentH += 1
      }
    }

    const hoy = new Date()
    const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    if (dateStr === hoyStr) {
      const ahoraMinutos = hoy.getHours() * 60 + hoy.getMinutes()
      const bufferMinutos = 30
      const corteMinutos = ahoraMinutos + bufferMinutos
      return slots.filter(timeStr => {
        const [h, m] = timeStr.split(':').map(Number)
        return (h * 60 + m) > corteMinutos
      })
    }

    return slots
  }

  const timeSlots = getTimeSlotsForDate(formData.requested_date).filter(t => !ocupadas.includes(t))
  const selectedDate = new Date(formData.requested_date + 'T00:00:00')
  const dayName = DIAS_LABELS[selectedDate.getDay()]
  const isDayClosed = timeSlots.length === 0
  const hoyStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
  const esHoy = formData.requested_date === hoyStr

  const handleBannerInstalarShown = () => {
    if (!pacienteIdReserva) return
    fetch('/api/citas/marcar-banner-instalar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pacienteId: pacienteIdReserva }),
    }).catch(() => {})
  }

  if (submitted) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 500, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ width: 64, height: 64, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} color="#10B981" />
          </div>
          <h3 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 24, fontWeight: 900, color: '#1E3A5F', marginBottom: 12 }}>
            ¡Revisa tu email!
          </h3>
          <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
            Te enviamos un email a <strong>{formData.patient_email}</strong> para confirmar tu cita. Haz clic en el enlace dentro de 24 horas.
          </p>
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F', marginBottom: 8 }}>{medico.display_name || medico.full_name}</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>{medico.specialty}</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>{fmtDateMX(formData.requested_date)} - {formData.requested_time}</p>
            {precioMostrado && (
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                Costo: ${precioMostrado} MXN
              </p>
            )}
          </div>
          {mostrarInstalarBannerPaciente && (
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <InstalarAppBanner
                visible={mostrarInstalarBannerPaciente}
                modo={modoInstalarApp}
                deferredPrompt={deferredInstalarApp}
                onShown={handleBannerInstalarShown}
                onClose={() => setMostrarInstalarBannerPaciente(false)}
              />
            </div>
          )}
          <button onClick={onClose} style={{ width: '100%', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicoId: medico.id,
          pacienteNombre: formData.patient_name,
          pacienteEmail: formData.patient_email,
          pacienteTelefono: formData.patient_phone,
          fecha: formData.requested_date,
          hora: formData.requested_time,
          motivo: formData.reason,
          turnstileToken,
          honeypot: formData.honeypot,
          formLoadTime: Date.now() - formLoadTime,
          pacienteId: pacienteId || undefined,
          actualizarDatos: pacienteId ? actualizarDatos : undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Error al agendar')
      }
      setPacienteIdReserva(result.pacienteId || null)
      setMostrarInstalarBannerPaciente(!result.pwaBannerShown && !!result.pacienteId)
      setSubmitted(true)
    } catch (error: any) {
      setError(error.message || 'Error al solicitar la cita. Intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F' }}>
              Agendar Cita
            </h3>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Paso {step} de 3</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, background: s <= step ? '#8B5CF6' : '#E5E7EB', borderRadius: 2 }} />
          ))}
        </div>
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        )}
        <input type="text" name="website" value={formData.honeypot} onChange={e => setFormData({ ...formData, honeypot: e.target.value })} style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} tabIndex={-1} autoComplete="off" />
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#1E3A5F' }}>Fecha</label>
              <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{diasAtencionTexto}</p>
              {/* maxWidth fija el tamaño de celda independiente del ancho del modal —
                  sin esto, en escritorio (modal más ancho) las celdas se estiraban a
                  llenar las 7 columnas y el calendario quedaba gigante; en móvil el
                  modal ya es angosto así que este tope no cambia nada ahí. */}
              <div style={{ maxWidth: 224, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <button type="button" onClick={() => setMesCalendario(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} disabled={!puedeRetrocederMes} aria-label="Mes anterior" style={{ background: 'none', border: 'none', width: 24, height: 24, cursor: puedeRetrocederMes ? 'pointer' : 'not-allowed', color: puedeRetrocederMes ? '#1E3A5F' : '#D1D5DB', fontSize: 15, fontWeight: 700 }}>‹</button>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1E3A5F', textTransform: 'capitalize' }}>
                    {mesCalendario.toLocaleDateString('es-MX', { month: 'long' })} {mesCalendario.getFullYear()}
                  </span>
                  <button type="button" onClick={() => setMesCalendario(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Mes siguiente" style={{ background: 'none', border: 'none', width: 24, height: 24, cursor: 'pointer', color: '#1E3A5F', fontSize: 15, fontWeight: 700 }}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 2 }}>
                  {DIAS_LABELS.map(l => (
                    <div key={l} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>{l}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                  {celdasCalendario.map((dateStr, idx) => {
                    if (!dateStr) return <div key={`vacio-${idx}`} />
                    const dayIndex = new Date(dateStr + 'T00:00:00').getDay()
                    const dia = Number(dateStr.slice(-2))
                    const cerrado = !diaEstaAbierto(dayIndex)
                    const esPasado = dateStr < hoyISO
                    const bloqueado = fechasBloqueadas.has(dateStr)
                    const deshabilitado = cerrado || esPasado || bloqueado
                    const seleccionado = dateStr === formData.requested_date && !deshabilitado
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={deshabilitado}
                        onClick={() => setFormData({ ...formData, requested_date: dateStr, requested_time: '' })}
                        title={esPasado ? undefined : bloqueado ? 'El médico bloqueó esta fecha' : cerrado ? 'El médico no atiende este día' : undefined}
                        style={{
                          aspectRatio: '1',
                          border: seleccionado ? '2px solid #8B5CF6' : '1px solid transparent',
                          borderRadius: 8,
                          background: seleccionado ? '#F5F3FF' : deshabilitado ? '#F9FAFB' : '#fff',
                          color: seleccionado ? '#8B5CF6' : deshabilitado ? '#D1D5DB' : '#374151',
                          fontSize: 13,
                          fontWeight: seleccionado ? 700 : 500,
                          cursor: deshabilitado ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: '#1E3A5F' }}>
                Hora disponible - {dayName}
                {isDayClosed && <span style={{ color: '#DC2626', fontWeight: 400 }}> (cerrado)</span>}
              </label>
              {isDayClosed ? (
                <div style={{ padding: '24px', background: '#FEF2F2', borderRadius: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: '#DC2626', fontWeight: 600 }}>
                    {esHoy ? 'No hay horarios disponibles hoy' : 'No hay horarios disponibles este día'}
                  </p>
                  <p style={{ fontSize: 12, color: '#991B1B', marginTop: 4 }}>
                    {esHoy ? 'Selecciona mañana' : 'Selecciona otra fecha'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {timeSlots.map(time => (
                    <button key={time} type="button" onClick={() => setFormData({ ...formData, requested_time: time })} style={{ padding: '8px 6px', border: formData.requested_time === time ? '2px solid #8B5CF6' : '1px solid #E5E7EB', borderRadius: 8, background: formData.requested_time === time ? '#F5F3FF' : '#fff', color: formData.requested_time === time ? '#8B5CF6' : '#4A5568', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setStep(2)} disabled={!formData.requested_time || isDayClosed} style={{ background: (!formData.requested_time || isDayClosed) ? '#9CA3AF' : '#8B5CF6', color: '#fff', border: 'none', borderRadius: 12, padding: 11, fontSize: 14, fontWeight: 600, cursor: (!formData.requested_time || isDayClosed) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Continuar <ChevronDown size={16} />
            </button>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={identLabelStyle}>
                <input type="checkbox" checked={modoPaciente === 'primera'} onChange={() => seleccionarModoPaciente('primera')} />
                Es mi primera cita con este médico
              </label>
              {modoPaciente === 'primera' && (
                <p style={identAvisoStyle}>
                  Usaremos tu correo y teléfono para vincular tus futuras citas con este médico.
                </p>
              )}

              <label style={identLabelStyle}>
                <input type="checkbox" checked={modoPaciente === 'existente'} onChange={() => seleccionarModoPaciente('existente')} />
                Ya he tenido cita con este médico
              </label>

              {modoPaciente === 'existente' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 4 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      value={contactoBusqueda}
                      onChange={e => setContactoBusqueda(e.target.value)}
                      placeholder="Correo o teléfono con el que agendaste antes"
                      readOnly={resultadoBusqueda === 'encontrado'}
                      style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      onClick={handleBuscarPaciente}
                      disabled={buscandoPaciente || !contactoBusqueda.trim() || resultadoBusqueda === 'encontrado'}
                      style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#8B5CF6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: buscandoPaciente || !contactoBusqueda.trim() || resultadoBusqueda === 'encontrado' ? 0.6 : 1, whiteSpace: 'nowrap' }}
                    >
                      {buscandoPaciente ? 'Enviando...' : resultadoBusqueda === 'codigo_enviado' || resultadoBusqueda === 'codigo_invalido' ? 'Reenviar código' : 'Buscar mis datos'}
                    </button>
                  </div>

                  {(resultadoBusqueda === 'codigo_enviado' || resultadoBusqueda === 'codigo_invalido') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={identAvisoStyle}>
                        Si tienes una cita previa con este médico, te enviamos un código a tu correo registrado. Revísalo e ingrésalo aquí.
                      </p>
                      {resultadoBusqueda === 'codigo_invalido' && (
                        <p style={{ ...identAvisoStyle, color: '#DC2626', background: '#FEF2F2' }}>
                          Código inválido o expirado. Puedes intentar de nuevo o pedir un código nuevo.
                        </p>
                      )}
                      {(resultadoBusqueda === 'codigo_invalido' || mostrarAyudaOtp) && (
                        <p style={identAvisoStyle}>
                          ¿No te llegó el código? Verifica que sea el mismo correo o teléfono con el que registraste tu cita anterior.
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          value={codigoOtp}
                          onChange={e => setCodigoOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Código de 6 dígitos"
                          inputMode="numeric"
                          style={{ flex: 1, minWidth: 160, padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, letterSpacing: 2 }}
                        />
                        <button
                          type="button"
                          onClick={handleVerificarCodigo}
                          disabled={verificandoCodigo || codigoOtp.trim().length !== 6}
                          style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#8B5CF6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: verificandoCodigo || codigoOtp.trim().length !== 6 ? 0.6 : 1, whiteSpace: 'nowrap' }}
                        >
                          {verificandoCodigo ? 'Verificando...' : 'Verificar código'}
                        </button>
                      </div>
                    </div>
                  )}

                  {resultadoBusqueda === 'encontrado' && (
                    <p style={{ ...identAvisoStyle, color: '#059669', background: '#ECFDF5' }}>Encontramos tus datos. Revísalos abajo.</p>
                  )}
                  {resultadoBusqueda === 'error' && (
                    <p style={{ ...identAvisoStyle, color: '#DC2626', background: '#FEF2F2' }}>
                      Error de conexión. Intenta de nuevo o continúa como si fuera tu primera vez.
                    </p>
                  )}
                  {resultadoBusqueda === 'limite' && (
                    <p style={{ ...identAvisoStyle, color: '#DC2626', background: '#FEF2F2' }}>
                      Demasiados intentos. Intenta de nuevo en {minutosEspera} minuto{minutosEspera === 1 ? '' : 's'}.
                    </p>
                  )}

                  {resultadoBusqueda === 'encontrado' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={identLabelStyle}>
                        <input type="checkbox" checked={actualizarDatos} onChange={e => setActualizarDatos(e.target.checked)} />
                        Actualizar mis datos
                      </label>
                      {actualizarDatos ? (
                        <p style={identAvisoStyle}>
                          Actualizará tu correo/teléfono guardado.
                        </p>
                      ) : (
                        <p style={identAvisoStyle}>
                          Sin marcar, tus datos no cambian.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Nombre completo *</label>
              <input type="text" value={formData.patient_name} onChange={e => setFormData({ ...formData, patient_name: e.target.value })} readOnly={campoIdentidadBloqueado} style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, background: campoIdentidadBloqueado ? '#F3F4F6' : '#fff', color: campoIdentidadBloqueado ? '#6B7280' : 'inherit', cursor: campoIdentidadBloqueado ? 'not-allowed' : 'text' }} placeholder="Tu nombre completo" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Email *</label>
              <input type="email" value={formData.patient_email} onChange={e => setFormData({ ...formData, patient_email: e.target.value })} readOnly={campoIdentidadBloqueado} style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, background: campoIdentidadBloqueado ? '#F3F4F6' : '#fff', color: campoIdentidadBloqueado ? '#6B7280' : 'inherit', cursor: campoIdentidadBloqueado ? 'not-allowed' : 'text' }} placeholder="tu@email.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Teléfono *</label>
              <input type="tel" value={formData.patient_phone} onChange={e => setFormData({ ...formData, patient_phone: e.target.value })} readOnly={campoIdentidadBloqueado} style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, background: campoIdentidadBloqueado ? '#F3F4F6' : '#fff', color: campoIdentidadBloqueado ? '#6B7280' : 'inherit', cursor: campoIdentidadBloqueado ? 'not-allowed' : 'text' }} placeholder="55 1234 5678" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1E3A5F' }}>Motivo de consulta (opcional)</label>
              <textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} rows={3} style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 14, resize: 'vertical' }} placeholder="Breve descripción..." />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Atrás
              </button>
              <button onClick={() => setStep(3)} disabled={!formData.patient_name || !formData.patient_email || !formData.patient_phone} style={{ flex: 1, background: !formData.patient_name || !formData.patient_email || !formData.patient_phone ? '#9CA3AF' : '#8B5CF6', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: !formData.patient_name || !formData.patient_email || !formData.patient_phone ? 'not-allowed' : 'pointer' }}>
                Continuar
              </button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 12 }}>Resumen de tu cita</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Médico</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{medico.display_name || medico.full_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Especialidad</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{medico.specialty}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Fecha</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{fmtDateMX(formData.requested_date)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Hora</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>{formData.requested_time}</span>
                </div>
                {precioMostrado && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #E5E7EB', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>Costo estimado</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F' }}>${precioMostrado} MXN</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} onSuccess={setTurnstileToken} options={{ theme: 'light' }} />
            </div>
            <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>
              <Info size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Recibirás un email para confirmar tu cita.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Atrás
              </button>
              <button onClick={handleSubmit} disabled={submitting || !turnstileToken} style={{ flex: 1, background: submitting || !turnstileToken ? '#9CA3AF' : '#8B5CF6', color: '#fff', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 600, cursor: submitting || !turnstileToken ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? 'Confirmando...' : 'Confirmar Cita'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Reporte manual de una reseña o respuesta — visible para cualquier
// visitante, sin sesión. No revela si el reporte "funcionó" más allá de
// confirmar el envío; la decisión de qué hacer con el contenido señalado
// vive solo en el panel de admin.
function ReportarBoton({ tipo, id }: { tipo: 'review' | 'review_response'; id: string }) {
  const [estado, setEstado] = useState<'idle' | 'confirmando' | 'enviando' | 'enviado' | 'error'>('idle')

  async function reportar() {
    setEstado('enviando')
    try {
      const res = await fetch('/api/resenas/reportar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, id }),
      })
      if (!res.ok) throw new Error('respuesta no ok')
      setEstado('enviado')
    } catch {
      setEstado('error')
    }
  }

  if (estado === 'enviado') {
    return <span style={{ fontSize: 11, color: '#059669', fontWeight: 600, flexShrink: 0 }}>Reportado, gracias</span>
  }

  if (estado === 'confirmando' || estado === 'enviando') {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#6B7280' }}>¿Reportar?</span>
        <button onClick={reportar} disabled={estado === 'enviando'}
          style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: 'none', border: 'none', cursor: estado === 'enviando' ? 'default' : 'pointer', padding: 0 }}>
          {estado === 'enviando' ? 'Enviando...' : 'Sí, reportar'}
        </button>
        <button onClick={() => setEstado('idle')} disabled={estado === 'enviando'}
          style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: estado === 'enviando' ? 'default' : 'pointer', padding: 0 }}>
          Cancelar
        </button>
      </span>
    )
  }

  if (estado === 'error') {
    return <span style={{ fontSize: 11, color: '#DC2626', flexShrink: 0 }}>Error al reportar</span>
  }

  return (
    <button onClick={() => setEstado('confirmando')} title="Reportar este contenido"
      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 11, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
      <Flag size={11} /> Reportar
    </button>
  )
}

// Datos públicos del perfil (medico, licencias, educación, reseñas, etc.) ya
// llegan resueltos desde el Server Component (page.tsx) para que el HTML
// inicial traiga el contenido real y el JSON-LD — antes se pedían aquí vía
// useEffect, así que un crawler que no ejecuta JS (o el primer paint de
// Googlebot) veía un spinner vacío. Solo lo que depende de la sesión del
// navegador (track-visit, isOwner) sigue cargándose del lado del cliente.
export default function DoctorProfileClient({
  medico,
  licenses,
  specialtyCredentials,
  education,
  experience,
  conditions,
  reviews,
  galleryPhotos,
  tieneConsultaCompletada,
}: {
  medico: Medico
  licenses: License[]
  specialtyCredentials: SpecialtyCredential[]
  education: EducationItem[]
  experience: ExperienceItem[]
  conditions: Condition[]
  reviews: Review[]
  galleryPhotos: GalleryPhoto[]
  tieneConsultaCompletada: boolean
}) {
  const id = medico.id
  const router = useRouter()
  const searchParams = useSearchParams()
  const reviewDestacadaId = searchParams.get('review')
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null)
  const [showAllPhotosModal, setShowAllPhotosModal] = useState(false)
  // Arranca ya expandida si el link trae ?review= apuntando a una reseña
  // que no está entre las 5 iniciales — si no, el ancla no existiría en el
  // DOM y el scroll de más abajo no tendría a dónde llegar.
  const [mostrarTodasResenas, setMostrarTodasResenas] = useState(() => {
    if (!reviewDestacadaId) return false
    const idx = reviews.findIndex(r => r.id === reviewDestacadaId)
    return idx >= 5
  })
  const [isMobile, setIsMobile] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showConacemModal, setShowConacemModal] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [mostrarTooltipBadge, setMostrarTooltipBadge] = useState(false)
  const [copiedToast, setCopiedToast] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  // Offset del tooltip relativo al badge (no "left: 50%" fijo) — se
  // recalcula cada vez que se abre para que nunca quede cortado por el
  // borde de la pantalla, sin importar en qué parte de la línea cayó el
  // badge cuando el nombre se envolvió a dos líneas.
  const [tooltipOffsetPx, setTooltipOffsetPx] = useState(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Scroll explícito por JS en vez de depender del salto nativo del
  // navegador a #hash — un fragmento se pierde si algún filtro de seguridad
  // de correo reescribe el link (nunca llega al servidor). rAF espera al
  // siguiente frame para que, si mostrarTodasResenas se acaba de activar
  // arriba, la reseña ya exista en el DOM antes de intentar el scroll.
  useEffect(() => {
    if (!reviewDestacadaId) return
    const frame = requestAnimationFrame(() => {
      document.getElementById(`review-${reviewDestacadaId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [reviewDestacadaId, mostrarTodasResenas])

  useEffect(() => {
    if (!mostrarTooltipBadge) return
    const cerrar = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) setMostrarTooltipBadge(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [mostrarTooltipBadge])

  // Centra el tooltip sobre el badge, pero recorta (clamp) contra los bordes
  // de la ventana — antes usaba left:50%/translateX(-50%) fijo, que se salía
  // de la pantalla cuando el badge caía cerca del borde derecho en móvil.
  useLayoutEffect(() => {
    if (!mostrarTooltipBadge || !badgeRef.current || !tooltipRef.current) return
    const margen = 8
    const badgeRect = badgeRef.current.getBoundingClientRect()
    const tooltipWidth = tooltipRef.current.offsetWidth
    const idealLeftEnViewport = badgeRect.left + badgeRect.width / 2 - tooltipWidth / 2
    const maxLeft = window.innerWidth - tooltipWidth - margen
    const clampedLeftEnViewport = Math.min(Math.max(idealLeftEnViewport, margen), Math.max(margen, maxLeft))
    setTooltipOffsetPx(clampedLeftEnViewport - badgeRect.left)
  }, [mostrarTooltipBadge])

  useEffect(() => {
    fetch('/api/track-visit', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ doctorId: id }),
    }).catch(() => {})
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === medico.email) setIsOwner(true)
    })
  }, [id, medico.email])

  const yearsExp = medico?.years_experience ?? medico?.years_of_experience ?? null
  const langs = parseLangs(medico?.languages ?? null)
  const precioPrimera = medico?.consultation_price_first_time || null
  const precioSubsecuente = medico?.consultation_price_general || null
  const displayName = medico?.display_name || medico?.full_name || ''
  const titlePrefix = medico?.professional_title ? `${medico.professional_title} ` : ''
  // Mismo cálculo que el checklist de completitud del dashboard del médico
  // (hooks/useProfileCompletion.ts) — reutilizado tal cual, sin ajustes: los
  // datos que necesita ya llegan como props en este perfil público.
  const perfilCompleto = calculateProfileCompletion({
    // languages en Medico admite string | string[] | null (el dato en DB no
    // siempre es un array) — parseLangs ya normaliza eso mismo para el resto
    // de este componente, se reutiliza aquí en vez de duplicar la lógica.
    medico: { ...medico, languages: langs },
    experienceCount: experience.length,
    educationCount: education.length,
    conditionsCount: conditions.length,
  }).percentage === 100
  const mostrarBadgePerfilCompleto = perfilCompleto && tieneConsultaCompletada
  // Determinística (no window.location.href): el JSON-LD ahora se sirve en
  // el HTML inicial, y usar window.location causaba un mismatch de
  // hidratación (servidor no tiene window, cliente sí). Coincide con el
  // canonicalUrl que ya arma generateMetadata en page.tsx.
  const profileUrl = `https://salurama.com/doctor/${medico.slug ?? medico.id}`

  const tieneRedes = !!(medico?.facebook_url || medico?.instagram_url || medico?.tiktok_url)

  // La cédula profesional aparece en la misma constancia SEP que cualquier
  // especialidad certificada — si Manuel aprobó al menos una, ya revisó
  // también la cédula base del médico en ese mismo documento.
  const cedulaVerificada = specialtyCredentials.some(c => c.credentials_status === 'verificado')

  // REGLA (fuente de confusión repetida — documentado 2026-07-23): esta
  // sección del perfil público SOLO muestra especialidades con
  // credentials_status === 'verificado', sin importar cuál sea la
  // especialidad PRINCIPAL declarada en doctors.specialty. Si la principal
  // no está verificada pero una adicional sí, la que se ve aquí es la
  // adicional — y si ninguna está verificada, esta sección queda vacía
  // aunque el médico tenga una especialidad principal perfectamente válida.
  // No es un bug: es la regla de "nunca mostrar como verificado algo que
  // Salurama no revisó" (ver principio legal en la memoria del proyecto).
  const especialidadesVerificadas = specialtyCredentials.filter(c => c.credentials_status === 'verificado')

  // ─── COMPARTIR PERFIL ───
  const handleShare = async () => {
    const shareText = `Te recomiendo al ${titlePrefix}${displayName} - ${medico?.specialty || ''} en Salurama. Verifica sus credenciales y agenda aquí:`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${titlePrefix}${displayName} - ${medico?.specialty}`,
          text: shareText,
          url: profileUrl,
        })
        return
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${profileUrl}`)
      setCopiedToast(true)
      setTimeout(() => setCopiedToast(false), 3000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = `${shareText} ${profileUrl}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedToast(true)
      setTimeout(() => setCopiedToast(false), 3000)
    }
  }

  // Dirección completa desde SEPOMEX
  const direccionCompleta = [
    medico?.street,
    medico?.ext_number ? `#${medico.ext_number}` : '',
    medico?.int_number ? `${medico.clinic_type === 'hospital' ? 'Consultorio' : 'Int.'} ${medico.int_number}` : '',
  ].filter(Boolean).join(' ') || ''

  const direccionExtendida = [
    direccionCompleta,
    medico?.colonia,
    medico?.cp ? `CP ${medico.cp}` : '',
    medico?.ciudad,
    medico?.estado ? getStateLabel(medico.estado) : medico?.estado,
  ].filter(Boolean).join(', ')

  const direccionNavegacion = encodeURIComponent([
    direccionCompleta,
    medico?.colonia,
    medico?.cp,
    medico?.ciudad,
    medico?.estado,
    'México',
  ].filter(Boolean).join(', '))

  const horarioParsed = (() => {
    if (!medico?.horario) return null
    let horario = medico.horario
    if (typeof horario === 'string') {
      try { horario = JSON.parse(horario) } catch { return null }
    }
    const normalizado: Record<string, any> = {}
    Object.keys(horario).forEach(key => {
      const keyNormalizada = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      normalizado[keyNormalizada] = horario[key]
    })
    return normalizado
  })()

  // Schema.org para Google (estrellas en resultados de búsqueda)
  const doctorSchema = medico ? {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: displayName,
    description: medico.about_me?.substring(0, 200) || `Especialista en ${medico.specialty}`,
    image: medico.photo_url || undefined,
    medicalSpecialty: medico.specialty,
    address: {
      '@type': 'PostalAddress',
      streetAddress: direccionCompleta || undefined,
      addressLocality: medico.ciudad || undefined,
      addressRegion: medico.estado || undefined,
      postalCode: medico.cp || undefined,
      addressCountry: 'MX',
    },
    aggregateRating: reviews.length > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: (medico.rating_avg || 0).toFixed(1),
      reviewCount: reviews.length,
      bestRating: '5',
      worstRating: '1',
    } : undefined,
    review: reviews.slice(0, 3).map((r: any) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.user_name || 'Paciente' },
      reviewBody: r.comment || '',
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: '5',
        worstRating: '1',
      },
      datePublished: r.created_at,
    })),
    telephone: medico.clinic_phone || medico.whatsapp_phone || undefined,
    url: profileUrl,
  } : null

  const lightboxIndex = lightboxPhoto ? galleryPhotos.findIndex(p => p.id === lightboxPhoto.id) : -1
  const goToLightboxPhoto = (direction: -1 | 1) => {
    const nextIndex = lightboxIndex + direction
    if (nextIndex < 0 || nextIndex >= galleryPhotos.length) return
    setLightboxPhoto(galleryPhotos[nextIndex])
  }
  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }
  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return
    goToLightboxPhoto(dx < 0 ? 1 : -1)
  }

  return (
    // paddingBottom reserva espacio para la barra sticky de "Agendar Cita" de
    // abajo — 120 (no 100) porque incluye la leyenda de recuperación de
    // acceso agregada debajo del botón; con 100 el texto de arriba quedaba
    // tapado al hacer scroll hasta el fondo. La leyenda es de una sola línea
    // (antes eran 2, con 140), así que necesita menos espacio extra que antes.
    <div className={`${fraunces.variable} ${dmSans.variable}`} style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'var(--font-dm-sans), sans-serif', color: '#111827', paddingBottom: 120 }}>

            {doctorSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdSeguro(doctorSchema) }}
        />
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease-out; }
        .toast { animation: toastIn 0.3s ease-out; }
        @media (max-width: 767px) {.desktop-only { display: none!important; } }
        @media (min-width: 768px) {.mobile-only { display: none!important; } }
      `}</style>
      {/* El layout raíz (app/layout.tsx) ya envuelve todo en su propio <main>
          con paddingTop: 68px para librar el Navbar fijo (72px) — este <main>
          NO debe repetir esa compensación, o el offset se duplica (~150px en
          vez de ~70-90px). Horario/Citas/Estadísticas no tienen este problema
          porque no agregan padding-top propio, solo su tab bar sticky (que
          reserva su propio espacio en el flujo, a diferencia de uno fixed). */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px 20px 120px' : '20px 20px 120px' }}>

        <div style={{ marginBottom: 8 }}>
          <BackButton />
        </div>

        {/* ─── HEADER ─── */}
        <section className="fade-up" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: 40, alignItems: 'start', marginBottom: 48 }}>
          <div style={{ position: 'relative', aspectRatio: isMobile ? '1/1' : '4/5', borderRadius: 24, overflow: 'hidden', background: '#EDE9FE', width: '100%', maxWidth: isMobile ? 280 : 320, margin: isMobile ? '0 auto' : '0' }}>
            {medico.photo_url ? (
              <Image
                src={medico.photo_url}
                alt={displayName}
                fill
                sizes="(max-width: 767px) 280px, 320px"
                priority
                style={{ objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setShowPhotoModal(true)}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1E3A5F, #2A9D8F)', fontFamily: 'var(--font-fraunces), serif', fontSize: 64, fontWeight: 900, color: '#fff' }}>
                {(displayName || '?')[0].toUpperCase()}
              </div>
            )}
            {((medico.professional_license && cedulaVerificada) || licenses.length > 0) && (
              <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(42, 157, 143, 0.95)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 50 }}>
                <ShieldCheck size={14} color="#fff" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cédula verificable</span>
              </div>
            )}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: isMobile ? 28 : 40, fontWeight: 900, color: '#1E3A5F', marginBottom: 4, lineHeight: 1.1 }}>
              {titlePrefix}{displayName}
              {mostrarBadgePerfilCompleto && (
                // inline-flex (no un hijo flex del h1) a propósito: así el
                // badge fluye con el texto del nombre y se envuelve junto a
                // la última palabra si el nombre se parte en dos líneas, en
                // vez de quedar centrado verticalmente sobre las dos líneas.
                <span
                  ref={badgeRef}
                  role="img"
                  aria-label="Perfil completo, con consultas reales atendidas en Salurama."
                  style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle', marginLeft: 8, cursor: 'pointer' }}
                  onMouseEnter={() => setMostrarTooltipBadge(true)}
                  onMouseLeave={() => setMostrarTooltipBadge(false)}
                  // Solo abre (no alterna): con onMouseEnter ya abriéndolo,
                  // un toggle aquí hacía que un clic sobre el badge ya en
                  // hover lo cerrara de inmediato. Cerrar en móvil lo cubre
                  // el listener de "tocar fuera" de abajo.
                  onClick={() => setMostrarTooltipBadge(true)}
                >
                  <BaculoEsculapio size={isMobile ? 16 : 20} color="#2A9D8F" />
                  {mostrarTooltipBadge && (
                    <span
                      ref={tooltipRef}
                      style={{ position: 'absolute', bottom: '130%', left: tooltipOffsetPx, background: '#1E3A5F', color: '#fff', fontSize: 11, fontWeight: 600, padding: '8px 12px', borderRadius: 8, width: 200, maxWidth: 'calc(100vw - 32px)', textAlign: 'center', lineHeight: 1.4, zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    >
                      Perfil completo, con consultas reales atendidas en Salurama.
                    </span>
                  )}
                </span>
              )}
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 12 }}>{medico.specialty}{medico.sub_specialty && ` · ${medico.sub_specialty}`}</p>
            {(medico.ciudad || medico.estado) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 13, marginBottom: 16 }}>
                <MapPin size={14} />
                {medico.ciudad}{medico.estado ? `, ${getStateLabel(medico.estado)}` : ''}
              </div>
            )}

            {(tieneRedes || true) && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                {medico.facebook_url && (
                  <a href={medico.facebook_url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }} title="Facebook">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                )}
                {medico.instagram_url && (
                  <a href={medico.instagram_url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(45deg, #FCAF45, #E1306C, #C13584, #833AB4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }} title="Instagram">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </a>
                )}
                {medico.tiktok_url && (
                  <a href={medico.tiktok_url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: '50%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }} title="TikTok">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                  </a>
                )}
                <button
                  onClick={handleShare}
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#F5F3FF', border: '1.5px solid #DDD6FE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#7C3AED', flexShrink: 0
                  }}
                  title="Compartir perfil"
                >
                  <Share2 size={15} />
                </button>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24, maxWidth: 400 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 14, textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>{(medico.rating_avg || 0).toFixed(1)}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={11} fill={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : 'none'} color={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : '#E5E7EB'} />
                  ))}
                </div>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Rating</p>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 14, textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>{reviews.length}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600, marginTop: 8 }}>Reseñas</p>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 14, textAlign: 'center', border: '1px solid #E5E7EB' }}>
                <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>{yearsExp || 'N/A'}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600, marginTop: 8 }}>Años Exp.</p>
              </div>
            </div>
            {(precioPrimera || precioSubsecuente) && (
              <div style={{ background: '#F5F3FF', borderRadius: 12, padding: 14, marginBottom: 20, display: 'inline-block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: '#8B5CF6', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={18} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Consulta</p>
                    {precioPrimera && precioSubsecuente ? (
                      <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                        <div>
                          <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>Primera vez</p>
                          <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>${precioPrimera}</p>
                        </div>
                        <div style={{ width: 1, height: 28, background: '#DDD6FE' }} />
                        <div>
                          <p style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>Subsecuente</p>
                          <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>${precioSubsecuente}</p>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F' }}>${precioPrimera || precioSubsecuente} MXN</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── CONTENIDO PRINCIPAL + SIDEBAR ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 32, alignItems: 'start' }}>
          <div>
            {/* Sobre el Doctor */}
            <section className="fade-up" style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 24, fontWeight: 900, color: '#1E3A5F', marginBottom: 12 }}>Sobre el Doctor</h2>
              <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.7 }}>
                {medico.about_me || 'Información no disponible. El médico no ha completado su presentación.'}
              </p>
            </section>

            {/* Galería de fotos */}
            {galleryPhotos.length > 0 && (
              <section className="fade-up" style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ImageIcon size={20} /> Galería
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                  {(isMobile ? galleryPhotos.slice(0, 4) : galleryPhotos).map((photo, idx) => {
                    const isMoreTile = isMobile && idx === 3 && galleryPhotos.length > 4
                    return (
                      <div
                        key={photo.id}
                        style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', border: '1px solid #E5E7EB' }}
                        onClick={() => (isMoreTile ? setShowAllPhotosModal(true) : setLightboxPhoto(photo))}
                      >
                        <Image
                          src={photo.photo_url}
                          alt={photo.caption || `Foto de ${displayName}`}
                          fill
                          sizes="(max-width: 767px) 45vw, 130px"
                          style={{ objectFit: 'cover' }}
                        />
                        {isMoreTile && (
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>+{galleryPhotos.length - 4} fotos</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Formación académica */}
            {education.length > 0 && (
              <section className="fade-up" style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GraduationCap size={20} /> Formación académica
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {education.map(edu => (
                    <div key={edu.id} style={{ display: 'flex', gap: 12, padding: 14, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                      <div style={{ width: 40, height: 40, background: '#EEF2FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GraduationCap size={18} color="#1E3A5F" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{edu.institution}</p>
                        <p style={{ fontSize: 13, color: '#6B7280' }}>{edu.degree}{edu.field_of_study ? ` en ${edu.field_of_study}` : ''}{edu.graduation_year ? ` · ${edu.graduation_year}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Experiencia profesional */}
            {experience.length > 0 && (
              <section className="fade-up" style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Briefcase size={20} /> Experiencia profesional
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {experience.map(exp => (
                    <div key={exp.id} style={{ display: 'flex', gap: 12, padding: 14, background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                      <div style={{ width: 40, height: 40, background: '#FEF3C7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Briefcase size={18} color="#D97706" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{exp.institution_name}</p>
                        <p style={{ fontSize: 13, color: '#6B7280' }}>{exp.position}{exp.location ? ` · ${exp.location}` : ''}{exp.is_current ? ' · Actual' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Padecimientos que atiende */}
            {conditions.length > 0 && (
              <section className="fade-up" style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Heart size={20} /> Padecimientos que atiende
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {conditions.map(c => (
                    <span key={c.id} style={{ padding: '6px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 20, fontSize: 13, color: '#374151' }}>{c.condition_name}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Idiomas */}
            {langs.length > 0 && (
              <section className="fade-up" style={{ marginBottom: 32 }}>
                <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 20, fontWeight: 900, color: '#1E3A5F', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={20} /> Idiomas
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {langs.map((lang, i) => (
                    <span key={i} style={{ padding: '6px 14px', background: '#E8F7F5', borderRadius: 20, fontSize: 13, color: '#1E3A5F', fontWeight: 500 }}>{lang}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Credenciales */}
            <section className="fade-up" style={{ marginBottom: 40 }}>
              <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 24, fontWeight: 900, color: '#1E3A5F', marginBottom: 12 }}>
                Consulta credenciales en portales oficiales
              </h2>
              <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB', maxWidth: 600 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 4 }}>
                  ⚠ Consulta en fuentes oficiales antes de agendar
                </p>
                <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 12 }}>
                  Tú decides con toda la información.
                </p>
                {medico.professional_license && cedulaVerificada && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', marginBottom: 6, border: '1px solid #E5E7EB' }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 2px', color: '#1E3A5F' }}>Cédula profesional</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <p style={{ fontSize: 11, color: '#8B5CF6', margin: 0 }}>No. {medico.professional_license}</p>
                          <CopyButton text={medico.professional_license} label="número de cédula" />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowVerificationModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#1E3A5F', borderRadius: 8, padding: '8px 12px', border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                      <Shield size={14} /> Consultar cédula profesional
                    </button>
                  </div>
                )}
                {especialidadesVerificadas.map(cred => (
                  <div key={cred.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', marginBottom: 6, border: '1px solid #E5E7EB' }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, margin: '0 2px', color: '#1E3A5F' }}>Certificación de especialidad:  {cred.granular_name}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <p style={{ fontSize: 11, color: '#8B5CF6', margin: 0 }}>{cred.council_name}</p>
                          <CopyButton text={displayName} label="nombre del médico" />
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setShowConacemModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', color: '#1E3A5F', borderRadius: 8, padding: '8px 12px', border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                      <Shield size={14} /> Consultar certificación vigente
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ─── SIDEBAR ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Ubicación */}
            {direccionExtendida && (
              <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} /> Ubicación
                </h3>
                {medico.clinic_name && <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{medico.clinic_name}</p>}
                {direccionCompleta && <p style={{ fontSize: 13, color: '#4A5568', marginBottom: 2 }}>{direccionCompleta}</p>}
                {medico.colonia && <p style={{ fontSize: 13, color: '#4A5568', marginBottom: 2 }}>Col. {medico.colonia}</p>}
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
                  {[
                    medico.cp ? `CP ${medico.cp}` : '',
                    medico.ciudad,
                    medico.estado ? getStateLabel(medico.estado) : medico.estado,
                  ].filter(Boolean).join(', ')}
                </p>
                {(() => {
                  const lat = medico.clinic_lat
                  const lng = medico.clinic_lng
                  const tieneCoordenadas = lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))

                  if (!tieneCoordenadas) {
                    return (
                      <div style={{ padding: '14px', background: '#FEF3C7', borderRadius: 10, border: '1px solid #FCD34D', textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: '#92400E' }}>Ubicación exacta no configurada</p>
                      </div>
                    )
                  }

                  const latNum = Number(lat)
                  const lngNum = Number(lng)

                  const handleNavigate = (e: React.MouseEvent) => {
                    const sheet = document.createElement('div')
                    sheet.style.cssText = 'position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.5);display:flex;align-items:flex-end'
                    sheet.innerHTML = `
                      <div style="background:#fff;width:100%;border-radius:20px 20px 0 0;padding:24px;animation:slideUp 0.3s">
                        <div style="width:40px;height:4px;background:#E5E7EB;border-radius:2px;margin:0 auto 20px"></div>
                        <h3 style="font-size:18px;font-weight:700;margin-bottom:16px">Cómo llegar</h3>
                        <div style="display:flex;flex-direction:column;gap:12px">
                          <a href="https://www.google.com/maps/dir/?api=1&destination=${latNum},${lngNum}&destination_place_id=&query=${direccionNavegacion}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:14px;background:#F9FAFB;border-radius:12px;text-decoration:none;color:#111" onclick="setTimeout(()=>this.closest('div[style*=fixed]').remove(),300)">
                            <div style="width:40px;height:40px;background:#4285F4;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">G</div>
                            <div><div style="font-weight:600">Google Maps</div><div style="font-size:12px;color:#6B7280">Navegación paso a paso</div></div>
                          </a>
                          <a href="https://waze.com/ul?ll=${latNum},${lngNum}&navigate=yes" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:14px;background:#F9FAFB;border-radius:12px;text-decoration:none;color:#111" onclick="setTimeout(()=>this.closest('div[style*=fixed]').remove(),300)">
                            <div style="width:40px;height:40px;background:#33CCFF;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">W</div>
                            <div><div style="font-weight:600">Waze</div><div style="font-size:12px;color:#6B7280">Tráfico en tiempo real</div></div>
                          </a>
                          <a href="https://maps.apple.com/?daddr=${latNum},${lngNum}&q=${direccionNavegacion}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:14px;background:#F9FAFB;border-radius:12px;textDecoration:none;color:#111" onclick="setTimeout(()=>this.closest('div[style*=fixed]').remove(),300)">
                            <div style="width:40px;height:40px;background:#000;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700"></div>
                            <div><div style="font-weight:600">Apple Maps</div><div style="font-size:12px;color:#6B7280">Para iPhone</div></div>
                          </a>
                        </div>
                        <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;margin-top:16px;padding:12px;background:none;border:none;color:#6B7280;font-weight:600">Cancelar</button>
                      </div>
                    `
                    sheet.onclick = (ev) => { if (ev.target === sheet) sheet.remove() }
                    document.body.appendChild(sheet)
                  }

                  return (
                    <>
                      <div style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', marginBottom: 12, border: '1px solid #E5E7EB' }}>
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          scrolling="no"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lngNum - 0.01}%2C${latNum - 0.01}%2C${lngNum + 0.01}%2C${latNum + 0.01}&layer=mapnik&marker=${latNum}%2C${lngNum}`}
                          style={{ border: 0 }}
                          title="Mapa ubicación"
                        />
                      </div>
                      <button
                        onClick={handleNavigate}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: '#1E3A5F', color: '#fff', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}
                      >
                        <Navigation size={14} /> Cómo llegar
                      </button>
                    </>
                  )
                })()}
              </div>
            )}

            {/* Horario */}
            {horarioParsed && Object.keys(horarioParsed).length > 0 && (
              <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} /> Horario
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {DIAS_SEMANA.map((dia, idx) => {
                    const horarioDia = horarioParsed?.[dia]
                    const inicio = horarioDia?.inicio || horarioDia?.start
                    const fin = horarioDia?.fin || horarioDia?.end
                    const abierto = horarioDia?.abierto ?? horarioDia?.open ?? horarioDia?.activo ?? !!(inicio && fin)
                    return (
                      <div key={dia} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: idx < 6 ? '1px solid #F3F4F6' : 'none' }}>
                        <span style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, width: 40 }}>{DIAS_LABELS[idx]}</span>
                        <span style={{ fontSize: 13, color: abierto ? '#111827' : '#9CA3AF', fontWeight: abierto ? 600 : 400 }}>
                          {abierto && inicio && fin ? `${inicio} - ${fin}` : 'Cerrado'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Seguros */}
            {medico.accepts_insurance && Array.isArray(medico.insurance_names) && medico.insurance_names.length > 0 && (
              <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={16} /> Seguros aceptados
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {medico.insurance_names.map((seg, i) => (
                    <span key={i} style={{ padding: '4px 10px', background: '#ECFDF5', borderRadius: 20, fontSize: 12, color: '#059669', fontWeight: 500 }}>{seg}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Contacto */}
            {(medico.whatsapp_available || medico.clinic_phone) && (
              <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={16} /> Contacto
                </h3>
                {medico.whatsapp_available && medico.whatsapp_phone && (
                  <a
                    href={`https://wa.me/52${medico.whatsapp_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#25D366', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13, justifyContent: 'center', marginBottom: medico.clinic_phone ? 8 : 0 }}
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                )}
                {medico.clinic_phone && (
                  <a
                    href={`tel:${medico.clinic_phone}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#1E3A5F', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13, justifyContent: 'center' }}
                  >
                    <Phone size={16} /> {medico.clinic_phone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      {reviews.length > 0 && (
  <section className="fade-up" style={{ maxWidth: 1200, margin: '40px auto 0', padding: '0 20px' }}>
    <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 24, fontWeight: 900, color: '#1E3A5F', marginBottom: 16 }}>
      Reseñas de pacientes ({reviews.length})
    </h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(mostrarTodasResenas ? reviews : reviews.slice(0, 5)).map((r: any) => (
        // scroll-margin-top libra el Navbar fijo (72px) al hacer scroll por
        // JS hasta acá, ej. desde el link del correo de aviso de respuesta
        // (?review=, ver el useEffect de reviewDestacadaId más arriba).
        <div key={r.id} id={`review-${r.id}`} style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #E5E7EB', scrollMarginTop: 90 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Paciente</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={16} color="#F59E0B" fill={i <= r.rating ? '#F59E0B' : 'none'} />
              ))}
            </div>
          </div>
          {r.comment && <p style={{ fontSize: 14, color: '#4A5568', lineHeight: 1.6 }}>{r.comment}</p>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
            <p style={{ fontSize: 11, color: '#9CA3AF' }}>
              {new Date(r.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <ReportarBoton tipo="review" id={r.id} />
          </div>
          {r.respuesta && (
            <div style={{ marginTop: 12, padding: 14, background: '#F0F4F8', borderRadius: 12, borderLeft: '3px solid #1E3A5F' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F' }}>Respuesta del médico</p>
                {r.respuestaId && <ReportarBoton tipo="review_response" id={r.respuestaId} />}
              </div>
              <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.respuesta}</p>
            </div>
          )}
        </div>
      ))}
    </div>
    {!mostrarTodasResenas && reviews.length > 5 && (
      <button
        onClick={() => setMostrarTodasResenas(true)}
        style={{ display: 'block', margin: '20px auto 0', background: '#fff', color: '#1E3A5F', border: '1px solid #E5E7EB', borderRadius: 50, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        Ver más ({reviews.length - 5})
      </button>
    )}
  </section>
)}
      </main>

      {/* Toast: Link copiado */}
      {copiedToast && (
        <div className="toast" style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#1E3A5F', color: '#fff', padding: '12px 24px', borderRadius: 50, fontSize: 13, fontWeight: 600, zIndex: 5000, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
          <CheckCircle size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Link copiado al portapapeles
        </div>
      )}

      {/* Sticky bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(12px)', padding: '16px 20px', zIndex: 1000, borderTop: '1px solid #E5E7EB', boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {(precioPrimera || precioSubsecuente) && (
              <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 80 }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 600 }}>Desde</p>
                <p style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>${precioSubsecuente || precioPrimera}</p>
              </div>
            )}
            <button onClick={() => setShowAppointmentModal(true)} style={{ flex: 1, background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)' }}>
              <Calendar size={16} /> Agendar Cita
            </button>
          </div>
          <Link href="/chat/recuperar" style={{ display: 'block', textAlign: 'center', marginTop: 8, fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>
            ¿Ya tienes cita? Chatea con tu médico aquí
          </Link>
        </div>
      </div>

      {showAppointmentModal && (
        <AppointmentModal medico={medico} onClose={() => setShowAppointmentModal(false)} />
      )}
      {showPhotoModal && medico.photo_url && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowPhotoModal(false)}>
          <button onClick={() => setShowPhotoModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10 }}>
            <X size={32} />
          </button>
          <img src={medico.photo_url} alt={displayName} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 16 }} />
        </div>
      )}
      {showAllPhotosModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAllPhotosModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 480, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>Galería ({galleryPhotos.length})</h3>
              <button
                onClick={() => setShowAllPhotosModal(false)}
                style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151', flexShrink: 0 }}
              >
                <X size={22} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {galleryPhotos.map(photo => (
                <div
                  key={photo.id}
                  style={{ aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: '1px solid #E5E7EB' }}
                  onClick={() => setLightboxPhoto(photo)}
                >
                  <img src={photo.photo_url} alt={photo.caption || `Foto de ${displayName}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {lightboxPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setLightboxPhoto(null)}>
          <button onClick={() => setLightboxPhoto(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10 }}>
            <X size={32} />
          </button>
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToLightboxPhoto(-1) }}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10 }}
              title="Foto anterior"
            >
              <ChevronLeft size={26} />
            </button>
          )}
          {lightboxIndex >= 0 && lightboxIndex < galleryPhotos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToLightboxPhoto(1) }}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', zIndex: 10 }}
              title="Foto siguiente"
            >
              <ChevronRight size={26} />
            </button>
          )}
          <div
            style={{ textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            <img src={lightboxPhoto.photo_url} alt={lightboxPhoto.caption || displayName} style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 16, touchAction: 'pan-y' }} />
            {lightboxPhoto.caption && (
              <p style={{ color: '#fff', fontSize: 13, marginTop: 12 }}>{lightboxPhoto.caption}</p>
            )}
          </div>
        </div>
      )}
      {showVerificationModal && (
        <InfoModal title="Consultar cédula profesional" onClose={() => setShowVerificationModal(false)}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, background: '#EDE9FE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Shield size={22} color="#1E3A5F" />
            </div>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Sigue estos pasos para verificar en SEP</p>
          </div>
          {medico.professional_license && cedulaVerificada && (
            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Número de cédula:</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #E5E7EB' }}>
                <code style={{ flex: 1, fontSize: 13 }}>{medico.professional_license}</code>
                <CopyButton text={medico.professional_license} label="cédula" />
              </div>
            </div>
          )}
          <a href="https://cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1E3A5F', color: '#fff', padding: '12px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <ExternalLink size={14} /> Abrir portal SEP
          </a>
        </InfoModal>
      )}
      {showConacemModal && (
        <InfoModal title="Consultar certificación CONACEM" onClose={() => setShowConacemModal(false)}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, background: '#EDE9FE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Shield size={22} color="#1E3A5F" />
            </div>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Verifica la certificación de especialidad</p>
          </div>
          <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Nombre del médico:</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #E5E7EB' }}>
              <span style={{ flex: 1, fontSize: 13 }}>{displayName}</span>
              <CopyButton text={displayName} label="nombre" />
            </div>
          </div>
          <a href="https://conacem.org.mx/buscador" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1E3A5F', color: '#fff', padding: '12px', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <ExternalLink size={14} /> Abrir portal CONACEM
          </a>
        </InfoModal>
      )}
    </div>
  )
}