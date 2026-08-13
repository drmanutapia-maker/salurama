'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { CheckCircle, XCircle } from 'lucide-react'
import ConversacionesLista, { ConversacionResumen } from '@/components/chat/ConversacionesLista'
import ConversacionChat from '@/components/chat/ConversacionChat'

export default function ChatPage() {
  const router = useRouter()
  const [medicoId, setMedicoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [conversacionSeleccionada, setConversacionSeleccionada] = useState<ConversacionResumen | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    let mounted = true
    // Ignora el evento INITIAL_SESSION con session=null que puede llegar
    // mientras el cliente todavía está leyendo la cookie (justo después de
    // navegar aquí) — mismo criterio que app/dashboard/page.tsx, para no
    // rebotar a /login por una sesión válida que solo tardó en confirmarse.
    let initialCheckDone = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!initialCheckDone) return
      if (!session && mounted) router.push('/login')
    })

    async function load() {
      const { user, networkError } = await getUserSafe(supabase)
      initialCheckDone = true
      if (networkError) { if (mounted) { setLoadError(true); setLoading(false) }; return }
      if (!user) { if (mounted) router.push('/login'); return }

      const { data: medicoData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!medicoData) { if (mounted) router.push('/dashboard'); return }

      if (!mounted) return
      setMedicoId(medicoData.id)
      setLoading(false)
    }
    load()

    return () => { mounted = false; subscription.unsubscribe() }
  }, [router])

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

  if (loading || !medicoId) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando chat...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.35s ease-out; }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, background: toast.type === 'success' ? '#DCFCE7' : '#FEF2F2', color: toast.type === 'success' ? '#059669' : '#DC2626', border: `1px solid ${toast.type === 'success' ? '#86EFAC' : '#FECACA'}`, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <XCircle size={15} />}
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
