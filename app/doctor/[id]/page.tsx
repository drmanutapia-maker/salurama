'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Head from 'next/head'
import { 
  MapPin, Phone, MessageCircle, Star, CheckCircle, ArrowLeft, 
  Camera, Calendar, Clock, ChevronRight, User, Award, Languages,
  Building2, GraduationCap, FileText
} from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface Medico {
  id: string
  full_name: string
  specialty: string
  location_city: string
  location_neighborhood: string
  address: string
  consultation_price: number
  phone: string
  whatsapp?: string
  license_verified: boolean
  photo_url: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  rating_avg: number
  rating_count: number
  years_experience?: number
  education?: string
  hospital_affiliation?: string
  schedule?: string
  languages?: string
  availability?: any
}

interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

interface AvailabilitySlot {
  day: string
  slots: string[]
}

export default function PerfilMedico() {
  const { id } = useParams()
  const router = useRouter()
  const [medico, setMedico] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'reviews' | 'ubicacion' | 'disponibilidad'>('info')
  const [reviews, setReviews] = useState<Review[]>([])
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    async function fetchMedico() {
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error || !data) { setError(true); return }
        setMedico(data)

        const { data: session } = await supabase.auth.getSession()
        if (session?.session?.user?.email === data.email) {
          setIsOwner(true)
        }

        const {  reviewsData } = await supabase
          .from('reviews')
          .select('id, rating, comment, created_at, profiles(full_name)')
          .eq('doctor_id', id)
          .eq('is_visible', true)
          .order('created_at', { ascending: false })
          .limit(10)
        
        setReviews(reviewsData?.map(r => ({
          id: r.id,
          user_name: r.profiles?.full_name || 'Usuario',
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at
        })) || [])

      } catch (_) {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchMedico()
  }, [id])

  useEffect(() => {
    if (activeTab === 'ubicacion' && medico?.latitude && medico?.longitude && mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [medico.longitude, medico.latitude],
        zoom: 15,
      })
      new mapboxgl.Marker({ color: '#3730A3' })
        .setLngLat([medico.longitude, medico.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<p style="font-family:'DM Sans',sans-serif;font-weight:600;color:#1A1A2E">${medico.full_name}</p><p style="font-size:13px;color:#6B7280">${medico.address}</p>`))
        .addTo(map.current)
    }
    return () => { if (map.current) { map.current.remove(); map.current = null } }
  }, [activeTab, medico])

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !medico) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('doctor-photos')
        .upload(fileName, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('doctor-photos').getPublicUrl(fileName)
      const { error: updateError } = await supabase.from('doctors').update({ photo_url: urlData.publicUrl }).eq('id', id)
      if (updateError) throw updateError
      setMedico(prev => prev ? { ...prev, photo_url: urlData.publicUrl } : null)
    } catch (_) {
      alert('Error al subir la foto. Intenta de nuevo.')
    } finally {
      setUploading(false)
    }
  }

  function handleWhatsApp() {
    if (!medico) return
    const phone = (medico.whatsapp || medico.phone || '').replace(/\D/g, '')
    const message = encodeURIComponent(`Hola Dr. ${medico.full_name}, vi tu perfil en Salurama y me gustaría agendar una consulta.`)
    window.open(`https://wa.me/52${phone}?text=${message}`, '_blank')
  }

  function handleLlamada() {
    if (!medico) return
    const phone = (medico.phone || '').replace(/\D/g, '')
    window.location.href = `tel:+52${phone}`
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!medico || !newReview.comment.trim()) return
    setSubmittingReview(true)
    try {
      const {  session } = await supabase.auth.getSession()
      if (!session?.session?.user) {
        alert('Debes iniciar sesión para dejar una reseña')
        return
      }
      const { error } = await supabase.from('reviews').insert({
        doctor_id: medico.id,
        user_id: session.session.user.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        is_visible: true
      })
      if (error) throw error
      setNewReview({ rating: 5, comment: '' })
      const {  reviewsData } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, profiles(full_name)')
        .eq('doctor_id', id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(10)
      setReviews(reviewsData?.map(r => ({
        id: r.id,
        user_name: r.profiles?.full_name || 'Usuario',
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at
      })) || [])
    } catch (_) {
      alert('Error al enviar la reseña. Intenta de nuevo.')
    } finally {
      setSubmittingReview(false)
    }
  }

  function getHorariosDisponibles() {
    if (!medico?.availability) return []
    try {
      const availability: AvailabilitySlot[] = JSON.parse(medico.availability)
      const hoy = new Date().getDay()
      const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
      const resultado = []
      for (let i = 0; i < 3; i++) {
        const diaIdx = (hoy + i) % 7
        const diaNombre = dias[diaIdx]
        const diaData = availability.find(d => d.day === diaNombre)
        if (diaData?.slots?.length) {
          resultado.push({
            nombre: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1),
            fecha: new Date(Date.now() + i * 86400000).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
            horarios: diaData.slots.slice(0, 3)
          })
        }
      }
      return resultado
    } catch {
      return []
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando perfil...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (error || !medico) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');`}</style>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#3730A3', marginBottom: 8 }}>Perfil no encontrado</h2>
          <p style={{ color: '#6B7280', marginBottom: 24 }}>Este médico no existe o su perfil no está disponible.</p>
          <Link href="/" style={{ background: '#3730A3', color: '#fff', padding: '12px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const tieneContacto = medico.phone || medico.whatsapp
  const horarios = getHorariosDisponibles()
    return (
    <>
      <Head>
        <title>{medico.full_name} — {medico.specialty} | Salurama</title>
        <meta name="description" content={`${medico.full_name}, ${medico.specialty} en ${medico.location_city}. Consulta desde $${medico.consultation_price} MXN. Médico verificado.`} />
        <meta property="og:title" content={`${medico.full_name} — ${medico.specialty} | Salurama`} />
        <meta property="og:description" content={`${medico.full_name}, ${medico.specialty} en ${medico.location_city}.`} />
        <meta property="og:type" content="profile" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Physician",
          "name": medico.full_name,
          "medicalSpecialty": medico.specialty,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": medico.location_city,
            "streetAddress": medico.address
          },
          "priceRange": medico.consultation_price > 0 ? `$${medico.consultation_price} MXN` : "A consultar",
          "image": medico.photo_url,
          "telephone": medico.phone,
          "url": `https://salurama.com/doctor/${medico.id}`,
          "aggregateRating": medico.rating_count > 0 ? {
            "@type": "AggregateRating",
            "ratingValue": medico.rating_avg.toFixed(1),
            "reviewCount": medico.rating_count
          } : undefined
        })}} />
      </Head>

      <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          .btn-whatsapp { display: flex; align-items: center; justify-content: center; gap: 10px; background: #25D366; color: #fff; border: none; border-radius: 50px; padding: 16px 28px; font-size: 16px; font-family: 'DM Sans', sans-serif; font-weight: 700; cursor: pointer; transition: background 0.18s; width: 100%; text-decoration: none; }
          .btn-whatsapp:hover { background: #1DAA56; }
          .btn-llamada { display: flex; align-items: center; justify-content: center; gap: 10px; background: #fff; color: #3730A3; border: 2px solid #3730A3; border-radius: 50px; padding: 14px 28px; font-size: 16px; font-family: 'DM Sans', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.18s; width: 100%; text-decoration: none; }
          .btn-llamada:hover { background: #EEF2FF; }
          .info-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid #F3F4F6; }
          .info-row:last-child { border-bottom: none; }
          .tag { display: inline-flex; align-items: center; gap: 4px; background: #EEF2FF; color: #3730A3; border-radius: 20px; padding: 4px 12px; font-size: 13px; font-weight: 600; }
          .tag-coral { background: #FFF0EB; color: #F4623A; }
          .tab-btn { padding: 12px 20px; border: none; background: none; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; color: #6B7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
          .tab-btn.active { color: #3730A3; border-bottom-color: #3730A3; }
          .tab-btn:hover { color: #3730A3; }
          .foto-overlay { position: absolute; inset: 0; border-radius: 50%; background: rgba(55,48,163,0.8); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
          .foto-wrap:hover .foto-overlay { opacity: 1; }
          .horario-slot { padding: 8px 14px; background: #fff; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; font-weight: 500; color: #3730A3; cursor: pointer; transition: all 0.15s; text-align: center; }
          .horario-slot:hover { background: #EEF2FF; border-color: #3730A3; transform: scale(1.03); }
          .review-card { padding: 16px; background: #F9FAFB; border-radius: 12px; margin-bottom: 12px; }
          .star-filled { color: #F59E0B; }
          .star-empty { color: #E5E7EB; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (max-width: 768px) { .perfil-grid { grid-template-columns: 1fr !important; } .sidebar-sticky { position: static !important; } .tabs-scroll { overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; } }
        `}</style>

        <nav style={{ background: '#fff', borderBottom: '2px solid #F3F4F6', padding: '0 20px', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#3730A3' }}>Salu</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600, color: '#F4623A' }}>rama</span>
            </Link>
            <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }} aria-label="Volver a resultados">
              <ArrowLeft size={16} /> Volver
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px 60px' }}>
          <div className="perfil-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }} className="foto-wrap">
                    {medico.photo_url ? (
                      <img src={medico.photo_url} alt={medico.full_name} style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '4px solid #EEF2FF', boxShadow: '0 4px 16px rgba(55,48,163,0.15)' }} />
                    ) : (
                      <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #3730A3 0%, #F4623A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 40, fontWeight: 900, color: '#fff', border: '4px solid #fff', boxShadow: '0 4px 16px rgba(55,48,163,0.2)' }}>
                        {(medico.full_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    {isOwner && (
                      <>
                        <div className="foto-overlay" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0} aria-label="Cambiar foto de perfil">
                          {uploading ? (
                            <div style={{ width: 28, height: 28, border: '3px solid #ffffff66', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          ) : (
                            <Camera size={24} color="#fff" />
                          )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFotoUpload} style={{ display: 'none' }} aria-hidden="true" />
                      </>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 900, color: '#1A1A2E', margin: 0 }}>{medico.full_name}</h1>
                      {medico.license_verified && <span className="tag"><CheckCircle size={14} /> Verificado</span>}
                    </div>
                    <p style={{ fontSize: 17, color: '#4F46E5', fontWeight: 600, marginBottom: 12, margin: 0 }}>{medico.specialty}</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                      {medico.location_city && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, color: '#6B7280' }}>
                          <MapPin size={14} /> {medico.location_city}{medico.location_neighborhood ? `, ${medico.location_neighborhood}` : ''}
                        </span>
                      )}
                      {medico.years_experience > 0 && <span style={{ fontSize: 14, color: '#6B7280' }}>· {medico.years_experience} años de experiencia</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={16} className={s <= Math.round(medico.rating_avg || 0) ? 'star-filled' : 'star-empty'} fill={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : 'none'} />
                        ))}
                      </div>
                      <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>{medico.rating_avg?.toFixed(1) || '0.0'} ({medico.rating_count || 0} opiniones)</span>
                    </div>
                  </div>
                </div>
                {medico.description && (
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
                    <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>{medico.description}</p>
                  </div>
                )}
              </div>

              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div className="tabs-scroll" style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', padding: '0 8px' }}>
                  {[
                    { id: 'info', label: 'Información', icon: User },
                    { id: 'disponibilidad', label: 'Disponibilidad', icon: Calendar },
                    { id: 'reviews', label: `Reseñas (${medico.rating_count})`, icon: Star },
                    { id: 'ubicacion', label: 'Ubicación', icon: MapPin }
                  ].map(tab => (
                    <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id as any)} style={{ display: 'flex', alignItems: 'center', gap: 6 }} role="tab" aria-selected={activeTab === tab.id}>
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: 24 }}>
                  {activeTab === 'info' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {medico.education && (
                        <div className="info-row">
                          <GraduationCap size={20} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2, fontWeight: 600 }}>Formación</p>
                            <p style={{ fontSize: 15, color: '#1A1A2E', margin: 0 }}>{medico.education}</p>
                          </div>
                        </div>
                      )}
                      {medico.hospital_affiliation && (
                        <div className="info-row">
                          <Building2 size={20} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2, fontWeight: 600 }}>Institución</p>
                            <p style={{ fontSize: 15, color: '#1A1A2E', margin: 0 }}>{medico.hospital_affiliation}</p>
                          </div>
                        </div>
                      )}
                      {medico.professional_license && (
                        <div className="info-row">
                          <FileText size={20} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2, fontWeight: 600 }}>Cédula profesional</p>
                            <p style={{ fontSize: 15, color: '#1A1A2E', margin: 0 }}>{medico.professional_license}</p>
                          </div>
                        </div>
                      )}
                      {medico.languages && (
                        <div className="info-row">
                          <Languages size={20} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2, fontWeight: 600 }}>Idiomas</p>
                            <p style={{ fontSize: 15, color: '#1A1A2E', margin: 0 }}>{medico.languages}</p>
                          </div>
                        </div>
                      )}
                      {medico.address && (
                        <div className="info-row">
                          <MapPin size={20} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2, fontWeight: 600 }}>Dirección</p>
                            <p style={{ fontSize: 15, color: '#1A1A2E', margin: 0 }}>{medico.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'disponibilidad' && (
                    <div>
                      {horarios.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {horarios.map((dia, idx) => (
                            <div key={idx} style={{ background: '#F9FAFB', borderRadius: 12, padding: 16 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>{dia.nombre}</p>
                                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{dia.fecha}</p>
                                </div>
                                <span className="tag tag-coral">Disponible</span>
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {dia.horarios.map((hora, hidx) => (
                                  <button key={hidx} className="horario-slot" aria-label={`Agendar cita ${hora}`}>{hora}</button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 32 }}>
                          <Clock size={48} color="#9CA3AF" style={{ marginBottom: 12 }} />
                          <p style={{ fontSize: 15, color: '#6B7280', margin: 0 }}>Horarios no disponibles aún</p>
                          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>El médico actualizará su disponibilidad pronto</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <form onSubmit={handleSubmitReview} style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 12 }}>Dejar una opinión</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                          {[1,2,3,4,5].map(s => (
                            <button key={s} type="button" onClick={() => setNewReview(r => ({ ...r, rating: s }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label={`${s} estrellas`}>
                              <Star size={24} className={s <= newReview.rating ? 'star-filled' : 'star-empty'} fill={s <= newReview.rating ? '#F59E0B' : 'none'} color={s <= newReview.rating ? '#F59E0B' : '#E5E7EB'} />
                            </button>
                          ))}
                        </div>
                        <textarea 
                          value={newReview.comment} 
                          onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))} 
                          placeholder="Comparte tu experiencia..." 
                          rows={3} 
                          style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', marginBottom: 12 }} 
                        />
                        <button 
                          type="submit" 
                          disabled={submittingReview || !newReview.comment.trim()} 
                          style={{ 
                            background: '#3730A3', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: 50, 
                            padding: '10px 24px', 
                            fontSize: 14, 
                            fontWeight: 600, 
                            cursor: submittingReview || !newReview.comment.trim() ? 'not-allowed' : 'pointer', 
                            fontFamily: "'DM Sans', sans-serif", 
                            opacity: submittingReview || !newReview.comment.trim() ? 0.6 : 1 
                          }}
                        >
                          {submittingReview ? 'Enviando...' : 'Enviar opinión'}
                        </button>
                      </form>
                      {reviews.length > 0 ? (
                        reviews.map(r => (
                          <div key={r.id} className="review-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', margin: 0 }}>{r.user_name}</p>
                              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{new Date(r.created_at).toLocaleDateString('es-MX')}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                              {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= r.rating ? 'star-filled' : 'star-empty'} fill={s <= r.rating ? '#F59E0B' : 'none'} />)}
                            </div>
                            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.5, margin: 0 }}>{r.comment}</p>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', padding: 24 }}>Aún no hay opiniones. ¡Sé el primero en compartir tu experiencia!</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'ubicacion' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Dirección</p>
                        <p style={{ fontSize: 15, color: '#1A1A2E', margin: 0 }}>{medico.address}</p>
                        <p style={{ fontSize: 15, color: '#1A1A2E', margin: 0 }}>{medico.location_neighborhood}, {medico.location_city}</p>
                      </div>
                      <div ref={mapContainer} style={{ width: '100%', height: 240, borderRadius: 12, overflow: 'hidden', background: '#F3F4F6' }} />
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${medico.address}, ${medico.location_city}`)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#3730A3', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                        Abrir en Google Maps <ChevronRight size={16} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
                        <div className="sidebar-sticky" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 88 }}>
              <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 6 }}>Costo de consulta</p>
                {medico.consultation_price > 0 ? (
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: 38, fontWeight: 900, color: '#3730A3', lineHeight: 1, margin: 0 }}>
                    ${medico.consultation_price.toLocaleString('es-MX')}<span style={{ fontSize: 16, fontWeight: 400, color: '#9CA3AF' }}> MXN</span>
                  </p>
                ) : (
                  <p style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#3730A3', margin: 0 }}>A consultar</p>
                )}
              </div>

              {tieneContacto && (
                <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 4, textAlign: 'center' }}>Contactar al médico</p>
                  {(medico.whatsapp || medico.phone) && (
                    <button className="btn-whatsapp" onClick={handleWhatsApp} aria-label="Enviar mensaje por WhatsApp">
                      <MessageCircle size={20} /> WhatsApp
                    </button>
                  )}
                  {medico.phone && (
                    <button className="btn-llamada" onClick={handleLlamada} aria-label="Llamar por teléfono">
                      <Phone size={18} /> Llamar
                    </button>
                  )}
                  <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>Contacto directo · Sin intermediarios · Sin costo</p>
                </div>
              )}

              {medico.license_verified && (
                <div style={{ background: '#DCFCE7', borderRadius: 16, padding: '16px 20px', border: '1px solid #86EFAC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <CheckCircle size={18} color="#059669" />
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#059669', margin: 0 }}>Médico verificado</p>
                  </div>
                  <p style={{ fontSize: 12, color: '#065F46', lineHeight: 1.5, margin: 0 }}>Cédula profesional confirmada por Salurama ante la Secretaría de Educación Pública.</p>
                </div>
              )}

              <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 1.5 }}>
                ¿Información incorrecta?{' '}
                <a href="mailto:hola@salurama.com" style={{ color: '#6B7280', textDecoration: 'underline' }}>Repórtalo aquí</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}