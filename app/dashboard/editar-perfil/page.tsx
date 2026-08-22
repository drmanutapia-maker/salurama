'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  X, Edit2, Save, Plus, Trash2, Phone, MessageCircle,
  DollarSign, Shield, Camera, Eye, CheckCircle, MapPin, Star
} from 'lucide-react'
import dynamic from 'next/dynamic'
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), { ssr: false })
import { useCP } from '@/hooks/useCP'
import TitleSelect from '@/components/TitleSelect'
import imageCompression from 'browser-image-compression'
import GaleriaFotos from './GaleriaFotos'

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

interface Medico {
  id: string
  slug: string
  pricing_tier: string
  full_name: string
  display_name: string | null
  professional_title: string | null
  email: string
  specialty: string
  photo_url: string | null
  phone: string
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  location_city: string
  location_state: string | null
  location_neighborhood: string | null
  ciudad: string | null
  estado: string | null
  cp: string | null
  postal_code: string | null
  location_municipality: string | null
  about_me: string | null
  consultation_price_first_time: number | null
  consultation_price_general: number | null
  accepts_insurance: boolean
  insurance_names: string[]
  whatsapp_available: boolean
  whatsapp_phone: string | null
  clinic_phone: string | null
  clinic_name: string | null
  clinic_address: string | null
  clinic_lat: number | null
  clinic_lng: number | null
  is_active: boolean
  professional_license: string | null
  years_experience: number | null
  languages: string[]
  horario: Record<string, unknown> | null
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

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError ||!user) {
        router.push('/login')
        return
      }

      const { data: medicoData, error: medicoError } = await supabase
     .from('doctors')
     .select('*')
     .eq('user_id', user.id)
     .single()

      if (medicoError?.code === 'PGRST116') {
        alert('No se encontró perfil')
        router.push('/dashboard')
        return
      }

      if (medicoError) throw medicoError

      setMedico(medicoData)

      const doctorId = medicoData.id
      const [specRes, eduRes, expRes, condRes, primaryCredRes] = await Promise.all([
        supabase.from('doctor_specialties').select('*').eq('doctor_id', doctorId),
        supabase.from('doctor_education').select('*').eq('doctor_id', doctorId).order('graduation_year', { ascending: false }),
        supabase.from('doctor_experience').select('*').eq('doctor_id', doctorId).order('is_current', { ascending: false }),
        supabase.from('doctor_conditions').select('*').eq('doctor_id', doctorId).order('category'),
        supabase.from('doctor_specialty_credentials').select('id, vigencia_hasta').eq('doctor_id', doctorId).eq('is_primary', true).maybeSingle(),
      ])

      setSpecialties(specRes.data?? [])
      setEducation(eduRes.data?? [])
      setExperience(expRes.data?? [])
      setConditions(condRes.data?? [])
      setPrimaryCredential(primaryCredRes.data ?? null)
    } catch (err) {
      console.error('Error:', err)
      alert('Error cargando perfil')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file ||!medico) return
    if (!file.type.startsWith('image/')) { alert('Selecciona una imagen válida'); return }
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
      alert('Error al subir foto')
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

  const handleSaveBasicInfo = async (data: Partial<Medico>) => {
  if (!medico) return
  setSaving(true)
  try {
    const { error } = await supabase.from('doctors').update(data).eq('id', medico.id)
    if (error) throw error
    setMedico(prev => prev? ({...prev,...data }) : null)
    await loadData()
    setActiveModal(null)
  } catch (err) {
    console.error('Error:', err)
    alert('Error al guardar')
  } finally {
    setSaving(false)
  }
}

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
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: '#111827' }}>{titlePrefix}{displayName}</p>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>{medico.specialty}</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>{medico.email}</p>
                  {(medico.facebook_url || medico.instagram_url || medico.tiktok_url) && (
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
                  Tu especialidad principal y su consejo los administra Salurama. Si necesitas cambiarla, contáctanos.
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
            <Card title="Experiencia profesional" onEdit={() => setActiveModal('experience')}>
              {experience.length > 0? experience.map(exp => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div><p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{exp.institution_name}</p><p style={{ fontSize: 13, color: '#6B7280' }}>{exp.position}{exp.location? ` · ${exp.location}` : ''}{exp.is_current? ' · Actual' : ''}</p></div>
                  <button onClick={() => handleDeleteExperience(exp.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}><Trash2 size={15} /></button>
                </div>
              )) : <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin experiencia.</p>}
            </Card>

            <Card title="Ubicación del consultorio" onEdit={() => setActiveModal('location')}>
  {medico.clinic_lat && medico.clinic_lng? (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 36, height: 36, background: '#E8F7F5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MapPin size={18} color="#2A9D8F" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            {medico.clinic_name || 'Consultorio'}
          </p>
          <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
            {medico.clinic_address}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <CheckCircle size={14} color="#2A9D8F" />
            <span style={{ fontSize: 12, color: '#2A9D8F', fontWeight: 600 }}>Ubicación verificada para "Cerca de mí"</span>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div style={{ padding: '16px', background: '#FEF3C7', borderRadius: 10, border: '1px solid #FCD34D' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, background: '#F59E0B', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MapPin size={16} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>Completa tu dirección exacta</p>
          <p style={{ fontSize: 13, color: '#78350F', lineHeight: 1.4, marginBottom: 8 }}>
            Tienes registrado: <strong>CP {medico.cp || medico.postal_code}</strong> · {medico.ciudad || medico.location_city || ''}
            <br />Falta: calle, número y colonia específica
          </p>
          <p style={{ fontSize: 12, color: '#92400E' }}>Sin esto, no apareces en búsquedas "cerca de mí"</p>
        </div>
      </div>
    </div>
  )}
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

      {activeModal && (
        <Modal onClose={() => setActiveModal(null)} title={{ basic: 'Información básica', intro: 'Biografía', specialties: 'Especialidades', conditions: 'Enfermedades', experience: 'Experiencia', education: 'Formación', languages: 'Idiomas', booking: 'Precios y contacto', location: 'Ubicación del consultorio' }[activeModal] || 'Editar'}>
          {activeModal === 'basic' && <BasicInfoForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'intro' && <IntroForm aboutMe={medico.about_me} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'specialties' && <SpecialtiesForm specialties={specialties} specialty={medico.specialty} councilMap={councilMap} onAdd={handleAddSpecialty} onDelete={handleDeleteSpecialty} saving={saving} />}
          {activeModal === 'conditions' && <ConditionsForm conditions={conditions} onAdd={handleAddCondition} onDelete={handleDeleteCondition} saving={saving} />}
          {activeModal === 'experience' && <ExperienceForm experience={experience} onAdd={handleAddExperience} onDelete={handleDeleteExperience} saving={saving} />}
          {activeModal === 'education' && <EducationForm education={education} onAdd={handleAddEducation} onDelete={handleDeleteEducation} saving={saving} />}
          {activeModal === 'languages' && <LanguagesForm languages={medico.languages?? []} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'booking' && <BookingForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'location' && <LocationForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
        </Modal>
      )}
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

function BasicInfoForm({ medico, onSave, saving }: any) {
  const [form, setForm] = useState({
    display_name: medico.display_name || medico.full_name,
    professional_title: medico.professional_title || '',
    years_experience: medico.years_experience?.toString() || '',
    facebook_url: medico.facebook_url || '',
    instagram_url: medico.instagram_url || '',
    tiktok_url: medico.tiktok_url || '',
    atiende_ninos: medico.atiende_ninos || false,
    min_patient_age: medico.min_patient_age?.toString() ?? '',
    max_patient_age: medico.max_patient_age?.toString() ?? '',
  })

  // El rango es opcional -- min > max solo se valida cuando el médico llenó
  // AMBOS cuadros (un solo cuadro lleno es válido: "de 5 años en adelante"
  // o "hasta 12 años", sin límite del otro lado).
  const rangoInvalido = form.atiende_ninos && form.min_patient_age !== '' && form.max_patient_age !== ''
    && Number(form.min_patient_age) > Number(form.max_patient_age)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rangoInvalido) return
    onSave({
      display_name: form.display_name,
      professional_title: form.professional_title,
      years_experience: form.years_experience? parseInt(form.years_experience) : null,
      facebook_url: form.facebook_url || null,
      instagram_url: form.instagram_url || null,
      tiktok_url: form.tiktok_url || null,
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
          <input type="url" value={form.facebook_url} onChange={e => setForm({...form, facebook_url: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://facebook.com/tu-perfil" />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Instagram</label>
          <input type="url" value={form.instagram_url} onChange={e => setForm({...form, instagram_url: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://instagram.com/tu-usuario" />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>TikTok</label>
          <input type="url" value={form.tiktok_url} onChange={e => setForm({...form, tiktok_url: e.target.value})} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 8, fontSize: 14 }} placeholder="https://tiktok.com/@tu-usuario" />
        </div>
      </div>

      <button type="submit" disabled={saving || rangoInvalido} style={{...btnPrimary, opacity: (saving || rangoInvalido)? 0.6 : 1, marginTop: 8 }}><Save size={15} /> {saving? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}

function LocationForm({ medico, onSave, saving }: any) {
  const { loading: loadingCP, error: cpError, cpData, search } = useCP()

  const [form, setForm] = useState({
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
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const isHospital = form.clinic_type === 'hospital'
    const currentName = isHospital? form.hospital_name : form.consultorio_name
    const currentInt = isHospital? form.hospital_int : form.consultorio_int
    const currentFloor = isHospital? form.hospital_floor : ''

    // Si el nombre está vacío, borrar ubicación
    const isClearing =!currentName

    if (isClearing) {
      await onSave({
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
      })
      return
    }

    const lat = pinCoords?.lat ?? medico.clinic_lat ?? null
    const lng = pinCoords?.lng ?? medico.clinic_lng ?? null

    const intLabel = isHospital? 'Consultorio' : 'Int.'
    const streetPart = isHospital
      ? `${form.street} ${form.ext_number}${currentFloor? `, Piso ${currentFloor}` : ''}${currentInt? `, ${intLabel} ${currentInt}` : ''}`
      : `${form.street} ${form.ext_number}${currentInt? ` ${intLabel} ${currentInt}` : ''}`
    const direccionCompleta = `${streetPart}, ${form.colonia}, ${form.cp}, ${form.ciudad}, ${form.estado}`

    await onSave({
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
    })
  }

  const currentName = form.clinic_type === 'hospital'? form.hospital_name : form.consultorio_name
  const currentInt = form.clinic_type === 'hospital'? form.hospital_int : form.consultorio_int
  const currentFloor = form.hospital_floor

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="submit" disabled={saving} style={{...btnPrimary, flex: 1, opacity: saving?0.6:1}}><Save size={15}/> {saving?'Guardando...':'Guardar ubicación'}</button>
        {editandoCP && <button type="button" onClick={() => setEditandoCP(false)} style={{ padding: '10px 14px', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>}
      </div>
    </form>
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
  const [form, setForm] = useState({
    consultation_price_first_time: medico.consultation_price_first_time?.toString() || '',
    consultation_price_general: medico.consultation_price_general?.toString() || '',
    accepts_insurance: medico.accepts_insurance || false,
    insurance_names: Array.isArray(medico.insurance_names)? medico.insurance_names : [],
    whatsapp_available: medico.whatsapp_available || false,
    whatsapp_phone: medico.whatsapp_phone || '',
    clinic_phone: medico.clinic_phone || '',
  })
  const toggleInsurance = (seg: string) => setForm(prev => ({...prev, insurance_names: prev.insurance_names.includes(seg)? prev.insurance_names.filter((s: string) => s !== seg) : [...prev.insurance_names, seg] }))
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSave({ consultation_price_first_time: form.consultation_price_first_time? Number(form.consultation_price_first_time) : null, consultation_price_general: form.consultation_price_general? Number(form.consultation_price_general) : null, accepts_insurance: form.accepts_insurance, insurance_names: form.insurance_names, whatsapp_available: form.whatsapp_available, whatsapp_phone: form.whatsapp_phone || null, clinic_phone: form.clinic_phone || null }) }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={15} /> Precios (MXN)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Primera vez *</label><input type="number" value={form.consultation_price_first_time} onChange={e => setForm(p => ({...p, consultation_price_first_time: e.target.value }))} style={inputStyle} placeholder="1500" min="0" required /></div>
          <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Subsecuente *</label><input type="number" value={form.consultation_price_general} onChange={e => setForm(p => ({...p, consultation_price_general: e.target.value }))} style={inputStyle} placeholder="1000" min="0" required /></div>
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>💡 Mostrar precios aumenta reservas 28%</p>
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={15} /> Seguros</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 10, color: '#374151' }}><input type="checkbox" checked={form.accepts_insurance} onChange={e => setForm(p => ({...p, accepts_insurance: e.target.checked }))} style={{ accentColor: '#1E3A5F' }} /> Acepto seguros</label>
        {form.accepts_insurance && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{ASEGURADORAS.map(seg => <label key={seg} className={`chip ${form.insurance_names.includes(seg)? 'selected' : ''}`}><input type="checkbox" checked={form.insurance_names.includes(seg)} onChange={() => toggleInsurance(seg)} style={{ display: 'none' }} />{seg}</label>)}</div>}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={15} /> Contacto</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Teléfono consultorio</label><input type="tel" value={form.clinic_phone} onChange={e => setForm(p => ({...p, clinic_phone: e.target.value }))} style={inputStyle} placeholder="55 1234 5678" /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: '#374151' }}><input type="checkbox" checked={form.whatsapp_available} onChange={e => setForm(p => ({...p, whatsapp_available: e.target.checked }))} style={{ accentColor: '#2A9D8F' }} /><MessageCircle size={15} color="#2A9D8F" /> WhatsApp</label>
          {form.whatsapp_available && <div><label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Número WhatsApp</label><input type="tel" value={form.whatsapp_phone} onChange={e => setForm(p => ({...p, whatsapp_phone: e.target.value }))} style={inputStyle} placeholder="55 1234 5678" /></div>}
        </div>
      </div>
      <button type="submit" disabled={saving} style={{...btnPrimary, opacity: saving? 0.6 : 1 }}><Save size={15} /> {saving? 'Guardando...' : 'Guardar'}</button>
    </form>
  )
}