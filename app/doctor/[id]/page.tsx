'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { MapPin, Phone, MessageCircle, Star, CheckCircle, ArrowLeft, Camera, Clock, Building2, GraduationCap, FileText, Languages } from 'lucide-react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface Medico {
  id: string
  full_name: string
  specialty: string
  email: string
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
  professional_license?: string
}

interface Review {
  id: string
  user_name: string
  rating: number
  comment: string
  created_at: string
}

type TabId = 'info' | 'disponibilidad' | 'reviews' | 'ubicacion'

export default function PerfilMedico() {
  const { id }  = useParams()
  const router  = useRouter()
  const [medico, setMedico]         = useState<Medico | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [isOwner, setIsOwner]       = useState(false)
  const [tab, setTab]               = useState<TabId>('info')
  const [reviews, setReviews]       = useState<Review[]>([])
  const [newReview, setNewReview]   = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [isMobile, setIsMobile]     = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mapContainer = useRef<HTMLDivElement>(null)
  const map          = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('doctors').select('*')
          .eq('id', id as string).single()
        if (error || !data) { setError(true); return }
        setMedico(data)
        const { data: sess } = await supabase.auth.getSession()
        if (sess?.session?.user?.email === data.email) setIsOwner(true)
        const { data: rev } = await supabase
          .from('reviews').select('*')
          .eq('doctor_id', id as string)
          .order('created_at', { ascending: false }).limit(10)
        setReviews((rev || []).map((r: any) => ({
          id: r.id,
          user_name: r.user_name || 'Paciente',
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at
        })))
      } catch { setError(true) }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  useEffect(() => {
    if (tab === 'ubicacion' && medico?.latitude && medico?.longitude && mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [medico.longitude, medico.latitude],
        zoom: 15
      })
      new mapboxgl.Marker({ color: '#3730A3' })
        .setLngLat([medico.longitude, medico.latitude])
        .addTo(map.current)
    }
    return () => {
      if (tab !== 'ubicacion' && map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [tab, medico])

  async function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !medico) return
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const name = id + '-' + Date.now() + '.' + ext
      const { error: ue } = await supabase.storage
        .from('doctor-photos').upload(name, file, { upsert: true })
      if (ue) throw ue
      const { data: urlData } = supabase.storage.from('doctor-photos').getPublicUrl(name)
      await supabase.from('doctors').update({ photo_url: urlData.publicUrl }).eq('id', id as string)
      setMedico(p => p ? { ...p, photo_url: urlData.publicUrl } : null)
    } catch { alert('Error al subir la foto.') }
    finally { setUploading(false) }
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!newReview.comment.trim()) return
    setSubmitting(true)
    try {
      await supabase.from('reviews').insert({
        doctor_id: medico!.id,
        rating: newReview.rating,
        comment: newReview.comment.trim(),
        is_visible: true
      })
      setNewReview({ rating: 5, comment: '' })
      const { data } = await supabase.from('reviews').select('*')
        .eq('doctor_id', id as string)
        .order('created_at', { ascending: false }).limit(10)
      setReviews((data || []).map((r: any) => ({
        id: r.id, user_name: r.user_name || 'Paciente',
        rating: r.rating, comment: r.comment, created_at: r.created_at
      })))
    } catch { alert('Error al enviar.') }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando perfil...</p>
      </div>
    </div>
  )

  if (error || !medico) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;700&display=swap');`}</style>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#3730A3', marginBottom: 8 }}>Perfil no encontrado</h2>
        <p style={{ color: '#6B7280', marginBottom: 20, fontSize: 14 }}>Este perfil no existe o no está disponible.</p>
        <Link href="/" style={{ background: '#3730A3', color: '#fff', padding: '11px 28px', borderRadius: 50, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>Ir al inicio</Link>
      </div>
    </div>
  )

  function buildWhatsAppUrl(medico: Medico): string {
    const phone = (medico.whatsapp || medico.phone || '').replace(/\D/g, '')
    const msg = 'Hola Dr. ' + medico.full_name + ', vi su perfil en Salurama y me gustaría agendar una consulta con usted.'
    return 'https://wa.me/52' + phone + '?text=' + encodeURIComponent(msg)
  }

  function buildPhoneUrl(medico: Medico): string {
    return 'tel:+52' + (medico.phone || '').replace(/\D/g, '')
  }

  function buildMapsUrl(medico: Medico): string {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((medico.address || '') + ', ' + medico.location_city)
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'info',           label: 'Información' },
    { id: 'disponibilidad', label: 'Disponibilidad' },
    { id: 'reviews',        label: 'Reseñas (' + reviews.length + ')' },
    { id: 'ubicacion',      label: 'Ubicación' },
  ]

  function ContactoCard() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {medico.consultation_price > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', border: '1px solid #E5E7EB', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>Costo de consulta</p>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 900, color: '#3730A3', lineHeight: 1, margin: 0 }}>
              {'$' + medico.consultation_price.toLocaleString('es-MX')}
              <span style={{ fontSize: 13, fontWeight: 400, color: '#9CA3AF' }}> MXN</span>
            </p>
          </div>
        )}

        {(medico.phone || medico.whatsapp) && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', textAlign: 'center', margin: 0 }}>Contactar al médico</p>

            <a href={buildWhatsAppUrl(medico)} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 50, padding: '13px', fontSize: 15, fontWeight: 700, textDecoration: 'none', width: '100%', fontFamily: "'DM Sans', sans-serif" }}>
              <MessageCircle size={17} />
              WhatsApp
            </a>

            {medico.phone && (
              <a href={buildPhoneUrl(medico)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', color: '#3730A3', border: '2px solid #3730A3', borderRadius: 50, padding: '11px', fontSize: 15, fontWeight: 600, textDecoration: 'none', width: '100%', fontFamily: "'DM Sans', sans-serif" }}>
                <Phone size={15} />
                Llamar
              </a>
            )}

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: 0 }}>Contacto directo · Sin intermediarios · Sin costo</p>
          </div>
        )}

        {medico.license_verified && (
          <div style={{ background: '#DCFCE7', borderRadius: 14, padding: '14px 16px', border: '1px solid #86EFAC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <CheckCircle size={15} color="#059669" />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#059669', margin: 0 }}>Médico verificado</p>
            </div>
            <p style={{ fontSize: 12, color: '#065F46', lineHeight: 1.5, margin: 0 }}>Cédula profesional confirmada ante la SEP.</p>
          </div>
        )}

        <p style={{ fontSize: 12, color: '#D1D5DB', textAlign: 'center' }}>
          {'¿Información incorrecta? '}
          <a href="mailto:hola@salurama.com" style={{ color: '#9CA3AF', textDecoration: 'underline' }}>Repórtalo aquí</a>
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'DM Sans', sans-serif", color: '#1A1A2E' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .tab-btn { padding: 11px 14px; border: none; background: none; font-family: 'DM Sans',sans-serif; font-size: 14px; font-weight: 600; color: #6B7280; cursor: pointer; border-bottom: 2.5px solid transparent; transition: all 0.18s; white-space: nowrap; }
        .tab-btn.on { color: #3730A3; border-bottom-color: #3730A3; }
        .irow { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F3F4F6; }
        .irow:last-child { border-bottom: none; }
        .foto-ov { position: absolute; inset: 0; border-radius: 50%; background: rgba(55,48,163,0.75); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; cursor: pointer; }
        .foto-wr:hover .foto-ov { opacity: 1; }
        .tabs-wrap { display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .tabs-wrap::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <nav style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '0 16px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </Link>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6B7280', background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            <ArrowLeft size={15} /> Volver
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '18px 16px 60px' }}>

        {isMobile && (
          <div style={{ marginBottom: 16 }}>
            <ContactoCard />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 18, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div style={{ background: '#fff', borderRadius: 18, padding: 'clamp(18px, 4vw, 24px)', border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flexShrink: 0 }} className="foto-wr">
                  {medico.photo_url
                    ? <img src={medico.photo_url} alt={medico.full_name} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '3px solid #EEF2FF' }} />
                    : (
                      <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg,#3730A3,#F4623A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 900, color: '#fff' }}>
                        {(medico.full_name || '?')[0].toUpperCase()}
                      </div>
                    )
                  }
                  {isOwner && (
                    <div>
                      <div className="foto-ov" onClick={() => fileInputRef.current?.click()}>
                        {uploading
                          ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                          : <Camera size={19} color="#fff" />
                        }
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                    <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(19px, 5vw, 25px)', fontWeight: 900, color: '#1A1A2E' }}>
                      {medico.full_name}
                    </h1>
                    {medico.license_verified && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', color: '#3730A3', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 600 }}>
                        <CheckCircle size={12} /> Verificado
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 15, color: '#4F46E5', fontWeight: 600, marginBottom: 8 }}>{medico.specialty}</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#6B7280' }}>
                    {medico.location_city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={12} />
                        {medico.location_city}
                        {medico.location_neighborhood ? ', ' + medico.location_neighborhood : ''}
                      </span>
                    )}
                    {(medico.years_experience || 0) > 0 && (
                      <span>{'· ' + medico.years_experience + ' años exp.'}</span>
                    )}
                  </div>
                  {reviews.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={13}
                          fill={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : 'none'}
                          color={s <= Math.round(medico.rating_avg || 0) ? '#F59E0B' : '#E5E7EB'}
                        />
                      ))}
                      <span style={{ fontSize: 13, color: '#6B7280' }}>
                        {(medico.rating_avg || 0).toFixed(1) + ' (' + reviews.length + ')'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {medico.description && (
                <p style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #F3F4F6', fontSize: 14, color: '#374151', lineHeight: 1.7, fontWeight: 300 }}>
                  {medico.description}
                </p>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div className="tabs-wrap" style={{ borderBottom: '1px solid #F3F4F6', padding: '0 6px' }}>
                {TABS.map(t => (
                  <button
                    key={t.id}
                    className={'tab-btn' + (tab === t.id ? ' on' : '')}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 'clamp(16px, 4vw, 22px)' }}>

                {tab === 'info' && (
                  <div>
                    {[
                      { icon: GraduationCap, label: 'Formación',         val: medico.education },
                      { icon: Building2,    label: 'Institución',        val: medico.hospital_affiliation },
                      { icon: FileText,     label: 'Cédula profesional', val: medico.professional_license },
                      { icon: Languages,    label: 'Idiomas',            val: medico.languages },
                      { icon: Clock,        label: 'Horarios',           val: medico.schedule },
                      { icon: MapPin,       label: 'Dirección',          val: medico.address },
                    ].filter(r => r.val).map((r, i) => (
                      <div key={i} className="irow">
                        <r.icon size={17} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 2 }}>{r.label}</p>
                          <p style={{ fontSize: 14, color: '#1A1A2E' }}>{r.val}</p>
                        </div>
                      </div>
                    ))}
                    {!medico.education && !medico.hospital_affiliation && !medico.languages && !medico.schedule && !medico.address && (
                      <p style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: 24 }}>
                        El médico completará su perfil próximamente.
                      </p>
                    )}
                  </div>
                )}

                {tab === 'disponibilidad' && (
                  <div style={{ textAlign: 'center', padding: 32 }}>
                    <Clock size={44} color="#9CA3AF" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 4 }}>Horarios no disponibles aún</p>
                    <p style={{ fontSize: 13, color: '#9CA3AF' }}>El médico actualizará su disponibilidad próximamente</p>
                  </div>
                )}

                {tab === 'reviews' && (
                  <div>
                    <form onSubmit={submitReview} style={{ background: '#F9FAFB', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', marginBottom: 8 }}>Dejar una opinión</p>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} type="button" onClick={() => setNewReview(r => ({ ...r, rating: s }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1 }}>
                            <Star size={22} fill={s <= newReview.rating ? '#F59E0B' : 'none'} color={s <= newReview.rating ? '#F59E0B' : '#E5E7EB'} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={newReview.comment}
                        onChange={e => setNewReview(r => ({ ...r, comment: e.target.value }))}
                        placeholder="Comparte tu experiencia..."
                        rows={3}
                        style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: "'DM Sans', sans-serif", resize: 'vertical', marginBottom: 8 }}
                      />
                      <button
                        type="submit"
                        disabled={submitting || !newReview.comment.trim()}
                        style={{ background: '#3730A3', color: '#fff', border: 'none', borderRadius: 50, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: submitting || !newReview.comment.trim() ? 0.6 : 1 }}
                      >
                        {submitting ? 'Enviando...' : 'Enviar opinión'}
                      </button>
                    </form>
                    {reviews.length > 0 ? reviews.map(r => (
                      <div key={r.id} style={{ padding: 14, background: '#F9FAFB', borderRadius: 10, marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{r.user_name}</p>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(r.created_at).toLocaleDateString('es-MX')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 2, marginBottom: 5 }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} fill={s <= r.rating ? '#F59E0B' : 'none'} color={s <= r.rating ? '#F59E0B' : '#E5E7EB'} />
                          ))}
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{r.comment}</p>
                      </div>
                    )) : (
                      <p style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: 24 }}>Aún no hay opiniones.</p>
                    )}
                  </div>
                )}

                {tab === 'ubicacion' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {medico.address && (
                      <div>
                        <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 4 }}>Dirección</p>
                        <p style={{ fontSize: 14, color: '#1A1A2E' }}>
                          {medico.address}
                          {medico.location_neighborhood ? ', ' + medico.location_neighborhood : ''}
                          {', ' + medico.location_city}
                        </p>
                      </div>
                    )}
                    <div ref={mapContainer} style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', background: '#F3F4F6' }} />
                    {medico.address && (
                      <a href={buildMapsUrl(medico)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#3730A3', fontWeight: 600, textDecoration: 'none' }}>
                        Abrir en Google Maps →
                      </a>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

          {!isMobile && (
            <div style={{ position: 'sticky', top: 72 }}>
              <ContactoCard />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}