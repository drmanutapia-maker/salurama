'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Star, Calendar, TrendingUp, CheckCircle, BarChart2, Eye } from 'lucide-react'
import BackButton from '@/components/BackButton'
import { calculateProfileCompletion } from '@/hooks/useProfileCompletion'

interface Cita {
  id: string
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled'
  fecha: string
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function EstadisticasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [medico, setMedico] = useState<any>(null)
  const [citas, setCitas] = useState<Cita[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [education, setEducation] = useState<any[]>([])
  const [experience, setExperience] = useState<any[]>([])
  const [conditions, setConditions] = useState<any[]>([])
  const [profileViews, setProfileViews] = useState(0)
  const [completionData, setCompletionData] = useState<{ checks: any[]; percentage: number }>({ checks: [], percentage: 0 })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { await supabase.auth.signOut(); router.push('/login'); return }

      const { data: doc } = await supabase
        .from('doctors')
        .select('id, full_name, photo_url, specialty, about_me, clinic_lat, clinic_lng, horario, consultation_price_first_time, consultation_price_general, phone, clinic_phone, whatsapp_phone, languages, profile_views')
        .eq('user_id', user.id)
        .single()
      if (!doc) { router.push('/dashboard'); return }
      setMedico(doc)
      setProfileViews(doc.profile_views || 0)

      const [citasRes, reviewsRes, eduRes, expRes, condRes] = await Promise.all([
        supabase.from('citas').select('id, estado, fecha').eq('medico_id', doc.id).order('fecha'),
        supabase.from('reviews').select('id, rating, comment, created_at').eq('doctor_id', doc.id).eq('is_visible', true).order('created_at', { ascending: false }),
        supabase.from('doctor_education').select('id').eq('doctor_id', doc.id),
        supabase.from('doctor_experience').select('id').eq('doctor_id', doc.id),
        supabase.from('doctor_conditions').select('id').eq('doctor_id', doc.id),
      ])
      setCitas((citasRes.data as Cita[]) || [])
      setReviews((reviewsRes.data as Review[]) || [])
      setEducation(eduRes.data || [])
      setExperience(expRes.data || [])
      setConditions(condRes.data || [])

      // Calcular completitud con el hook compartido
      const result = calculateProfileCompletion({
        medico: doc,
        experienceCount: expRes.data?.length || 0,
        educationCount: eduRes.data?.length || 0,
        conditionsCount: condRes.data?.length || 0,
      })
      setCompletionData(result)

      setLoading(false)
    }
    load()
  }, [router])

  const total = citas.length
  const porStatus = {
    pending_verification: citas.filter(c => c.estado === 'pending_verification').length,
    confirmed: citas.filter(c => c.estado === 'confirmed').length,
    completed: citas.filter(c => c.estado === 'completed').length,
    cancelled: citas.filter(c => c.estado === 'cancelled').length,
  }
  const tasaConfirmacion = total > 0
    ? Math.round(((porStatus.confirmed + porStatus.completed) / total) * 100)
    : 0

  const ratingPromedio = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  const hoy = new Date()
  const citasPorMes: { label: string; count: number }[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1)
    const mesNum = d.getMonth()
    const anio = d.getFullYear()
    const count = citas.filter(c => {
      const cd = new Date(c.fecha + 'T00:00:00')
      return cd.getMonth() === mesNum && cd.getFullYear() === anio
    }).length
    return { label: MESES[mesNum], count }
  })
  const maxMes = Math.max(...citasPorMes.map(m => m.count), 1)

  const citasPorDia = DIAS.map((label, idx) => ({
    label,
    count: citas.filter(c => new Date(c.fecha + 'T00:00:00').getDay() === idx).length,
  }))
  const maxDia = Math.max(...citasPorDia.map(d => d.count), 1)

  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: reviews.filter(rv => rv.rating === r).length,
    pct: reviews.length > 0 ? (reviews.filter(rv => rv.rating === r).length / reviews.length) * 100 : 0,
  }))

  const { checks, percentage: completionPct } = completionData
  const colorProgreso = completionPct >= 80 ? '#2A9D8F' : completionPct >= 50 ? '#F59E0B' : '#EF4444'

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E8ECF3', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando estadísticas...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes growY { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
        .card { background:#fff; border-radius:16px; border:1px solid #E5E7EB; padding:24px; }
        .section-title { font-family:'Fraunces',serif; font-size:16px; font-weight:900; color:#111827; margin-bottom:16px; }
        @media(max-width:640px) {.kpi-grid { grid-template-columns: repeat(2,1fr)!important; } }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ marginBottom: 16 }}>
          <BackButton fallback="/dashboard" />
        </div>
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Estadísticas</h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Resumen de tu actividad en Salurama</p>
        </div>

        {/* KPIs */}
        <div className="kpi-grid fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Eye size={20} color="#8B5CF6" />, label: 'Vistas al perfil', value: profileViews, bg: '#F5F3FF', color: '#8B5CF6' },
            { icon: <Calendar size={20} color="#1E3A5F" />, label: 'Total citas', value: total, bg: '#E8ECF3', color: '#1E3A5F' },
            { icon: <CheckCircle size={20} color="#2A9D8F" />, label: 'Tasa confirmación', value: `${tasaConfirmacion}%`, bg: '#E8F7F5', color: '#2A9D8F' },
            { icon: <Star size={20} color="#D97706" />, label: 'Rating promedio', value: reviews.length > 0 ? ratingPromedio.toFixed(1) : '—', bg: '#FFFBEB', color: '#D97706' },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{k.icon}</div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: 12, color: k.color, fontWeight: 500, marginTop: 4, opacity: 0.8 }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Distribución de citas + Últimos 6 meses */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <p className="section-title">Distribución de citas</p>
            {total === 0 ? (
              <p style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Aún no tienes citas registradas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Pendientes', count: porStatus.pending_verification, color: '#F59E0B' },
                  { label: 'Confirmadas', count: porStatus.confirmed, color: '#2A9D8F' },
                  { label: 'Completadas', count: porStatus.completed, color: '#8B5CF6' },
                  { label: 'Canceladas', count: porStatus.cancelled, color: '#EF4444' },
                ].map(({ label, count, color }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{count}</span>
                    </div>
                    <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${total > 0 ? (count / total) * 100 : 0}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={16} color="#1E3A5F" /> Últimos 6 meses
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {citasPorMes.map(({ label, count }) => (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', opacity: count > 0 ? 1 : 0 }}>{count}</span>
                  <div style={{ width: '100%', background: '#E8ECF3', borderRadius: '4px 4px 0 0', height: `${(count / maxMes) * 90}%`, minHeight: count > 0 ? 4 : 0, transformOrigin: 'bottom', animation: 'growY 0.6s ease' }} />
                  <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Citas por día + Distribución de reseñas */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
          <div className="card">
            <p className="section-title">Citas por día de semana</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
              {citasPorDia.map(({ label, count }) => (
                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2A9D8F', opacity: count > 0 ? 1 : 0 }}>{count}</span>
                  <div style={{ width: '100%', background: '#E8F7F5', borderRadius: '3px 3px 0 0', height: `${(count / maxDia) * 80}%`, minHeight: count > 0 ? 4 : 0, animation: 'growY 0.6s ease', transformOrigin: 'bottom' }} />
                  <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="section-title">Distribución de reseñas</p>
            {reviews.length === 0 ? (
              <p style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Aún no tienes reseñas verificadas</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ratingDist.map(({ stars, count, pct }) => (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', minWidth: 12 }}>{stars}</span>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#F59E0B', borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#6B7280', minWidth: 20, textAlign: 'right' }}>{count}</span>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
                  Promedio: <strong style={{ color: '#D97706' }}>{ratingPromedio.toFixed(1)} ★</strong> de {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Últimas reseñas */}
        {reviews.length > 0 && (
          <div className="card fade-up" style={{ marginBottom: 16 }}>
            <p className="section-title">Últimas reseñas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Paciente verificado</span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} color="#F59E0B" fill={i < r.rating ? '#F59E0B' : 'none'} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.5 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Perfil completado (CHECKLIST UNIFICADO) */}
        <div className="card fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="section-title" style={{ marginBottom: 0 }}>Perfil completado</p>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: completionPct >= 80 ? '#2A9D8F' : completionPct >= 50 ? '#D97706' : '#DC2626' }}>
              {completionPct}%
            </span>
          </div>
          <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', width: `${completionPct}%`, background: colorProgreso, borderRadius: 4, transition: 'width 0.8s ease' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 8 }}>
            {checks.map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: ok ? '#E8F7F5' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ok
                    ? <CheckCircle size={12} color="#2A9D8F" />
                    : <span style={{ width: 6, height: 6, background: '#D1D5DB', borderRadius: '50%' }} />}
                </div>
                <span style={{ fontSize: 13, color: ok ? '#111827' : '#9CA3AF', fontWeight: ok ? 500 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
          {completionPct < 100 && (
            <button
              onClick={() => router.push('/dashboard/editar-perfil')}
              style={{ marginTop: 16, background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 50, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Completar perfil →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}