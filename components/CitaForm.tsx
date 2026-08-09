'use client'
import { useState, useRef } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { fechaISOLocal } from '@/lib/citas/fechas'

export default function CitaForm({ medicoId, medicoNombre }: { medicoId: string, medicoNombre: string }) {
  const [formLoadTime] = useState(Date.now())
  const [turnstileToken, setTurnstileToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicoId,
          pacienteNombre: formData.get('nombre'),
          pacienteEmail: formData.get('email'),
          pacienteTelefono: formData.get('telefono'),
          fecha: formData.get('fecha'),
          hora: formData.get('hora'),
          motivo: formData.get('motivo'),
          turnstileToken,
          honeypot: formData.get('website'),
          formLoadTime: Date.now() - formLoadTime,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setSuccess(true)
      formRef.current?.reset()
    } catch (error: any) {
      alert(error.message || 'Error al agendar')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: 32, background: '#ECFDF5', borderRadius: 12, textAlign: 'center' }}>
        <h3 style={{ color: '#059669', marginBottom: 8 }}>¡Cita solicitada!</h3>
        <p style={{ color: '#047857' }}>Revisa tu email para confirmar. Tienes 24 horas.</p>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} />
      <input name="nombre" required placeholder="Tu nombre completo" style={inputStyle} />
      <input name="email" type="email" required placeholder="tu@email.com" style={inputStyle} />
      <input name="telefono" required placeholder="55 1234 5678" style={inputStyle} />
      <input name="fecha" type="date" required style={inputStyle} min={fechaISOLocal(new Date())} />
      <input name="hora" type="time" required style={inputStyle} />
      <textarea name="motivo" placeholder="Motivo de consulta (opcional)" rows={3} style={inputStyle} />
      <Turnstile siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} onSuccess={setTurnstileToken} options={{ theme: 'light' }} />
      <button type="submit" disabled={loading ||!turnstileToken} style={{...inputStyle, background: '#0F4C75', color: 'white', border: 'none', cursor: loading? 'not-allowed' : 'pointer', opacity: loading ||!turnstileToken? 0.6 : 1 }}>
        {loading? 'Agendando...' : 'Agendar cita'}
      </button>
    </form>
  )
}

const inputStyle = { padding: '12px 16px', borderRadius: 8, border: '1.5px solid #E5E7EB', fontSize: 15, outline: 'none' } as const