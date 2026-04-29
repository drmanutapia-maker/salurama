'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  X, Edit2, Save, Plus, Trash2, ExternalLink, Phone, MessageCircle,
  DollarSign, Shield, Camera, Eye, CheckCircle
} from 'lucide-react'

// ─────────────────────────────────────────────
// CATÁLOGOS (SIN DUPLICADOS)
// ─────────────────────────────────────────────
const UNIVERSIDADES_MEXICO = [
  'Universidad Nacional Autónoma de México (UNAM)',
  'Instituto Politécnico Nacional (IPN)',
  'Universidad de Guadalajara (UdeG)',
  'Universidad Autónoma de Nuevo León (UANL)',
  'Universidad Iberoamericana',
  'Instituto Tecnológico de Monterrey (Tec de Monterrey)',
  'Universidad Autónoma Metropolitana (UAM)',
  'Benemérita Universidad Autónoma de Puebla (BUAP)',
  'Universidad Veracruzana',
  'Universidad Autónoma de Yucatán (UADY)',
  'Universidad Anáhuac',
  'Universidad La Salle',
  'Universidad del Valle de México (UVM)',
  'Universidad Panamericana',
  'Universidad Autónoma de San Luis Potosí',
  'Universidad Michoacana de San Nicolás de Hidalgo',
  'Universidad Autónoma de Querétaro',
  'Universidad Autónoma de Chihuahua',
  'Universidad de Sonora',
  'Universidad Autónoma de Baja California',
  'Universidad Autónoma de Sinaloa',
  'Universidad Autónoma del Estado de México',
  'Facultad de Medicina UNAM',
  'Hospital Infantil de México Federico Gómez',
  'Instituto Nacional de Cardiología',
  'Instituto Nacional de Cancerología',
  'Hospital General de México',
  'Hospital Juárez de México',
]

const ESPECIALIDADES_MEDICAS = [
  'Medicina Interna', 'Cardiología', 'Hematología', 'Pediatría',
  'Ginecología y Obstetricia', 'Cirugía General', 'Anestesiología',
  'Dermatología', 'Endocrinología', 'Gastroenterología', 'Neumología',
  'Nefrología', 'Oncología', 'Ortopedia y Traumatología', 'Psiquiatría',
  'Radiología', 'Urología', 'Neurología', 'Oftalmología',
  'Otorrinolaringología', 'Medicina Familiar', 'Medicina General',
  'Reumatología', 'Infectología', 'Alergología e Inmunología',
  'Angiología y Cirugía Vascular', 'Cirugía Cardiovascular',
  'Cirugía Plástica y Reconstructiva', 'Coloproctología',
  'Medicina Crítica y Cuidados Intensivos', 'Medicina de Emergencia',
  'Medicina Física y Rehabilitación', 'Neonatología', 'Neurocirugía',
  'Neurología Pediátrica', 'Patología', 'Traumatología Pediátrica',
]

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
  'GNP Seguros', 'AXA Seguros', 'MetLife', 'Zurich', 'Inbursa',
  'Banorte Seguros', 'Qualitas', 'Allianz', 'Chubb', 'MAPFRE',
  'IMSS', 'ISSSTE', 'IMSS Bienestar', 'Seguro Popular', 'Particular (sin seguro)',
]

const MODAL_TITLES: Record<string, string> = {
  basic: 'Información básica',
  intro: 'Biografía / Introducción',
  specialties: 'Especialidades con cédulas',
  conditions: 'Enfermedades tratadas',
  experience: 'Experiencia profesional',
  education: 'Formación académica',
  languages: 'Idiomas',
  booking: 'Información para reservar',
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  photo_url: string | null
  phone: string
  location_city: string
  about_me: string | null
  consultation_price_general: number | null
  consultation_price_followup: number | null
  consultation_price_first_time: number | null
  accepts_insurance: boolean
  insurance_names: string[]
  whatsapp_available: boolean
  whatsapp_phone: string | null
  clinic_phone: string | null
  clinic_name: string | null
  clinic_address: string | null
  is_active: boolean
  professional_license: string | null
  specialty_council: string | null
  years_experience: number | null
  languages: string[]
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

// ─────────────────────────────────────────────
// HELPERS UI
// ─────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1.5px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none',
  transition: 'border-color 0.15s',
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

const btnGhost: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: '#EEF2FF',
  color: '#1E3A5F',
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
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
  const [showPreview, setShowPreview] = useState(false)
  const [profileCompletion, setProfileCompletion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // ─── CALCULAR COMPLETITUD ───────────────────
  useEffect(() => {
    if (!medico) return
    const checks = [
      !!medico.photo_url,
      !!medico.specialty,
      !!medico.professional_license,
      !!medico.location_city,
      !!(medico.about_me && medico.about_me.length > 100),
      !!(Array.isArray(medico.languages) && medico.languages.length >= 2),
      experience.length > 0,
      education.length > 0,
      specialties.length > 0,
      !!(medico.consultation_price_first_time),
    ]
    setProfileCompletion(Math.round((checks.filter(Boolean).length / checks.length) * 100))
  }, [medico, specialties, education, experience])

  // ─── CARGAR DATOS ──────────────────────────
  // ✅ CORRECCIÓN LÍNEA 248: Agregar data: antes del segundo {
  const loadData = useCallback(async () => {
    console.log('🔄 [LOAD DATA] Iniciando carga de perfil...')
    setLoading(true)
    try {
      // Paso 1: Obtener usuario autenticado
      console.log('🔑 [LOAD DATA] Obteniendo usuario de Auth...')
      // ✅ LÍNEA 248 CORREGIDA: data: antes del segundo {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('❌ [LOAD DATA] Error de autenticación:', authError)
        alert('Error de autenticación: ' + authError.message)
        router.push('/login')
        return
      }
      if (!user) {
        console.error('❌ [LOAD DATA] No hay usuario autenticado')
        router.push('/login')
        return
      }
      console.log('✅ [LOAD DATA] Usuario autenticado:', user.email)

      // Paso 2: Buscar perfil en tabla doctors
      console.log('🔍 [LOAD DATA] Buscando perfil en tabla doctors...')
      // ✅ LÍNEA 258 CORREGIDA: data: antes de medicoData
      const { data: medicoData, error: medicoError } = await supabase
        .from('doctors')
        .select('*')
        .eq('email', user.email)
        .single()

      console.log('📋 [LOAD DATA] Resultado:', {
        tieneData: !!medicoData,
        error: medicoError,
        errorCode: medicoError?.code
      })

      // Si no existe el perfil (PGRST116 = no rows)
      if (medicoError?.code === 'PGRST116') {
        console.error('❌ [LOAD DATA] No se encontró perfil para:', user.email)
        alert('No se encontró un perfil con este email: ' + user.email + '\n\nPor favor contacta a soporte.')
        router.push('/dashboard')
        setLoading(false)
        return
      }

      // Si hay otro error
      if (medicoError) {
        console.error('❌ [LOAD DATA] Error consultando perfil:', medicoError)
        alert('Error al cargar el perfil: ' + medicoError.message)
        router.push('/dashboard')
        setLoading(false)
        return
      }

      // Perfil encontrado - cargar datos
      console.log('✅ [LOAD DATA] Perfil encontrado:', medicoData.id)
      setMedico(medicoData)

      // Paso 3: Cargar tablas relacionadas
      const doctorId = medicoData.id
      console.log('🔍 [LOAD DATA] Cargando tablas relacionadas para doctor:', doctorId)
      const [specRes, eduRes, expRes, condRes] = await Promise.all([
        supabase.from('doctor_specialties').select('*').eq('doctor_id', doctorId),
        supabase.from('doctor_education').select('*').eq('doctor_id', doctorId).order('graduation_year', { ascending: false }),
        supabase.from('doctor_experience').select('*').eq('doctor_id', doctorId).order('is_current', { ascending: false }),
        supabase.from('doctor_conditions').select('*').eq('doctor_id', doctorId).order('category'),
      ])

      if (specRes.error) console.warn('⚠️ [LOAD DATA] Especialidades:', specRes.error.message)
      if (eduRes.error) console.warn('⚠️ [LOAD DATA] Educación:', eduRes.error.message)
      if (expRes.error) console.warn('⚠️ [LOAD DATA] Experiencia:', expRes.error.message)
      if (condRes.error) console.warn('⚠️ [LOAD DATA] Condiciones:', condRes.error.message)

      setSpecialties(specRes.data ?? [])
      setEducation(eduRes.data ?? [])
      setExperience(expRes.data ?? [])
      setConditions(condRes.data ?? [])

      console.log('✅ [LOAD DATA] Perfil cargado exitosamente')
      console.log('📊 [LOAD DATA] Resumen:', {
        specialties: specRes.data?.length ?? 0,
        education: eduRes.data?.length ?? 0,
        experience: expRes.data?.length ?? 0,
        conditions: condRes.data?.length ?? 0
      })
    } catch (err) {
      console.error('❌ [LOAD DATA] Error inesperado:', err)
      alert('Error inesperado: ' + (err instanceof Error ? err.message : 'Desconocido'))
    } finally {
      console.log('⏹️ [LOAD DATA] Seteando loading = false')
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    console.log('🔄 [USE EFFECT] Llamando a loadData...')
    loadData()
  }, [loadData])

  // ─── SUBIR FOTO ─────────────────────────────
  // ✅ CORRECCIÓN LÍNEA 365: Cambiar urlData por data
  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !medico) return
    if (!file.type.startsWith('image/')) { alert('Selecciona una imagen válida'); return }
    if (file.size > 5 * 1024 * 1024) { alert('La imagen debe pesar menos de 5 MB'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${medico.id}/profile.${ext}`

      if (medico.photo_url) {
        const oldPath = medico.photo_url.split('/doctor-photos/')[1]?.split('?')[0]
        if (oldPath) {
          const { error: removeError } = await supabase.storage
            .from('doctor-photos')
            .remove([oldPath])
          if (removeError) console.warn('Error eliminando foto anterior:', removeError)
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('doctor-photos')
        .upload(path, file, { upsert: true, cacheControl: '0' })

      if (uploadError) {
        console.error('Error de upload:', uploadError)
        throw uploadError
      }

      // ✅ LÍNEA 365 CORREGIDA: data en lugar de urlData
      const { data } = supabase.storage
        .from('doctor-photos')
        .getPublicUrl(path)

      const photoUrl = `${data.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('doctors')
        .update({ photo_url: photoUrl })
        .eq('id', medico.id)

      if (updateError) {
        console.error('Error actualizando doctors:', updateError)
        throw updateError
      }

      setMedico(prev => prev ? { ...prev, photo_url: photoUrl } : null)
    } catch (err) {
      console.error('Error subiendo foto:', err)
      alert('Error al subir la foto: ' + (err instanceof Error ? err.message : 'Verifica las políticas RLS del bucket doctor-photos'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── GUARDAR INFO BÁSICA ────────────────────
  const handleSaveBasicInfo = async (data: Partial<Medico>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctors').update(data).eq('id', medico.id)
      if (error) {
        console.error('Error de update:', error)
        throw error
      }
      await loadData()
      setActiveModal(null)
    } catch (err) {
      console.error('Error guardando:', err)
      alert('Error al guardar: ' + (err instanceof Error ? err.message : 'Verifica las políticas RLS de la tabla doctors'))
    } finally {
      setSaving(false)
    }
  }

  // ─── ESPECIALIDADES ─────────────────────────
  const handleAddSpecialty = async (data: Omit<SpecialtyWithLicense, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_specialties').insert({ ...data, doctor_id: medico.id })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error al agregar especialidad: ' + (err instanceof Error ? err.message : ''))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSpecialty = async (id: string) => {
    if (!confirm('¿Eliminar esta especialidad?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_specialties').delete().eq('id', id)
      if (error) throw error
      await loadData()
    } catch (err) {
      alert('Error al eliminar especialidad')
    } finally {
      setSaving(false)
    }
  }

  // ─── EDUCACIÓN ──────────────────────────────
  const handleAddEducation = async (data: Omit<Education, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_education').insert({
        ...data,
        doctor_id: medico.id,
        graduation_year: data.graduation_year || null,
      })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error al agregar educación: ' + (err instanceof Error ? err.message : ''))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteEducation = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_education').delete().eq('id', id)
      await loadData()
    } catch (err) {
      alert('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  // ─── EXPERIENCIA ────────────────────────────
  const handleAddExperience = async (data: Omit<Experience, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_experience').insert({
        ...data,
        doctor_id: medico.id,
        start_date: data.start_date || null,
        end_date: data.is_current ? null : (data.end_date || null),
      })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error al agregar experiencia: ' + (err instanceof Error ? err.message : ''))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExperience = async (id: string) => {
    if (!confirm('¿Eliminar esta experiencia?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_experience').delete().eq('id', id)
      await loadData()
    } catch (err) {
      alert('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  // ─── CONDICIONES ────────────────────────────
  const handleAddCondition = async (data: Omit<Condition, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_conditions').insert({ ...data, doctor_id: medico.id })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (err) {
      alert('Error al agregar enfermedad')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCondition = async (id: string) => {
    if (!confirm('¿Eliminar este padecimiento?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_conditions').delete().eq('id', id)
      await loadData()
    } catch (err) {
      alert('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  // ─── LOADING ────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9CA3AF', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Cargando perfil...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!medico) return null

  // ─── RENDER PRINCIPAL ───────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.35s ease-out both; }
        .foto-wr { position: relative; }
        .foto-ov {
          position: absolute; inset: 0; border-radius: 50%;
          background: rgba(30,58,95,0.78); display: flex;
          align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s; cursor: pointer;
        }
        .foto-wr:hover .foto-ov { opacity: 1; }
        .step-btn { transition: background 0.2s, color 0.2s; }
        .card-edit { transition: box-shadow 0.15s; }
        .card-edit:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); }
        .chip {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; padding: 6px 12px;
          border-radius: 20px; cursor: pointer;
          border: 1.5px solid #E5E7EB;
          transition: background 0.1s, border-color 0.1s;
          font-family: 'DM Sans', sans-serif;
          user-select: none;
        }
        .chip.selected { background: #EEF2FF; border-color: #1E3A5F; }
        .chip:hover { background: #F3F4F6; }
        .chip.selected:hover { background: #E0E7FF; }
        input:focus, select:focus, textarea:focus {
          border-color: #1E3A5F !important; outline: none;
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto', padding: '100px 16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Volver 
          </button>
          <button
            onClick={() => setShowPreview(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1E3A5F', fontFamily: "'DM Sans', sans-serif" }}
          >
            <Eye size={14} /> Vista previa
          </button>
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 900, color: '#1A1A2E', marginBottom: 6 }}>
          Editar perfil
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
          Un perfil completo recibe hasta <strong style={{ color: '#1E3A5F' }}>11× más contactos</strong> de pacientes.
        </p>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E3A5F' }}>
              Haz completado: {profileCompletion}%
            </span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>Paso {activeStep} de 3</span>
          </div>
          <div style={{ height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${profileCompletion}%`,
              background: profileCompletion >= 80
                ? 'linear-gradient(90deg,#059669,#2A9D8F)'
                : profileCompletion >= 50
                  ? 'linear-gradient(90deg,#F59E0B,#EF8C0E)'
                  : 'linear-gradient(90deg,#1E3A5F,#2563EB)',
              transition: 'width 0.4s ease',
              borderRadius: 4,
            }} />
          </div>
        </div>
      </div>

      {/* ── STEPS NAV ── */}
      <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto 20px', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 8, background: '#fff', borderRadius: 12, padding: 8, border: '1px solid #E5E7EB' }}>
          {[
            { num: 1, title: '1. Identidad', sub: 'Foto · Especialidad · Bio' },
            { num: 2, title: '2. Formación', sub: 'Educación · Idiomas · Enfermedades' },
            { num: 3, title: '3. Reservar', sub: 'Experiencia · Contacto · Precios' },
          ].map(s => (
            <button
              key={s.num}
              className="step-btn"
              onClick={() => setActiveStep(s.num)}
              style={{
                flex: 1, padding: '12px 14px', border: 'none', borderRadius: 8,
                cursor: 'pointer', textAlign: 'left',
                background: activeStep === s.num ? '#1E3A5F' : 'transparent',
                color: activeStep === s.num ? '#fff' : '#6B7280',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700 }}>{s.title}</p>
              <p style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{s.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── CARDS ── */}
      <div className="fade-up" style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 80px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* STEP 1 */}
        {activeStep === 1 && (
          <>
            <Card title="1. Información básica" onEdit={() => setActiveModal('basic')}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="foto-wr">
                  {medico.photo_url ? (
                    <img
                      src={medico.photo_url}
                      alt={medico.full_name}
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#1E3A5F,#2A9D8F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: "'Fraunces', serif" }}>
                      {(medico.full_name?.charAt(0) || '?').toUpperCase()}
                    </div>
                  )}
                  <div className="foto-ov" onClick={() => fileInputRef.current?.click()}>
                    {uploading
                      ? <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <Camera size={22} color="#fff" />
                    }
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{medico.full_name}</p>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>{medico.specialty}</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>{medico.email}</p>
                  <p style={{ fontSize: 13, color: '#9CA3AF' }}>{medico.phone || 'Sin teléfono'}</p>
                </div>
                {!medico.photo_url && (
                  <button onClick={() => fileInputRef.current?.click()} style={{ ...btnGhost, flexShrink: 0 }}>
                    <Camera size={14} /> Subir foto
                  </button>
                )}
              </div>
            </Card>

            <Card title="2. Especialidades y cédulas" onEdit={() => setActiveModal('specialties')}>
              <div style={{ padding: '10px 12px', background: '#F0FFF4', borderRadius: 8, border: '1px solid #A7F3D0', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <CheckCircle size={14} color="#059669" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 0.5 }}>Especialidad principal</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{medico.specialty}</p>
                {medico.professional_license && (
                  <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Cédula: <strong>{medico.professional_license}</strong></p>
                )}
                {medico.specialty_council && (
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>Consejo: {medico.specialty_council}</p>
                )}
              </div>
              {specialties.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {specialties.map(spec => (
                    <div key={spec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{spec.specialty_name}</p>
                        <p style={{ fontSize: 13, color: '#6B7280' }}>Cédula: {spec.license_number}</p>
                        {spec.council && <p style={{ fontSize: 12, color: '#9CA3AF' }}>{spec.council}</p>}
                        {spec.is_current && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#059669', background: '#F0FFF4', padding: '3px 8px', borderRadius: 4, marginTop: 4 }}>
                            <CheckCircle size={11} /> Vigente
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteSpecialty(spec.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Sin especialidades adicionales registradas.</p>
              )}
            </Card>

            <Card title="3. Biografía / Introducción" onEdit={() => setActiveModal('intro')}>
              {medico.about_me ? (
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
                  {medico.about_me.length > 200 ? medico.about_me.substring(0, 200) + '...' : medico.about_me}
                </p>
              ) : (
                <p style={{ fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' }}>
                  Sin biografía. Agregar una bio aumenta la confianza del paciente.
                </p>
              )}
            </Card>
          </>
        )}

        {/* STEP 2 */}
        {activeStep === 2 && (
          <>
            <Card title="4. Formación académica" onEdit={() => setActiveModal('education')}>
              {education.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {education.map(edu => (
                    <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600 }}>{edu.institution}</p>
                        <p style={{ fontSize: 13, color: '#6B7280' }}>
                          {edu.degree}{edu.field_of_study ? ` · ${edu.field_of_study}` : ''}{edu.graduation_year ? ` · ${edu.graduation_year}` : ''}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteEducation(edu.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin formación académica registrada.</p>
              )}
            </Card>

            <Card title="5. Idiomas de atención" onEdit={() => setActiveModal('languages')}>
              {Array.isArray(medico.languages) && medico.languages.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {medico.languages.map((lang, i) => (
                    <span key={i} style={{ padding: '4px 12px', background: '#EEF2FF', borderRadius: 20, fontSize: 13, color: '#1E3A5F', fontWeight: 500 }}>
                      {lang}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin idiomas registrados. Hablar 2+ idiomas duplica las citas.</p>
              )}
            </Card>

            <Card title="6. Enfermedades que trata" onEdit={() => setActiveModal('conditions')}>
              {conditions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {conditions.map(c => (
                    <span key={c.id} style={{ padding: '4px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 20, fontSize: 13, color: '#374151' }}>
                      {c.condition_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin padecimientos registrados. Ayuda a los pacientes a encontrarte.</p>
              )}
            </Card>
          </>
        )}

        {/* STEP 3 */}
        {activeStep === 3 && (
          <>
            <Card title="7. Experiencia profesional" onEdit={() => setActiveModal('experience')}>
              {experience.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {experience.map(exp => (
                    <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600 }}>{exp.institution_name}</p>
                        <p style={{ fontSize: 13, color: '#6B7280' }}>
                          {exp.position}{exp.location ? ` · ${exp.location}` : ''}{exp.is_current ? ' · Actual' : ''}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteExperience(exp.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin experiencia registrada.</p>
              )}
            </Card>

            <Card title="8. Información para contacto y reserva" onEdit={() => setActiveModal('booking')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {medico.consultation_price_first_time ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={15} color="#1E3A5F" />
                    <span style={{ fontSize: 14 }}>Primera vez: <strong style={{ color: '#1E3A5F' }}>${medico.consultation_price_first_time} MXN</strong></span>
                  </div>
                ) : null}
                {medico.consultation_price_general ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={15} color="#1E3A5F" />
                    <span style={{ fontSize: 14 }}>Subsecuente: <strong style={{ color: '#1E3A5F' }}>${medico.consultation_price_general} MXN</strong></span>
                  </div>
                ) : null}
                {medico.whatsapp_available && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageCircle size={15} color="#25D366" />
                    <span style={{ fontSize: 14 }}>WhatsApp disponible {medico.whatsapp_phone ? `· ${medico.whatsapp_phone}` : ''}</span>
                  </div>
                )}
                {medico.clinic_phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={15} color="#1E3A5F" />
                    <span style={{ fontSize: 14 }}>Consultorio: {medico.clinic_phone}</span>
                  </div>
                )}
                {medico.accepts_insurance && Array.isArray(medico.insurance_names) && medico.insurance_names.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Shield size={15} color="#1E3A5F" style={{ marginTop: 2 }} />
                    <span style={{ fontSize: 14 }}>Seguros: {medico.insurance_names.join(', ')}</span>
                  </div>
                )}
                {!medico.consultation_price_first_time && !medico.whatsapp_available && !medico.clinic_phone && (
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' }}>Sin información de contacto o precios.</p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ── MODALES ── */}
      {activeModal && (
        <Modal onClose={() => setActiveModal(null)} title={MODAL_TITLES[activeModal] ?? 'Editar'}>
          {activeModal === 'basic' && <BasicInfoForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'intro' && <IntroForm aboutMe={medico.about_me} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'specialties' && <SpecialtiesForm specialties={specialties} specialty={medico.specialty} council={medico.specialty_council} onAdd={handleAddSpecialty} onDelete={handleDeleteSpecialty} saving={saving} />}
          {activeModal === 'conditions' && <ConditionsForm conditions={conditions} onAdd={handleAddCondition} onDelete={handleDeleteCondition} saving={saving} />}
          {activeModal === 'experience' && <ExperienceForm experience={experience} onAdd={handleAddExperience} onDelete={handleDeleteExperience} saving={saving} />}
          {activeModal === 'education' && <EducationForm education={education} onAdd={handleAddEducation} onDelete={handleDeleteEducation} saving={saving} />}
          {activeModal === 'languages' && <LanguagesForm languages={medico.languages ?? []} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'booking' && <BookingForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
        </Modal>
      )}

      {/* ── MODAL PREVIEW ── */}
      {showPreview && (
        <Modal onClose={() => setShowPreview(false)} title="Vista previa del perfil público">
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', margin: '0 auto 16px',
              background: medico.photo_url ? `url(${medico.photo_url}) center/cover` : 'linear-gradient(135deg,#1E3A5F,#2A9D8F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: 900, color: '#fff', fontFamily: "'Fraunces', serif",
            }}>
              {!medico.photo_url && (medico.full_name?.charAt(0) || '?').toUpperCase()}
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F', marginBottom: 6 }}>
              {medico.full_name}
            </h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              {medico.specialty} · {medico.location_city}
            </p>
            <button
              onClick={() => { setShowPreview(false); window.open(`/doctor/${medico.id}`, '_blank') }}
              style={{ ...btnPrimary, borderRadius: 12 }}
            >
              <ExternalLink size={15} /> Abrir perfil público
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE CARD
// ─────────────────────────────────────────────
function Card({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div className="card-edit" style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1.5px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{title}</h3>
        <button
          onClick={onEdit}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1A1A2E', fontFamily: "'DM Sans', sans-serif" }}
        >
          <Edit2 size={13} /> Editar
        </button>
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE MODAL
// ─────────────────────────────────────────────
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", color: '#1A1A2E' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// FORMULARIOS
// ─────────────────────────────────────────────
function BasicInfoForm({ medico, onSave, saving }: { medico: Medico; onSave: (d: Partial<Medico>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    full_name: medico.full_name,
    phone: medico.phone || '',
    location_city: medico.location_city || '',
    years_experience: medico.years_experience?.toString() || '',
    clinic_name: medico.clinic_name || '',
    clinic_address: medico.clinic_address || '',
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...form,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
    })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[
        { label: 'Nombre completo *', key: 'full_name', type: 'text', placeholder: 'Dr. Juan Pérez', required: true },
        { label: 'Teléfono', key: 'phone', type: 'tel', placeholder: '55 1234 5678' },
        { label: 'Ciudad / Estado', key: 'location_city', type: 'text', placeholder: 'Ciudad de México' },
        { label: 'Años de experiencia', key: 'years_experience', type: 'number', placeholder: '10' },
        { label: 'Nombre del consultorio', key: 'clinic_name', type: 'text', placeholder: 'Consultorio Dr. Pérez' },
        { label: 'Dirección del consultorio', key: 'clinic_address', type: 'text', placeholder: 'Av. Insurgentes Sur 123, Col. Roma' },
      ].map(f => (
        <div key={f.key}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 }}>{f.label}</label>
          <input
            type={f.type}
            value={(form as any)[f.key]}
            onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
            style={inputStyle}
            placeholder={f.placeholder}
            required={f.required}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
          <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
        </button>
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
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 }}>Sobre mí</label>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
          Cuéntale a tus pacientes sobre tu enfoque, valores y experiencia. Mínimo 100 caracteres.
        </p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={7}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Soy hematólogo con X años de experiencia, especializado en..."
        />
        <p style={{ fontSize: 11, color: text.length < 100 ? '#F59E0B' : '#059669', marginTop: 4, fontWeight: 500 }}>
          {text.length} caracteres {text.length < 100 ? `(faltan ${100 - text.length} para el mínimo recomendado)` : '✓'}
        </p>
      </div>
      <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
        <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  )
}

function SpecialtiesForm({ specialties, specialty, council, onAdd, onDelete, saving }: {
  specialties: SpecialtyWithLicense[]
  specialty: string
  council: string | null
  onAdd: (d: Omit<SpecialtyWithLicense, 'id'>) => void
  onDelete: (id: string) => void
  saving: boolean
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ specialty_name: '', license_number: '', council: '', is_current: false, issue_year: '' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({ ...form, issue_year: form.issue_year ? parseInt(form.issue_year) : null })
    setShowForm(false)
    setForm({ specialty_name: '', license_number: '', council: '', is_current: false, issue_year: '' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ padding: '10px 14px', background: '#F0FFF4', borderRadius: 8, border: '1px solid #A7F3D0' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: 4 }}>Especialidad principal</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{specialty}</p>
        {council && <p style={{ fontSize: 12, color: '#6B7280' }}>{council}</p>}
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Para cambiar la especialidad principal ve a soporte.</p>
      </div>

      {specialties.map(spec => (
        <div key={spec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{spec.specialty_name}</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Cédula: {spec.license_number}</p>
            {spec.council && <p style={{ fontSize: 12, color: '#9CA3AF' }}>{spec.council}</p>}
            {spec.is_current && <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Vigente</span>}
          </div>
          <button onClick={() => onDelete(spec.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Especialidad *</label>
            <input type="text" value={form.specialty_name} onChange={e => setForm(p => ({ ...p, specialty_name: e.target.value }))} style={inputStyle} list="esp-list" required placeholder="Ej: Hematología" />
            <datalist id="esp-list">{ESPECIALIDADES_MEDICAS.map((e, i) => <option key={i} value={e} />)}</datalist>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Número de cédula *</label>
            <input type="text" value={form.license_number} onChange={e => setForm(p => ({ ...p, license_number: e.target.value }))} style={inputStyle} required placeholder="12345678" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Consejo de especialidad</label>
            <input type="text" value={form.council} onChange={e => setForm(p => ({ ...p, council: e.target.value }))} style={inputStyle} placeholder="Consejo Mexicano de Hematología" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: '#374151' }}>Año de expedición (opcional)</label>
            <input type="number" value={form.issue_year} onChange={e => setForm(p => ({ ...p, issue_year: e.target.value }))} style={inputStyle} min="1950" max={new Date().getFullYear()} placeholder="2015" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_current} onChange={e => setForm(p => ({ ...p, is_current: e.target.checked }))} style={{ accentColor: '#1E3A5F' }} />
            Vigente en el consejo
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Guardando...' : 'Agregar especialidad'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} style={btnGhost}>
          <Plus size={15} /> Agregar especialidad adicional
        </button>
      )}
    </div>
  )
}

function ConditionsForm({ conditions, onAdd, onDelete, saving }: { conditions: Condition[]; onAdd: (d: Omit<Condition, 'id'>) => void; onDelete: (id: string) => void; saving: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ condition_name: '', category: 'principal' })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(form)
    setShowForm(false)
    setForm({ condition_name: '', category: 'principal' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: '#6B7280' }}>Los padecimientos ayudan a los pacientes a encontrarte por síntoma o diagnóstico.</p>
      {conditions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {conditions.map(c => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 20, fontSize: 13 }}>
              {c.condition_name}
              <button onClick={() => onDelete(c.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {showForm ? (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Enfermedad o padecimiento *</label>
            <input type="text" value={form.condition_name} onChange={e => setForm(p => ({ ...p, condition_name: e.target.value }))} style={inputStyle} required placeholder="Ej: Leucemia, Anemia, Trombosis..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Tipo</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
              <option value="principal">Principal</option>
              <option value="otra">Otra enfermedad tratada</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>Agregar</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} style={btnGhost}>
          <Plus size={15} /> Agregar padecimiento
        </button>
      )}
    </div>
  )
}

function EducationForm({ education, onAdd, onDelete, saving }: { education: Education[]; onAdd: (d: Omit<Education, 'id'>) => void; onDelete: (id: string) => void; saving: boolean }) {
  const currentYear = new Date().getFullYear()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    institution: '',
    degree: 'Licenciatura',
    field_of_study: '',
    graduation_year: currentYear.toString()
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      ...form,
      graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null
    })
    setShowForm(false)
    setForm({ institution: '', degree: 'Licenciatura', field_of_study: '', graduation_year: currentYear.toString() })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {education.map(edu => (
        <div key={edu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{edu.institution}</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              {edu.degree}{edu.field_of_study ? ` · ${edu.field_of_study}` : ''}{edu.graduation_year ? ` · ${edu.graduation_year}` : ''}
            </p>
          </div>
          <button onClick={() => onDelete(edu.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {showForm ? (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Institución *</label>
            <input type="text" value={form.institution} onChange={e => setForm(p => ({ ...p, institution: e.target.value }))} style={inputStyle} required list="uni-list" placeholder="UNAM, IPN, UdeG..." />
            <datalist id="uni-list">{UNIVERSIDADES_MEXICO.map((u, i) => <option key={i} value={u} />)}</datalist>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Grado *</label>
            <select value={form.degree} onChange={e => setForm(p => ({ ...p, degree: e.target.value }))} style={inputStyle}>
              <option>Licenciatura</option>
              <option>Especialidad</option>
              <option>Maestría</option>
              <option>Doctorado</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Área de estudio</label>
            <input type="text" value={form.field_of_study} onChange={e => setForm(p => ({ ...p, field_of_study: e.target.value }))} style={inputStyle} placeholder="Medicina, Hematología, etc." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Año de graduación</label>
            <input
              type="number"
              value={form.graduation_year}
              onChange={e => setForm(p => ({ ...p, graduation_year: e.target.value }))}
              style={inputStyle}
              min="1950"
              max={currentYear}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>Agregar</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} style={btnGhost}>
          <Plus size={15} /> Agregar formación
        </button>
      )}
    </div>
  )
}

function ExperienceForm({ experience, onAdd, onDelete, saving }: { experience: Experience[]; onAdd: (d: Omit<Experience, 'id'>) => void; onDelete: (id: string) => void; saving: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ institution_name: '', position: '', location: '', start_date: '', end_date: '', is_current: false })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(form)
    setShowForm(false)
    setForm({ institution_name: '', position: '', location: '', start_date: '', end_date: '', is_current: false })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {experience.map(exp => (
        <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{exp.institution_name}</p>
            <p style={{ fontSize: 13, color: '#6B7280' }}>{exp.position}{exp.location ? ` · ${exp.location}` : ''}</p>
            {exp.is_current && <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>✓ Trabajo actual</span>}
          </div>
          <button onClick={() => onDelete(exp.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: 4 }}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {showForm ? (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, background: '#F9FAFB', borderRadius: 10, border: '1px solid #E5E7EB' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Institución / Hospital *</label>
            <input type="text" value={form.institution_name} onChange={e => setForm(p => ({ ...p, institution_name: e.target.value }))} style={inputStyle} required placeholder="Hospital General, IMSS, Clínica Ángeles..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Puesto</label>
            <input type="text" value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} style={inputStyle} placeholder="Médico adscrito, Jefe de servicio..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Ubicación</label>
            <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} style={inputStyle} placeholder="Ciudad de México" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Inicio</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Fin</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} style={inputStyle} disabled={form.is_current} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_current} onChange={e => setForm(p => ({ ...p, is_current: e.target.checked }))} style={{ accentColor: '#1E3A5F' }} />
            Trabajo actual
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>Agregar</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} style={btnGhost}>
          <Plus size={15} /> Agregar experiencia
        </button>
      )}
    </div>
  )
}

function LanguagesForm({ languages, onSave, saving }: { languages: string[]; onSave: (d: Partial<Medico>) => void; saving: boolean }) {
  const [selected, setSelected] = useState<string[]>(Array.isArray(languages) ? languages : [])
  const [showIndigenous, setShowIndigenous] = useState(() => {
    const langs = Array.isArray(languages) ? languages : []
    return langs.some(l => LENGUAS_INDIGENAS.includes(l))
  })

  const toggle = (lang: string) => {
    setSelected(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalLanguages = showIndigenous
      ? selected
      : selected.filter(l => !LENGUAS_INDIGENAS.includes(l))
    onSave({ languages: finalLanguages })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Idiomas</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {IDIOMAS_FRECUENTES.map(lang => (
            <label
              key={lang}
              className={`chip ${selected.includes(lang) ? 'selected' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={selected.includes(lang)}
                onChange={() => toggle(lang)}
                style={{ display: 'none' }}
              />
              {lang}
            </label>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={showIndigenous}
          onChange={e => setShowIndigenous(e.target.checked)}
          style={{ accentColor: '#1E3A5F' }}
        />
        Hablo una lengua indígena mexicana
      </label>

      {showIndigenous && (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Lengua indígena</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LENGUAS_INDIGENAS.map(lang => (
              <label
                key={lang}
                className={`chip ${selected.includes(lang) ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(lang)}
                  onChange={() => toggle(lang)}
                  style={{ display: 'none' }}
                />
                {lang}
              </label>
            ))}
          </div>
        </div>
      )}

      <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
        <Save size={15} /> {saving ? 'Guardando...' : 'Guardar idiomas'}
      </button>
    </form>
  )
}

function BookingForm({ medico, onSave, saving }: { medico: Medico; onSave: (d: Partial<Medico>) => void; saving: boolean }) {
  const [form, setForm] = useState({
    consultation_price_first_time: medico.consultation_price_first_time?.toString() || '',
    consultation_price_general: medico.consultation_price_general?.toString() || '',
    consultation_price_followup: medico.consultation_price_followup?.toString() || '',
    accepts_insurance: medico.accepts_insurance || false,
    insurance_names: Array.isArray(medico.insurance_names) ? medico.insurance_names : [],
    whatsapp_available: medico.whatsapp_available || false,
    whatsapp_phone: medico.whatsapp_phone || '',
    clinic_phone: medico.clinic_phone || '',
  })

  const toggleInsurance = (seg: string) => {
    setForm(prev => ({
      ...prev,
      insurance_names: prev.insurance_names.includes(seg)
        ? prev.insurance_names.filter(s => s !== seg)
        : [...prev.insurance_names, seg],
    }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      consultation_price_first_time: form.consultation_price_first_time ? Number(form.consultation_price_first_time) : null,
      consultation_price_general: form.consultation_price_general ? Number(form.consultation_price_general) : null,
      consultation_price_followup: form.consultation_price_followup ? Number(form.consultation_price_followup) : null,
      accepts_insurance: form.accepts_insurance,
      insurance_names: form.insurance_names,
      whatsapp_available: form.whatsapp_available,
      whatsapp_phone: form.whatsapp_phone || null,
      clinic_phone: form.clinic_phone || null,
    })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Precios */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <DollarSign size={15} /> Precios de consulta (MXN)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            { label: 'Primera vez', key: 'consultation_price_first_time' },
            { label: 'Subsecuente', key: 'consultation_price_general' },
            { label: 'Seguimiento', key: 'consultation_price_followup' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>{f.label}</label>
              <input
                type="number"
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                style={inputStyle}
                placeholder="0"
                min="0"
              />
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>💡 Publicar precios aumenta las reservas hasta un 28%</p>
      </div>

      {/* Seguros */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield size={15} /> Seguros y convenios
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={form.accepts_insurance}
            onChange={e => setForm(p => ({ ...p, accepts_insurance: e.target.checked }))}
            style={{ accentColor: '#1E3A5F' }}
          />
          Acepto pacientes con seguro médico
        </label>
        {form.accepts_insurance && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ASEGURADORAS.map(seg => (
              <label
                key={seg}
                className={`chip ${form.insurance_names.includes(seg) ? 'selected' : ''}`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={form.insurance_names.includes(seg)}
                  onChange={() => toggleInsurance(seg)}
                  style={{ display: 'none' }}
                />
                {seg}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Contacto */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#1E3A5F', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Phone size={15} /> Contacto
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Teléfono del consultorio</label>
            <input
              type="tel"
              value={form.clinic_phone}
              onChange={e => setForm(p => ({ ...p, clinic_phone: e.target.value }))}
              style={inputStyle}
              placeholder="55 1234 5678"
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.whatsapp_available}
              onChange={e => setForm(p => ({ ...p, whatsapp_available: e.target.checked }))}
              style={{ accentColor: '#25D366' }}
            />
            <MessageCircle size={15} color="#25D366" /> Disponible por WhatsApp
          </label>
          {form.whatsapp_available && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6B7280', textTransform: 'uppercase' }}>Número WhatsApp</label>
              <input
                type="tel"
                value={form.whatsapp_phone}
                onChange={e => setForm(p => ({ ...p, whatsapp_phone: e.target.value }))}
                style={inputStyle}
                placeholder="55 1234 5678"
              />
            </div>
          )}
        </div>
      </div>

      <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
        <Save size={15} /> {saving ? 'Guardando...' : 'Guardar información'}
      </button>
    </form>
  )
}