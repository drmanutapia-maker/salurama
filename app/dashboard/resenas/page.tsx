'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Star, ArrowLeft, FileText, FileSpreadsheet, Pencil, Trash2 } from 'lucide-react'
import { getUserSafe } from '@/lib/getUserSafe'

const RESPUESTA_MAX = 1000

interface ReviewResponse {
  id: string
  respuesta: string
  created_at: string
  updated_at: string
}

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  respuesta: ReviewResponse | null
}

export default function ResenasPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [filtro, setFiltro] = useState<number | null>(null)
  const [doctorId, setDoctorId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError) { setLoadError(true); setLoading(false); return }
      if (!user) { await supabase.auth.signOut(); router.push('/login'); return }

      const { data: doc } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!doc) { router.push('/dashboard'); return }
      setDoctorId(doc.id)

      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, respuesta:review_responses(id, respuesta, created_at, updated_at)')
        .eq('doctor_id', doc.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })

      const normalizado = (data || []).map((r: any) => ({
        ...r,
        respuesta: Array.isArray(r.respuesta) ? (r.respuesta[0] ?? null) : (r.respuesta ?? null),
      }))
      setReviews(normalizado as Review[])
      setLoading(false)
    }
    load()
  }, [router])

  const ratingPromedio = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const reviewsFiltradas = filtro !== null ? reviews.filter((r) => r.rating === filtro) : reviews

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
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando reseñas...</p>
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
        .fade-up { animation: fadeUp 0.4s ease-out; }
        .card { background:#fff; border-radius:16px; border:1px solid #E5E7EB; padding:24px; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <button
            onClick={() => router.push('/dashboard/estadisticas')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, padding: 0 }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Reseñas</h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            {reviews.length > 0
              ? <>Promedio de <strong style={{ color: '#D97706' }}>{ratingPromedio.toFixed(1)} ★</strong> con {reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</>
              : 'Aún no tienes reseñas'}
          </p>
        </div>

        {/* Reportes descargables */}
        <div className="card fade-up" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Reportes descargables</p>
            <p style={{ fontSize: 12, color: '#6B7280' }}>Exporta todas tus reseñas en PDF o Excel.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/api/resenas/pdf" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1E3A5F', color: '#fff', textDecoration: 'none', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
              <FileText size={14} /> PDF
            </a>
            <a href="/api/resenas/excel" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2A9D8F', color: '#fff', textDecoration: 'none', borderRadius: 50, padding: '10px 18px', fontSize: 13, fontWeight: 600 }}>
              <FileSpreadsheet size={14} /> Excel
            </a>
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="card fade-up" style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Filtrar por calificación</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {[null, 5, 4, 3, 2, 1].map((f) => {
                const count = f === null ? reviews.length : reviews.filter((r) => r.rating === f).length
                const active = filtro === f
                return (
                  <button
                    key={f ?? 'todas'}
                    onClick={() => setFiltro(f)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: active ? '#1E3A5F' : '#F3F4F6', color: active ? '#fff' : '#4A5568',
                      border: 'none', borderRadius: 50, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {f === null ? 'Todas' : <>{f} <Star size={11} fill={active ? '#fff' : '#F59E0B'} color={active ? '#fff' : '#F59E0B'} /></>} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {reviewsFiltradas.length === 0 ? (
          <div className="card fade-up" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ fontSize: 14, color: '#9CA3AF' }}>
              {reviews.length === 0 ? 'Cuando tus pacientes dejen reseñas, aparecerán aquí.' : 'No tienes reseñas con esa calificación.'}
            </p>
          </div>
        ) : (
          <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviewsFiltradas.map((r) => (
              <div key={r.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} color="#F59E0B" fill={s <= r.rating ? '#F59E0B' : 'none'} />
                    ))}
                  </div>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {new Date(r.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                {r.comment && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>{r.comment}</p>}
                {doctorId && (
                  <RespuestaMedico
                    review={r}
                    doctorId={doctorId}
                    onChange={(respuesta) => {
                      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, respuesta } : x)))
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RespuestaMedico({
  review,
  doctorId,
  onChange,
}: {
  review: Review
  doctorId: string
  onChange: (respuesta: ReviewResponse | null) => void
}) {
  const [editando, setEditando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [texto, setTexto] = useState(review.respuesta?.respuesta ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    const limpio = texto.trim()
    if (!limpio) { setError('Escribe una respuesta antes de publicar.'); return }
    setGuardando(true)
    setError(null)

    if (review.respuesta) {
      const { data, error: err } = await supabase
        .from('review_responses')
        .update({ respuesta: limpio, updated_at: new Date().toISOString() })
        .eq('id', review.respuesta.id)
        .select('id, respuesta, created_at, updated_at')
        .single()
      setGuardando(false)
      if (err || !data) { setError('No se pudo guardar la edición. Intenta de nuevo.'); return }
      onChange(data as ReviewResponse)
      setEditando(false)
    } else {
      const { data, error: err } = await supabase
        .from('review_responses')
        .insert({ review_id: review.id, doctor_id: doctorId, respuesta: limpio })
        .select('id, respuesta, created_at, updated_at')
        .single()
      setGuardando(false)
      if (err || !data) { setError('No se pudo publicar la respuesta. Intenta de nuevo.'); return }
      onChange(data as ReviewResponse)
      setEditando(false)

      // Solo al crear, nunca al editar. No se espera — la moderación nunca
      // debe retrasar que el médico vea su respuesta publicada.
      supabase.auth.getSession().then(({ data: sess }) => {
        const token = sess.session?.access_token
        if (!token) return
        fetch('/api/dashboard/resenas/moderar-respuesta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ responseId: data.id }),
        }).catch(() => {})
      })
    }
  }

  async function eliminar() {
    if (!review.respuesta) return
    setBorrando(true)
    const { error: err } = await supabase.from('review_responses').delete().eq('id', review.respuesta.id)
    setBorrando(false)
    if (err) { setError('No se pudo eliminar la respuesta. Intenta de nuevo.'); return }
    onChange(null)
    setTexto('')
  }

  if (review.respuesta && !editando) {
    return (
      <div style={{ marginTop: 12, padding: 14, background: '#F0F4F8', borderRadius: 12, borderLeft: '3px solid #1E3A5F' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#1E3A5F', marginBottom: 6 }}>Tu respuesta</p>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{review.respuesta.respuesta}</p>
        <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
          <button
            onClick={() => { setTexto(review.respuesta!.respuesta); setEditando(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#1E3A5F', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            <Pencil size={12} /> Editar
          </button>
          <button
            onClick={eliminar}
            disabled={borrando}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: borrando ? 'default' : 'pointer', padding: 0, opacity: borrando ? 0.6 : 1 }}
          >
            <Trash2 size={12} /> {borrando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{error}</p>}
      </div>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, RESPUESTA_MAX))}
        placeholder="Responde a esta reseña..."
        rows={3}
        style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{texto.length}/{RESPUESTA_MAX}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {editando && (
            <button
              onClick={() => { setEditando(false); setTexto(review.respuesta?.respuesta ?? ''); setError(null) }}
              style={{ background: '#F3F4F6', color: '#4A5568', border: 'none', borderRadius: 50, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={guardar}
            disabled={guardando || !texto.trim()}
            style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 50, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: guardando ? 'default' : 'pointer', opacity: guardando || !texto.trim() ? 0.6 : 1 }}
          >
            {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Responder'}
          </button>
        </div>
      </div>
      {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{error}</p>}
    </div>
  )
}
