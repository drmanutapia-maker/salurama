'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  X, Edit2, Save, Plus, Trash2, Phone, MessageCircle,
  DollarSign, Shield, Camera, Eye, CheckCircle, MapPin, Star, Globe, AlertTriangle
} from 'lucide-react'
import ConsultorioCard, { type ConsultorioRow } from './ConsultorioCard'
import dynamic from 'next/dynamic'
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false })
import { useCP } from '@/hooks/useCP'
import TitleSelect from '@/components/TitleSelect'
import imageCompression from 'browser-image-compression'
import GaleriaFotos from './GaleriaFotos'
import FechasBloqueadas, { type BloqueoFecha } from '@/components/FechasBloqueadas'
import { fechaISOLocal } from '@/lib/citas/fechas'

const UNIVERSIDADES_MEXICO = [
  'Benemérita Universidad Autónoma de Puebla (BUAP)',
  'Centro de Estudios Universitarios Xochicalco (CEUX)',
  'Escuela Médico Naval',
  'Escuela de Medicina Intermédica',
  'Instituto Politécnico Nacional (IPN)',
  'Instituto Tecnológico de Monterrey (Tec de Monterrey)',
  'Instituto de Ciencias y Estudios Superiores de Tamaulipas (ICEST)',
  'Universidad Anáhuac',
  'Universidad Anáhuac Mayab',
  'Universidad Autónoma Benito Juárez de Oaxaca (UABJO)',
  'Universidad Autónoma Metropolitana (UAM)',
  'Universidad Autónoma de Aguascalientes (UAA)',
  'Universidad Autónoma de Baja California',
  'Universidad Autónoma de Baja California Sur (UABCS)',
  'Universidad Autónoma de Campeche',
  'Universidad Autónoma de Chiapas (UNACH)',
  'Universidad Autónoma de Chihuahua',
  'Universidad Autónoma de Ciudad Juárez (UACJ)',
  'Universidad Autónoma de Coahuila (UAdeC)',
  'Universidad Autónoma de Durango (UAD)',
  'Universidad Autónoma de Guadalajara (UAG)',
  'Universidad Autónoma de Guanajuato (UGTO)',
  'Universidad Autónoma de Guerrero (UAGro)',
  'Universidad Autónoma de Hidalgo (UAEH)',
  'Universidad Autónoma de Nayarit (UAN)',
  'Universidad Autónoma de Nuevo León (UANL)',
  'Universidad Autónoma de Querétaro',
  'Universidad Autónoma de San Luis Potosí',
  'Universidad Autónoma de Sinaloa',
  'Universidad Autónoma de Tamaulipas (UAT)',
  'Universidad Autónoma de Tlaxcala',
  'Universidad Autónoma de Tlaxcala (UATx)',
  'Universidad Autónoma de Yucatán (UADY)',
  'Universidad Autónoma de Zacatecas (UAZ)',
  'Universidad Autónoma del Estado de Hidalgo',
  'Universidad Autónoma del Estado de Morelos (UAEM)',
  'Universidad Autónoma del Estado de México',
  'Universidad Autónoma del Estado de Quintana Roo (UQRoo)',
  'Universidad Católica de Culiacán',
  'Universidad Central de México',
  'Universidad Cuauhtémoc (Plantel Aguascalientes / Querétaro)',
  'Universidad Intercontinental (UIC)',
  'Universidad Justo Sierra',
  'Universidad Juárez Autónoma de Tabasco (UJAT)',
  'Universidad Juárez del Estado de Durango (UJED)',
  'Universidad La Salle',
  'Universidad Madero (UMAD)',
  'Universidad Mayor de San Simón',
  'Universidad Metropolitana de Monterrey (UMM)',
  'Universidad Michoacana de San Nicolás de Hidalgo',
  'Universidad Nacional Autónoma de México (UNAM)',
  'Universidad Olmeca',
  'Universidad Panamericana',
  'Universidad Potosina',
  'Universidad Veracruzana',
  'Universidad Westhill',
  'Universidad de Ciencias y Artes de Chiapas (UNICACH)',
  'Universidad de Colima (UCOL)',
  'Universidad de Guadalajara (UdeG)',
  'Universidad de Montemorelos',
  'Universidad de Monterrey (UDEM)',
  'Universidad de Sonora',
  'Universidad de las Américas Puebla (UDLAP)',
  'Universidad del Noreste (UNE)',
  'Universidad del Regional del Norte',
  'Universidad del Valle de Atemajac (UNIVA)',
  'Universidad del Valle de México (UVM)',
  'Universidad del Valle de Puebla (UVP)',
  'Universidad del-Valle de Cuernavaca (UNIVAC)',
]

// Lista reemplazada por councilMap (specialty_granular_mapping en vivo) —
// misma fuente única de verdad que usa el registro.

const IDIOMAS_FRECUENTES = [
  'Español', 'Inglés', 'Francés', 'Alemán', 'Italiano',
  'Portugués', 'Chino', 'Japonés', 'Árabe', 'Ruso',
]

const LENGUAS_INDIGENAS = [
  'Náhuatl', 'Maya', 'Mixteco', 'Zapoteco', 'Otomí',
  'Tzeltal', 'Tzotzil', 'Chol', 'Mazahua', 'Purépecha',
  'Totonaca', 'Chinanteco', 'Mixe', 'Huasteco', 'Otra lengua indígena',
]

const ASEGURADORAS = [
  'GNP Seguros', 'AXA Seguros', 'MetLife', 'Zurich', 'Inbursa', 'Seguros Monterrey',
  'Banorte Seguros', 'Qualitas', 'Allianz', 'Chubb', 'MAPFRE',
]

const FORMAS_DE_PAGO = ['💳 Tarjeta', '💵 Efectivo', '🏦 Transferencia', '📱 PayPal']

interface Medico {
  id: string
  slug: string
  pricing_tier: string
  full_name: string
  display_name: string | null
  professional_title: string | null
  specialty: string
  photo_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  linkedin_url: string | null
  website_url: string | null
  // location_* / postal_code no son columnas reales de doctors (nunca llegaron
  // con select): se dejan opcionales por el tipo heredado.
  location_city?: string
  location_state?: string | null
  location_neighborhood?: string | null
  ciudad: string | null
  estado: string | null
  cp: string | null
  postal_code?: string | null
  location_municipality?: string | null
  about_me: string | null
  consultation_price_first_time: number | null
  consultation_price_general: number | null
  accepts_insurance: boolean
  insurance_names: string[]
  payment_methods: string[] | null
  factura_disponible: boolean | null
  whatsapp_available: boolean
  whatsapp_phone: string | null
  clinic_phone: string | null
  clinic_phone_visible?: boolean | null
  clinic_name: string | null
  clinic_address: string | null
  clinic_lat: number | null
  clinic_lng: number | null
  is_active: boolean
  professional_license: string | null
  years_experience: number | null
  languages: string[]
  horario: Record<string, unknown> | null
  duracion_cita_minutos: number | null
  atiende_ninos: boolean
  min_patient_age: number | null
  max_patient_age: number | null
}

interface SpecialtyWithLicense {
  id: string
  specialty_name: string
  license_number: string
  council: string
  is_current: boolean
  issue_year?: number | null
}

interface Education {
  id: string
  institution: string
  degree: string
  field_of_study: string
  graduation_year?: number | null
}

interface Experience {
  id: string
  institution_name: string
  position: string
  location: string
  start_date?: string | null
  end_date?: string | null
  is_current: boolean
}

interface Condition {
  id: string
  condition_name: string
  category: string
}

// Un consultorio adicional (adicionales gestionados via tabla consultorios).
interface ConsultorioAdicional {
  id: string
  clinic_name: string
  clinic_type: string
  street: string
  ext_number: string
  int_number: string
  floor: string
  cp: string
  colonia: string
  ciudad: string
  estado: string
  clinic_lat: number | null
  clinic_lng: number | null
  clinic_phone: string
  is_primary: boolean
  clinic_phone_visible?: boolean
  horario?: Record<string, { activo: boolean; inicio: string; fin: string; descanso_inicio?: string; descanso_fin?: string }> | null
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s',
  color: '#111827',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  background: '#1E3A5F',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '12px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
}

const btnSecondary: React.CSSProperties = {
...btnPrimary,
  background: '#F3F4F6',
  color: '#374151',
}

// Solo para mostrar la vigencia en texto (aaaa-mm-dd -> dd/mm/aaaa). El
// <input type="date"> de edición no pasa por aquí — su formato es nativo del
// navegador, no controlable desde código. Parte el string a mano en vez de
// usar `new Date()` para no arriesgar un corrimiento de día por zona horaria.
function formatFechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: '#E8F7F5',
  color: '#1E3A5F',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
}

// Columnas de doctors que lee esta página: todas las legibles con la sesión
// del navegador (GRANT SELECT de authenticated). Explícitas: email, phone,
// whatsapp, clinic_phone, whatsapp_phone, address, admin_notes, last_reviewed_*,
// pricing_period y stripe_* NO se pueden leer de la tabla; el teléfono del
// consultorio y el WhatsApp propios se obtienen con get_mi_doctor_datos_sensibles().
// Campos que ahora viven en consultorios y se leen por separado en loadData():
// clinic_name, clinic_address, clinic_type, clinic_lat, clinic_lng,
// clinic_formatted_address, clinic_phone_visible, horario,
// street, ext_number, int_number, floor, cp, colonia.
// ciudad y estado siguen en doctors (sincronizados por trigger desde consultorios).
// duracion_cita_minutos sigue en doctors (decisión de diseño).
const COLUMNAS_EDITAR_PERFIL = 'id, created_at, updated_at, full_name, specialty, professional_license, license_verified, consultation_price, description, photo_url, is_active, gender, languages, hospital_affiliation, years_experience, education, schedule, rating_avg, rating_count, profile_views, slug, verification_status, symptoms, insurance_accepted, availability, specialty_council_url, license_issue_date, sub_specialty, license_visible, review_status, atiende_ninos, about_me, website_url, price_list, payment_methods, office_materials, patient_age_range, access_info, additional_info, consultation_price_general, consultation_price_followup, consultation_price_first_time, accepts_insurance, insurance_names, available_days, schedule_start, schedule_end, first_visit_requirements, wheelchair_accessible, has_elevator, has_parking, public_transport_nearby, min_patient_age, max_patient_age, best_contact_time, whatsapp_available, cancellation_policy, next_available_date, availability_status, availability_hours, availability_schedule, location_city_id, duracion_cita_minutos, user_id, license_not_current, display_name, professional_title, facebook_url, instagram_url, tiktok_url, x_url, linkedin_url, estado, ciudad, latitude, longitude, pricing_tier, cofepris_aviso_numero, cofepris_acuse_url, cofepris_aviso_fecha, has_aviso_funcionamiento, factura_disponible, webauthn_banner_declined, webauthn_migrado_dispositivo, pwa_banner_shown, cofepris_banner_declined'

export default function EditarPerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [medico, setMedico] = useState<Medico | null>(null)
  const [specialties, setSpecialties] = useState<SpecialtyWithLicense[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(1)
  // Email de la cuenta (sesión): doctors.email ya no es legible desde el navegador.
  const [emailSesion, setEmailSesion] = useState('')
  // Fechas bloqueadas próximas (doctor_blocked_dates). bloqueosError evita
  // que un fallo de lectura se muestre como "Sin fechas bloqueadas".
  const [bloqueos, setBloqueos] = useState<BloqueoFecha[]>([])
  const [bloqueosError, setBloqueosError] = useState(false)
  // Lista plana de todos los consultorios del médico (principal + adicionales).
  // Es la fuente de verdad para la sección "Mis consultorios".
  const [consultorios, setConsultorios] = useState<ConsultorioRow[]>([])
  // ID del consultorio que se está editando en el modal 'consultorio_edit'.
  // '__nuevo__' = se está agregando uno nuevo.
  const [editandoConsultorioId, setEditandoConsultorioId] = useState<string | null>(null)
  // ID del consultorio sobre el que se está ejecutando una operación async
  // (toggle activo / eliminar) para deshabilitar sus botones.
  const [guardandoConsultorioId, setGuardandoConsultorioId] = useState<string | null>(null)

  useEffect(() => {
    if (activeModal === 'location' && !consultorioPrincipalIdRef.current) {
      console.warn('[editar-perfil] Modal de ubicación abierto pero consultorioPrincipalIdRef es null — loadData no encontró el consultorio principal.')
    }
  }, [activeModal])
  // Borrador del horario del consultorio principal mientras el modal de
  // ubicación está abierto. HorarioConsultorioForm lo actualiza en cada
  // cambio (sin re-render del padre) y UbicacionTabs lo lee al presionar
  // "Guardar cambios". null = el médico no ha tocado el horario, así que
  // no se envía nada de horario/duración en ese guardado.
  const horarioBorradorRef = useRef<{ horario: Horario; duracion: number; valido: boolean } | null>(null)
  // UbicacionTabs registra aquí intentarCerrar() para que X / clic fuera /
  // Escape del modal de ubicación pidan confirmación si hay cambios sin
  // guardar (ver Modal onClose más abajo).
  const controlUbicacionRef = useRef<{ intentarCerrar: () => void } | null>(null)
  // ID del consultorio principal en la tabla consultorios — se rellena en
  // loadData() y se usa en handleSaveLocation() para el UPDATE.
  const consultorioPrincipalIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (activeModal !== 'location') horarioBorradorRef.current = null
  }, [activeModal])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editingLicense, setEditingLicense] = useState(false)
  const [licenseInput, setLicenseInput] = useState('')
  const [licenseSaving, setLicenseSaving] = useState(false)
  const [licenseError, setLicenseError] = useState('')

  // Especialidad principal y consejo: ya no se editan a mano (ver
  // handleSaveVigencia más abajo) — solo se muestran, derivados de
  // councilMap. Lo único que el médico puede tocar es la vigencia de su
  // certificación (primaryCredential), nunca su especialidad ni el consejo.
  const [primaryCredential, setPrimaryCredential] = useState<{ id: string; vigencia_hasta: string | null } | null>(null)
  const [marcandoPrincipalId, setMarcandoPrincipalId] = useState<string | null>(null)
  const [editingVigencia, setEditingVigencia] = useState(false)
  const [vigenciaInput, setVigenciaInput] = useState('')
  const [vigenciaSaving, setVigenciaSaving] = useState(false)
  const [vigenciaError, setVigenciaError] = useState('')

  // Mapeo especialidad -> consejo CONACEM (fuente única de verdad, ver
  // specialty_granular_mapping) — se usa tanto para mostrar/editar la
  // especialidad principal como para el formulario de especialidad adicional.
  const [councilMap, setCouncilMap] = useState<Record<string, { councilName: string | null; exclusionReason: string | null }>>({})

  useEffect(() => {
    async function loadCouncilMapping() {
      const { data } = await supabase
        .from('specialty_granular_mapping')
        .select('granular_name, exclusion_reason, conacem_councils(council_name)')
      if (data) {
        const map: Record<string, { councilName: string | null; exclusionReason: string | null }> = {}
        data.forEach((row: any) => {
          map[row.granular_name] = {
            councilName: row.conacem_councils?.council_name ?? null,
            exclusionReason: row.exclusion_reason,
          }
        })
        setCouncilMap(map)
      }
    }
    loadCouncilMapping()
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // silencioso: recarga sin pasar por la pantalla de carga -- se usa al
  // guardar desde el modal de ubicación, que debe seguir abierto (con su tab
  // activo y los borradores de los demás tabs) en vez de desmontarse.
  const loadData = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError ||!user) {
        router.push('/login')
        return
      }

      const { data: medicoBase, error: medicoError } = await supabase
     .from('doctors')
     .select(COLUMNAS_EDITAR_PERFIL)
     .eq('user_id', user.id)
     .single()

      if (medicoError?.code === 'PGRST116') {
        alert('No se encontró perfil')
        router.push('/dashboard')
        return
      }

      if (medicoError) throw medicoError

      setEmailSesion(user.email ?? '')

      // Teléfono del consultorio y WhatsApp propios: por función, no por la tabla.
      // Consultorio principal y lista completa: ahora en la tabla consultorios.
      const [sensiblesRes, consultorioPrincipalRes, todosConsultoriosRes] = await Promise.all([
        supabase.rpc('get_mi_doctor_datos_sensibles'),
        supabase.from('consultorios')
          .select('id, nombre, tipo, street, ext_number, int_number, floor, colonia, ciudad, estado, cp, formatted_address, lat, lng, telefono_visible, horario')
          .eq('doctor_id', medicoBase.id)
          .eq('es_principal', true)
          .maybeSingle(),
        supabase.from('consultorios')
          .select('id, nombre, tipo, street, ext_number, int_number, floor, colonia, ciudad, estado, cp, formatted_address, lat, lng, telefono, telefono_visible, horario, es_principal, activo, orden')
          .eq('doctor_id', medicoBase.id)
          .order('orden', { ascending: true }),
      ])
      const contacto = Array.isArray(sensiblesRes.data) ? sensiblesRes.data[0] : null
      const cp = consultorioPrincipalRes.data

      consultorioPrincipalIdRef.current = cp?.id ?? null

      // Lista plana para la sección "Mis consultorios": principal primero.
      const todosRows: ConsultorioRow[] = ((todosConsultoriosRes.data ?? []) as any[])
        .map(c => ({
          id: c.id,
          nombre: c.nombre ?? null,
          tipo: c.tipo ?? null,
          street: c.street ?? null,
          ext_number: c.ext_number ?? null,
          int_number: c.int_number ?? null,
          floor: c.floor ?? null,
          cp: c.cp ?? null,
          colonia: c.colonia ?? null,
          ciudad: c.ciudad ?? null,
          estado: c.estado ?? null,
          formatted_address: c.formatted_address ?? null,
          lat: c.lat != null ? Number(c.lat) : null,
          lng: c.lng != null ? Number(c.lng) : null,
          telefono: c.telefono ?? null,
          telefono_visible: c.telefono_visible ?? false,
          horario: c.horario ?? null,
          es_principal: c.es_principal ?? false,
          activo: c.activo ?? true,
          orden: c.orden ?? 0,
        }))
        .sort((a, b) => (b.es_principal ? 1 : 0) - (a.es_principal ? 1 : 0))
      setConsultorios(todosRows)

      const medicoData = {
        ...medicoBase,
        clinic_phone: contacto?.clinic_phone ?? null,
        whatsapp_phone: contacto?.whatsapp_phone ?? null,
        // Campos del consultorio principal (sobrescriben cualquier columna plana residual)
        clinic_name: cp?.nombre ?? null,
        clinic_type: cp?.tipo ?? null,
        clinic_address: cp?.formatted_address ?? null,
        clinic_lat: cp?.lat != null ? Number(cp.lat) : null,
        clinic_lng: cp?.lng != null ? Number(cp.lng) : null,
        clinic_phone_visible: cp?.telefono_visible ?? null,
        horario: cp?.horario ?? null,
        street: cp?.street ?? null,
        ext_number: cp?.ext_number ?? null,
        int_number: cp?.int_number ?? null,
        floor: cp?.floor ?? null,
        cp: cp?.cp ?? null,
        colonia: cp?.colonia ?? null,
        // ciudad/estado siguen en doctors (sincronizados por trigger desde consultorios)
      }

      setMedico(medicoData)

      const doctorId = medicoData.id
      const [specRes, eduRes, expRes, condRes, primaryCredRes, bloqueosRes] = await Promise.all([
        supabase.from('doctor_specialties').select('*').eq('doctor_id', doctorId),
        supabase.from('doctor_education').select('*').eq('doctor_id', doctorId).order('graduation_year', { ascending: false }),
        supabase.from('doctor_experience').select('*').eq('doctor_id', doctorId).order('is_current', { ascending: false }),
        supabase.from('doctor_conditions').select('*').eq('doctor_id', doctorId).order('category'),
        supabase.from('doctor_specialty_credentials').select('id, vigencia_hasta').eq('doctor_id', doctorId).eq('is_primary', true).maybeSingle(),
        supabase.from('doctor_blocked_dates').select('id, fecha, motivo, created_at').eq('doctor_id', doctorId).gte('fecha', fechaISOLocal(new Date())).order('fecha', { ascending: true }),
      ])
      setBloqueos(bloqueosRes.data ?? [])
      setBloqueosError(!!bloqueosRes.error)

      setSpecialties(specRes.data?? [])
      setEducation(eduRes.data?? [])
      setExperience(expRes.data?? [])
      setConditions(condRes.data?? [])
      setPrimaryCredential(primaryCredRes.data ?? null)
    } catch (err) {
      console.error('Error:', err)
      alert('Error cargando perfil')
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file ||!medico) return
    if (!file.type.startsWith('image/')) { alert('Selecciona una imagen en formato JPG o PNG'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5 MB'); return }

    setUploading(true)
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      })

      const ext = file.name.split('.').pop()
      const path = `${medico.id}/profile.${ext}`

      if (medico.photo_url) {
        const oldPath = medico.photo_url.split('/doctor-photos/')[1]?.split('?')[0]
        if (oldPath) await supabase.storage.from('doctor-photos').remove([oldPath])
      }

      const { error: uploadError } = await supabase.storage
     .from('doctor-photos')
     .upload(path, compressedFile, { upsert: true, cacheControl: '0' })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('doctor-photos').getPublicUrl(path)
      const photoUrl = `${data.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
     .from('doctors')
     .update({ photo_url: photoUrl })
     .eq('id', medico.id)

      if (updateError) throw updateError
      setMedico(prev => prev? {...prev, photo_url: photoUrl } : null)
    } catch (err) {
      console.error('Error:', err)
      alert('No se pudo subir la foto. Verifica que sea JPG o PNG y pese menos de 5 MB, e inténtalo de nuevo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeletePhoto = async () => {
    if (!medico?.photo_url ||!confirm('¿Eliminar foto de perfil?')) return

    setUploading(true)
    try {
      const oldPath = medico.photo_url.split('/doctor-photos/')[1]?.split('?')[0]
      if (oldPath) {
        await supabase.storage.from('doctor-photos').remove([oldPath])
      }

      const { error } = await supabase
     .from('doctors')
     .update({ photo_url: null })
     .eq('id', medico.id)

      if (error) throw error
      setMedico(prev => prev? {...prev, photo_url: null} : null)
    } catch (err) {
      console.error('Error:', err)
      alert('Error al eliminar foto')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveBasicInfo = async (data: Partial<Medico>, opts?: { mantenerModal?: boolean }) => {
  if (!medico) return false
  // Segunda barrera, independiente de que BasicInfoForm mantenga su botón
  // "Guardar" deshabilitado -- este es el único lugar donde estos campos
  // de verdad llegan a la base de datos (esta función también la comparten
  // otros modales: intro, idiomas, precios), así que el guardado real nunca
  // debe depender solo de que la UI del formulario bloquee el envío. Si
  // `data` no trae estas llaves (los otros modales no las tocan), los
  // checks no hacen nada.
  if (data.facebook_url && !esLinkDeRedSocial(data.facebook_url, ['facebook.com', 'fb.com'])) {
    alert('Este campo solo acepta links de Facebook')
    return false
  }
  if (data.instagram_url && !esLinkDeRedSocial(data.instagram_url, ['instagram.com'])) {
    alert('Este campo solo acepta links de Instagram')
    return false
  }
  if (data.tiktok_url && !esLinkDeRedSocial(data.tiktok_url, ['tiktok.com'])) {
    alert('Este campo solo acepta links de TikTok')
    return false
  }
  if (data.linkedin_url && !esLinkDeRedSocial(data.linkedin_url, ['linkedin.com'])) {
    alert('Este campo solo acepta links de LinkedIn')
    return false
  }
  if (data.website_url && marcaCompetidoraEn(data.website_url)) {
    alert('Este campo solo acepta tu propia página web')
    return false
  }
  setSaving(true)
  try {
    const { error } = await supabase.from('doctors').update(data).eq('id', medico.id)
    if (error) throw error
    setMedico(prev => prev? ({...prev,...data }) : null)
    await loadData(!!opts?.mantenerModal)
    if (!opts?.mantenerModal) setActiveModal(null)
    return true
  } catch (err) {
    console.error('Error:', err)
    alert('Error al guardar')
    return false
  } finally {
    setSaving(false)
  }
}

  // Mapeo de nombres UI → columnas en consultorios
  const CONSULTORIO_FIELDS_MAP: Record<string, string> = {
    clinic_name: 'nombre',
    clinic_type: 'tipo',
    clinic_address: 'formatted_address',
    clinic_lat: 'lat',
    clinic_lng: 'lng',
    clinic_phone: 'telefono',
    clinic_phone_visible: 'telefono_visible',
    horario: 'horario',
    street: 'street',
    ext_number: 'ext_number',
    int_number: 'int_number',
    floor: 'floor',
    cp: 'cp',
    estado: 'estado',
    ciudad: 'ciudad',
    colonia: 'colonia',
  }

  // Guarda cambios del modal de ubicación: campos de consultorio principal
  // van a consultorios; duracion_cita_minutos va a doctors.
  const handleSaveLocation = async (data: Record<string, any>, opts?: { mantenerModal?: boolean }): Promise<boolean> => {
    if (!medico) return false
    setSaving(true)
    try {
      // Construir fila para consultorios
      const consultorioRow: Record<string, any> = {}
      const doctorsRow: Record<string, any> = {}

      for (const [key, val] of Object.entries(data)) {
        if (key in CONSULTORIO_FIELDS_MAP) {
          consultorioRow[CONSULTORIO_FIELDS_MAP[key]] = val
        } else if (key === 'duracion_cita_minutos') {
          doctorsRow[key] = val
        }
        // Ignorar otras llaves silenciosamente
      }

      // 1. Update consultorio principal (fuente de verdad)
      if (Object.keys(consultorioRow).length > 0) {
        if (!consultorioPrincipalIdRef.current) {
          throw new Error('No se encontró el ID del consultorio principal. Recarga la página e inténtalo de nuevo.')
        }
        console.log('[handleSaveLocation] ANTES UPDATE — consultorioPrincipalId:', consultorioPrincipalIdRef.current, '| consultorioRow:', JSON.stringify(consultorioRow))
        const { data: updated, error } = await supabase.from('consultorios')
          .update(consultorioRow)
          .eq('id', consultorioPrincipalIdRef.current)
          .select('id')
        console.log('[handleSaveLocation] DESPUÉS UPDATE — data:', JSON.stringify(updated), '| error:', JSON.stringify(error))
        if (error) throw error
        if (!updated || updated.length === 0) {
          throw new Error('El consultorio no se actualizó (0 filas afectadas). Verifica tu sesión y vuelve a intentarlo.')
        }
      }

      // 2. Update doctors (solo duracion_cita_minutos u otros campos propios)
      if (Object.keys(doctorsRow).length > 0) {
        const { error } = await supabase.from('doctors')
          .update(doctorsRow)
          .eq('id', medico.id)
        if (error) throw error
      }

      // Adicionales se gestionan individualmente desde ConsultorioCard,
      // Adicionales se gestionan individualmente desde ConsultorioCard.

      // Actualizar estado local optimistamente y recargar
      setMedico(prev => prev ? { ...prev, ...data } : null)
      await loadData(!!opts?.mantenerModal)
      if (!opts?.mantenerModal) setActiveModal(null)
      return true
    } catch (err) {
      console.error('Error al guardar ubicación:', err)
      alert('Error al guardar')
      return false
    } finally {
      setSaving(false)
    }
  }

  // ── Gestión de consultorios adicionales (Subfase 3.3) ──────────────────

  const handleToggleActivo = async (id: string) => {
    const c = consultorios.find(x => x.id === id)
    if (!c || c.es_principal) return
    setGuardandoConsultorioId(id)
    try {
      const { error } = await supabase.from('consultorios').update({ activo: !c.activo }).eq('id', id)
      if (error) throw error
      setConsultorios(prev => prev.map(x => x.id === id ? { ...x, activo: !x.activo } : x))
    } catch {
      alert('Error al actualizar consultorio')
    } finally {
      setGuardandoConsultorioId(null)
    }
  }

  const handleEliminarConsultorio = async (id: string) => {
    setGuardandoConsultorioId(id)
    try {
      const { count } = await supabase.from('citas')
        .select('id', { count: 'exact', head: true })
        .eq('consultorio_id', id)
      const tieneCitas = (count ?? 0) > 0
      if (tieneCitas) {
        const { error } = await supabase.from('consultorios').update({ activo: false }).eq('id', id)
        if (error) throw error
        setConsultorios(prev => prev.map(x => x.id === id ? { ...x, activo: false } : x))
      } else {
        const { error } = await supabase.from('consultorios').delete().eq('id', id)
        if (error) throw error
        setConsultorios(prev => prev.filter(x => x.id !== id))
      }
    } catch {
      alert('Error al eliminar consultorio')
    } finally {
      setGuardandoConsultorioId(null)
    }
  }

  const handleEditarConsultorio = (id: string) => {
    setEditandoConsultorioId(id)
    setActiveModal('consultorio_edit')
  }

  const handleAgregarConsultorio = () => {
    setEditandoConsultorioId('__nuevo__')
    setActiveModal('consultorio_edit')
  }

  // Guarda un consultorio adicional nuevo o editado (desde el modal 'consultorio_edit').
  const handleSaveConsultorioEdit = async (c: ConsultorioAdicional) => {
    if (!medico || !editandoConsultorioId) return
    setSaving(true)
    try {
      const isHospital = c.clinic_type === 'hospital'
      const streetPart = isHospital
        ? `${c.street} ${c.ext_number}${c.floor ? `, Piso ${c.floor}` : ''}${c.int_number ? `, Consultorio ${c.int_number}` : ''}`
        : `${c.street} ${c.ext_number}${c.int_number ? ` Int. ${c.int_number}` : ''}`
      const row: Record<string, any> = {
        doctor_id: medico.id,
        nombre: c.clinic_name || null,
        tipo: c.clinic_type,
        street: c.street || null,
        ext_number: c.ext_number || null,
        int_number: c.int_number || null,
        floor: isHospital ? (c.floor || null) : null,
        cp: c.cp || null,
        colonia: c.colonia || null,
        ciudad: c.ciudad || null,
        estado: c.estado || null,
        formatted_address: [streetPart, c.colonia, c.cp, c.ciudad, c.estado].filter(Boolean).join(', ') || null,
        lat: c.clinic_lat ?? null,
        lng: c.clinic_lng ?? null,
        telefono: c.clinic_phone || null,
        telefono_visible: !!(c.clinic_phone) && c.clinic_phone_visible === true,
        horario: c.horario ?? null,
        es_principal: false,
        activo: true,
      }

      if (editandoConsultorioId === '__nuevo__') {
        const siguienteOrden = consultorios.filter(x => !x.es_principal).length + 1
        row.orden = siguienteOrden
        const { error } = await supabase.from('consultorios').insert(row)
        if (error) throw error
      } else {
        const { error } = await supabase.from('consultorios').update(row).eq('id', editandoConsultorioId)
        if (error) throw error
      }

      setActiveModal(null)
      await loadData(true)
    } catch {
      alert('Error al guardar consultorio')
    } finally {
      setSaving(false)
    }
  }

  // ───────────────────────────────────────────────────────────────────────

  const handleStartEditLicense = () => {
    setLicenseInput(medico?.professional_license || '')
    setLicenseError('')
    setEditingLicense(true)
  }

  const handleSaveLicense = async () => {
    if (!medico) return
    const clean = licenseInput.trim()
    if (!/^\d{7,8}$/.test(clean)) {
      setLicenseError('La cédula debe tener 7 u 8 dígitos')
      return
    }
    setLicenseSaving(true)
    setLicenseError('')
    try {
      const res = await fetch('/api/dashboard/actualizar-cedula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professional_license: clean }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar la cédula')
      setMedico(prev => prev ? { ...prev, professional_license: clean } : prev)
      setEditingLicense(false)
      if (data.changed) {
        alert('Cédula actualizada. Volverá a pasar por revisión antes de mostrarse como verificada.')
      }
    } catch (err: any) {
      setLicenseError(err.message || 'Error al guardar la cédula')
    } finally {
      setLicenseSaving(false)
    }
  }

  // La especialidad principal y su consejo ya no se editan desde aquí — los
  // decide/cambia un admin en /admin/medicos. Lo único que el médico puede
  // tocar es la vigencia de su certificación (nunca credentials_status ni
  // numero_certificacion) — endpoint acotado a un solo campo.
  const handleStartEditVigencia = () => {
    setVigenciaInput(primaryCredential?.vigencia_hasta || '')
    setVigenciaError('')
    setEditingVigencia(true)
  }

  const handleSaveVigencia = async () => {
    if (!primaryCredential) return
    setVigenciaSaving(true)
    setVigenciaError('')
    try {
      const res = await fetch('/api/dashboard/actualizar-vigencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vigenciaHasta: vigenciaInput || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar la vigencia')
      setPrimaryCredential(prev => prev ? { ...prev, vigencia_hasta: vigenciaInput || null } : prev)
      setEditingVigencia(false)
    } catch (err: any) {
      setVigenciaError(err.message || 'Error al guardar la vigencia')
    } finally {
      setVigenciaSaving(false)
    }
  }

  // Al agregar una especialidad adicional: busca su consejo CONACEM en
  // specialty_granular_mapping (fuente única de verdad) y lo guarda en
  // doctor_specialties.council — antes quedaba siempre vacío porque este
  // formulario no lo capturaba. Si la especialidad tiene consejo, además crea
  // su fila en doctor_specialty_credentials (pendiente de constancia SEP),
  // igual que la especialidad principal al registrarse. Si no tiene consejo
  // (ej. Medicina General), no se crea fila — queda fuera del sistema de
  // credenciales, igual que en el registro.
  const handleAddSpecialty = async (data: Omit<SpecialtyWithLicense, 'id' | 'council'>, selfDeclaredNotCurrent: boolean) => {
    if (!medico) return
    setSaving(true)
    try {
      const { data: mapping } = await supabase
        .from('specialty_granular_mapping')
        .select('id, conacem_council_id, conacem_councils(council_name)')
        .eq('granular_name', data.specialty_name)
        .maybeSingle()

      const councilName = (mapping as any)?.conacem_councils?.council_name ?? ''

      const { error } = await supabase.from('doctor_specialties').insert({ ...data, council: councilName, doctor_id: medico.id })
      if (error) throw error

      if (mapping?.conacem_council_id) {
        await supabase.from('doctor_specialty_credentials').insert({
          doctor_id: medico.id,
          specialty_mapping_id: mapping.id,
          is_primary: false,
          self_declared_not_current: selfDeclaredNotCurrent,
        })
      }

      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error')
    } finally {
      setSaving(false)
    }
  }

  // Al borrar una especialidad adicional también hay que borrar su fila de
  // doctor_specialty_credentials — si no, queda huérfana (el bug real
  // encontrado 2026-07-22 al investigar el reporte de Manuel: la fila de
  // Medicina Interna se quedó viva en credentials aunque la especialidad ya
  // no existía en doctor_specialties).
  const handleDeleteSpecialty = async (spec: SpecialtyWithLicense) => {
    if (!confirm('¿Eliminar?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_specialties').delete().eq('id', spec.id)
      const { data: mapping } = await supabase
        .from('specialty_granular_mapping')
        .select('id')
        .eq('granular_name', spec.specialty_name)
        .maybeSingle()
      if (mapping && medico) {
        await supabase
          .from('doctor_specialty_credentials')
          .delete()
          .eq('doctor_id', medico.id)
          .eq('specialty_mapping_id', mapping.id)
          .eq('is_primary', false)
      }
      await loadData()
    } catch (err) {
      alert('Error')
    } finally {
      setSaving(false)
    }
  }

  // Intercambia la especialidad principal con una adicional — llama a un
  // endpoint que ejecuta la función de base de datos
  // marcar_especialidad_principal (todo-o-nada: los 4 movimientos pasan
  // juntos o ninguno). La saliente nunca pierde sus datos: solo cambia de
  // is_primary, no se borra ni se re-crea.
  const handleMarcarPrincipal = async (spec: SpecialtyWithLicense) => {
    if (!medico) return
    if (!confirm(`¿Hacer de "${spec.specialty_name}" tu especialidad principal? "${medico.specialty}" pasará a ser una especialidad adicional, sin perder tu certificación.`)) return
    setMarcandoPrincipalId(spec.id)
    try {
      const res = await fetch('/api/dashboard/marcar-especialidad-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialtyId: spec.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cambiar la especialidad principal')
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Error al cambiar la especialidad principal')
    } finally {
      setMarcandoPrincipalId(null)
    }
  }

  const handleAddEducation = async (data: Omit<Education, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      await supabase.from('doctor_education').insert({...data, doctor_id: medico.id, graduation_year: data.graduation_year || null })
      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('¿Eliminar?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_education').delete().eq('id', id)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleAddExperience = async (data: Omit<Experience, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      await supabase.from('doctor_experience').insert({
     ...data,
        doctor_id: medico.id,
        start_date: data.start_date || null,
        end_date: data.is_current? null : (data.end_date || null),
      })
      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('¿Eliminar?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_experience').delete().eq('id', id)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleAddCondition = async (data: Omit<Condition, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      await supabase.from('doctor_conditions').insert({...data, doctor_id: medico.id })
      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCondition = async (id: string) => {
    if (!confirm('¿Eliminar?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_conditions').delete().eq('id', id)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #E8ECF3', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6B7280', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!medico) return null

  const displayName = medico.display_name || medico.full_name
  const titlePrefix = medico.professional_title? `${medico.professional_title} ` : ''

  // Lista de consultorios para la sección "Mis consultorios".
  // consultorios ya viene del estado; si aún no cargó, mostrar vacío.

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
     .fade-up { animation: fadeUp 0.35s ease-out both; }
     .foto-wr { position: relative; }
     .foto-ov { position: absolute; inset: 0; border-radius: 50%; background: rgba(30,58,95,0.78); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
     .foto-wr:hover.foto-ov { opacity: 1; }
     .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 6px 12px; border-radius: 20px; cursor: pointer; border: 1.5px solid #E5E7EB; transition: all 0.1s; font-family: 'DM Sans', sans-serif; user-select: none; color: #374151; }
     .chip.selected { background: #E8F7F5; border-color: #2A9D8F; color: #1E3A5F; }
     .chip:hover { background: #F3F4F6; }
        input:focus, select:focus, textarea:focus { border-color: #1E3A5F!important; outline: none; }
      `}</style>

      <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 900, color: '#111827', marginBottom: 6 }}>Editar perfil</h1>
            <p style={{ fontSize: 14, color: '#6B7280' }}>Completa tu información profesional</p>
          </div>
          <button onClick={() => router.push(`/doctor/${medico?.id}?from=edit`)} style={btnGhost}>
            <Eye size={14} /> Vista previa
          </button>
        </div>
      </div>

      <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 8, background: '#fff', borderRadius: 12, padding: 8, border: '1px solid #E5E7EB' }}>
          {[{ num: 1, title: '1. Identidad', sub: 'Foto · Especialidad · Bio' }, { num: 2, title: '2. Formación', sub: 'Educación · Idiomas' }, { num: 3, title: '3. Consulta', sub: 'Precios · Contacto' }].map(s => (
            <button key={s.num} onClick={() => setActiveStep(s.num)} style={{ flex: 1, padding: '12px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', background: activeStep === s.num? '#1E3A5F' : 'transparent', color: activeStep === s.num? '#fff' : '#6B7280', fontFamily: "'DM Sans', sans-serif" }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</p>
              <p style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{s.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activeStep === 1 && (
          <>
            <Card title="Información básica" onEdit={() => setActiveModal('basic')}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="foto-wr" style={{ position: 'relative' }}>
                    {medico.photo_url? <img src={medico.photo_url} alt={displayName} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', display: 'block', cursor: uploading? 'not-allowed' : 'pointer', opacity: uploading? 0.5 : 1 }} onClick={() => { if (!uploading) fileInputRef.current?.click() }} /> : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: "'Fraunces', serif", cursor: uploading? 'not-allowed' : 'pointer', opacity: uploading? 0.5 : 1 }} onClick={() => { if (!uploading) fileInputRef.current?.click() }}>{(displayName?.charAt(0) || '?').toUpperCase()}</div>}
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, background: '#1E3A5F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', cursor: uploading? 'not-allowed' : 'pointer', opacity: uploading? 0.5 : 1 }} onClick={() => { if (!uploading) fileInputRef.current?.click() }}>
                      <Camera size={13} color="#fff" />
                    </div>
                    {medico.photo_url && (
                      <button onClick={handleDeletePhoto} disabled={uploading} style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, background: '#DC2626', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }} title="Eliminar foto">
                        <X size={12} color="#fff" />
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
                  </div>
                  <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, whiteSpace: 'nowrap' }}>JPG o PNG, máx. 5 MB</p>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: '#111827' }}>{titlePrefix}{displayName}</p>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>{medico.specialty}</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>{emailSesion}</p>
                  {(medico.facebook_url || medico.instagram_url || medico.tiktok_url || medico.linkedin_url) && (
  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
    {medico.facebook_url && (
      <a href={medico.facebook_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1877F2' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      </a>
    )}
    {medico.instagram_url && (
      <a href={medico.instagram_url} target="_blank" rel="noopener noreferrer" style={{ color: '#E4405F' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
      </a>
    )}
    {medico.tiktok_url && (
      <a href={medico.tiktok_url} target="_blank" rel="noopener noreferrer" style={{ color: '#000000' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
      </a>
    )}
    {medico.linkedin_url && (
      <a href={medico.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: '#0A66C2' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      </a>
    )}
  </div>
)}
                  {medico.years_experience && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{medico.years_experience} años de experiencia</p>}
                  {medico.atiende_ninos && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                      Atiende pacientes pediátricos
                      {(medico.min_patient_age != null || medico.max_patient_age != null) && (
                        <> ({medico.min_patient_age ?? 0}–{medico.max_patient_age ?? 17} años)</>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <GaleriaFotos doctorId={medico.id} doctorSlug={medico.slug} />

            <Card title="Especialidades y cédulas" onEdit={() => setActiveModal('specialties')}>
              <div style={{ padding: '10px 12px', background: '#E8F7F5', borderRadius: 8, border: '1px solid #9FD8CD', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><CheckCircle size={14} color="#2A9D8F" /><span style={{ fontSize: 11, fontWeight: 700, color: '#1D6F65', textTransform: 'uppercase' }}>Principal</span></div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{medico.specialty}</p>

                {editingLicense ? (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={licenseInput}
                        onChange={e => setLicenseInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Número de cédula"
                        style={{ flex: 1, padding: '6px 10px', border: '1px solid #9FD8CD', borderRadius: 6, fontSize: 13, fontFamily: 'monospace' }}
                        disabled={licenseSaving}
                      />
                      <button onClick={handleSaveLicense} disabled={licenseSaving}
                        style={{ background: '#2A9D8F', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: licenseSaving ? 0.6 : 1 }}>
                        {licenseSaving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button onClick={() => { setEditingLicense(false); setLicenseError('') }} disabled={licenseSaving}
                        style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                    {licenseError && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{licenseError}</p>}
                    <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                      Cambiar la cédula la vuelve a poner en revisión. Dejará de mostrar el badge de cédula disponible para consulta hasta que se revise de nuevo.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    {medico.professional_license
                      ? <p style={{ fontSize: 13, color: '#6B7280' }}>Cédula: <strong style={{ color: '#111827' }}>{medico.professional_license}</strong></p>
                      : <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin cédula registrada</p>}
                    <button onClick={handleStartEditLicense}
                      style={{ background: 'none', border: 'none', color: '#1E3A5F', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                      title="Editar cédula">
                      <Edit2 size={13} />
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  {councilMap[medico.specialty]?.councilName
                    ? <p style={{ fontSize: 13, color: '#6B7280' }}>Consejo: <strong style={{ color: '#111827' }}>{councilMap[medico.specialty]?.councilName}</strong></p>
                    : <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin consejo certificador para esta especialidad</p>}
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                  El consejo certificador se asigna automáticamente según la especialidad. Para cambiar cuál es tu especialidad principal, marca con la estrella una de tus especialidades secundarias de abajo.
                </p>

                {primaryCredential && (
                  <div style={{ marginTop: 10 }}>
                    {editingVigencia ? (
                      <div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="date"
                            value={vigenciaInput}
                            onChange={e => setVigenciaInput(e.target.value)}
                            style={{ padding: '6px 10px', border: '1px solid #9FD8CD', borderRadius: 6, fontSize: 13 }}
                            disabled={vigenciaSaving}
                          />
                          <button onClick={handleSaveVigencia} disabled={vigenciaSaving}
                            style={{ background: '#2A9D8F', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: vigenciaSaving ? 0.6 : 1 }}>
                            {vigenciaSaving ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => { setEditingVigencia(false); setVigenciaError('') }} disabled={vigenciaSaving}
                            style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
                            Cancelar
                          </button>
                        </div>
                        {vigenciaError && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{vigenciaError}</p>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {primaryCredential.vigencia_hasta
                          ? <p style={{ fontSize: 13, color: '#6B7280' }}>Vigencia hasta: <strong style={{ color: '#111827' }}>{formatFechaCorta(primaryCredential.vigencia_hasta)}</strong></p>
                          : <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin fecha de vigencia registrada</p>}
                        <button onClick={handleStartEditVigencia}
                          style={{ background: 'none', border: 'none', color: '#1E3A5F', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                          title="Editar vigencia">
                          <Edit2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {specialties.length > 0? specialties.map(spec => (
                <div key={spec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB', marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{spec.specialty_name}</p>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>Cédula: {spec.license_number}</p>
                    {spec.council
                      ? <p style={{ fontSize: 12, color: '#6B7280' }}>Consejo: {spec.council}</p>
                      : <p style={{ fontSize: 12, color: '#9CA3AF' }}>Sin consejo certificador reconocido</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                    <button onClick={() => handleMarcarPrincipal(spec)} disabled={marcandoPrincipalId === spec.id}
                      title="Marcar como principal"
                      style={{ background: 'none', border: 'none', color: '#D97706', cursor: marcandoPrincipalId === spec.id ? 'not-allowed' : 'pointer', padding: 4, opacity: marcandoPrincipalId === spec.id ? 0.5 : 1, display: 'inline-flex', alignItems: 'center' }}>
                      {marcandoPrincipalId === spec.id
                        ? <span style={{ width: 15, height: 15, border: '2px solid #D9770640', borderTopColor: '#D97706', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        : <Star size={15} />}
                    </button>
                    <button onClick={() => handleDeleteSpecialty(spec)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>
                  </div>
                </div>
              )) : <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin especialidades adicionales.</p>}
            </Card>

            <Card title="Biografía" onEdit={() => setActiveModal('intro')}>
              {medico.about_me? <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{medico.about_me.length > 200? medico.about_me.substring(0, 200) + '...' : medico.about_me}</p> : <p style={{ fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' }}>Sin biografía.</p>}
            </Card>
          </>
        )}

        {activeStep === 2 && (
          <>
            <Card title="Formación académica" onEdit={() => setActiveModal('education')}>
              {education.length > 0? education.map(edu => (
                <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div><p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{edu.institution}</p><p style={{ fontSize: 13, color: '#6B7280' }}>{edu.degree}{edu.field_of_study? ` · ${edu.field_of_study}` : ''}{edu.graduation_year? ` · ${edu.graduation_year}` : ''}</p></div>
                  <button onClick={() => handleDeleteEducation(edu.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>
                </div>
              )) : <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin formación.</p>}
            </Card>

            <Card title="Experiencia profesional" onEdit={() => setActiveModal('experience')}>
              {experience.length > 0? experience.map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div><p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{exp.institution_name}</p><p style={{ fontSize: 13, color: '#6B7280' }}>{exp.position}{exp.location? ` · ${exp.location}` : ''}{exp.is_current? ' · Actual' : ''}</p></div>
                  <button onClick={() => handleDeleteExperience(exp.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>
                </div>
              )) : <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin experiencia.</p>}
            </Card>

            <Card title="Idiomas" onEdit={() => setActiveModal('languages')}>
              {Array.isArray(medico.languages) && medico.languages.length > 0? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{medico.languages.map((lang, i) => <span key={i} style={{ padding: '4px 12px', background: '#E8F7F5', borderRadius: 20, fontSize: 13, color: '#1E3A5F', fontWeight: 500 }}>{lang}</span>)}</div> : <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin idiomas.</p>}
            </Card>

            <Card title="Enfermedades que trata" onEdit={() => setActiveModal('conditions')}>
              {conditions.length > 0? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{conditions.map(c => <span key={c.id} style={{ padding: '4px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 20, fontSize: 13, color: '#374151' }}>{c.condition_name}</span>)}</div> : <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin padecimientos.</p>}
            </Card>
          </>
        )}

        {activeStep === 3 && (
          <>
            {/* ── Mis consultorios ── */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1.5px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Mis consultorios</h3>
                <button
                  onClick={consultorios.length < 3 ? handleAgregarConsultorio : undefined}
                  disabled={consultorios.length >= 3}
                  title={consultorios.length >= 3 ? 'Límite de 3 consultorios alcanzado' : 'Agregar consultorio'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: consultorios.length >= 3 ? '#F3F4F6' : '#1E3A5F',
                    color: consultorios.length >= 3 ? '#9CA3AF' : '#fff',
                    border: 'none', borderRadius: 8, padding: '8px 14px',
                    fontSize: 13, fontWeight: 600, cursor: consultorios.length >= 3 ? 'not-allowed' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Plus size={14} />
                  {consultorios.length >= 3 ? 'Límite alcanzado' : 'Agregar consultorio'}
                </button>
              </div>
              {consultorios.length === 0 && (
                <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', paddingTop: 12 }}>Cargando consultorios…</p>
              )}
              {consultorios.map((c, i) => (
                <ConsultorioCard
                  key={c.id}
                  consultorio={c}
                  esPrincipal={c.es_principal}
                  index={i}
                  onEdit={() => handleEditarConsultorio(c.id)}
                  onToggleActivo={() => handleToggleActivo(c.id)}
                  onDelete={() => handleEliminarConsultorio(c.id)}
                  guardando={guardandoConsultorioId === c.id}
                />
              ))}
            </div>

            <Card title="Bloquear fechas" onEdit={() => setActiveModal('bloqueos')}>
              {bloqueosError
                ? <p style={{ fontSize: 13, color: '#DC2626' }}>No se pudieron cargar tus fechas bloqueadas.</p>
                : bloqueos.length > 0
                  ? <p style={{ fontSize: 14, color: '#374151' }}>{bloqueos.length} {bloqueos.length === 1 ? 'fecha bloqueada' : 'fechas bloqueadas'} próximamente</p>
                  : <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin fechas bloqueadas</p>}
            </Card>

            <Card title="Precios y contacto" onEdit={() => setActiveModal('booking')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {medico.consultation_price_first_time && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={15} color="#1E3A5F" /><span style={{ fontSize: 14, color: '#374151' }}>Primera vez: <strong style={{ color: '#111827' }}>${medico.consultation_price_first_time} MXN</strong></span></div>}
                {medico.consultation_price_general && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={15} color="#1E3A5F" /><span style={{ fontSize: 14, color: '#374151' }}>Subsecuente: <strong style={{ color: '#111827' }}>${medico.consultation_price_general} MXN</strong></span></div>}
                {medico.whatsapp_available && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MessageCircle size={15} color="#2A9D8F" /><span style={{ fontSize: 14, color: '#374151' }}>WhatsApp {medico.whatsapp_phone? `· ${medico.whatsapp_phone}` : ''}</span></div>}
                {medico.clinic_phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={15} color="#1E3A5F" /><span style={{ fontSize: 14, color: '#374151' }}>Consultorio: {medico.clinic_phone}</span></div>}
                {medico.accepts_insurance && Array.isArray(medico.insurance_names) && medico.insurance_names.length > 0 && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}><Shield size={15} color="#1E3A5F" style={{ marginTop: 2 }} /><span style={{ fontSize: 14, color: '#374151' }}>Seguros: {medico.insurance_names.join(', ')}</span></div>}
                {!medico.consultation_price_first_time &&!medico.consultation_price_general && <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin precios configurados.</p>}
              </div>
            </Card>
          </>
        )}
      </div>

      {activeModal && activeModal !== 'consultorio_edit' && (
        <Modal onClose={() => { if (activeModal === 'location' && controlUbicacionRef.current) controlUbicacionRef.current.intentarCerrar(); else setActiveModal(null) }} title={{ basic: 'Información básica', intro: 'Biografía', specialties: 'Especialidades', conditions: 'Enfermedades', experience: 'Experiencia', education: 'Formación', languages: 'Idiomas', booking: 'Precios y contacto', location: 'Ubicación del consultorio', bloqueos: 'Bloquear fechas de consulta' }[activeModal] || 'Editar'}>
          {activeModal === 'basic' && <BasicInfoForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'intro' && <IntroForm aboutMe={medico.about_me} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'specialties' && <SpecialtiesForm specialties={specialties} specialty={medico.specialty} councilMap={councilMap} onAdd={handleAddSpecialty} onDelete={handleDeleteSpecialty} saving={saving} />}
          {activeModal === 'conditions' && <ConditionsForm conditions={conditions} onAdd={handleAddCondition} onDelete={handleDeleteCondition} saving={saving} />}
          {activeModal === 'experience' && <ExperienceForm experience={experience} onAdd={handleAddExperience} onDelete={handleDeleteExperience} saving={saving} />}
          {activeModal === 'education' && <EducationForm education={education} onAdd={handleAddEducation} onDelete={handleDeleteEducation} saving={saving} />}
          {activeModal === 'languages' && <LanguagesForm languages={medico.languages?? []} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'booking' && <BookingForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'bloqueos' && <FechasBloqueadas doctorId={medico.id} bloqueos={bloqueos} onChange={setBloqueos} sinMarco />}
          {activeModal === 'location' && (
            <UbicacionTabs
              medico={medico}
              onSave={(d: Record<string, any>) => handleSaveLocation(d, { mantenerModal: true })}
              saving={saving}
              horarioBorradorRef={horarioBorradorRef}
              onCerrar={() => setActiveModal(null)}
              controlRef={controlUbicacionRef}
            />
          )}
        </Modal>
      )}

      {/* Modal de edición / creación de un consultorio (adicional o nuevo) */}
      {activeModal === 'consultorio_edit' && editandoConsultorioId && (() => {
        const esNuevo = editandoConsultorioId === '__nuevo__'
        const row = esNuevo ? null : consultorios.find(x => x.id === editandoConsultorioId) ?? null
        const consultorioParaForm: ConsultorioAdicional = row
          ? {
              id: row.id,
              clinic_name: row.nombre ?? '',
              clinic_type: row.tipo ?? 'consultorio',
              street: row.street ?? '',
              ext_number: row.ext_number ?? '',
              int_number: row.int_number ?? '',
              floor: row.floor ?? '',
              cp: row.cp ?? '',
              colonia: row.colonia ?? '',
              ciudad: row.ciudad ?? '',
              estado: row.estado ?? '',
              clinic_lat: row.lat,
              clinic_lng: row.lng,
              clinic_phone: row.telefono ?? '',
              is_primary: false,
              clinic_phone_visible: row.telefono_visible,
              horario: row.horario ?? null,
            }
          : {
              id: crypto.randomUUID(),
              clinic_name: '',
              clinic_type: 'consultorio',
              street: '', ext_number: '', int_number: '', floor: '',
              cp: '', colonia: '', ciudad: '', estado: '',
              clinic_lat: null, clinic_lng: null,
              clinic_phone: '', is_primary: false,
              clinic_phone_visible: false, horario: null,
            }
        return (
          <Modal
            onClose={() => setActiveModal(null)}
            title={esNuevo ? 'Agregar consultorio' : 'Editar consultorio'}
          >
            <ConsultorioAdicionalForm
              consultorio={consultorioParaForm}
              onSave={handleSaveConsultorioEdit}
              onCancel={() => setActiveModal(null)}
              saving={saving}
            />
          </Modal>
        )
      })()}
    </div>
  )
}

function Card({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1.5px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h3>
        <button onClick={onEdit} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: "'DM Sans', sans-serif" }}><Edit2 size={13} color="#1E3A5F" /> <span style={{ color: '#1E3A5F' }}>Editar</span></button>
      </div>
      {children}
    </div>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", color: '#111827' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// La mayoría de las personas escriben/pegan un dominio sin esquema
// ("www.salurama.com") -- sin esto, el propio navegador rechaza el valor por
// su validación nativa de type="url" (exige http(s)://) antes de que
// nuestra validación de dominio llegue a correr, con un mensaje nativo
// confuso que no explica el porqué. Se antepone https:// automáticamente;
// si la persona sí puso su propio esquema (http:// o https://), se respeta
// tal cual.
function normalizarUrl(valor: string): string {
  const v = valor.trim()
  if (v === '') return v
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

// Lee el hostname real de la URL en vez de buscar el texto del dominio en
// todo el string -- así "https://ejemplo.com/?ir=facebook.com" NO cuenta
// como link de Facebook solo porque la palabra aparece en la query string.
// Si el navegador todavía no bloqueó un valor sin esquema (type="url" nativo
// exige uno, pero por si acaso), cae de vuelta al string completo en
// minúsculas para no reventar con una URL inválida.
function hostnameDe(url: string): string {
  try { return new URL(url).hostname.toLowerCase() } catch { return url.toLowerCase() }
}

// true si el hostname ES ese dominio o es un subdominio suyo (www., m.,
// es-la., etc.) -- evita falsos positivos como "notfacebook.com".
function hostnameCoincideCon(host: string, dominio: string): boolean {
  return host === dominio || host.endsWith('.' + dominio)
}

function esLinkDeRedSocial(url: string, dominios: string[]): boolean {
  if (!url) return true
  const host = hostnameDe(url)
  return dominios.some(d => hostnameCoincideCon(host, d))
}

// Directorios médicos competidores conocidos en México -- lista corta a
// propósito (los más reconocidos: Doctoralia y Top Doctors), no pretende ser
// exhaustiva. Se compara por ETIQUETA del hostname (cada segmento entre
// puntos), no por substring del dominio completo -- "doctoralia" así
// coincide con "doctoralia.com.mx", "www.doctoralia.com", "mx.doctoralia.com",
// etc. (cualquier TLD/subdominio de esa marca) sin falsos positivos como
// "notdoctoralia.com" (esa etiqueta completa es "notdoctoralia", no
// "doctoralia").
const MARCAS_COMPETIDORAS = ['doctoralia', 'topdoctors']

function marcaCompetidoraEn(url: string): string | null {
  if (!url) return null
  const etiquetas = hostnameDe(url).split('.')
  return MARCAS_COMPETIDORAS.find(marca => etiquetas.includes(marca)) || null
}

function BasicInfoForm({ medico, onSave, saving }: any) {
  const [form, setForm] = useState({
    display_name: medico.display_name || medico.full_name,
    professional_title: medico.professional_title || '',
    years_experience: medico.years_experience?.toString() || '',
    facebook_url: medico.facebook_url || '',
    instagram_url: medico.instagram_url || '',
    tiktok_url: medico.tiktok_url || '',
    linkedin_url: medico.linkedin_url || '',
    website_url: medico.website_url || '',
    atiende_ninos: medico.atiende_ninos || false,
    min_patient_age: medico.min_patient_age?.toString() ?? '',
    max_patient_age: medico.max_patient_age?.toString() ?? '',
  })

  // El rango es opcional -- min > max solo se valida cuando el médico llenó
  // AMBOS cuadros (un solo cuadro lleno es válido: "de 5 años en adelante"
  // o "hasta 12 años", sin límite del otro lado).
  const rangoInvalido = form.atiende_ninos && form.min_patient_age !== '' && form.max_patient_age !== ''
    && Number(form.min_patient_age) > Number(form.max_patient_age)

  // Se valida sobre la versión CON https:// antepuesto, no sobre lo que haya
  // en el estado en este instante -- así, si alguien escribe "salurama.com"
  // y le da a Guardar sin pasar por otro campo (sin que el onBlur de abajo
  // llegue a normalizarlo en el estado), la validación igual lo evalúa bien
  // en vez de que new URL() truene por falta de esquema. Cada uno vacío
  // cuenta como válido (son opcionales) -- solo se marca inválido si el
  // médico escribió algo que no corresponde a esa plataforma.
  const facebookNormalizado = normalizarUrl(form.facebook_url)
  const instagramNormalizado = normalizarUrl(form.instagram_url)
  const tiktokNormalizado = normalizarUrl(form.tiktok_url)
  const linkedinNormalizado = normalizarUrl(form.linkedin_url)
  const websiteNormalizado = normalizarUrl(form.website_url)

  const facebookInvalido = facebookNormalizado !== '' && !esLinkDeRedSocial(facebookNormalizado, ['facebook.com', 'fb.com'])
  const instagramInvalido = instagramNormalizado !== '' && !esLinkDeRedSocial(instagramNormalizado, ['instagram.com'])
  const tiktokInvalido = tiktokNormalizado !== '' && !esLinkDeRedSocial(tiktokNormalizado, ['tiktok.com'])
  const linkedinInvalido = linkedinNormalizado !== '' && !esLinkDeRedSocial(linkedinNormalizado, ['linkedin.com'])
  const marcaCompetidoraWebsite = marcaCompetidoraEn(websiteNormalizado)

  const formInvalido = rangoInvalido || facebookInvalido || instagramInvalido || tiktokInvalido || linkedinInvalido || !!marcaCompetidoraWebsite

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formInvalido) return
    onSave({
      display_name: form.display_name,
      professional_title: form.professional_title,
      years_experience: form.years_experience? parseInt(form.years_experience) : null,
      facebook_url: facebookNormalizado || null,
      instagram_url: instagramNormalizado || null,
      tiktok_url: tiktokNormalizado || null,
      linkedin_url: linkedinNormalizado || null,
      website_url: websiteNormalizado || null,
      atiende_ninos: form.atiende_ninos,
      // Si desmarca el checkbox, el rango deja de tener sentido -- se
      // limpia en vez de quedar guardado "fantasma" sin el checkbox que lo
      // explique.
      min_patient_age: form.atiende_ninos && form.min_patient_age !== '' ? parseInt(form.min_patient_age) : null,
      max_patient_age: form.atiende_ninos && form.max_patient_age !== '' ? parseInt(form.max_patient_age) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Nombre para mostrar *</label>
        <input type="text" value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="Dr. Juan Pérez" required />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Título *</label>
        <TitleSelect value={form.professional_title} onChange={(v) => setForm({...form, professional_title: v})} required />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Años de experiencia</label>
        <input type="number" value={form.years_experience} onChange={e => setForm({...form, years_experience: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="10" />
      </div>

      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: '#374151' }}>
          <input type="checkbox" checked={form.atiende_ninos} onChange={e => setForm({...form, atiende_ninos: e.target.checked})} style={{ accentColor: '#1E3A5F' }} />
          Atiendo pacientes pediátricos
        </label>
        {form.atiende_ninos && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Rango de edad que atiendes (opcional)</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Desde</label>
                <input
                  type="number"
                  min={0}
                  max={17}
                  value={form.min_patient_age}
                  onChange={e => setForm({...form, min_patient_age: e.target.value})}
                  placeholder="0"
                  style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", width: 90 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Hasta</label>
                <input
                  type="number"
                  min={0}
                  max={17}
                  value={form.max_patient_age}
                  onChange={e => setForm({...form, max_patient_age: e.target.value})}
                  placeholder="17"
                  style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: "'DM Sans', sans-serif", width: 90 }}
                />
              </div>
            </div>
            {rangoInvalido && (
              <p role="alert" style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 8 }}>
                "Desde" no puede ser mayor que "Hasta".
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 12 }}>Redes sociales (opcional)</p>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Facebook</label>
          <input type="url" value={form.facebook_url} onChange={e => setForm({...form, facebook_url: e.target.value})} onBlur={() => setForm(f => ({...f, facebook_url: normalizarUrl(f.facebook_url)}))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://facebook.com/tu-perfil" />
          {facebookInvalido && (
            <p role="alert" style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
              Este campo solo acepta links de Facebook
            </p>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Instagram</label>
          <input type="url" value={form.instagram_url} onChange={e => setForm({...form, instagram_url: e.target.value})} onBlur={() => setForm(f => ({...f, instagram_url: normalizarUrl(f.instagram_url)}))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://instagram.com/tu-usuario" />
          {instagramInvalido && (
            <p role="alert" style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
              Este campo solo acepta links de Instagram
            </p>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>TikTok</label>
          <input type="url" value={form.tiktok_url} onChange={e => setForm({...form, tiktok_url: e.target.value})} onBlur={() => setForm(f => ({...f, tiktok_url: normalizarUrl(f.tiktok_url)}))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://tiktok.com/@tu-usuario" />
          {tiktokInvalido && (
            <p role="alert" style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
              Este campo solo acepta links de TikTok
            </p>
          )}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>LinkedIn</label>
          <input type="url" value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url: e.target.value})} onBlur={() => setForm(f => ({...f, linkedin_url: normalizarUrl(f.linkedin_url)}))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://linkedin.com/in/tu-perfil" />
          {linkedinInvalido && (
            <p role="alert" style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
              Este campo solo acepta links de LinkedIn
            </p>
          )}
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}><Globe size={14} color="#1E3A5F" /> Página web propia</label>
          <input type="url" value={form.website_url} onChange={e => setForm({...form, website_url: e.target.value})} onBlur={() => setForm(f => ({...f, website_url: normalizarUrl(f.website_url)}))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://tu-consultorio.com" />
          {marcaCompetidoraWebsite && (
            <p role="alert" style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 4 }}>
              Este campo solo acepta tu propia página web
            </p>
          )}
        </div>
      </div>

      <button type="submit" disabled={saving || formInvalido} style={{...btnPrimary, opacity: (saving || formInvalido)? 0.6 : 1, marginTop: 8 }}><Save size={15} /> {saving? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}

// Indicador/acción de "consultorio principal" dentro del formulario de cada
// consultorio (la estrella ya no vive en la fila de la lista). El principal
// actual solo muestra su estado; los demás ofrecen marcarse como principal
// -- ver UbicacionTabs, que decide qué hace onMarcar.
function ControlPrincipal({ esPrincipal, onMarcar }: { esPrincipal: boolean; onMarcar?: () => void }) {
  if (esPrincipal) {
    return (
      <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#B45309', background: '#FEF3C7', borderRadius: 8, padding: '8px 12px' }}>
        <Star size={14} fill="#D97706" color="#D97706" /> Consultorio principal — se muestra primero en tu perfil
      </p>
    )
  }
  if (!onMarcar) return null
  return (
    <button type="button" onClick={onMarcar} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#B45309', background: '#fff', border: '1px solid #FCD34D', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'left' }}>
      <Star size={14} color="#D97706" /> Marcar como consultorio principal
    </button>
  )
}

// Valores del formulario del consultorio principal a partir de `medico`.
// Se usa tanto para el estado inicial de LocationForm como de referencia para
// detectar cambios sin guardar (se compara contra el `medico` vigente, así
// que después de guardar el formulario vuelve a quedar "sin cambios").
function formDesdeMedico(medico: any) {
  return {
    clinic_type: medico.clinic_type || 'consultorio',
    street: medico.street || '',
    ext_number: medico.ext_number || '',
    cp: medico.cp || '',
    estado: medico.estado || '',
    ciudad: medico.ciudad || '',
    colonia: medico.colonia || '',
    consultorio_name: medico.clinic_type === 'consultorio'? (medico.clinic_name || '') : '',
    consultorio_int: medico.clinic_type === 'consultorio'? (medico.int_number || '') : '',
    hospital_name: medico.clinic_type === 'hospital'? (medico.clinic_name || '') : '',
    hospital_int: medico.clinic_type === 'hospital'? (medico.int_number || '') : '',
    hospital_floor: medico.clinic_type === 'hospital'? (medico.floor || '') : '',
    clinic_phone: medico.clinic_phone || '',
    clinic_phone_visible: !!medico.clinic_phone && medico.clinic_phone_visible === true,
  }
}

// Redondeo a 6 decimales (~10 cm) para comparar coordenadas sin falsos
// positivos por ruido de punto flotante.
const redondearCoord = (n: unknown) => (n == null || n === '' ? null : Math.round(Number(n) * 1e6) / 1e6)

// ¿El horario del consultorio principal que está en el borrador difiere del
// guardado? El borrador solo existe si el médico tocó el editor.
function horarioPrincipalCambio(medico: any, borrador: { horario: Horario; duracion: number } | null): boolean {
  if (!borrador) return false
  return JSON.stringify(borrador.horario) !== JSON.stringify(normalizarHorario(medico.horario))
    || borrador.duracion !== (medico.duracion_cita_minutos || 30)
}

// Lo que cada formulario de consultorio adicional expone a UbicacionTabs
// para el botón "Guardar cambios" global y la detección de cambios.
type ControlAdicional = {
  construir: () => { consultorio: ConsultorioAdicional } | { error: string }
  hayCambios: () => boolean
}

// Subconjunto comparable de un consultorio adicional (null/''/undefined se
// tratan igual) para saber si el formulario difiere de lo guardado.
function firmaConsultorio(c: ConsultorioAdicional): string {
  return JSON.stringify({
    clinic_type: c.clinic_type || 'consultorio',
    clinic_name: c.clinic_name || '',
    street: c.street || '',
    ext_number: c.ext_number || '',
    int_number: c.int_number || '',
    floor: c.floor || '',
    cp: c.cp || '',
    estado: c.estado || '',
    ciudad: c.ciudad || '',
    colonia: c.colonia || '',
    clinic_phone: (c.clinic_phone || '').trim(),
    clinic_phone_visible: !!(c.clinic_phone || '').trim() && c.clinic_phone_visible === true,
    clinic_lat: redondearCoord(c.clinic_lat),
    clinic_lng: redondearCoord(c.clinic_lng),
    horario: c.horario ?? null,
  })
}

// El guardado ya no vive aquí: "Guardar cambios" (al final del modal, en
// UbicacionTabs) llama a controlRef.current.construirCambios() para armar los
// campos de dirección y teléfono del consultorio principal, y a hayCambios()
// para saber si hay algo sin guardar.
function LocationForm({ medico, controlRef, esPrincipal, onMarcarPrincipal }: any) {
  const { loading: loadingCP, error: cpError, cpData, search } = useCP()

  const [form, setForm] = useState(() => formDesdeMedico(medico))

  const [editandoCP, setEditandoCP] = useState(!form.cp)
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    if (cpData) {
      setForm(f => ({
      ...f,
        estado: cpData.estado,
        ciudad: cpData.municipio,
        colonia: cpData.colonias.length === 1? cpData.colonias[0].nombre : ''
      }))
      if (cpData.lat && cpData.lng) {
        setPinCoords({ lat: cpData.lat, lng: cpData.lng })
      }
    }
  }, [cpData])

  const geocodeAddress = async () => {
    const { street, ext_number, colonia, cp, ciudad } = form
    if (!street || !colonia || !cp) return
    setGeocoding(true)
    try {
      const q = `${street} ${ext_number}, ${colonia}, ${cp}, ${ciudad || 'México'}, México`
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=mx`,
        { headers: { 'User-Agent': 'Salurama/1.0 (salurama.com)' } }
      )
      const data = await res.json()
      if (data[0]) setPinCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
    } catch { /* silently ignore — user can drag pin */ }
    finally { setGeocoding(false) }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setPinCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }

  // Campos de doctors que salen de este formulario (dirección + teléfono del
  // consultorio principal). El horario y el guardado en sí
  // los maneja UbicacionTabs.
  const construirCambios = (): { cambios: Record<string, any> } => {
    // Teléfono del consultorio principal (columna plana clinic_phone). El
    // flag de visibilidad solo se envía si doctors ya tiene esa columna
    // (select('*') solo trae las que existen); si no, mandarlo haría fallar
    // todo el guardado de ubicación.
    const telefono = form.clinic_phone.trim()
    const camposTelefono = {
      clinic_phone: telefono || null,
      ...('clinic_phone_visible' in medico ? { clinic_phone_visible: telefono !== '' && form.clinic_phone_visible } : {}),
    }

    const isHospital = form.clinic_type === 'hospital'
    const currentName = isHospital? form.hospital_name : form.consultorio_name
    const currentInt = isHospital? form.hospital_int : form.consultorio_int
    const currentFloor = isHospital? form.hospital_floor : ''

    // Si el nombre está vacío, borrar ubicación
    const isClearing =!currentName

    if (isClearing) {
      return {
        cambios: {
          clinic_name: null,
          clinic_address: null,
          clinic_lat: null,
          clinic_lng: null,
          street: null,
          ext_number: null,
          int_number: null,
          floor: null,
          cp: null,
          estado: null,
          ciudad: null,
          colonia: null,
          ...camposTelefono,
        },
      }
    }

    const lat = pinCoords?.lat ?? medico.clinic_lat ?? null
    const lng = pinCoords?.lng ?? medico.clinic_lng ?? null

    const intLabel = isHospital? 'Consultorio' : 'Int.'
    const streetPart = isHospital
      ? `${form.street} ${form.ext_number}${currentFloor? `, Piso ${currentFloor}` : ''}${currentInt? `, ${intLabel} ${currentInt}` : ''}`
      : `${form.street} ${form.ext_number}${currentInt? ` ${intLabel} ${currentInt}` : ''}`
    const direccionCompleta = `${streetPart}, ${form.colonia}, ${form.cp}, ${form.ciudad}, ${form.estado}`

    return {
      cambios: {
        clinic_type: form.clinic_type,
        clinic_name: currentName,
        clinic_address: direccionCompleta,
        clinic_lat: lat,
        clinic_lng: lng,
        street: form.street,
        ext_number: form.ext_number,
        int_number: currentInt || null,
        floor: isHospital? (currentFloor || null) : null,
        cp: form.cp,
        estado: form.estado,
        ciudad: form.ciudad,
        colonia: form.colonia,
        ...camposTelefono,
      },
    }
  }

  // ¿Hay algo distinto de lo guardado? Campos del formulario contra el
  // `medico` vigente, y el pin contra las coordenadas guardadas.
  const hayCambios = (): boolean => {
    if (JSON.stringify(form) !== JSON.stringify(formDesdeMedico(medico))) return true
    if (pinCoords) {
      return redondearCoord(pinCoords.lat) !== redondearCoord(medico.clinic_lat)
        || redondearCoord(pinCoords.lng) !== redondearCoord(medico.clinic_lng)
    }
    return false
  }

  if (controlRef) controlRef.current = { construirCambios, hayCambios }

  const currentName = form.clinic_type === 'hospital'? form.hospital_name : form.consultorio_name
  const currentInt = form.clinic_type === 'hospital'? form.hospital_int : form.consultorio_int
  const currentFloor = form.hospital_floor

  return (
    <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ControlPrincipal esPrincipal={!!esPrincipal} onMarcar={onMarcarPrincipal} />

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Tipo de lugar</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['consultorio', 'hospital'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({...form, clinic_type: t })}
              style={{ padding: '10px', border: `2px solid ${form.clinic_type===t?'#1E3A5F':'#E5E7EB'}`, borderRadius: 8, background: form.clinic_type===t?'#EEF2FF':'#fff', fontSize: 13, fontWeight: 600, color: form.clinic_type===t?'#1E3A5F':'#6B7280', cursor: 'pointer' }}
            >
              {t==='consultorio'?'Consultorio independiente':'Hospital/Clínica'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>
          Nombre del {form.clinic_type==='hospital'?'hospital/clínica':'consultorio'}
        </label>
        <input
          type="text"
          value={currentName}
          onChange={e => setForm({
          ...form,
            [form.clinic_type === 'hospital'? 'hospital_name' : 'consultorio_name']: e.target.value
          })}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }}
          placeholder={form.clinic_type==='hospital'?'Hospital Ángeles':'Consultorio Dr. Pérez'}
        />
      </div>

      <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Ubicación</p>
          {!editandoCP && <button type="button" onClick={() => setEditandoCP(true)} style={{ fontSize: 11, color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{form.cp?'Cambiar CP':'Agregar CP'}</button>}
        </div>
        {editandoCP? (
          <div>
            <input type="text" value={form.cp} onChange={e => { const cp=e.target.value.replace(/\D/g,'').slice(0,5); setForm({...form, cp}); if(cp.length===5) search(cp) }} maxLength={5} placeholder="Código postal" style={{ width: '100px', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, marginBottom: 6 }} autoFocus />
            {loadingCP && <span style={{ fontSize: 11, marginLeft: 8 }}>Buscando...</span>}
            {!loadingCP && cpError && <span style={{ fontSize: 11, marginLeft: 8, color: '#DC2626' }}>{cpError}</span>}
            {cpData && form.estado && <p style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{form.ciudad}, {form.estado}</p>}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#111827' }}><strong>CP:</strong> {form.cp || 'No definido'}</p>
            <p style={{ fontSize: 13, color: '#374151' }}>{form.colonia}{form.colonia&&', '}{form.ciudad}{form.ciudad&&', '}{form.estado}</p>
          </div>
        )}
      </div>

      {editandoCP && cpData && cpData.colonias.length > 0 && (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Colonia</label>
          <select value={form.colonia} onChange={e => setForm({...form, colonia: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, background: '#fff' }} >
            <option value="">Selecciona colonia</option>
            {cpData.colonias.map((c: any) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: form.clinic_type==='hospital'?'2fr 1fr 1fr 1fr':'2fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Calle</label>
          <input type="text" value={form.street} onChange={e => setForm({...form, street: e.target.value})} onBlur={geocodeAddress} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="Av. Reforma" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>No. Ext</label>
          <input type="text" value={form.ext_number} onChange={e => setForm({...form, ext_number: e.target.value})} onBlur={geocodeAddress} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="222" />
        </div>
        {form.clinic_type==='hospital' && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Piso</label>
            <input type="text" value={currentFloor} onChange={e => setForm({...form, hospital_floor: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="3" />
          </div>
        )}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>{form.clinic_type==='hospital'?'Consultorio':'No. Int'}</label>
          <input
            type="text"
            value={currentInt}
            onChange={e => setForm({
            ...form,
              [form.clinic_type === 'hospital'? 'hospital_int' : 'consultorio_int']: e.target.value
            })}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }}
            placeholder="305"
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Teléfono del consultorio</label>
        <input type="tel" value={form.clinic_phone} onChange={e => setForm({...form, clinic_phone: e.target.value, clinic_phone_visible: e.target.value.trim() === '' ? false : form.clinic_phone_visible})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="55 1234 5678" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 8, color: form.clinic_phone.trim() === '' ? '#9CA3AF' : '#374151', cursor: form.clinic_phone.trim() === '' ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            checked={form.clinic_phone_visible}
            disabled={form.clinic_phone.trim() === ''}
            onChange={e => setForm({...form, clinic_phone_visible: e.target.checked})}
            style={{ accentColor: '#1E3A5F' }}
          />
          Mostrar en perfil público
        </label>
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1E3A5F', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
      >
        📍 Usar mi ubicación
      </button>

      {(pinCoords || (medico?.clinic_lat && medico?.clinic_lng)) && (
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
            {geocoding ? '🔍 Buscando dirección…' : 'Arrastra el pin a la ubicación exacta de tu consultorio'}
          </p>
          <LocationPicker
            initialLat={pinCoords?.lat || medico?.clinic_lat || 19.4326}
            initialLng={pinCoords?.lng || medico?.clinic_lng || -99.1332}
            onLocationChange={(lat, lng) => setPinCoords({ lat, lng })}
          />
        </div>
      )}

      {editandoCP && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={() => setEditandoCP(false)} style={{ padding: '10px 14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
        </div>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------
// Editor de horario por consultorio. Tipos, constantes y validarDia son
// copia tal cual de app/dashboard/horario/page.tsx.
// ---------------------------------------------------------------------
type DiaSemana = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo'

interface HorarioDia {
  activo: boolean
  inicio: string
  fin: string
  descanso_inicio?: string
  descanso_fin?: string
}

type Horario = Record<DiaSemana, HorarioDia>

const DIAS: { key: DiaSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

const HORAS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

// Las horas son strings "HH:MM" de 2 dígitos, así que compararlas como
// texto da el mismo resultado que compararlas como minutos.
function validarDia(dia: HorarioDia): string | null {
  if (!dia.activo) return null
  if (dia.fin <= dia.inicio) return 'La hora de cierre debe ser después de la hora de apertura'
  if (dia.descanso_inicio && dia.descanso_fin && dia.descanso_fin <= dia.descanso_inicio) {
    return 'La hora de fin de comida debe ser después de la hora de inicio'
  }
  return null
}

const HORARIO_DEFAULT: Horario = DIAS.reduce((acc, { key }) => {
  acc[key] = {
    activo: false,
    inicio: '09:00',
    fin: '18:00'
  }
  return acc
}, {} as Horario)

// Misma normalización de formatos viejos que hace loadHorario en
// /dashboard/horario (abierto/open/activo, start/end, lunch_*/comida_*).
// Sin horario guardado (null), arranca con todos los días inactivos.
function normalizarHorario(rawHorario: unknown): Horario {
  const horarioCargado = { ...HORARIO_DEFAULT }
  if (!rawHorario || typeof rawHorario !== 'object') return horarioCargado
  const raw = rawHorario as Record<string, any>
  DIAS.forEach(({ key }) => {
    if (raw[key]) {
      horarioCargado[key] = {
        activo: raw[key].abierto ?? raw[key].open ?? raw[key].activo ?? !!(raw[key].inicio || raw[key].start),
        inicio: raw[key].inicio || raw[key].start || '09:00',
        fin: raw[key].fin || raw[key].end || '18:00',
        descanso_inicio: raw[key].descanso_inicio || raw[key].lunch_start || raw[key].comida_inicio,
        descanso_fin: raw[key].descanso_fin || raw[key].lunch_end || raw[key].comida_fin,
      }
    }
  })
  return horarioCargado
}

// Sin autoguardado ni botón propio: cada cambio se reporta al padre con
// onGuardar(horario, duracion, valido) -- es solo un borrador. El padre es
// quien persiste cuando el médico presiona su botón de guardado ("Guardar
// ubicación" o "Guardar consultorio"). No dispara nada al montarse, así que
// un horario que el médico no tocó no se reescribe. sinDuracion oculta el
// selector de duración (doctors.duracion_cita_minutos es una sola columna
// por médico, no por consultorio).
function HorarioConsultorioForm({ horarioInicial, duracionInicial, onGuardar, titulo, sinDuracion }: {
  horarioInicial: unknown
  duracionInicial: number | null | undefined
  onGuardar: (horario: Horario, duracion: number, valido: boolean) => void
  titulo?: string
  sinDuracion?: boolean
}) {
  const [horario, setHorario] = useState<Horario>(() => normalizarHorario(horarioInicial))
  const [duracion, setDuracion] = useState<number>(duracionInicial || 30)

  const onGuardarRef = useRef(onGuardar)
  onGuardarRef.current = onGuardar
  const primerRenderRef = useRef(true)

  const updateDia = (dia: DiaSemana, campo: keyof HorarioDia, valor: any) => {
    setHorario(prev => ({ ...prev, [dia]: { ...prev[dia], [campo]: valor } }))
  }

  const toggleDia = (dia: DiaSemana) => updateDia(dia, 'activo', !horario[dia].activo)

  const toggleDescanso = (dia: DiaSemana, checked: boolean) => {
    setHorario(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        descanso_inicio: checked ? '14:00' : undefined,
        descanso_fin: checked ? '15:00' : undefined
      }
    }))
  }

  const copiarATodos = (diaOrigen: DiaSemana) => {
    const origen = horario[diaOrigen]
    const nuevo = { ...horario }
    DIAS.forEach(({ key }) => { if (key !== diaOrigen) nuevo[key] = { ...origen } })
    setHorario(nuevo)
  }

  const erroresPorDia = DIAS.reduce((acc, { key }) => {
    const err = validarDia(horario[key])
    if (err) acc[key] = err
    return acc
  }, {} as Partial<Record<DiaSemana, string>>)
  const hayErroresValidacion = Object.keys(erroresPorDia).length > 0

  // Agrupa corridas de días consecutivos con el mismo inicio/fin (misma
  // lógica que segmentosVistaPrevia en /dashboard/horario).
  const segmentosVistaPrevia = (() => {
    const activos = DIAS.map((d, idx) => ({ ...d, idx })).filter(d => horario[d.key].activo)
    const segmentos: string[] = []
    let i = 0
    while (i < activos.length) {
      let j = i
      const { inicio, fin } = horario[activos[i].key]
      while (
        j + 1 < activos.length &&
        activos[j + 1].idx === activos[j].idx + 1 &&
        horario[activos[j + 1].key].inicio === inicio &&
        horario[activos[j + 1].key].fin === fin
      ) {
        j++
      }
      segmentos.push(
        j > i
          ? `${activos[i].label} a ${activos[j].label}: ${inicio}–${fin}`
          : `${activos[i].label.slice(0, 3)}: ${inicio}–${fin}`
      )
      i = j + 1
    }
    return segmentos
  })()

  useEffect(() => {
    if (primerRenderRef.current) { primerRenderRef.current = false; return }
    onGuardarRef.current(horario, duracion, !hayErroresValidacion)
  }, [horario, duracion, hayErroresValidacion])

  const selectHora: React.CSSProperties = { padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, background: '#fff' }
  const selectHoraChico: React.CSSProperties = { padding: '6px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, background: '#fff' }

  return (
    <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', display: 'flex', alignItems: 'center', gap: 6 }}>
        {titulo || 'Horario de atención'}
      </p>

      {!sinDuracion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>Duración de cada cita:</label>
          <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))} style={{ ...selectHora, padding: '8px 12px' }}>
            <option value={15}>15 minutos</option>
            <option value={20}>20 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
          </select>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {DIAS.map(({ key, label }) => {
          const dia = horario[key]
          const errorDia = erroresPorDia[key]
          return (
            <div key={key} style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', background: errorDia ? '#FEF2F2' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 130 }}>
                  <button
                    type="button"
                    onClick={() => toggleDia(key)}
                    style={{
                      width: 44, height: 26, borderRadius: 13,
                      background: dia.activo ? '#1E3A5F' : '#D1D5DB',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s', flexShrink: 0
                    }}
                    aria-label={`${dia.activo ? 'Desactivar' : 'Activar'} ${label}`}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: dia.activo ? 20 : 2,
                      width: 22, height: 22, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                  <span style={{ fontWeight: 600, fontSize: 14, color: dia.activo ? '#111827' : '#6B7280' }}>{label}</span>
                </div>

                {dia.activo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <select value={dia.inicio} onChange={(e) => updateDia(key, 'inicio', e.target.value)} style={selectHora}>
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span style={{ color: '#6B7280' }}>—</span>
                    <select value={dia.fin} onChange={(e) => updateDia(key, 'fin', e.target.value)} style={selectHora}>
                      {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <button type="button" onClick={() => copiarATodos(key)} style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 4 }}>
                      Copiar a todos
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: '#6B7280' }}>No disponible</span>
                )}
              </div>

              {dia.activo && (
                <div style={{ marginTop: 10, marginLeft: 56, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#6B7280' }}>
                    <input
                      type="checkbox"
                      checked={!!dia.descanso_inicio}
                      onChange={(e) => toggleDescanso(key, e.target.checked)}
                      style={{ accentColor: '#1E3A5F', width: 16, height: 16 }}
                    />
                    Agregar hora de comida
                  </label>
                  {dia.descanso_inicio && (
                    <>
                      <select value={dia.descanso_inicio} onChange={(e) => updateDia(key, 'descanso_inicio', e.target.value)} style={selectHoraChico}>
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span style={{ fontSize: 12, color: '#6B7280' }}>—</span>
                      <select value={dia.descanso_fin} onChange={(e) => updateDia(key, 'descanso_fin', e.target.value)} style={selectHoraChico}>
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </>
                  )}
                </div>
              )}

              {errorDia && (
                <p role="alert" style={{ marginTop: 8, marginLeft: 56, fontSize: 12, color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} aria-hidden="true" /> {errorDia}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ background: '#F0F4FF', borderRadius: 12, padding: 14, border: '1px solid #C7D2FE' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 6 }}>Vista previa para pacientes</p>
        <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>
          {segmentosVistaPrevia.length > 0 ? segmentosVistaPrevia.join('  •  ') : 'Sin horario configurado'}
        </p>
      </div>

      {hayErroresValidacion && (
        <p style={{ fontSize: 12, color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertTriangle size={14} aria-hidden="true" /> No se podrá guardar hasta corregir el horario marcado en rojo
        </p>
      )}
    </div>
  )
}

// Mismo patrón de campos que LocationForm de arriba (toggle consultorio/
// hospital, geocodificación automática en el onBlur de calle/número, pin
// arrastrable) pero operando sobre un ConsultorioAdicional suelto en vez de
// las columnas planas de `medico` -- por eso no reutiliza LocationForm
// directamente, sino que replica su mismo formulario con un onSave propio.
function ConsultorioAdicionalForm({ consultorio, onSave, onCancel, onEliminar, esPrincipal, onMarcarPrincipal, registrarControl, saving }: {
  consultorio: ConsultorioAdicional
  onSave?: (c: ConsultorioAdicional) => void
  onCancel?: () => void
  onEliminar?: () => void
  esPrincipal?: boolean
  onMarcarPrincipal?: () => void
  registrarControl?: (control: ControlAdicional | null) => void
  saving: boolean
}) {
  const { loading: loadingCP, error: cpError, cpData, search } = useCP()

  const [form, setForm] = useState({
    clinic_type: consultorio.clinic_type || 'consultorio',
    clinic_name: consultorio.clinic_name || '',
    street: consultorio.street || '',
    ext_number: consultorio.ext_number || '',
    int_number: consultorio.int_number || '',
    floor: consultorio.floor || '',
    cp: consultorio.cp || '',
    estado: consultorio.estado || '',
    ciudad: consultorio.ciudad || '',
    colonia: consultorio.colonia || '',
    clinic_phone: consultorio.clinic_phone || '',
    clinic_phone_visible: !!consultorio.clinic_phone && consultorio.clinic_phone_visible === true,
  })
  const [editandoCP, setEditandoCP] = useState(!form.cp)
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(
    consultorio.clinic_lat != null && consultorio.clinic_lng != null
      ? { lat: consultorio.clinic_lat, lng: consultorio.clinic_lng }
      : null
  )
  const [geocoding, setGeocoding] = useState(false)
  // Borrador del horario de este consultorio (ver HorarioConsultorioForm).
  // Sin tocar el editor se conserva lo que ya traía el consultorio (o null).
  const [horarioConsultorio, setHorarioConsultorio] = useState<ConsultorioAdicional['horario']>(consultorio.horario ?? null)
  const [horarioValido, setHorarioValido] = useState(true)

  useEffect(() => {
    if (cpData) {
      setForm(f => ({
        ...f,
        estado: cpData.estado,
        ciudad: cpData.municipio,
        colonia: cpData.colonias.length === 1 ? cpData.colonias[0].nombre : '',
      }))
      if (cpData.lat && cpData.lng) setPinCoords({ lat: cpData.lat, lng: cpData.lng })
    }
  }, [cpData])

  const geocodeAddress = async () => {
    const { street, ext_number, colonia, cp, ciudad } = form
    if (!street || !colonia || !cp) return
    setGeocoding(true)
    try {
      const q = `${street} ${ext_number}, ${colonia}, ${cp}, ${ciudad || 'México'}, México`
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=mx`,
        { headers: { 'User-Agent': 'Salurama/1.0 (salurama.com)' } }
      )
      const data = await res.json()
      if (data[0]) setPinCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) })
    } catch { /* silently ignore — user can drag pin */ }
    finally { setGeocoding(false) }
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => setPinCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }

  // El consultorio tal como quedaría con lo que hay hoy en el formulario.
  const construirActual = (): ConsultorioAdicional => {
    const isHospital = form.clinic_type === 'hospital'
    return {
      ...consultorio,
      horario: horarioConsultorio,
      clinic_type: form.clinic_type,
      clinic_name: form.clinic_name,
      street: form.street,
      ext_number: form.ext_number,
      int_number: form.int_number,
      floor: isHospital ? form.floor : '',
      cp: form.cp,
      estado: form.estado,
      ciudad: form.ciudad,
      colonia: form.colonia,
      clinic_phone: form.clinic_phone,
      clinic_phone_visible: form.clinic_phone.trim() !== '' && form.clinic_phone_visible,
      clinic_lat: pinCoords?.lat ?? consultorio.clinic_lat ?? null,
      clinic_lng: pinCoords?.lng ?? consultorio.clinic_lng ?? null,
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!horarioValido) {
      alert('Corrige el horario marcado en rojo antes de guardar')
      return
    }
    onSave?.(construirActual())
  }

  // Para el "Guardar cambios" global y la detección de cambios de
  // UbicacionTabs: se vuelve a registrar en cada render (siempre apunta al
  // estado vigente) y se da de baja al desmontarse.
  useEffect(() => {
    registrarControl?.({
      construir: () => {
        if (!horarioValido) return { error: 'Corrige el horario marcado en rojo antes de guardar' }
        if (!form.clinic_name.trim()) return { error: 'Ponle nombre al consultorio antes de guardar' }
        return { consultorio: construirActual() }
      },
      hayCambios: () => firmaConsultorio(construirActual()) !== firmaConsultorio(consultorio),
    })
    return () => registrarControl?.(null)
  })

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ControlPrincipal esPrincipal={!!esPrincipal} onMarcar={onMarcarPrincipal} />

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Tipo de lugar</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {['consultorio', 'hospital'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({...form, clinic_type: t })}
              style={{ padding: '10px', border: `2px solid ${form.clinic_type===t?'#1E3A5F':'#E5E7EB'}`, borderRadius: 8, background: form.clinic_type===t?'#EEF2FF':'#fff', fontSize: 13, fontWeight: 600, color: form.clinic_type===t?'#1E3A5F':'#6B7280', cursor: 'pointer' }}
            >
              {t==='consultorio'?'Consultorio independiente':'Hospital/Clínica'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>
          Nombre del {form.clinic_type==='hospital'?'hospital/clínica':'consultorio'}
        </label>
        <input
          type="text"
          value={form.clinic_name}
          onChange={e => setForm({...form, clinic_name: e.target.value})}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }}
          placeholder={form.clinic_type==='hospital'?'Hospital Ángeles':'Consultorio Dr. Pérez'}
          required
        />
      </div>

      <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Ubicación</p>
          {!editandoCP && <button type="button" onClick={() => setEditandoCP(true)} style={{ fontSize: 11, color: '#1E3A5F', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{form.cp?'Cambiar CP':'Agregar CP'}</button>}
        </div>
        {editandoCP ? (
          <div>
            <input type="text" value={form.cp} onChange={e => { const cp=e.target.value.replace(/\D/g,'').slice(0,5); setForm({...form, cp}); if(cp.length===5) search(cp) }} maxLength={5} placeholder="Código postal" style={{ width: '100px', padding: '6px 8px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, marginBottom: 6 }} autoFocus />
            {loadingCP && <span style={{ fontSize: 11, marginLeft: 8 }}>Buscando...</span>}
            {!loadingCP && cpError && <span style={{ fontSize: 11, marginLeft: 8, color: '#DC2626' }}>{cpError}</span>}
            {cpData && form.estado && <p style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{form.ciudad}, {form.estado}</p>}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#111827' }}><strong>CP:</strong> {form.cp || 'No definido'}</p>
            <p style={{ fontSize: 13, color: '#374151' }}>{form.colonia}{form.colonia&&', '}{form.ciudad}{form.ciudad&&', '}{form.estado}</p>
          </div>
        )}
      </div>

      {editandoCP && cpData && cpData.colonias.length > 0 && (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Colonia</label>
          <select value={form.colonia} onChange={e => setForm({...form, colonia: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14, background: '#fff' }} >
            <option value="">Selecciona colonia</option>
            {cpData.colonias.map((c: any) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: form.clinic_type==='hospital'?'2fr 1fr 1fr 1fr':'2fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Calle</label>
          <input type="text" value={form.street} onChange={e => setForm({...form, street: e.target.value})} onBlur={geocodeAddress} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="Av. Reforma" />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>No. Ext</label>
          <input type="text" value={form.ext_number} onChange={e => setForm({...form, ext_number: e.target.value})} onBlur={geocodeAddress} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="222" />
        </div>
        {form.clinic_type==='hospital' && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Piso</label>
            <input type="text" value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="3" />
          </div>
        )}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>{form.clinic_type==='hospital'?'Consultorio':'No. Int'}</label>
          <input type="text" value={form.int_number} onChange={e => setForm({...form, int_number: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="305" />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Teléfono de este consultorio</label>
        <input type="tel" value={form.clinic_phone} onChange={e => setForm({...form, clinic_phone: e.target.value, clinic_phone_visible: e.target.value.trim() === '' ? false : form.clinic_phone_visible})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="55 1234 5678" />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 8, color: form.clinic_phone.trim() === '' ? '#9CA3AF' : '#374151', cursor: form.clinic_phone.trim() === '' ? 'not-allowed' : 'pointer' }}>
          <input
            type="checkbox"
            checked={form.clinic_phone_visible}
            disabled={form.clinic_phone.trim() === ''}
            onChange={e => setForm({...form, clinic_phone_visible: e.target.checked})}
            style={{ accentColor: '#1E3A5F' }}
          />
          Mostrar en perfil público
        </label>
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1E3A5F', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
      >
        📍 Usar mi ubicación
      </button>

      {pinCoords && (
        <div style={{ marginTop: 4 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
            {geocoding ? '🔍 Buscando dirección…' : 'Arrastra el pin a la ubicación exacta de este consultorio'}
          </p>
          <LocationPicker
            initialLat={pinCoords.lat}
            initialLng={pinCoords.lng}
            onLocationChange={(lat, lng) => setPinCoords({ lat, lng })}
          />
        </div>
      )}

      <HorarioConsultorioForm
        titulo="Horario de este consultorio"
        horarioInicial={consultorio.horario}
        duracionInicial={null}
        sinDuracion
        onGuardar={(horario, _duracion, valido) => { setHorarioConsultorio(horario); setHorarioValido(valido) }}
      />

      {/* Un consultorio que ya existe se guarda con el "Guardar cambios"
          global de UbicacionTabs; solo el nuevo (onCancel = flujo de
          creación) tiene su propio botón de confirmación. Eliminar no se
          ofrece si es el principal. */}
      {(onCancel || (onEliminar && !esPrincipal)) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {onCancel && <button type="submit" disabled={saving} style={{...btnPrimary, flex: 1, opacity: saving?0.6:1}}><Save size={15}/> {saving?'Guardando...':'Guardar consultorio'}</button>}
          {onCancel && <button type="button" onClick={onCancel} disabled={saving} style={{ padding: '10px 14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>}
          {onEliminar && !esPrincipal && <button type="button" onClick={onEliminar} disabled={saving} aria-label="Eliminar este consultorio" style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Trash2 size={14} /> Eliminar</button>}
        </div>
      )}
    </form>
  )
}

// Modal de ubicación del consultorio principal: edita dirección, teléfono
// y horario. Los adicionales se gestionan desde ConsultorioCard.
//
// Salir: X / clic fuera / Escape llaman a controlRef.current.intentarCerrar().
// Si hay cambios sin guardar se pide confirmación; si no, se cierra directo.
// Franjas de atención de un día. Si tiene hora de comida válida (dentro del
// horario y bien ordenada) el día se parte en dos franjas, porque durante la
// comida el médico no está en ese consultorio y puede estar en otro. Un día
// inactivo no tiene franjas.
function franjasDelDia(dia: HorarioDia): { inicio: string; fin: string }[] {
  if (!dia.activo) return []
  const { inicio, fin, descanso_inicio: di, descanso_fin: df } = dia
  if (di && df && inicio < di && di < df && df < fin) return [{ inicio, fin: di }, { inicio: df, fin }]
  return [{ inicio, fin }]
}

// Primer par de consultorios (en el orden recibido) cuyos horarios se
// cruzan, o null si no hay cruces: para cada par y cada día activo en ambos,
// dos franjas se cruzan si inicio1 < fin2 && inicio2 < fin1 -- las horas son
// "HH:MM" de ancho fijo, así que comparar como texto equivale a compararlas
// como minutos.
function detectarSolapamiento(entradas: { nombre: string; horario: Horario }[]): { a: string; b: string } | null {
  for (let i = 0; i < entradas.length; i++) {
    for (let j = i + 1; j < entradas.length; j++) {
      const a = entradas[i]
      const b = entradas[j]
      for (const { key } of DIAS) {
        for (const x of franjasDelDia(a.horario[key])) {
          for (const y of franjasDelDia(b.horario[key])) {
            if (x.inicio < y.fin && y.inicio < x.fin) return { a: a.nombre, b: b.nombre }
          }
        }
      }
    }
  }
  return null
}

function UbicacionTabs({ medico, onSave, saving, horarioBorradorRef, onCerrar, controlRef }: any) {
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const locationControlRef = useRef<{ construirCambios: () => { cambios: Record<string, any> }; hayCambios: () => boolean } | null>(null)

  const hayCambiosPendientes = (): boolean => {
    if (locationControlRef.current?.hayCambios()) return true
    if (horarioPrincipalCambio(medico, horarioBorradorRef.current)) return true
    return false
  }

  const guardarTodo = async (): Promise<boolean> => {
    const cambios: Record<string, any> = {}

    const loc = locationControlRef.current
    if (loc?.hayCambios()) Object.assign(cambios, loc.construirCambios().cambios)

    const borradorHorario = horarioBorradorRef.current
    if (horarioPrincipalCambio(medico, borradorHorario)) {
      if (!borradorHorario.valido) {
        alert('Corrige el horario marcado en rojo antes de guardar')
        return false
      }
      cambios.horario = borradorHorario.horario
      cambios.duracion_cita_minutos = borradorHorario.duracion
    }

    if (Object.keys(cambios).length === 0) return true

    const ok = await onSave(cambios)
    return ok !== false
  }

  const intentarCerrar = () => {
    if (hayCambiosPendientes()) setConfirmarSalida(true)
    else onCerrar()
  }
  if (controlRef) controlRef.current = { intentarCerrar }
  useEffect(() => () => { if (controlRef) controlRef.current = null }, [controlRef])

  return (
    <div>
      <LocationForm
        medico={medico}
        controlRef={locationControlRef}
        esPrincipal={true}
        onMarcarPrincipal={() => {}}
      />
      <HorarioConsultorioForm
        titulo="Horario de este consultorio"
        horarioInicial={medico.horario}
        duracionInicial={medico.duracion_cita_minutos}
        onGuardar={(horario: any, duracion: any, valido: any) => { horarioBorradorRef.current = { horario, duracion, valido } }}
      />
      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={async () => { if (await guardarTodo()) onCerrar() }}
          disabled={saving}
          style={{ ...btnPrimary, width: '100%', opacity: saving ? 0.6 : 1 }}
        >
          <Save size={15} /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {confirmarSalida && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmarSalida(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div role="alertdialog" aria-modal="true" aria-labelledby="titulo-salir-ubicacion" style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
            <h3 id="titulo-salir-ubicacion" style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Tienes cambios sin guardar</h3>
            <button
              type="button"
              onClick={() => setConfirmarSalida(false)}
              style={{ width: '100%', minHeight: 44, padding: '10px 16px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={() => { setConfirmarSalida(false); onCerrar() }}
              style={{ background: 'none', border: 'none', padding: '8px 12px', minHeight: 40, color: '#DC2626', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function IntroForm({ aboutMe, onSave, saving }: { aboutMe: string | null; onSave: (d: Partial<Medico>) => void; saving: boolean }) {
  const [text, setText] = useState(aboutMe || '')
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSave({ about_me: text }) }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151', textTransform: 'uppercase' }}>Sobre mí</label>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>Mínimo 100 caracteres.</p>
        {text.length < 100 && (
          <p style={{ fontSize: 12, color: '#4B5563', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 8, padding: '8px 10px', marginBottom: 8, lineHeight: 1.5 }}>
            Tu biografía ayuda a que buscadores como Google muestren tu perfil como contenido único, no genérico. Hoy la mayoría de los perfiles no la tienen.
          </p>
        )}
        <textarea value={text} onChange={e => setText(e.target.value)} rows={7} style={{...inputStyle, resize: 'vertical' }} placeholder="Soy médico con X años..." />
        <p style={{ fontSize: 11, color: text.length < 100? '#D97706' : '#2A9D8F', marginTop: 4, fontWeight: 500 }}>{text.length} caracteres {text.length < 100? `(faltan ${100 - text.length})` : '✓'}</p>
      </div>
      <button type="submit" disabled={saving} style={{...btnPrimary, opacity: saving? 0.6 : 1 }}><Save size={15} /> {saving? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}

function SpecialtiesForm({ specialties, specialty, councilMap, onAdd, onDelete, saving }: any) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ specialty_name: '', license_number: '', is_current: false, issue_year: '' })
  const [notCurrent, setNotCurrent] = useState(false)
  const councilInfo = form.specialty_name ? councilMap[form.specialty_name] : undefined
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({ ...form, issue_year: form.issue_year ? parseInt(form.issue_year) : null }, notCurrent)
    setShowForm(false)
    setForm({ specialty_name: '', license_number: '', is_current: false, issue_year: '' })
    setNotCurrent(false)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '10px 14px', background: '#E8F7F5', borderRadius: 8, border: '1px solid #9FD8CD' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#1D6F65', textTransform: 'uppercase', marginBottom: 4 }}>Principal</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{specialty}</p>
        {councilMap[specialty]?.councilName && <p style={{ fontSize: 12, color: '#6B7280' }}>{councilMap[specialty].councilName}</p>}
      </div>
      {specialties.map((spec: any) => <div key={spec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}><div><p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{spec.specialty_name}</p><p style={{ fontSize: 13, color: '#6B7280' }}>Cédula: {spec.license_number}{spec.council && ` · ${spec.council}`}</p></div><button onClick={() => onDelete(spec)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button></div>)}
      {showForm ? (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <input type="text" value={form.specialty_name} onChange={e => setForm(p => ({ ...p, specialty_name: e.target.value }))} style={inputStyle} list="esp-list" required placeholder="Especialidad" />
          <datalist id="esp-list">{Object.keys(councilMap).sort().map(name => <option key={name} value={name} />)}</datalist>
          {form.specialty_name && (
            councilInfo?.councilName
              ? <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Consejo: {councilInfo.councilName}</p>
              : councilInfo
                ? <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Sin consejo certificador reconocido: no participará en el sistema de credenciales.</p>
                : null
          )}
          <input type="text" value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} style={inputStyle} required placeholder="Cédula" />
          {councilInfo?.councilName && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={notCurrent} onChange={e => setNotCurrent(e.target.checked)} />
              <span style={{ fontSize: 12, color: '#4B5563' }}>Mi certificación no está vigente</span>
            </label>
          )}
          <div style={{ display: 'flex', gap: 8 }}><button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>Agregar</button><button type="button" onClick={() => setShowForm(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button></div>
        </form>
      ) : <button onClick={() => setShowForm(true)} style={btnGhost}><Plus size={15} /> Agregar especialidad</button>}
    </div>
  )
}

function ConditionsForm({ conditions, onAdd, onDelete, saving }: any) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ condition_name: '', category: 'principal' })
  const submit = (e: React.FormEvent) => { e.preventDefault(); onAdd(form); setShowForm(false); setForm({ condition_name: '', category: 'principal' }) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#6B7280' }}>Ayuda a pacientes a encontrarte.</p>
      {conditions.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{conditions.map((c: any) => <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 20, fontSize: 13, color: '#374151' }}>{c.condition_name}<button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 0 }}><X size={12} /></button></span>)}</div>}
      {showForm? <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}><input type="text" value={form.condition_name} onChange={e => setForm(p => ({...p, condition_name: e.target.value }))} style={inputStyle} required placeholder="Ej: Diabetes" /><div style={{ display: 'flex', gap: 8 }}><button type="submit" disabled={saving} style={{...btnPrimary, flex: 1, opacity: saving? 0.6 : 1 }}>Agregar</button><button type="button" onClick={() => setShowForm(false)} style={{...btnSecondary, flex: 1 }}>Cancelar</button></div></form> : <button onClick={() => setShowForm(true)} style={btnGhost}><Plus size={15} /> Agregar</button>}
    </div>
  )
}

function EducationForm({ education, onAdd, onDelete, saving }: any) {
  const currentYear = new Date().getFullYear()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ institution: '', degree: 'Licenciatura', field_of_study: '', graduation_year: currentYear.toString() })
  const submit = (e: React.FormEvent) => { e.preventDefault(); onAdd({...form, graduation_year: form.graduation_year? parseInt(form.graduation_year) : null }); setShowForm(false); setForm({ institution: '', degree: 'Licenciatura', field_of_study: '', graduation_year: currentYear.toString() }) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {education.map((edu: any) => <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}><div><p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{edu.institution}</p><p style={{ fontSize: 13, color: '#6B7280' }}>{edu.degree}{edu.field_of_study? ` · ${edu.field_of_study}` : ''}{edu.graduation_year? ` · ${edu.graduation_year}` : ''}</p></div><button onClick={() => onDelete(edu.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button></div>)}
      {showForm? <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}><input type="text" value={form.institution} onChange={e => setForm(p => ({...p, institution: e.target.value }))} style={inputStyle} required list="uni-list" placeholder="Institución" /><datalist id="uni-list">{UNIVERSIDADES_MEXICO.map((u, i) => <option key={i} value={u} />)}</datalist><select value={form.degree} onChange={e => setForm(p => ({...p, degree: e.target.value }))} style={inputStyle}><option>Licenciatura</option><option>Especialidad</option><option>Maestría</option><option>Doctorado</option></select><input type="text" value={form.field_of_study} onChange={e => setForm(p => ({...p, field_of_study: e.target.value }))} style={inputStyle} placeholder="Área" /><input type="number" value={form.graduation_year} onChange={e => setForm(p => ({...p, graduation_year: e.target.value }))} style={inputStyle} min="1950" max={currentYear} /><div style={{ display: 'flex', gap: 8 }}><button type="submit" disabled={saving} style={{...btnPrimary, flex: 1, opacity: saving? 0.6 : 1 }}>Agregar</button><button type="button" onClick={() => setShowForm(false)} style={{...btnSecondary, flex: 1 }}>Cancelar</button></div></form> : <button onClick={() => setShowForm(true)} style={btnGhost}><Plus size={15} /> Agregar formación</button>}
    </div>
  )
}

function ExperienceForm({ experience, onAdd, onDelete, saving }: any) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ institution_name: '', position: '', location: '', start_date: '', end_date: '', is_current: false })
  const submit = (e: React.FormEvent) => { e.preventDefault(); onAdd(form); setShowForm(false); setForm({ institution_name: '', position: '', location: '', start_date: '', end_date: '', is_current: false }) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {experience.map((exp: any) => <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}><div><p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{exp.institution_name}</p><p style={{ fontSize: 13, color: '#6B7280' }}>{exp.position}{exp.location? ` · ${exp.location}` : ''}{exp.is_current? ' · Actual' : ''}</p></div><button onClick={() => onDelete(exp.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button></div>)}
      {showForm? <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}><input type="text" value={form.institution_name} onChange={e => setForm(p => ({...p, institution_name: e.target.value }))} style={inputStyle} required placeholder="Hospital" /><input type="text" value={form.position} onChange={e => setForm(p => ({...p, position: e.target.value }))} style={inputStyle} placeholder="Puesto" /><input type="text" value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value }))} style={inputStyle} placeholder="Ubicación" /><label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}><input type="checkbox" checked={form.is_current} onChange={e => setForm(p => ({...p, is_current: e.target.checked }))} style={{ accentColor: '#1E3A5F' }} /> Trabajo actual</label><div style={{ display: 'flex', gap: 8 }}><button type="submit" disabled={saving} style={{...btnPrimary, flex: 1, opacity: saving? 0.6 : 1 }}>Agregar</button><button type="button" onClick={() => setShowForm(false)} style={{...btnSecondary, flex: 1 }}>Cancelar</button></div></form> : <button onClick={() => setShowForm(true)} style={btnGhost}><Plus size={15} /> Agregar experiencia</button>}
    </div>
  )
}

function LanguagesForm({ languages, onSave, saving }: any) {
  const [selected, setSelected] = useState<string[]>(Array.isArray(languages)? languages : [])
  const [showIndigenous, setShowIndigenous] = useState(() => Array.isArray(languages)? languages.some((l: string) => LENGUAS_INDIGENAS.includes(l)) : false)
  const toggle = (lang: string) => setSelected(prev => prev.includes(lang)? prev.filter(l => l!== lang) : [...prev, lang])
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSave({ languages: showIndigenous? selected : selected.filter(l =>!LENGUAS_INDIGENAS.includes(l)) }) }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', color: '#374151' }}>Idiomas</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{IDIOMAS_FRECUENTES.map(lang => <label key={lang} className={`chip ${selected.includes(lang)? 'selected' : ''}`}><input type="checkbox" checked={selected.includes(lang)} onChange={() => toggle(lang)} style={{ display: 'none' }} />{lang}</label>)}</div></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', color: '#374151' }}><input type="checkbox" checked={showIndigenous} onChange={e => setShowIndigenous(e.target.checked)} style={{ accentColor: '#1E3A5F' }} /> Hablo lengua indígena</label>
      {showIndigenous && <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', color: '#374151' }}>Lengua indígena</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{LENGUAS_INDIGENAS.map(lang => <label key={lang} className={`chip ${selected.includes(lang)? 'selected' : ''}`}><input type="checkbox" checked={selected.includes(lang)} onChange={() => toggle(lang)} style={{ display: 'none' }} />{lang}</label>)}</div></div>}
      <button type="submit" disabled={saving} style={{...btnPrimary, opacity: saving? 0.6 : 1 }}><Save size={15} /> {saving? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}

function BookingForm({ medico, onSave, saving }: any) {
  // El precio único no tiene columna propia -- es solo un modo de captura
  // que, al guardar, escribe el mismo valor en consultation_price_first_time
  // y consultation_price_general. Si ambos ya venían iguales desde la base
  // de datos, el formulario arranca en modo "precio único" para reflejar
  // ese estado; si no, arranca en modo "precios separados".
  const preciosYaIguales = medico.consultation_price_first_time != null
    && medico.consultation_price_general != null
    && medico.consultation_price_first_time === medico.consultation_price_general

  const [form, setForm] = useState({
    consultation_price_first_time: preciosYaIguales? '' : (medico.consultation_price_first_time?.toString() || ''),
    consultation_price_general: preciosYaIguales? '' : (medico.consultation_price_general?.toString() || ''),
    precio_unico: preciosYaIguales? medico.consultation_price_first_time.toString() : '',
    mismo_precio: preciosYaIguales,
    accepts_insurance: medico.accepts_insurance || false,
    insurance_names: Array.isArray(medico.insurance_names)? medico.insurance_names : [],
    payment_methods: Array.isArray(medico.payment_methods)? medico.payment_methods : [],
    factura_disponible: medico.factura_disponible || false,
    whatsapp_available: medico.whatsapp_available || false,
    whatsapp_phone: medico.whatsapp_phone || '',
  })
  const toggleInsurance = (seg: string) => setForm(prev => ({...prev, insurance_names: prev.insurance_names.includes(seg)? prev.insurance_names.filter((s: string) => s !== seg) : [...prev.insurance_names, seg] }))
  const togglePaymentMethod = (metodo: string) => setForm(prev => ({...prev, payment_methods: prev.payment_methods.includes(metodo)? prev.payment_methods.filter((m: string) => m !== metodo) : [...prev.payment_methods, metodo] }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const precioPrimera = form.precio_unico !== ''? form.precio_unico : form.consultation_price_first_time
    const precioGeneral = form.precio_unico !== ''? form.precio_unico : form.consultation_price_general
    onSave({
      consultation_price_first_time: precioPrimera? Number(precioPrimera) : null,
      consultation_price_general: precioGeneral? Number(precioGeneral) : null,
      accepts_insurance: form.accepts_insurance,
      insurance_names: form.insurance_names,
      payment_methods: form.payment_methods,
      factura_disponible: form.factura_disponible,
      whatsapp_available: form.whatsapp_available,
      whatsapp_phone: form.whatsapp_phone || null,
    })
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={15} /> Precios (MXN)</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#374151', marginBottom: 10 }}>
          <input type="checkbox" checked={form.mismo_precio} onChange={e => setForm(p => ({...p, mismo_precio: e.target.checked }))} style={{ accentColor: '#1E3A5F' }} />
          Mismo precio para ambas consultas
        </label>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Precio único</label>
          <input type="number" value={form.precio_unico} onChange={e => setForm(p => ({...p, precio_unico: e.target.value }))} disabled={!form.mismo_precio} style={{...inputStyle, opacity: !form.mismo_precio? 0.5 : 1 }} placeholder="1200" min="0" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Primera vez</label><input type="number" value={form.consultation_price_first_time} onChange={e => setForm(p => ({...p, consultation_price_first_time: e.target.value }))} disabled={form.mismo_precio} style={{...inputStyle, opacity: form.mismo_precio? 0.5 : 1 }} placeholder="1500" min="0" /></div>
          <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Subsecuente</label><input type="number" value={form.consultation_price_general} onChange={e => setForm(p => ({...p, consultation_price_general: e.target.value }))} disabled={form.mismo_precio} style={{...inputStyle, opacity: form.mismo_precio? 0.5 : 1 }} placeholder="1000" min="0" /></div>
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>💡 Mostrar precios aumenta reservas 28%</p>
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={15} /> Formas de pago</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{FORMAS_DE_PAGO.map(metodo => <label key={metodo} className={`chip ${form.payment_methods.includes(metodo)? 'selected' : ''}`}><input type="checkbox" checked={form.payment_methods.includes(metodo)} onChange={() => togglePaymentMethod(metodo)} style={{ display: 'none' }} />{metodo}</label>)}</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 10, color: '#374151' }}><input type="checkbox" checked={form.factura_disponible} onChange={e => setForm(p => ({...p, factura_disponible: e.target.checked }))} style={{ accentColor: '#1E3A5F' }} /> Ofrezco factura</label>
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={15} /> Seguros</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 10, color: '#374151' }}><input type="checkbox" checked={form.accepts_insurance} onChange={e => setForm(p => ({...p, accepts_insurance: e.target.checked }))} style={{ accentColor: '#1E3A5F' }} /> Acepto seguros</label>
        {form.accepts_insurance && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ASEGURADORAS.map(seg => <label key={seg} className={`chip ${form.insurance_names.includes(seg)? 'selected' : ''}`}><input type="checkbox" checked={form.insurance_names.includes(seg)} onChange={() => toggleInsurance(seg)} style={{ display: 'none' }} />{seg}</label>)}</div>}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={15} /> Contacto</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}><input type="checkbox" checked={form.whatsapp_available} onChange={e => setForm(p => ({...p, whatsapp_available: e.target.checked }))} style={{ accentColor: '#2A9D8F' }} /><MessageCircle size={15} color="#2A9D8F" /> WhatsApp</label>
          {form.whatsapp_available && <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Número WhatsApp</label><input type="tel" value={form.whatsapp_phone} onChange={e => setForm(p => ({...p, whatsapp_phone: e.target.value }))} style={inputStyle} placeholder="55 1234 5678" /></div>}
          {form.whatsapp_available && (
            <p style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 10px', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, fontSize: 12, color: '#92400E', margin: 0 }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              Recomendamos no compartir tu número personal. Al activar esta opción será visible públicamente en tu perfil.
            </p>
          )}
        </div>
      </div>
      <button type="submit" disabled={saving} style={{...btnPrimary, opacity: saving? 0.6 : 1 }}><Save size={15} /> {saving? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}