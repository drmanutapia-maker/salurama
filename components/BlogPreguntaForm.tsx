'use client'
import { useState } from 'react'
import { Send, CheckCircle2 } from 'lucide-react'

export default function BlogPreguntaForm({ articuloId }: { articuloId: string }) {
  const [pregunta, setPregunta] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pregunta.trim().length < 5) {
      setError('Escribe tu pregunta con un poco más de detalle.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/blog/preguntas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articuloId, pregunta: pregunta.trim(), nombre: nombre.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar tu pregunta. Intenta de nuevo.')
        return
      }
      setEnviada(true)
    } catch {
      setError('No se pudo enviar tu pregunta. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (enviada) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 22px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14 }}>
        <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 14, color: '#065F46', lineHeight: 1.5 }}>
          Gracias, recibimos tu pregunta. Podría inspirar un próximo artículo.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '22px 22px 24px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 14 }}>
      <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 900, color: '#1E3A5F', marginBottom: 6 }}>
        ¿Te quedó alguna duda?
      </p>
      <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 16 }}>
        Mándanos tu pregunta sobre este tema. No respondemos casos individuales, pero tus preguntas nos ayudan a elegir el tema del próximo artículo.
      </p>
      <textarea
        value={pregunta}
        onChange={e => setPregunta(e.target.value)}
        placeholder="Escribe tu pregunta..."
        maxLength={1000}
        rows={3}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111827', resize: 'vertical', marginBottom: 10 }}
      />
      <input
        type="text"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Tu nombre (opcional)"
        maxLength={100}
        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #E5E7EB', fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111827', marginBottom: 12 }}
      />
      {error && <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</p>}
      <button
        type="submit"
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: loading ? '#9CA3AF' : '#1E3A5F', color: '#fff', fontWeight: 700,
          border: 'none', padding: '11px 24px', borderRadius: 50, fontSize: 14,
          fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Enviando...' : 'Enviar pregunta'} <Send size={15} />
      </button>
    </form>
  )
}
