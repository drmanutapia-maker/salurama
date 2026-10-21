'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

type CitaInfo = {
  pacienteNombre: string
  medicoNombre: string
  fechaFmt: string
  horaFmt: string
}

type Estado =
  | 'cargando'
  | 'invalido'
  | 'ya_procesada'
  | 'fuera_de_ventana'
  | 'confirmando'
  | 'cancelando'
  | 'cancelada'
  | 'error'

function CancelarCitaContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [estado, setEstado] = useState<Estado>('cargando')
  const [cita, setCita] = useState<CitaInfo | null>(null)
  const [whatsapp, setWhatsapp] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setEstado('invalido')
      return
    }
    fetch(`/api/citas/cancelar-por-token?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error === 'no_encontrado') setEstado('invalido')
        else if (data.error === 'ya_procesada') setEstado('ya_procesada')
        else if (data.fuera_de_ventana) {
          setWhatsapp(data.whatsapp_recepcion ?? null)
          setEstado('fuera_de_ventana')
        } else if (data.cita) {
          setCita(data.cita)
          setEstado('confirmando')
        } else {
          setEstado('error')
          setErrorMsg('No se pudo cargar la información de la cita.')
        }
      })
      .catch(() => {
        setEstado('error')
        setErrorMsg('Error al cargar la cita. Intenta de nuevo.')
      })
  }, [token])

  const confirmarCancelacion = async () => {
    if (!token) return
    setEstado('cancelando')
    try {
      const res = await fetch('/api/citas/cancelar-por-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelToken: token }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        setEstado('cancelada')
      } else {
        setErrorMsg(data?.error || 'No se pudo cancelar la cita.')
        setEstado('error')
      }
    } catch {
      setErrorMsg('Error al cancelar. Intenta de nuevo.')
      setEstado('error')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F9FAFB', display: 'flex',
      flexDirection: 'column', alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        width: '100%', background: '#1E3A5F', padding: '20px',
        textAlign: 'center', marginBottom: 32,
      }}>
        <span style={{ color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px' }}>
          Salurama
        </span>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        padding: '0 16px 40px',
      }}>
        <div style={{
          background: '#fff', borderRadius: 16,
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)', overflow: 'hidden',
        }}>

          {/* Cargando */}
          {estado === 'cargando' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 size={32} style={{ color: '#1E3A5F', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 12, color: '#6B7280', fontSize: 14 }}>Cargando información...</p>
            </div>
          )}

          {/* Link inválido */}
          {estado === 'invalido' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <XCircle size={40} style={{ color: '#DC2626', marginBottom: 12 }} />
              <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 18, fontWeight: 700 }}>
                Link inválido
              </h2>
              <p style={{ margin: 0, color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
                Este enlace no es válido o ha expirado.
              </p>
            </div>
          )}

          {/* Fuera de ventana */}
          {estado === 'fuera_de_ventana' && (
            <div style={{ padding: 32 }}>
              <XCircle size={40} style={{ color: '#D97706', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 18, fontWeight: 700, textAlign: 'center' }}>
                No es posible cancelar en línea
              </h2>
              <p style={{ margin: '0 0 20px', color: '#6B7280', fontSize: 14, lineHeight: 1.6, textAlign: 'center' }}>
                Esta cita ya no puede cancelarse en línea. Contacta directamente al consultorio para cancelar.
              </p>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[\s\-]/g, '')}?text=${encodeURIComponent('Hola, quisiera cancelar mi cita agendada a través de Salurama.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, background: '#25D366', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 10 }}
                >
                  📲 Contactar consultorio
                </a>
              )}
            </div>
          )}

          {/* Ya procesada */}
          {estado === 'ya_procesada' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: '#6B7280', marginBottom: 12 }} />
              <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 18, fontWeight: 700 }}>
                Esta cita ya fue procesada
              </h2>
              <p style={{ margin: 0, color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
                Esta cita ya fue cancelada o completada anteriormente.
              </p>
            </div>
          )}

          {/* Cancelada con éxito */}
          {estado === 'cancelada' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: '#2A9D8F', marginBottom: 12 }} />
              <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 18, fontWeight: 700 }}>
                Tu cita ha sido cancelada
              </h2>
              <p style={{ margin: 0, color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
                Hemos notificado al consultorio. Si tienes dudas, contáctalos directamente.
              </p>
            </div>
          )}

          {/* Error */}
          {estado === 'error' && (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <XCircle size={40} style={{ color: '#DC2626', marginBottom: 12 }} />
              <h2 style={{ margin: '0 0 8px', color: '#1F2937', fontSize: 18, fontWeight: 700 }}>
                Algo salió mal
              </h2>
              <p style={{ margin: 0, color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
                {errorMsg || 'Error inesperado. Intenta de nuevo.'}
              </p>
            </div>
          )}

          {/* Confirmación */}
          {(estado === 'confirmando' || estado === 'cancelando') && cita && (
            <div style={{ padding: 32 }}>
              <h2 style={{ margin: '0 0 4px', color: '#1E3A5F', fontSize: 20, fontWeight: 800 }}>
                Cancelar tu cita
              </h2>
              <p style={{ margin: '0 0 24px', color: '#6B7280', fontSize: 13 }}>
                Confirma que deseas cancelar la siguiente cita.
              </p>

              {/* Datos de la cita */}
              <div style={{
                background: '#F9FAFB', borderRadius: 12, padding: '16px 20px',
                marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <Row label="Paciente" value={cita.pacienteNombre} />
                <Row label="Médico" value={`Dr. ${cita.medicoNombre}`} />
                <Row label="Fecha" value={cita.fechaFmt} />
                <Row label="Hora" value={cita.horaFmt} />
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={confirmarCancelacion}
                  disabled={estado === 'cancelando'}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                    background: estado === 'cancelando' ? '#F87171' : '#DC2626',
                    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {estado === 'cancelando' && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                  {estado === 'cancelando' ? 'Cancelando...' : 'Cancelar mi cita'}
                </button>
                <a
                  href="/"
                  style={{
                    width: '100%', padding: '13px', borderRadius: 10, border: '1.5px solid #E5E7EB',
                    background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600,
                    textAlign: 'center', textDecoration: 'none', display: 'block', boxSizing: 'border-box',
                  }}
                >
                  No, mantener mi cita
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 13, color: '#9CA3AF', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1F2937', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

export default function CancelarCitaPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} style={{ color: '#1E3A5F', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <CancelarCitaContent />
    </Suspense>
  )
}
