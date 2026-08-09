'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Star, Calendar, CheckCircle, BarChart2, Eye, FileText, FileSpreadsheet, ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react'
import { calculateProfileCompletion } from '@/hooks/useProfileCompletion'
import { getUserSafe } from '@/lib/getUserSafe'
import type { Benchmark, BenchmarkGrupo } from '@/lib/estadisticasData'

interface Cita {
  id: string
  estado: 'pending_verification' | 'confirmed' | 'completed' | 'cancelled' | 'cancelada_paciente'
  fecha: string
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
}

// Tendencia mensual (beneficio Premium) — mismo tipo y misma lógica que
// lib/estadisticasData.ts, espejada aquí a propósito (esta pantalla ya
// duplica el resto del cálculo server-side en vez de compartirlo, para no
// mezclar el módulo que usa la service role key con el bundle de cliente).
interface TrendMetric {
  actual: number
  anterior: number
  cambioPct: number | null
  direccion: 'up' | 'down' | 'flat' | 'nuevo'
}

function calcularTendencia(actual: number, anterior: number): TrendMetric {
  if (anterior === 0) {
    return { actual, anterior, cambioPct: null, direccion: actual > 0 ? 'nuevo' : 'flat' }
  }
  const cambioPct = ((actual - anterior) / anterior) * 100
  const direccion = actual > anterior ? 'up' : actual < anterior ? 'down' : 'flat'
  return { actual, anterior, cambioPct, direccion }
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function EstadisticasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [medico, setMedico] = useState<any>(null)
  const [citas, setCitas] = useState<Cita[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [education, setEducation] = useState<any[]>([])
  const [experience, setExperience] = useState<any[]>([])
  const [conditions, setConditions] = useState<any[]>([])
  const [profileViews, setProfileViews] = useState(0)
  const [visitasMes, setVisitasMes] = useState(0)
  const [visitasMesAnterior, setVisitasMesAnterior] = useState(0)
  const [vistasPorMes, setVistasPorMes] = useState<{ label: string; count: number }[]>([])
  const [completionData, setCompletionData] = useState<{ checks: any[]; percentage: number }>({ checks: [], percentage: 0 })
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null)

  useEffect(() => {
    async function load() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError) { setLoadError(true); setLoading(false); return }
      if (!user) { await supabase.auth.signOut(); router.push('/login'); return }

      const { data: doc } = await supabase
        .from('doctors')
        .select('id, full_name, photo_url, specialty, about_me, clinic_lat, clinic_lng, horario, consultation_price_first_time, consultation_price_general, phone, clinic_phone, whatsapp_phone, languages, pricing_tier')
        .eq('user_id', user.id)
        .single()
      if (!doc) { router.push('/dashboard'); return }
      setMedico(doc)

      // Vistas — misma fuente que /dashboard: cuenta real desde la tabla
      // profile_views vía /api/track-visit, no la columna doctors.profile_views
      // (esa quedó congelada, ver app/dashboard/page.tsx). profile_views tiene
      // RLS sin políticas — no se puede leer directo con el cliente anon, por
      // eso el desglose de mes actual/anterior también viene de este mismo
      // endpoint (resuelto con service role) y no de una consulta aparte.
      const [citasRes, reviewsRes, eduRes, expRes, condRes, visitasRes] = await Promise.all([
        supabase.from('citas').select('id, estado, fecha').eq('medico_id', doc.id).order('fecha'),
        supabase.from('reviews').select('id, rating, comment, created_at').eq('doctor_id', doc.id).eq('is_visible', true).order('created_at', { ascending: false }),
        supabase.from('doctor_education').select('id').eq('doctor_id', doc.id),
        supabase.from('doctor_experience').select('id').eq('doctor_id', doc.id),
        supabase.from('doctor_conditions').select('id').eq('doctor_id', doc.id),
        fetch('/api/track-visit').then(r => r.ok ? r.json() : { count: 0, mesActual: 0, mesAnterior: 0, vistasPorMes: [] }).catch(() => ({ count: 0, mesActual: 0, mesAnterior: 0, vistasPorMes: [] })),
      ])
      // El benchmark exige agregar reseñas/citas de OTROS médicos — desde
      // que restringimos el RLS de citas al dueño (ver auditoría del flujo
      // de citas), esto ya no se puede calcular con el cliente anon como
      // el resto de esta pantalla; viene de un endpoint server-side.
      fetch('/api/estadisticas/benchmark')
        .then(r => r.ok ? r.json() : null)
        .then(json => setBenchmark(json?.benchmark ?? null))
        .catch(() => setBenchmark(null))
      setCitas((citasRes.data as Cita[]) || [])
      setReviews((reviewsRes.data as Review[]) || [])
      setEducation(eduRes.data || [])
      setExperience(expRes.data || [])
      setConditions(condRes.data || [])
      setProfileViews(visitasRes.count || 0)
      setVisitasMes(visitasRes.mesActual || 0)
      setVisitasMesAnterior(visitasRes.mesAnterior || 0)
      setVistasPorMes(visitasRes.vistasPorMes || [])

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

  // Tendencia mensual (beneficio Premium) — calificación compara el
  // promedio ACUMULADO de siempre contra el acumulado a inicios de este
  // mes (no "reseñas recibidas este mes"), para no mostrar una caída falsa
  // cuando simplemente no llegó ninguna reseña nueva. Ver Parte 1 en
  // lib/estadisticasData.ts para el detalle de esta decisión.
  const inicioMesTendencia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const inicioMesAnteriorTendencia = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
  const reviewsHastaInicioMes = reviews.filter(r => new Date(r.created_at) < inicioMesTendencia)
  const reviewsMes = reviews.filter(r => new Date(r.created_at) >= inicioMesTendencia)
  const reviewsMesAnterior = reviews.filter(r => new Date(r.created_at) >= inicioMesAnteriorTendencia && new Date(r.created_at) < inicioMesTendencia)
  const promedioDe = (arr: Review[]) => (arr.length > 0 ? arr.reduce((s, r) => s + r.rating, 0) / arr.length : 0)

  const tendencias = {
    vistas: calcularTendencia(visitasMes, visitasMesAnterior),
    calificacion: calcularTendencia(
      Math.round(promedioDe(reviews) * 10) / 10,
      Math.round(promedioDe(reviewsHastaInicioMes) * 10) / 10
    ),
    reseñas: calcularTendencia(reviewsMes.length, reviewsMesAnterior.length),
  }

  // Series de 6 meses para la gráfica de línea (beneficio Premium) —
  // mismos límites de mes que citasPorMes abajo. Calificación usa el
  // promedio ACUMULADO al cierre de cada mes (no "reseñas de ese mes"),
  // mismo criterio que la tendencia de 2 puntos de arriba, para que la
  // línea no dé saltos falsos en meses sin reseñas nuevas.
  const seriesMeses = Array.from({ length: 6 }, (_, i) => {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1)
    const fin = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i) + 1, 1)
    return { label: MESES[inicio.getMonth()], inicio, fin }
  })
  const calificacionPorMes = seriesMeses.map(({ label, fin }) => ({
    label,
    value: Math.round(promedioDe(reviews.filter(r => new Date(r.created_at) < fin)) * 10) / 10,
  }))
  const reseñasPorMes = seriesMeses.map(({ label, inicio, fin }) => ({
    label,
    value: reviews.filter(r => { const d = new Date(r.created_at); return d >= inicio && d < fin }).length,
  }))

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

  if (loadError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p style={{ color: '#111827', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No se pudo conectar</p>
        <p style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 16 }}>Revisa tu conexión a internet e inténtalo de nuevo.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )

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
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Estadísticas</h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Resumen de tu actividad en Salurama</p>
        </div>

        {/* Reportes descargables */}
        <div className="card fade-up" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Reportes descargables</p>
            <p style={{ fontSize: 12, color: '#6B7280' }}>Exporta este resumen en PDF o Excel.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/api/estadisticas/pdf" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1E3A5F', color: '#fff', textDecoration: 'none', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
              <FileText size={14} /> PDF
            </a>
            <a href="/api/estadisticas/excel" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2A9D8F', color: '#fff', textDecoration: 'none', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
              <FileSpreadsheet size={14} /> Excel
            </a>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpi-grid fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Eye size={20} color="#8B5CF6" />, label: 'Vistas al perfil', value: profileViews, bg: '#F5F3FF', color: '#8B5CF6', trend: { metric: tendencias.vistas, texto: 'Descubre si subieron o bajaron tus vistas este mes' } },
            { icon: <Calendar size={20} color="#1E3A5F" />, label: 'Total citas', value: total, bg: '#E8ECF3', color: '#1E3A5F', trend: null },
            { icon: <CheckCircle size={20} color="#2A9D8F" />, label: 'Tasa confirmación', value: `${tasaConfirmacion}%`, bg: '#E8F7F5', color: '#2A9D8F', trend: null },
            { icon: <Star size={20} color="#D97706" />, label: 'Rating promedio', value: reviews.length > 0 ? ratingPromedio.toFixed(1) : '—', bg: '#FFFBEB', color: '#D97706', trend: { metric: tendencias.calificacion, texto: 'Descubre si subió o bajó tu calificación este mes' } },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{k.icon}</div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1 }}>{k.value}</p>
              <p style={{ fontSize: 12, color: k.color, fontWeight: 500, marginTop: 4, opacity: 0.8 }}>{k.label}</p>
              {k.trend && (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                  <TrendBadge trend={k.trend.metric} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tendencia de los últimos 6 meses (gráfica de línea) */}
        <div className="card fade-up" style={{ marginBottom: 16 }}>
          <p className="section-title">Tendencia de los últimos 6 meses</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
            {[
              { label: 'Vistas', data: vistasPorMes.map(d => ({ label: d.label, value: d.count })), color: '#8B5CF6', formatValue: (v: number) => String(v) },
              { label: 'Calificación', data: calificacionPorMes, color: '#D97706', formatValue: (v: number) => v.toFixed(1) },
              { label: 'Reseñas', data: reseñasPorMes, color: '#F59E0B', formatValue: (v: number) => String(v) },
            ].map(g => (
              <div key={g.label}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', marginBottom: 8 }}>{g.label}</p>
                <LineChart data={g.data} color={g.color} formatValue={g.formatValue} />
              </div>
            ))}
          </div>
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
              <BarChart2 size={16} color="#1E3A5F" /> Citas: últimos 6 meses
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
            <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Distribución de reseñas
              <TrendBadge trend={tendencias.reseñas} />
            </p>
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
            <button
              onClick={() => router.push('/dashboard/resenas')}
              style={{ display: 'block', width: '100%', marginTop: 14, background: 'none', border: 'none', borderTop: '1px solid #F3F4F6', paddingTop: 14, color: '#1E3A5F', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
            >
              Ver todas las reseñas →
            </button>
          </div>
        </div>

        {/* Cómo te comparas (benchmark de especialidad) */}
        <div className="card fade-up" style={{ marginBottom: 16 }}>
          <p className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} color="#1E3A5F" /> Cómo te comparas
          </p>
          {benchmark ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
              <BenchmarkGrupoCard
                titulo={`Médicos de ${benchmark.especialidad}`}
                subtitulo="En toda la plataforma"
                grupo={benchmark.nacional}
                tuRatingTexto={reviews.length > 0 ? `${ratingPromedio.toFixed(1)} ★` : '—'}
                tuTasaTexto={`${tasaConfirmacion}%`}
              />
              <BenchmarkGrupoCard
                titulo={`Médicos de ${benchmark.especialidad}`}
                subtitulo={benchmark.ciudad ? `En ${benchmark.ciudad}` : 'Sin ciudad registrada en tu perfil'}
                grupo={benchmark.ciudadGrupo}
                tuRatingTexto={reviews.length > 0 ? `${ratingPromedio.toFixed(1)} ★` : '—'}
                tuTasaTexto={`${tasaConfirmacion}%`}
              />
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Cargando comparación...</p>
          )}
        </div>

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

// Gráfica de línea de 6 meses (beneficio Premium) — un solo componente
// reusable para las 3 métricas (vistas, calificación, reseñas), cada una
// con su propia escala de eje Y ajustada a sus propios valores (no fija
// 0-100% ni 1-5), para que un cambio real pequeño (ej. 4.8 a 4.9 en
// calificación) sí se vea en la línea en vez de aplanarse.
//
// Sigue las especificaciones de la skill de dataviz: línea de 2px, marcador
// final ≥8px (r≥4) con anillo del color de superficie, relleno de área al
// ~10% de opacidad, sin leyenda (una sola serie — el título de la tarjeta
// ya dice qué es), etiqueta de valor solo en el punto final, y una capa de
// hover con línea vertical + tooltip (el valor de cada punto también
// queda accesible por hover/foco, no solo mirando la línea).
function LineChart({ data, color, formatValue }: { data: { label: string; value: number }[]; color: string; formatValue: (v: number) => string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const width = 280
  const height = 90
  const padX = 10
  const padY = 18

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const paddedMin = min - range * 0.2
  const paddedMax = max + range * 0.2
  const paddedRange = paddedMax - paddedMin || 1

  const points = data.map((d, i) => ({
    ...d,
    x: padX + (data.length > 1 ? (i / (data.length - 1)) * (width - padX * 2) : (width - padX * 2) / 2),
    y: padY + (1 - (d.value - paddedMin) / paddedRange) * (height - padY * 2),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const baseline = height - padY
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${baseline} L ${points[0].x.toFixed(1)} ${baseline} Z`

  const handleMove = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * width
    let nearest = 0
    let nearestDist = Infinity
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX)
      if (dist < nearestDist) { nearestDist = dist; nearest = i }
    })
    setHoverIndex(nearest)
  }

  const last = points[points.length - 1]
  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        width="100%"
        height={height + 16}
        viewBox={`0 0 ${width} ${height + 16}`}
        preserveAspectRatio="none"
        style={{ display: 'block', touchAction: 'pan-y' }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={() => setHoverIndex(null)}
      >
        <path d={areaPath} fill={color} opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hovered && (
          <line x1={hovered.x} y1={padY} x2={hovered.x} y2={baseline} stroke="#D1D5DB" strokeWidth={1} />
        )}

        {points.map((p, i) => {
          const isLast = i === points.length - 1
          const isHovered = i === hoverIndex
          const r = isLast || isHovered ? 4 : 2.5
          return <circle key={i} cx={p.x} cy={p.y} r={r} fill={isLast || isHovered ? color : '#fff'} stroke={color} strokeWidth={1.5} />
        })}

        <text x={last.x} y={Math.max(last.y - 8, 9)} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
          {formatValue(last.value)}
        </text>

        {points.map((p, i) => (
          <text key={i} x={p.x} y={height + 12} textAnchor="middle" fontSize="9" fill="#9CA3AF">{p.label}</text>
        ))}
      </svg>

      {hovered && hoverIndex !== points.length - 1 && (
        <div
          style={{
            position: 'absolute', left: `${(hovered.x / width) * 100}%`, top: 0, transform: 'translateX(-50%)',
            background: '#111827', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600,
            whiteSpace: 'nowrap', pointerEvents: 'none', marginTop: -28,
          }}
        >
          {hovered.label}: {formatValue(hovered.value)}
        </div>
      )}
    </div>
  )
}

// Insignia compacta de tendencia.
function TrendBadge({ trend }: { trend: TrendMetric }) {
  if (trend.direccion === 'nuevo') {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: '#2A9D8F' }}>Nuevo</span>
  }
  if (trend.direccion === 'flat') {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: '#9CA3AF' }}><Minus size={11} /> Sin cambio</span>
  }
  const pct = trend.cambioPct !== null ? Math.round(Math.abs(trend.cambioPct)) : 0
  const up = trend.direccion === 'up'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: up ? '#2A9D8F' : '#EF4444' }}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />} {pct}%
    </span>
  )
}

// Tarjeta de un grupo de comparación del benchmark (nacional o ciudad) —
// muestra "Tú" siempre (es tu propio dato), y "Grupo" solo si se cumplió
// el umbral de anonimato (grupo?.xSuficiente); si no, un aviso en vez del
// número, para nunca dar a entender un promedio de 1 o 2 médicos.
function BenchmarkGrupoCard({
  titulo, subtitulo, grupo, tuRatingTexto, tuTasaTexto,
}: {
  titulo: string
  subtitulo: string
  grupo: BenchmarkGrupo | null
  tuRatingTexto: string
  tuTasaTexto: string
}) {
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 14, padding: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{titulo}</p>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>{subtitulo}</p>
      <ComparacionFila label="Rating promedio" tuTexto={tuRatingTexto} grupoValor={grupo?.ratingPromedio ?? null} suficiente={grupo?.ratingSuficiente ?? false} formatoGrupo={(v) => `${v.toFixed(1)} ★`} />
      <ComparacionFila label="Tasa de confirmación" tuTexto={tuTasaTexto} grupoValor={grupo?.tasaConfirmacion ?? null} suficiente={grupo?.tasaSuficiente ?? false} formatoGrupo={(v) => `${v}%`} />
    </div>
  )
}

function ComparacionFila({
  label, tuTexto, grupoValor, suficiente, formatoGrupo,
}: {
  label: string
  tuTexto: string
  grupoValor: number | null
  suficiente: boolean
  formatoGrupo: (v: number) => string
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#1E3A5F' }}>Tú: {tuTexto}</span>
        {suficiente && grupoValor !== null ? (
          <span style={{ fontSize: 13, color: '#6B7280' }}>Grupo: {formatoGrupo(grupoValor)}</span>
        ) : (
          <span style={{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>Aún no hay datos suficientes</span>
        )}
      </div>
    </div>
  )
}