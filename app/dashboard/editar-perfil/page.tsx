'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { X, Edit2, Save, Plus, Trash2, ExternalLink, Phone, MessageCircle, Clock, MapPin, DollarSign, CreditCard, Shield, Calendar, Users, Accessibility, Camera, Upload } from 'lucide-react'

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
  payment_methods: string[]
  accepts_insurance: boolean
  insurance_names: string[]
  available_days: string[]
  schedule_start: string | null
  schedule_end: string | null
  first_visit_requirements: string | null
  wheelchair_accessible: boolean
  has_elevator: boolean
  has_parking: boolean
  public_transport_nearby: boolean
  min_patient_age: number | null
  max_patient_age: number | null
  best_contact_time: string | null
  whatsapp_available: boolean
  clinic_phone: string | null
  cancellation_policy: string | null
  languages: string[]
  website_url: string | null
  clinic_name: string | null
  clinic_address: string | null
  is_active: boolean
}

interface License {
  id: string
  license_number: string
  license_type: string
  institution: string
  issue_date: string
}

interface Education {
  id: string
  institution: string
  degree: string
  field_of_study: string
  graduation_year: number
}

interface Experience {
  id: string
  institution_name: string
  position: string
  location: string
  start_date: string
  end_date: string
  is_current: boolean
}

interface SocialMedia {
  id: string
  platform: string
  url: string
  username: string
}

interface Condition {
  id: string
  condition_name: string
  category: string
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const METODOS_PAGO = ['Efectivo', 'Tarjeta de crédito', 'Tarjeta de débito', 'Transferencia', 'PayPal', 'Otro']
const SEGUROS_MEDICOS = ['GNP', 'AXA', 'Banorte', 'MetLife', 'Zurich', 'Inbursa', 'Qualitas', 'Otro']
const PLATAFORMAS_SOCIALES = ['Facebook', 'Instagram', 'LinkedIn', 'X (Twitter)', 'YouTube', 'TikTok']

export default function EditarPerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [medico, setMedico] = useState<Medico | null>(null)
  const [licenses, setLicenses] = useState<License[]>([])
  const [education, setEducation] = useState<Education[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [socialMedia, setSocialMedia] = useState<SocialMedia[]>([])
  const [conditions, setConditions] = useState<Condition[]>([])
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: medicoData, error: medicoError } = await supabase
        .from('doctors')
        .select('*')
        .eq('email', user.email)
        .single()

      if (medicoError || !medicoData) {
        console.error('Error loading medico:', medicoError)
        router.push('/dashboard')
        return
      }

      setMedico(medicoData)

      const [licensesRes, educationRes, experienceRes, socialMediaRes, conditionsRes] = await Promise.all([
        supabase.from('doctor_licenses').select('*').eq('doctor_id', medicoData.id),
        supabase.from('doctor_education').select('*').eq('doctor_id', medicoData.id).order('graduation_year', { ascending: false }),
        supabase.from('doctor_experience').select('*').eq('doctor_id', medicoData.id).order('is_current', { ascending: false }),
        supabase.from('doctor_social_media').select('*').eq('doctor_id', medicoData.id),
        supabase.from('doctor_conditions').select('*').eq('doctor_id', medicoData.id).order('category'),
      ])

      setLicenses(licensesRes.data || [])
      setEducation(educationRes.data || [])
      setExperience(experienceRes.data || [])
      setSocialMedia(socialMediaRes.data || [])
      setConditions(conditionsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBasicInfo = async (data: Partial<Medico>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctors').update(data).eq('id', medico.id)
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error al guardar: ' + (error as any).message)
    } finally {
      setSaving(false)
    }
  }

  // ✅ FUNCIÓN PARA SUBIR FOTO
  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !medico) return
    
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe pesar más de 5MB')
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const name = `${medico.id}/profile.${ext}`

      if (medico.photo_url) {
        const oldPath = medico.photo_url.split('/doctor-photos/')[1]
        if (oldPath) {
          await supabase.storage.from('doctor-photos').remove([oldPath])
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('doctor-photos')
        .upload(name, file, { upsert: true, cacheControl: '0' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('doctor-photos')
        .getPublicUrl(name)

      const urlWithTimestamp = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('doctors')
        .update({ photo_url: urlWithTimestamp })
        .eq('id', medico.id)

      if (updateError) throw updateError

      setMedico(p => p ? { ...p, photo_url: urlWithTimestamp } : null)
      
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Error:', err)
      alert('Error al subir la foto: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setUploading(false)
    }
  }

  const handleAddLicense = async (data: Omit<License, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_licenses').insert({ ...data, doctor_id: medico.id })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (error) {
      console.error('Error adding license:', error)
      alert('Error al agregar cédula: ' + (error as any).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLicense = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cédula?')) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_licenses').delete().eq('id', id)
      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('Error deleting license:', error)
      alert('Error al eliminar cédula')
    } finally {
      setSaving(false)
    }
  }

  const handleAddEducation = async (data: Omit<Education, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_education').insert({ ...data, doctor_id: medico.id })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (error) {
      console.error('Error adding education:', error)
      alert('Error al agregar educación')
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
    } catch (error) {
      alert('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  const handleAddExperience = async (data: Omit<Experience, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_experience').insert({ ...data, doctor_id: medico.id })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (error) {
      alert('Error al agregar experiencia')
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
    } catch (error) {
      alert('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSocialMedia = async (data: Omit<SocialMedia, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_social_media').insert({ ...data, doctor_id: medico.id })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (error) {
      alert('Error al agregar red social')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSocialMedia = async (id: string) => {
    if (!confirm('¿Eliminar esta red social?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_social_media').delete().eq('id', id)
      await loadData()
    } catch (error) {
      alert('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  const handleAddCondition = async (data: Omit<Condition, 'id'>) => {
    if (!medico) return
    setSaving(true)
    try {
      const { error } = await supabase.from('doctor_conditions').insert({ ...data, doctor_id: medico.id })
      if (error) throw error
      await loadData()
      setActiveModal(null)
    } catch (error) {
      alert('Error al agregar enfermedad')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCondition = async (id: string) => {
    if (!confirm('¿Eliminar esta enfermedad?')) return
    setSaving(true)
    try {
      await supabase.from('doctor_conditions').delete().eq('id', id)
      await loadData()
    } catch (error) {
      alert('Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando perfil...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!medico) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
        .foto-ov { position: absolute; inset: 0; border-radius: 50%; background: rgba(55, 48, 163, 0.75); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
        .foto-wr:hover .foto-ov { opacity: 1; }
        input, select, textarea { font-family: 'DM Sans', sans-serif; }
      `}</style>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              color: '#3730A3',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 16
            }}
          >
            ← Volver
          </button>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#1A1A2E' }}>
            Editar perfil
          </h1>
        </div>
        {/* 10 Tarjetas */}
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 1. Información Básica - CON UPLOAD DE FOTO */}
          <Card title="Información básica" onEdit={() => setActiveModal('basic')}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              {/* ✅ FOTO CON HOVER OVERLAY */}
              <div className="foto-wr" style={{ position: 'relative' }}>
                {medico.photo_url ? (
                  <img src={medico.photo_url} alt={medico.full_name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#3730A3,#F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, color: '#fff' }}>
                    {(medico.full_name || '?')[0].toUpperCase()}
                  </div>
                )}
                
                {/* Overlay con ícono de cámara */}
                <div className="foto-ov" onClick={() => fileInputRef.current?.click()}>
                  {uploading ? (
                    <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  ) : (
                    <Camera size={24} color="#fff" />
                  )}
                </div>
                
                {/* Input file oculto */}
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFoto} 
                  style={{ display: 'none' }} 
                />
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{medico.full_name}</p>
                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>{medico.specialty}</p>
                <p style={{ fontSize: 14, color: '#6B7280' }}>{medico.email}</p>
                <p style={{ fontSize: 14, color: '#6B7280' }}>{medico.phone || 'Teléfono no registrado'}</p>
              </div>
            </div>
          </Card>
          {/* 2. Introducción */}
          <Card title="Introducción" onEdit={() => setActiveModal('intro')}>
            <p style={{ fontSize: 14, color: medico.about_me ? '#1A1A2E' : '#9CA3AF' }}>{medico.about_me || '--'}</p>
          </Card>
          {/* 3. Datos Legales */}
          <Card title="Datos legales" onEdit={() => setActiveModal('licenses')}>
            {licenses.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {licenses.map((lic) => (
                  <div key={lic.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{lic.license_number}</p>
                      <p style={{ fontSize: 12, color: '#6B7280' }}>{lic.license_type} - {lic.institution || 'Sin institución'}</p>
                    </div>
                    <button onClick={() => handleDeleteLicense(lic.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>--</p>
            )}
          </Card>
          {/* 4. Especialidades */}
          <Card title="Especialidades" onEdit={() => setActiveModal('specialties')}>
            <p style={{ fontSize: 14, color: '#1A1A2E' }}>{medico.specialty}</p>
          </Card>
          {/* 5. Enfermedades tratadas */}
          <Card title="Enfermedades tratadas" onEdit={() => setActiveModal('conditions')}>
            {conditions.length > 0 ? (
              <div>
                {conditions.filter(c => c.category === 'principal').length > 0 && (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Principales</p>
                    <ul style={{ fontSize: 14, color: '#6B7280', paddingLeft: 20, marginBottom: 12 }}>
                      {conditions.filter(c => c.category === 'principal').map((c, i) => (<li key={i}>{c.condition_name}</li>))}
                    </ul>
                  </>
                )}
                {conditions.filter(c => c.category === 'otra').length > 0 && (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Otras</p>
                    <ul style={{ fontSize: 14, color: '#6B7280', paddingLeft: 20 }}>
                      {conditions.filter(c => c.category === 'otra').map((c, i) => (<li key={i}>{c.condition_name}</li>))}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>--</p>
            )}
          </Card>
          {/* 6. Tu experiencia */}
          <Card title="Tu experiencia" onEdit={() => setActiveModal('experience')}>
            {experience.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {experience.map((exp) => (
                  <div key={exp.id}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{exp.institution_name}</p>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>{exp.position} {exp.location && `• ${exp.location}`}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>--</p>
            )}
          </Card>
          {/* 7. Educación */}
          <Card title="Educación" onEdit={() => setActiveModal('education')}>
            {education.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {education.map((edu) => (
                  <div key={edu.id}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{edu.institution}</p>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>{edu.degree} {edu.field_of_study && `• ${edu.field_of_study}`}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>--</p>
            )}
          </Card>
          {/* 8. Idiomas */}
          <Card title="Idiomas" onEdit={() => setActiveModal('languages')}>
            {Array.isArray(medico.languages) && medico.languages.length > 0 ? (
              <ul style={{ fontSize: 14, color: '#6B7280', paddingLeft: 20 }}>
                {medico.languages.map((lang, i) => (<li key={i}>{lang}</li>))}
              </ul>
            ) : (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>--</p>
            )}
          </Card>
          {/* 9. Redes sociales */}
          <Card title="Redes sociales" onEdit={() => setActiveModal('social')}>
            {socialMedia.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {socialMedia.map((sm) => (
                  <div key={sm.id}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{sm.platform}</p>
                    <a href={sm.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#3730A3', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {sm.username || sm.url} <ExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>--</p>
            )}
          </Card>
          {/* 10. Información para reservar */}
          <Card title="Información para reservar por teléfono" onEdit={() => setActiveModal('booking')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(medico.consultation_price_general || 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DollarSign size={16} color="#F4623A" />
                  <span style={{ fontSize: 14 }}>Consulta: <strong style={{ color: '#F4623A' }}>${medico.consultation_price_general} MXN</strong></span>
                </div>
              )}
              {Array.isArray(medico.payment_methods) && medico.payment_methods.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CreditCard size={16} color="#3730A3" />
                  <span style={{ fontSize: 14 }}>Pago: {medico.payment_methods.join(', ')}</span>
                </div>
              )}
              {medico.whatsapp_available && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={16} color="#25D366" />
                  <span style={{ fontSize: 14 }}>WhatsApp disponible</span>
                </div>
              )}
              {medico.clinic_phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={16} color="#3730A3" />
                  <span style={{ fontSize: 14 }}>{medico.clinic_phone}</span>
                </div>
              )}
              {(!medico.consultation_price_general && !medico.payment_methods?.length && !medico.whatsapp_available && !medico.clinic_phone) && (
                <p style={{ fontSize: 14, color: '#9CA3AF' }}>--</p>
              )}
            </div>
          </Card>
        </div>
      </div>
      {/* Modales */}
      {activeModal && (
        <Modal onClose={() => setActiveModal(null)} title={getModalTitle(activeModal)}>
          {activeModal === 'basic' && <BasicInfoForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'intro' && <IntroForm aboutMe={medico.about_me} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'licenses' && <LicensesForm licenses={licenses} onAdd={handleAddLicense} onDelete={handleDeleteLicense} saving={saving} />}
          {activeModal === 'specialties' && <SpecialtiesForm specialty={medico.specialty} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'conditions' && <ConditionsForm conditions={conditions} onAdd={handleAddCondition} onDelete={handleDeleteCondition} saving={saving} />}
          {activeModal === 'experience' && <ExperienceForm experience={experience} onAdd={handleAddExperience} onDelete={handleDeleteExperience} saving={saving} />}
          {activeModal === 'education' && <EducationForm education={education} onAdd={handleAddEducation} onDelete={handleDeleteEducation} saving={saving} />}
          {activeModal === 'languages' && <LanguagesForm languages={medico.languages || []} onSave={handleSaveBasicInfo} saving={saving} />}
          {activeModal === 'social' && <SocialMediaForm socialMedia={socialMedia} onAdd={handleAddSocialMedia} onDelete={handleDeleteSocialMedia} saving={saving} />}
          {activeModal === 'booking' && <BookingForm medico={medico} onSave={handleSaveBasicInfo} saving={saving} />}
        </Modal>
      )}
    </div>
  )
}

// ==================== COMPONENTES AUXILIARES ====================
function Card({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1.5px solid #E5E7EB' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E' }}>{title}</h3>
        <button
          onClick={onEdit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#F9FAFB',
            border: '1.5px solid #E5E7EB',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            color: '#1A1A2E'
          }}
        >
          <Edit2 size={14} /> Editar
        </button>
      </div>
      {children}
    </div>
  )
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ==================== FORMULARIOS (mismos que antes) ====================
function BasicInfoForm({ medico, onSave, saving }: { medico: Medico; onSave: (data: any) => void; saving: boolean }) {
  const [formData, setFormData] = useState({
    full_name: medico.full_name,
    phone: medico.phone || '',
    clinic_name: medico.clinic_name || '',
    clinic_address: medico.clinic_address || '',
    website_url: medico.website_url || '',
  })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nombre completo</label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          required
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Teléfono (privado)</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          placeholder="55 1234 5678"
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Clínica/Consultorio</label>
        <input
          type="text"
          value={formData.clinic_name}
          onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          placeholder="Ej: Hospital Ángeles"
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Dirección completa (pública)</label>
        <textarea
          value={formData.clinic_address}
          onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
          rows={3}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
          placeholder="Calle, número, colonia, ciudad"
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Sitio web</label>
        <input
          type="url"
          value={formData.website_url}
          onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          placeholder="https://tudominio.com"
        />
      </div>
      <div style={{ background: '#F9FAFB', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
          ℹ️ El email ({medico.email}) no es editable por seguridad. Si necesitas cambiarlo, contacta a soporte.
        </p>
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: saving ? '#9CA3AF' : '#3730A3',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer'
        }}
      >
        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function IntroForm({ aboutMe, onSave, saving }: { aboutMe: string | null; onSave: (data: any) => void; saving: boolean }) {
  const [text, setText] = useState(aboutMe || '')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ about_me: text })
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Sobre mí</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
          placeholder="Cuéntales a los pacientes sobre ti, tu experiencia y tu enfoque médico..."
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: saving ? '#9CA3AF' : '#3730A3',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer'
        }}
      >
        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function LicensesForm({ licenses, onAdd, onDelete, saving }: { licenses: License[]; onAdd: (data: any) => void; onDelete: (id: string) => void; saving: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ license_number: '', license_type: 'profesional', institution: '', issue_date: '' })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
    setShowForm(false)
    setFormData({ license_number: '', license_type: 'profesional', institution: '', issue_date: '' })
  }
  if (showForm) {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Número de cédula *</label>
          <input
            type="text"
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: 12345678"
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Tipo *</label>
          <select
            value={formData.license_type}
            onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          >
            <option value="profesional">Cédula profesional</option>
            <option value="especialidad">Cédula de especialidad</option>
            <option value="subespecialidad">Cédula de subespecialidad</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Institución</label>
          <input
            type="text"
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: UNAM"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fecha de expedición</label>
          <input
            type="date"
            value={formData.issue_date}
            onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    )
  }
  return (
    <div>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        Agrega tus cédulas para que los pacientes verifiquen tus credenciales en la SEP
      </p>
      <button
        onClick={() => setShowForm(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EEF2FF',
          color: '#3730A3',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Plus size={16} /> Agregar cédula
      </button>
    </div>
  )
}

function SpecialtiesForm({ specialty, onSave, saving }: { specialty: string; onSave: (data: any) => void; saving: boolean }) {
  const [text, setText] = useState(specialty || '')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ specialty: text })
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Especialidad principal</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          required
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: saving ? '#9CA3AF' : '#3730A3',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer'
        }}
      >
        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function ConditionsForm({ conditions, onAdd, onDelete, saving }: { conditions: Condition[]; onAdd: (data: any) => void; onDelete: (id: string) => void; saving: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ condition_name: '', category: 'principal' })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
    setShowForm(false)
    setFormData({ condition_name: '', category: 'principal' })
  }
  if (showForm) {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Enfermedad o padecimiento *</label>
          <input
            type="text"
            value={formData.condition_name}
            onChange={(e) => setFormData({ ...formData, condition_name: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: Diabetes tipo 2"
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Categoría *</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          >
            <option value="principal">Principal (las más importantes)</option>
            <option value="otra">Otra enfermedad tratada</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    )
  }
  return (
    <div>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        Agrega las enfermedades que tratas para ayudar a los pacientes a encontrarte
      </p>
      <button
        onClick={() => setShowForm(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EEF2FF',
          color: '#3730A3',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Plus size={16} /> Agregar enfermedad
      </button>
    </div>
  )
}

function ExperienceForm({ experience, onAdd, onDelete, saving }: { experience: Experience[]; onAdd: (data: any) => void; onDelete: (id: string) => void; saving: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ institution_name: '', position: '', location: '', start_date: '', end_date: '', is_current: false })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
    setShowForm(false)
    setFormData({ institution_name: '', position: '', location: '', start_date: '', end_date: '', is_current: false })
  }
  if (showForm) {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Institución/Hospital *</label>
          <input
            type="text"
            value={formData.institution_name}
            onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: Hospital Ángeles"
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Puesto</label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: Médico adscrito"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ubicación</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: Ciudad de México"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Inicio</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fin</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              disabled={formData.is_current}
            />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={formData.is_current}
            onChange={(e) => setFormData({ ...formData, is_current: e.target.checked })}
            style={{ accentColor: '#3730A3' }}
          />
          Trabajo actual
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    )
  }
  return (
    <div>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        Agrega tu experiencia en hospitales, clínicas, etc.
      </p>
      <button
        onClick={() => setShowForm(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EEF2FF',
          color: '#3730A3',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Plus size={16} /> Agregar experiencia
      </button>
    </div>
  )
}

function EducationForm({ education, onAdd, onDelete, saving }: { education: Education[]; onAdd: (data: any) => void; onDelete: (id: string) => void; saving: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ institution: '', degree: '', field_of_study: '', graduation_year: new Date().getFullYear() })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
    setShowForm(false)
    setFormData({ institution: '', degree: '', field_of_study: '', graduation_year: new Date().getFullYear() })
  }
  if (showForm) {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Institución *</label>
          <input
            type="text"
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: UNAM"
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Grado académico *</label>
          <select
            value={formData.degree}
            onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          >
            <option value="Licenciatura">Licenciatura</option>
            <option value="Especialidad">Especialidad</option>
            <option value="Maestría">Maestría</option>
            <option value="Doctorado">Doctorado</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Área de estudio</label>
          <input
            type="text"
            value={formData.field_of_study}
            onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: Hematología"
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Año de graduación</label>
          <input
            type="number"
            value={formData.graduation_year}
            onChange={(e) => setFormData({ ...formData, graduation_year: parseInt(e.target.value) })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            min="1950"
            max={new Date().getFullYear()}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    )
  }
  return (
    <div>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        Agrega tu formación académica
      </p>
      <button
        onClick={() => setShowForm(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EEF2FF',
          color: '#3730A3',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Plus size={16} /> Agregar educación
      </button>
    </div>
  )
}

function LanguagesForm({ languages, onSave, saving }: { languages: string[]; onSave: (data: any) => void; saving: boolean }) {
  const [text, setText] = useState(Array.isArray(languages) ? languages.join(', ') : '')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ languages: text.split(',').map(l => l.trim()).filter(l => l) })
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Idiomas (separados por coma)</label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          placeholder="Ej: Español, Inglés, Francés"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: saving ? '#9CA3AF' : '#3730A3',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer'
        }}
      >
        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function SocialMediaForm({ socialMedia, onAdd, onDelete, saving }: { socialMedia: SocialMedia[]; onAdd: (data: any) => void; onDelete: (id: string) => void; saving: boolean }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ platform: 'Facebook', url: '', username: '' })
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
    setShowForm(false)
    setFormData({ platform: 'Facebook', url: '', username: '' })
  }
  if (showForm) {
    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Plataforma *</label>
          <select
            value={formData.platform}
            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
          >
            {PLATAFORMAS_SOCIALES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>URL del perfil *</label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="https://..."
            required
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nombre de usuario</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
            placeholder="Ej: @doctorjuan"
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, background: '#3730A3', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Guardando...' : 'Agregar'}
          </button>
          <button type="button" onClick={() => setShowForm(false)} style={{ flex: 1, background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </form>
    )
  }
  return (
    <div>
      <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
        Agrega tus redes sociales para que los pacientes te sigan
      </p>
      <button
        onClick={() => setShowForm(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EEF2FF',
          color: '#3730A3',
          border: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        <Plus size={16} /> Agregar red social
      </button>
    </div>
  )
}

function BookingForm({ medico, onSave, saving }: { medico: Medico; onSave: (data: any) => void; saving: boolean }) {
  const [formData, setFormData] = useState({
    consultation_price_general: medico.consultation_price_general || '',
    consultation_price_followup: medico.consultation_price_followup || '',
    consultation_price_first_time: medico.consultation_price_first_time || '',
    payment_methods: medico.payment_methods || [],
    accepts_insurance: medico.accepts_insurance || false,
    insurance_names: medico.insurance_names || [],
    whatsapp_available: medico.whatsapp_available || false,
    clinic_phone: medico.clinic_phone || '',
    best_contact_time: medico.best_contact_time || '',
    min_patient_age: medico.min_patient_age || '',
    max_patient_age: medico.max_patient_age || '',
    cancellation_policy: medico.cancellation_policy || '',
  })
  const togglePaymentMethod = (method: string) => {
    setFormData(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(method)
        ? prev.payment_methods.filter(m => m !== method)
        : [...prev.payment_methods, method]
    }))
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      consultation_price_general: formData.consultation_price_general ? Number(formData.consultation_price_general) : null,
      consultation_price_followup: formData.consultation_price_followup ? Number(formData.consultation_price_followup) : null,
      consultation_price_first_time: formData.consultation_price_first_time ? Number(formData.consultation_price_first_time) : null,
      min_patient_age: formData.min_patient_age ? Number(formData.min_patient_age) : null,
      max_patient_age: formData.max_patient_age ? Number(formData.max_patient_age) : null,
    })
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Costos */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarSign size={18} /> Costos y Pagos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Consulta general ($)</label>
            <input
              type="number"
              value={formData.consultation_price_general}
              onChange={(e) => setFormData({ ...formData, consultation_price_general: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              placeholder="800"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Primera vez ($)</label>
            <input
              type="number"
              value={formData.consultation_price_first_time}
              onChange={(e) => setFormData({ ...formData, consultation_price_first_time: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              placeholder="1000"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Seguimiento ($)</label>
            <input
              type="number"
              value={formData.consultation_price_followup}
              onChange={(e) => setFormData({ ...formData, consultation_price_followup: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              placeholder="600"
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Métodos de pago</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {METODOS_PAGO.map(method => (
              <label
                key={method}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  padding: '6px 12px',
                  background: formData.payment_methods.includes(method) ? '#EEF2FF' : '#F9FAFB',
                  borderRadius: 20,
                  cursor: 'pointer',
                  border: formData.payment_methods.includes(method) ? '1px solid #3730A3' : '1px solid #E5E7EB'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.payment_methods.includes(method)}
                  onChange={() => togglePaymentMethod(method)}
                  style={{ accentColor: '#3730A3' }}
                />
                {method}
              </label>
            ))}
          </div>
        </div>
      </div>
      {/* Seguros */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={18} /> Seguros Médicos
        </h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={formData.accepts_insurance}
            onChange={(e) => setFormData({ ...formData, accepts_insurance: e.target.checked })}
            style={{ accentColor: '#3730A3' }}
          />
          Acepto seguros médicos
        </label>
        {formData.accepts_insurance && (
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>¿Cuáles seguros aceptas?</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SEGUROS_MEDICOS.map(seguro => (
                <label
                  key={seguro}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    padding: '6px 12px',
                    background: formData.insurance_names.includes(seguro) ? '#EEF2FF' : '#F9FAFB',
                    borderRadius: 20,
                    cursor: 'pointer',
                    border: formData.insurance_names.includes(seguro) ? '1px solid #3730A3' : '1px solid #E5E7EB'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.insurance_names.includes(seguro)}
                    onChange={(e) => setFormData({
                      ...formData,
                      insurance_names: e.target.checked
                        ? [...formData.insurance_names, seguro]
                        : formData.insurance_names.filter(s => s !== seguro)
                    })}
                    style={{ accentColor: '#3730A3' }}
                  />
                  {seguro}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Contacto */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Phone size={18} /> Contacto
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Teléfono del consultorio</label>
            <input
              type="tel"
              value={formData.clinic_phone}
              onChange={(e) => setFormData({ ...formData, clinic_phone: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              placeholder="55 1234 5678"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Mejor horario para llamar</label>
            <input
              type="text"
              value={formData.best_contact_time}
              onChange={(e) => setFormData({ ...formData, best_contact_time: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              placeholder="9am - 6pm"
            />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={formData.whatsapp_available}
            onChange={(e) => setFormData({ ...formData, whatsapp_available: e.target.checked })}
            style={{ accentColor: '#25D366' }}
          />
          <MessageCircle size={16} color="#25D366" /> Disponible por WhatsApp
        </label>
      </div>
      {/* Pacientes */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} /> Pacientes
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Edad mínima (años)</label>
            <input
              type="number"
              value={formData.min_patient_age}
              onChange={(e) => setFormData({ ...formData, min_patient_age: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              placeholder="0"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Edad máxima (años)</label>
            <input
              type="number"
              value={formData.max_patient_age}
              onChange={(e) => setFormData({ ...formData, max_patient_age: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14 }}
              placeholder="100"
            />
          </div>
        </div>
      </div>
      {/* Botón Guardar */}
      <button
        type="submit"
        disabled={saving}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: saving ? '#9CA3AF' : '#3730A3',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '14px 24px',
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
          marginTop: 8
        }}
      >
        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  )
}

function getModalTitle(modal: string): string {
  const titles: Record<string, string> = {
    basic: 'Información básica',
    intro: 'Introducción',
    licenses: 'Datos legales',
    specialties: 'Especialidades',
    conditions: 'Enfermedades tratadas',
    experience: 'Tu experiencia',
    education: 'Educación',
    languages: 'Idiomas',
    social: 'Redes sociales',
    booking: 'Información para reservar'
  }
  return titles[modal] || 'Editar'
}