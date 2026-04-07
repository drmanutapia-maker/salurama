'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, LogOut, CheckCircle, AlertCircle, Upload, X, ZoomIn } from 'lucide-react'

interface Medico {
  id: string
  full_name: string
  email: string
  specialty: string
  photo_url: string | null
  phone: string
  location_city: string
  is_active: boolean
  review_status: string
}

export default function DashboardMedico() {
  const router = useRouter()
  const [medico, setMedico] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleFoto = async (file: File) => {
    if (!medico) return

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
      setShowPhotoMenu(false)
      
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Error:', err)
      alert('Error al subir la foto: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFoto(file)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando dashboard...</p>
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
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .fade-in { animation: fadeIn 0.2s ease-out; }
      `}</style>
      
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* HEADER */}
        <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', marginBottom: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Foto con click para ampliar */}
            <div style={{ position: 'relative' }}>
              {medico.photo_url ? (
                <div 
                  onClick={() => setShowPhotoModal(true)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <img 
                    src={`${medico.photo_url}?t=${Date.now()}`} 
                    alt={medico.full_name} 
                    style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #EEF2FF' }} 
                  />
                  <div style={{ 
                    position: 'absolute', 
                    top: '50%', 
                    left: '50%', 
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(55, 48, 163, 0.9)',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s'
                  }}>
                    <ZoomIn size={16} color="#fff" />
                  </div>
                </div>
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #3730A3, #F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 900, color: '#fff', border: '3px solid #EEF2FF' }}>
                  {(medico.full_name || '?')[0].toUpperCase()}
                </div>
              )}
              <label 
                onClick={() => setShowPhotoMenu(true)}
                style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  background: uploading ? '#9CA3AF' : '#3730A3', 
                  borderRadius: '50%', 
                  padding: 8, 
                  cursor: uploading ? 'not-allowed' : 'pointer', 
                  border: '3px solid #fff',
                  opacity: uploading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
              >
                {uploading ? (
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <Upload size={16} color="#fff" />
                )}
              </label>
            </div>
            
            {/* Info */}
            <div style={{ flex: 1, minWidth: 250 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 900, color: '#1A1A2E' }}>
                  {medico.full_name}
                </h1>
              </div>
              <p style={{ fontSize: 15, color: '#4F46E5', fontWeight: 600, marginBottom: 4 }}>{medico.specialty}</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{medico.location_city}</p>
              <p style={{ fontSize: 13, color: '#6B7280' }}>{medico.email}</p>
            </div>
          </div>
        </div>

        {/* MENSAJE DE ESTADO */}
        <div className="fade-up" style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 12, padding: '16px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <CheckCircle size={20} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', marginBottom: 4 }}>
              ✅ Perfil activo y visible para pacientes
            </p>
            <p style={{ fontSize: 13, color: '#059669', lineHeight: 1.6 }}>
              Los pacientes pueden verificar tus credenciales directamente en el portal de la SEP. 
              Tu información es pública y verificable en cualquier momento.
            </p>
          </div>
        </div>

        {/* GRID DE SECCIONES */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Información Básica */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1A1A2E', marginBottom: 16 }}>
              Información básica
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Nombre completo</p>
                <p style={{ fontSize: 14, color: '#1A1A2E' }}>{medico.full_name}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Especialidad</p>
                <p style={{ fontSize: 14, color: '#1A1A2E' }}>{medico.specialty}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Teléfono</p>
                <p style={{ fontSize: 14, color: '#1A1A2E' }}>{medico.phone || 'No registrado'}</p>
              </div>
            </div>
            <Link href="/dashboard/perfil" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, fontSize: 13, color: '#3730A3', fontWeight: 600, textDecoration: 'none' }}>
              Editar información →
            </Link>
          </div>

          {/* Estado del Perfil */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1A1A2E', marginBottom: 16 }}>
              Estado del perfil
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Visibilidad</p>
                <p style={{ fontSize: 14, color: medico.is_active ? '#059669' : '#DC2626', fontWeight: 600 }}>
                  {medico.is_active ? '✓ Visible para pacientes' : '✗ Oculto'}
                </p>
              </div>
            </div>
          </div>

          {/* Próximas Funciones (Premium) */}
          <div style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)', borderRadius: 16, padding: '20px', border: '1.5px solid #C7D2FE' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#3730A3', marginBottom: 12 }}>
              🔒 Próximamente: Premium
            </h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {['📊 Analytics detallados','📅 Agenda avanzada (Google Calendar)','💬 Recordatorios automáticos (WhatsApp/SMS)','📥 Exportación de datos',].map((item, i) => (
                <li key={i} style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
              Pronto podrás acceder a estas funciones con Salurama Premium.
            </p>
            <button disabled style={{ width: '100%', background: '#9CA3AF', color: '#fff', border: 'none', borderRadius: 50, padding: '12px', fontSize: 13, fontWeight: 600, cursor: 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}>
              Disponible pronto
            </button>
          </div>
        </div>

        {/* Mensaje discreto de verificación */}
        <div style={{ textAlign: 'center', marginTop: 40, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>
            🔍 Los pacientes pueden verificar tus credenciales en canales oficiales (SEP, CONACEM)
          </p>
        </div>
      </div>

      {/* MODAL DE SELECCIÓN DE FOTO */}
      {showPhotoMenu && (
        <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setShowPhotoMenu(false)} />
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px', maxWidth: 500, width: '100%', position: 'relative', boxShadow: '0 -4px 24px rgba(0,0,0,0.1)' }}>
            <button onClick={() => setShowPhotoMenu(false)} style={{ position: 'absolute', top: 16, right: 16, background: '#F3F4F6', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} color="#6B7280" />
            </button>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1A1A2E', marginBottom: 20, textAlign: 'center' }}>
              Actualizar foto de perfil
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#F9FAFB', borderRadius: 12, cursor: 'pointer', border: '1.5px solid #E5E7EB' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#3730A3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={24} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>Elegir del álbum</p>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>Seleccionar de la galería</p>
                </div>
                <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} ref={fileInputRef} />
              </label>
            </div>
            <button onClick={() => setShowPhotoMenu(false)} style={{ width: '100%', background: '#F3F4F6', color: '#6B7280', border: 'none', borderRadius: 50, padding: '14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 16 }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE FOTO AMPLIADA */}
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
    </div>
  )
}