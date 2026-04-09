'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, XCircle, Star } from 'lucide-react'

export default function VerifyReviewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [appointmentData, setAppointmentData] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      return
    }

    supabase
      .from('appointment_requests')
      .select(`
        *,
        doctors (full_name)
      `)
      .eq('review_token', token)
      .eq('review_sent', true)
      .eq('review_verified', false)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('error')
          return
        }
        setAppointmentData(data)
        setStatus('success')
      })
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appointmentData) return

    setSubmitting(true)
    try {
      // Insertar reseña verificada
      const { error: reviewError } = await supabase.from('reviews').insert({
        doctor_id: appointmentData.doctor_id,
        user_name: appointmentData.patient_name,
        user_email: appointmentData.patient_email,
        rating: rating,
        comment: comment,
        email_verified: true,
        verified_at: new Date().toISOString(),
        is_visible: true,
        appointment_id: appointmentData.id
      })

      if (reviewError) throw reviewError

      // Marcar cita como verificada
      await supabase
        .from('appointment_requests')
        .update({ review_verified: true })
        .eq('id', appointmentData.id)

      alert('¡Gracias por tu reseña verificada! ✓')
      router.push(`/doctor/${appointmentData.doctor_id}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar la reseña')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#3730A3', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9CA3AF' }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <XCircle size={64} color="#DC2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, color: '#1A1A2E', marginBottom: 8 }}>
            Link inválido o expirado
          </h2>
          <p style={{ color: '#6B7280' }}>
            Este link de verificación ya fue usado o ha expirado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <CheckCircle size={64} color="#059669" style={{ margin: '0 auto 16px', display: 'block' }} />
          
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, color: '#1A1A2E', textAlign: 'center', marginBottom: 8 }}>
            ¡Tu opinión importa!
          </h1>
          
          <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: 32 }}>
            Cita con el Dr. {appointmentData?.doctors?.full_name} - {new Date(appointmentData?.requested_date).toLocaleDateString('es-MX')}
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                ¿Cómo calificarías tu experiencia?
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <Star
                      size={32}
                      fill={star <= rating ? '#F59E0B' : 'none'}
                      color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Cuéntanos tu experiencia (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: 12, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
                placeholder="Comparte tu experiencia con otros pacientes..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                background: submitting ? '#9CA3AF' : 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: 14,
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Enviando...' : 'Enviar reseña verificada ✓'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}