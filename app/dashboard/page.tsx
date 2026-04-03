'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, LogOut, Edit3, CheckCircle, AlertCircle, Upload, Eye } from 'lucide-react'

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
  const [editing, setEditing] = useState(false)

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

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file || !medico) return

  // Validar tipo
  if (!file.type.startsWith('image/')) {
    alert('Por favor selecciona una imagen (JPG, PNG, etc.)')
    return
  }

  // Validar tamaño (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen no debe pesar más de 5MB')
    return
  }

  setUploading(true)
  try {
    const ext = file.name.split('.').pop()
    // Usar ID del médico como nombre de carpeta + archivo
    const fileName = `${medico.id}/profile.${ext}`
    
    // Eliminar foto anterior si existe
    if (medico.photo_url) {
      const oldPath = medico.photo_url.split('/doctor-photos/')[1]
      if (oldPath) {
        await supabase.storage
          .from('doctor-photos')
          .remove([oldPath])
      }
    }

    // Subir nueva foto
    const { error: uploadError } = await supabase.storage
      .from('doctor-photos')
      .upload(fileName, file, { 
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('doctor-photos')
      .getPublicUrl(fileName)

    // Actualizar en base de datos
    const { error: updateError } = await supabase
      .from('doctors')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', medico.id)

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    setMedico(p => p ? { ...p, photo_url: urlData.publicUrl } : null)
  } catch (err) {
    console.error('Error completo:', err)
    alert('Error al subir la foto: ' + (err instanceof Error ? err.message : 'Error desconocido'))
  } finally {
    setUploading(false)
  }
}

  if (!medico) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* HEADER */}
        <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', marginBottom: 20, border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Foto */}
            <div style={{ position: 'relative' }}>
              {medico.photo_url ? (
                <img src={medico.photo_url} alt={medico.full_name} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #EEF2FF' }} />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #3730A3, #F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 900, color: '#fff', border: '3px solid #EEF2FF' }}>
                  {(medico.full_name || '?')[0].toUpperCase()}
                </div>
              )}
              <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#3730A3', borderRadius: '50%', padding: 8, cursor: 'pointer', border: '3px solid #fff' }}>
                <Upload size={16} color="#fff" />
                <input type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} disabled={uploading} />
              </label>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 250 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 900, color: '#1A1A2E' }}>
                  {medico.full_name}
                </h1>
                {medico.review_status === 'revisado' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#059669', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>
                    <CheckCircle size={12} /> Perfil verificado
                  </span>
                )}
                {medico.review_status === 'pendiente' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FEF3C7', color: '#D97706', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>
                    <AlertCircle size={12} /> Pendiente de revisión
                  </span>
                )}
              </div>
              <p style={{ fontSize: 15, color: '#4F46E5', fontWeight: 600, marginBottom: 4 }}>{medico.specialty}</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>{medico.location_city}</p>
              <p style={{ fontSize: 13, color: '#6B7280' }}>{medico.email}</p>
            </div>

            {/* Botón Editar */}
            <button
              onClick={() => setEditing(!editing)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: editing ? '#3730A3' : '#fff', color: editing ? '#fff' : '#3730A3', border: '1.5px solid #3730A3', borderRadius: 50, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              <Edit3 size={14} />
              {editing ? 'Cancelar' : 'Editar perfil'}
            </button>
          </div>
        </div>

        {/* MENSAJE DE ESTADO */}
        {medico.review_status === 'pendiente' && (
          <div className="fade-up" style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12, padding: '16px 18px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="#92400E" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#92400E', marginBottom: 4 }}>
                Tu perfil está en revisión
              </p>
              <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                Estamos verificando tu información. Esto toma 24-48 horas. Recibirás un email cuando tu perfil esté activo y visible para los pacientes.
              </p>
            </div>
          </div>
        )}

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
              <div>
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Verificación</p>
                <p style={{ fontSize: 14, color: '#1A1A2E' }}>
                  {medico.review_status === 'revisado' ? '✓ Verificado' : medico.review_status === 'pendiente' ? '⏳ Pendiente' : '✗ Rechazado'}
                </p>
              </div>
            </div>
          </div>

          {/* Próximas Funciones (Premium) */}
          <div style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)', borderRadius: 16, padding: '20px', border: '1.5px solid #C7D2FE' }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#3730A3', marginBottom: 12 }}>
              🔒 Próxidamente: Premium
            </h2>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[
                '📊 Analytics detallados',
                '📅 Agenda avanzada (Google Calendar)',
                '💬 Recordatorios automáticos (WhatsApp/SMS)',
                '📥 Exportación de datos',
              ].map((item, i) => (
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
      </div>
    </div>
  )
}