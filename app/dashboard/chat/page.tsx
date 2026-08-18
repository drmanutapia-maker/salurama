'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { CheckCircle, XCircle } from 'lucide-react'
import ConversacionesLista, { ConversacionResumen } from '@/components/chat/ConversacionesLista'
import ConversacionChat from '@/components/chat/ConversacionChat'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'

export default function ChatPage() {
  const router = useRouter()
  const [medicoId, setMedicoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<PageErrorType | null>(null)
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState<ConversacionResumen | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const cancelRef = useRef(false)
  const initialCheckDoneRef = useRef(false)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    cancelRef.current = false
    setLoading(true)
    setLoadError(null)
    const { user, networkError } = await getUserSafe(supabase)
    initialCheckDoneRef.current = true
    if (networkError) { if (!cancelRef.current) { setLoadError('network'); setLoading(false) }; return }
    if (!user) { router.push('/login'); return }

    try {
      const { data: medicoData, error: medicoErr } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (medicoErr) throw medicoErr

      if (!medicoData) { router.push('/dashboard'); return }

      if (!cancelRef.current) { setMedicoId(medicoData.id); setLoading(false) }
    } catch (err) {
      if (!cancelRef.current) { setLoadError(classifyError(err)); setLoading(false) }
    }
  }, [router])

  useEffect(() => {
    // Ignora el evento INITIAL_SESSION con session=null que puede llegar
    // mientras el cliente todavía está leyendo la cookie (justo después de
    // navegar aquí) — mismo criterio que app/dashboard/page.tsx, para no
    // rebotar a /login por una sesión válida que solo tardó en confirmarse.
    initialCheckDoneRef.current = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!initialCheckDoneRef.current) return
      if (!session) router.push('/login')
    })

    load()

    return () => { cancelRef.current = true; subscription.unsubscribe() }
  }, [load])

  if (loadError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <PageErrorState type={loadError} onRetry={load} />
    </div>
  )

  if (loading || !medicoId) return <ChatSkeleton />

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease-out; }
      `}</style>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: toast.type === 'success' ? '#059669' : '#DC2626', border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          {toast.type === 'success' ? <CheckCircle size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Chat</h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>Conversaciones con tus pacientes</p>
        </div>

        <div className="fade-up">
          {conversacionSeleccionada ? (
            <ConversacionChat
              conversacion={conversacionSeleccionada}
              onVolver={() => setConversacionSeleccionada(null)}
              onError={(msg) => showToast(msg, 'error')}
            />
          ) : (
            <ConversacionesLista medicoId={medicoId} onSeleccionar={setConversacionSeleccionada} />
          )}
        </div>
      </div>
    </div>
  )
}

// Skeleton de Chat — título + lista de conversaciones fantasma, misma
// estructura que ConversacionesLista para que la carga no salte.
function ChatSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif" }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando chat…
      </span>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <Skeleton width={100} height={28} style={{ marginBottom: 8 }} />
          <Skeleton width={220} height={16} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: '14px 16px' }}>
              <Skeleton width={44} height={44} radius={999} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton width="40%" height={15} />
                <Skeleton width="60%" height={13} />
              </div>
              <Skeleton width={30} height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
