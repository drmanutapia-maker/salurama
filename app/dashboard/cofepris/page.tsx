'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { isManuelEmail } from '@/lib/manuelOnly'
import {
  AlertTriangle, Check, Download, Upload, ExternalLink,
  FileText, ClipboardList, Hash, PartyPopper,
} from 'lucide-react'

interface Medico {
  id: string
  user_id: string
  has_aviso_funcionamiento: boolean | null
  cofepris_aviso_numero: string | null
  cofepris_acuse_url: string | null
  cofepris_aviso_fecha: string | null
}

type WizardStep = 1 | 2 | 3

const STEPS: { n: WizardStep; label: string }[] = [
  { n: 1, label: 'Proyecto de anuncio' },
  { n: 2, label: 'Trámite en DIGIPRiS' },
  { n: 3, label: 'Número de aviso' },
]

function Stepper({ current }: { current: WizardStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {STEPS.map((s, i) => {
        const done = s.n < current
        const active = s.n === current
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#2A9D8F' : active ? '#1E3A5F' : '#F3F4F6',
                color: done || active ? '#fff' : '#9CA3AF', fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}>
                {done ? <Check size={15} /> : s.n}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#1E3A5F' : '#9CA3AF', whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#2A9D8F' : '#F3F4F6', margin: '0 8px 20px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB' }

export default function CofeprisPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [medico, setMedico] = useState<Medico | null>(null)
  const [step, setStep] = useState<WizardStep>(1)

  // Gate
  const [gateChecked, setGateChecked] = useState(false)
  const [savingGate, setSavingGate] = useState(false)

  // Paso 3
  const [avisoNumero, setAvisoNumero] = useState('')
  const [savingNumero, setSavingNumero] = useState(false)
  const [uploadingAcuse, setUploadingAcuse] = useState(false)
  const [acuseSignedUrl, setAcuseSignedUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadAcuseSignedUrl = useCallback(async (path: string) => {
    const { data } = await supabase.storage.from('doctor-documents').createSignedUrl(path, 3600)
    setAcuseSignedUrl(data?.signedUrl || null)
  }, [])

  useEffect(() => {
    async function load() {
      const { user, networkError } = await getUserSafe(supabase)
      if (networkError) { setLoading(false); return }
      if (!user) { router.replace('/login'); return }

      // Aviso de Publicidad COFEPRIS: excepción de cuenta, no de plan — ver lib/manuelOnly.ts
      if (!isManuelEmail(user.email)) { router.replace('/dashboard'); return }

      const { data: doctor } = await supabase
        .from('doctors')
        .select('id, user_id, has_aviso_funcionamiento, cofepris_aviso_numero, cofepris_acuse_url, cofepris_aviso_fecha')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!doctor) { router.replace('/dashboard'); return }

      setMedico(doctor)
      setGateChecked(!!doctor.has_aviso_funcionamiento)
      setAvisoNumero(doctor.cofepris_aviso_numero || '')
      if (doctor.cofepris_acuse_url) await loadAcuseSignedUrl(doctor.cofepris_acuse_url)
      setLoading(false)
    }
    load()
  }, [router, loadAcuseSignedUrl])

  const handleSaveGate = async () => {
    if (!medico) return
    setSavingGate(true)
    try {
      const { error } = await supabase.from('doctors').update({ has_aviso_funcionamiento: gateChecked }).eq('id', medico.id)
      if (error) throw error
      setMedico(prev => prev ? { ...prev, has_aviso_funcionamiento: gateChecked } : prev)
    } catch {
      alert('Error al guardar. Intenta de nuevo.')
    } finally {
      setSavingGate(false)
    }
  }

  const handleSaveNumero = async () => {
    if (!medico) return
    setSavingNumero(true)
    try {
      const res = await fetch('/api/dashboard/cofepris/guardar-numero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aviso_numero: avisoNumero.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      const fecha = new Date().toISOString().slice(0, 10)
      setMedico(prev => prev ? { ...prev, cofepris_aviso_numero: avisoNumero.trim(), cofepris_aviso_fecha: fecha } : prev)
    } catch {
      alert('Error al guardar el número de aviso.')
    } finally {
      setSavingNumero(false)
    }
  }

  const handleUploadAcuse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !medico) return
    if (file.type !== 'application/pdf') { alert('Solo se aceptan archivos PDF'); return }
    if (file.size > 10 * 1024 * 1024) { alert('Máximo 10 MB'); return }

    setUploadingAcuse(true)
    try {
      const path = `${medico.user_id}/cofepris/acuse.pdf`
      const { error: uploadError } = await supabase.storage.from('doctor-documents').upload(path, file, { upsert: true, cacheControl: '0' })
      if (uploadError) throw uploadError

      const { error: updateError } = await supabase.from('doctors').update({ cofepris_acuse_url: path }).eq('id', medico.id)
      if (updateError) throw updateError

      setMedico(prev => prev ? { ...prev, cofepris_acuse_url: path } : prev)
      await loadAcuseSignedUrl(path)
    } catch (err) {
      console.error(err)
      alert('Error al subir el acuse')
    } finally {
      setUploadingAcuse(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%' }} />
      </div>
    )
  }
  if (!medico) return null

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#2A9D8F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Servicio opcional
        </p>
        <h1 style={{ fontFamily: 'Fraunces', fontSize: 28, fontWeight: 900, color: '#1E3A5F', marginBottom: 8 }}>
          Aviso de Publicidad COFEPRIS
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 28, lineHeight: 1.6 }}>
          Te ayudamos a preparar la documentación para tu Aviso de Publicidad ante COFEPRIS. No es obligatorio
          para usar Salurama ni afecta la visibilidad de tu perfil.
        </p>

        {medico.has_aviso_funcionamiento !== true ? (
          // ═══ GATE — sin numerar, no forma parte del stepper ═══
          <div style={cardStyle}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={gateChecked}
                onChange={e => setGateChecked(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 2 }}
              />
              <span style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>
                Cuento con mi Aviso de Funcionamiento de consultorio vigente
              </span>
            </label>
            <button
              onClick={handleSaveGate}
              disabled={savingGate}
              style={{ background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: savingGate ? 0.6 : 1 }}
            >
              {savingGate ? 'Guardando...' : 'Continuar'}
            </button>

            {medico.has_aviso_funcionamiento === false && (
              <div style={{ marginTop: 20, background: '#FFFBEB', border: '1.5px solid #FEF3C7', borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#B45309' }}>
                    El Aviso de Funcionamiento es un prerequisito
                  </p>
                </div>
                <p style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.7, marginBottom: 12 }}>
                  El Aviso de Publicidad ante COFEPRIS solo aplica a consultorios que ya cuentan con su Aviso de
                  Funcionamiento vigente ante la Secretaría de Salud. No podemos continuar con este asistente hasta
                  que lo tengas. El resto de tu perfil y de Salurama sigue funcionando normalmente mientras tanto.
                </p>
                <a
                  href="https://www.gob.mx/cofepris/acciones-y-programas/autorizacion-publicitaria"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#B45309', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  Consultar en gob.mx <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>
        ) : (
          // ═══ WIZARD ═══
          <>
            <Stepper current={step} />

            {step === 1 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <FileText size={20} color="#1E3A5F" />
                  <h2 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>Proyecto de anuncio</h2>
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18, lineHeight: 1.6 }}>
                  Genera un PDF base con tus datos de perfil (nombre, título, especialidad, cédula, foto y
                  descripción). Es un borrador de apoyo: revísalo antes de subirlo a DIGIPRiS, incluye un espacio
                  marcado para las leyendas legales obligatorias que aún están pendientes de revisión.
                </p>
                <a
                  href="/api/dashboard/cofepris/proyecto-pdf"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1E3A5F', color: '#fff', borderRadius: 12, padding: '12px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Download size={16} /> Descargar proyecto de anuncio (PDF)
                </a>
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={() => setStep(2)} style={{ background: '#F3F4F6', color: '#1E3A5F', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <ClipboardList size={20} color="#1E3A5F" />
                  <h2 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>Trámite en DIGIPRiS</h2>
                </div>
                <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  {[
                    'Ingresa a DIGIPRiS (trámites autogestivos de COFEPRIS) con tu e.firma (SAT).',
                    'Selecciona el trámite de Aviso de Publicidad, Modalidad A (actividades profesionales, no requiere aprobación previa).',
                    'Sube el PDF de tu proyecto de anuncio (el que generaste en el paso anterior).',
                    'Firma electrónicamente el trámite con tu e.firma.',
                    'Descarga tu acuse de recibido: trae el folio/número de aviso que necesitarás en el siguiente paso.',
                  ].map((paso, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{paso}</li>
                  ))}
                </ol>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href="https://www.gob.mx/cofepris/documentos/digipris-tramites-autogestivos?state=published" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    DIGIPRiS: trámites autogestivos (gob.mx) <ExternalLink size={13} />
                  </a>
                  <a href="https://www.gob.mx/cofepris/acciones-y-programas/autorizacion-publicitaria" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    Autorización publicitaria: información general (gob.mx) <ExternalLink size={13} />
                  </a>
                </div>
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
                  <button onClick={() => setStep(1)} style={{ background: 'none', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Atrás
                  </button>
                  <button onClick={() => setStep(3)} style={{ background: '#F3F4F6', color: '#1E3A5F', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Hash size={20} color="#1E3A5F" />
                  <h2 style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 900, color: '#1E3A5F' }}>Número de aviso y acuse</h2>
                </div>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 18, lineHeight: 1.6 }}>
                  Captura el folio de tu acuse de DIGIPRiS y sube el PDF del acuse. Queda guardado de forma privada,
                  solo tú puedes verlo.
                </p>

                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Número de aviso / folio</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <input
                    type="text"
                    value={avisoNumero}
                    onChange={e => setAvisoNumero(e.target.value)}
                    placeholder="Ej. 20260719A0001234"
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 10, fontSize: 14 }}
                  />
                  <button onClick={handleSaveNumero} disabled={savingNumero || !avisoNumero.trim()}
                    style={{ background: '#2A9D8F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: savingNumero || !avisoNumero.trim() ? 0.6 : 1 }}>
                    {savingNumero ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Acuse de recibido (PDF)</label>
                {medico.cofepris_acuse_url && acuseSignedUrl && (
                  <a href={acuseSignedUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1E3A5F', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 10 }}>
                    <FileText size={14} /> Ver acuse ya subido <ExternalLink size={12} />
                  </a>
                )}
                <div>
                  <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUploadAcuse} style={{ display: 'none' }} id="acuse-upload" disabled={uploadingAcuse} />
                  <label htmlFor="acuse-upload" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F3F4F6', color: '#1E3A5F', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: uploadingAcuse ? 'not-allowed' : 'pointer', opacity: uploadingAcuse ? 0.6 : 1 }}>
                    <Upload size={15} /> {uploadingAcuse ? 'Subiendo...' : medico.cofepris_acuse_url ? 'Reemplazar acuse' : 'Subir acuse (PDF)'}
                  </label>
                </div>

                {medico.cofepris_aviso_numero && medico.cofepris_acuse_url && (
                  <div style={{ marginTop: 24, background: '#ECFDF5', border: '1.5px solid #D1FAE5', borderRadius: 12, padding: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <PartyPopper size={20} color="#059669" />
                    <p style={{ fontSize: 13, color: '#065F46', fontWeight: 600 }}>
                      Listo: tu aviso de publicidad quedó registrado en tu perfil.
                    </p>
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <button onClick={() => setStep(2)} style={{ background: 'none', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Atrás
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
