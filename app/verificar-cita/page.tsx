'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

function VerificarCitaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token no válido.')
      return
    }

    async function verify() {
      const { data: cita, error } = await supabase
        .from('citas')
        .select('*')
        .eq('verification_token', token)
        .single()

      if (error || !cita) {
        setStatus('error')
        setMessage('Este enlace no es válido o ya expiró.')
        return
      }

      if (cita.estado === 'confirmed') {
        setStatus('success')
        setMessage('Esta cita ya estaba confirmada.')
        return
      }

      const { error: updateError } = await supabase
        .from('citas')
        .update({ estado: 'confirmed' })
        .eq('id', cita.id)

      if (updateError) {
        setStatus('error')
        setMessage('Error al confirmar la cita. Intenta de nuevo.')
        return
      }

      // Notificar al médico
      const { data: citaData } = await supabase
        .from('citas')
        .select('medico_id, paciente_nombre, fecha, hora')
        .eq('id', cita.id)
        .single()

      if (citaData) {
        const { data: medicoData } = await supabase
          .from('doctors')
          .select('email, full_name')
          .eq('id', citaData.medico_id)
          .single()

        if (medicoData?.email) {
          const d = new Date(citaData.fecha + 'T00:00:00')
          const fechaFormateada = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

          fetch('/api/notify-doctor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: medicoData.email,
              doctorName: medicoData.full_name,
              patientName: citaData.paciente_nombre,
              fecha: fechaFormateada,
              hora: citaData.hora?.slice(0, 5),
            }),
          }).catch(console.error)
        }
      }

      setStatus('success')
      setMessage('¡Cita confirmada con éxito!')
    }

    verify()
  }, [token])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", background: '#F9FAFB', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 40, maxWidth: 500, width: '100%', textAlign: 'center', border: '1px solid #E5E7EB' }}>
        {status === 'loading' && (
          <>
            <Loader2 size={48} color="#8B5CF6" style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F', marginBottom: 8 }}>Verificando cita...</h2>
            <p style={{ color: '#6B7280', fontSize: 14 }}>Estamos confirmando tu cita.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ width: 64, height: 64, background: '#ECFDF5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle size={32} color="#10B981" />
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#065F46', marginBottom: 8 }}>¡Confirmada!</h2>
            <p style={{ color: '#047857', fontSize: 14, marginBottom: 24 }}>{message}</p>
            <button onClick={() => router.push('/')} style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Ir al inicio
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ width: 64, height: 64, background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <XCircle size={32} color="#DC2626" />
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#991B1B', marginBottom: 8 }}>Error</h2>
            <p style={{ color: '#7F1D1D', fontSize: 14, marginBottom: 24 }}>{message}</p>
            <button onClick={() => router.push('/')} style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Ir al inicio
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerificarCitaPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
        <Loader2 size={32} color="#8B5CF6" style={{ animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <VerificarCitaContent />
    </Suspense>
  )
}