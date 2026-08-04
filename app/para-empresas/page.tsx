'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Database, Quote, ShieldCheck, Send, Check } from 'lucide-react'

type FormState = 'idle' | 'sending' | 'sent' | 'error'

export default function ParaEmpresas() {
  const [form, setForm] = useState({ nombre: '', empresa: '', correo: '', mensaje: '' })
  const [state, setState] = useState<FormState>('idle')

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('sending')

    try {
      const res = await fetch('/api/contacto-empresas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })

      if (!res.ok) throw new Error('request failed')

      setState('sent')
      setForm({ nombre: '', empresa: '', correo: '', mensaje: '' })
    } catch {
      setState('error')
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#fff', minHeight: '100vh', color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;0,900;1,600&family=DM+Sans:wght@300;400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .pe-card { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px; padding: 24px 20px; }
        .pe-icon { width: 42px; height: 42px; border-radius: 10px; background: #E8ECF3;
          display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
        .pe-input { width: 100%; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #111827;
          border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 11px 14px; outline: none;
          transition: border-color 0.15s; }
        .pe-input:focus { border-color: #1E3A5F; }
        .pe-label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
        @media (max-width: 768px) {
          .pe-grid-3 { grid-template-columns: 1fr !important; }
          .pe-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(160deg, #E8ECF3 0%, #fff 60%)', padding: 'clamp(56px,8vw,84px) 20px clamp(44px,6vw,64px)', textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            Para empresas farmacéuticas
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(30px,6vw,48px)', fontWeight: 900, color: '#0D1829', lineHeight: 1.15, marginBottom: 20 }}>
            Salurama MSL Virtual: Llega a los médicos que prescriben tus productos.
          </h1>
          <p style={{ fontSize: 'clamp(15px,3vw,18px)', color: '#4A5568', lineHeight: 1.8, maxWidth: 580, margin: '0 auto 32px' }}>
            Información científica balanceada, anclada en literatura verificada, no publicidad.
            MSL Virtual responde preguntas clínicas de hematólogos y oncólogos con las mismas
            exigencias de rigor y trazabilidad que un Medical Science Liaison humano.
          </p>
          <a
            href="#contacto"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1E3A5F', color: '#fff',
              fontWeight: 700, textDecoration: 'none', padding: '13px 28px', borderRadius: 50, fontSize: 15 }}
          >
            Hablemos de tu contenido científico →
          </a>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section style={{ padding: 'clamp(48px,6vw,64px) 20px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
            Cómo funciona
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(24px,4vw,32px)', fontWeight: 900, color: '#0D1829', textAlign: 'center', marginBottom: 14, lineHeight: 1.25 }}>
            Un modelo de recuperación aumentada, no un generador de texto libre
          </h2>
          <p style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 1.8, maxWidth: 640, margin: '0 auto 40px' }}>
            MSL Virtual utiliza arquitectura RAG (Retrieval-Augmented Generation) sobre un corpus
            cerrado de literatura científica verificada. Cada respuesta se construye a partir de
            fragmentos recuperados de ese corpus, no de conocimiento generado libremente por el modelo.
          </p>

          <div className="pe-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            <div className="pe-card">
              <div className="pe-icon"><Database size={20} color="#1E3A5F" /></div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Corpus verificado</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, fontWeight: 300 }}>
                Publicaciones científicas curadas y validadas antes de incorporarse al sistema. El modelo
                no navega internet ni usa conocimiento externo al corpus en tiempo de respuesta.
              </p>
            </div>
            <div className="pe-card">
              <div className="pe-icon"><Quote size={20} color="#1E3A5F" /></div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Respuestas ancladas y citadas</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, fontWeight: 300 }}>
                Cada afirmación clínica relevante se atribuye explícitamente a su fuente (autor, journal,
                año). El médico ve de dónde sale cada dato, no solo la conclusión.
              </p>
            </div>
            <div className="pe-card">
              <div className="pe-icon"><ShieldCheck size={20} color="#1E3A5F" /></div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Sin inventar datos clínicos</p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, fontWeight: 300 }}>
                Si el corpus no contiene información suficiente para responder con precisión, el sistema
                lo dice explícitamente en vez de extrapolar o inferir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAPTURAS ── */}
      <section style={{ padding: 'clamp(48px,6vw,64px) 20px', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            El producto
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, color: '#0D1829', marginBottom: 32, lineHeight: 1.25 }}>
            MSL Virtual en la práctica
          </h2>

          <div className="pe-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, textAlign: 'left' }}>
            {[
              {
                src:   '/para-empresas/msl-virtual-criterios-diagnosticos.png',
                alt:   'Chat de MSL Virtual mostrando la pregunta "Criterios diagnóstico de mieloma múltiple" y el inicio de la respuesta basada en las guías NCCN 2026',
                title: 'La pregunta',
                desc:  'El médico pregunta en lenguaje natural, dentro de su flujo clínico.',
              },
              {
                src:   '/para-empresas/msl-virtual-tabla-crab.png',
                alt:   'Respuesta de MSL Virtual con tabla estructurada de criterios CRAB (Hipercalcemia, Insuficiencia renal, Anemia, Lesiones óseas)',
                title: 'Respuesta estructurada',
                desc:  'La información se organiza en tablas y criterios claros, no en texto libre.',
              },
              {
                src:   '/para-empresas/msl-virtual-fuentes-verificadas.png',
                alt:   'Bloque de fuentes de MSL Virtual mostrando la guía NCCN Clinical Practice Guidelines in Oncology con etiqueta "Verificado"',
                title: 'Fuentes verificadas',
                desc:  'Cada respuesta cita su fuente exacta, con etiqueta de verificación visible.',
              },
            ].map(shot => (
              <figure key={shot.src} className="pe-card" style={{ padding: 0, overflow: 'hidden' }}>
                <figcaption style={{ padding: '16px 18px 18px', borderBottom: '1.5px solid #E5E7EB' }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>{shot.title}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, fontWeight: 300, margin: 0 }}>{shot.desc}</p>
                </figcaption>
                <img
                  src={shot.src}
                  alt={shot.alt}
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── VALOR ── */}
      <section style={{ padding: 'clamp(48px,6vw,64px) 20px', background: '#fff' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
            Dónde encaja tu contenido
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,4vw,28px)', fontWeight: 900, color: '#0D1829', marginBottom: 16, lineHeight: 1.25 }}>
            El médico ya está preguntando
          </h2>
          <p style={{ fontSize: 15, color: '#4A5568', lineHeight: 1.85 }}>
            Los médicos preguntan sobre criterios diagnósticos, regímenes de tratamiento y manejo de
            comorbilidades. Tu contenido científico puede responder esas preguntas directamente donde
            el médico ya está trabajando, dentro de su flujo clínico, no en un canal publicitario aparte.
          </p>
        </div>
      </section>

      {/* ── FORMULARIO DE CONTACTO ── */}
      <section id="contacto" style={{ background: '#1E3A5F', padding: 'clamp(48px,6vw,64px) 20px' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#7EA8C9', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, textAlign: 'center' }}>
            Contacto
          </p>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: '#fff', marginBottom: 28, lineHeight: 1.3, textAlign: 'center' }}>
            Cuéntanos sobre tu contenido científico
          </h2>

          {state === 'sent' ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
              <Check size={28} color="#2A9D8F" style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Mensaje enviado</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>Te contactaremos pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="pe-label">Nombre</label>
                <input className="pe-input" required value={form.nombre} onChange={handleChange('nombre')} />
              </div>
              <div>
                <label className="pe-label">Empresa</label>
                <input className="pe-input" required value={form.empresa} onChange={handleChange('empresa')} />
              </div>
              <div>
                <label className="pe-label">Correo</label>
                <input className="pe-input" type="email" required value={form.correo} onChange={handleChange('correo')} />
              </div>
              <div>
                <label className="pe-label">Mensaje</label>
                <textarea className="pe-input" required rows={4} style={{ resize: 'vertical' }} value={form.mensaje} onChange={handleChange('mensaje')} />
              </div>

              {state === 'error' && (
                <p style={{ fontSize: 13, color: '#DC2626' }}>
                  No se pudo enviar el mensaje. Intenta de nuevo o escríbenos directo a contacto@salurama.com.
                </p>
              )}

              <button
                type="submit"
                disabled={state === 'sending'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 50, padding: '13px 20px',
                  fontSize: 14, fontWeight: 700, cursor: state === 'sending' ? 'default' : 'pointer',
                  opacity: state === 'sending' ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}
              >
                <Send size={15} />
                {state === 'sending' ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24 }}>
            <Link href="/documentos-adicionales/contrato-b2b" style={{ fontSize: 13, color: '#9FB0C9', textDecoration: 'underline' }}>
              Contrato B2B
            </Link>
            <Link href="/documentos-adicionales/publicidad-etica" style={{ fontSize: 13, color: '#9FB0C9', textDecoration: 'underline' }}>
              Ética Publicitaria
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
