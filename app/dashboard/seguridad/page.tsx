'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { ShieldCheck, Smartphone, LogOut, Fingerprint, CheckCircle } from 'lucide-react'
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser'

interface SessionRow {
  id: string
  device: string
  ip: string | null
  createdAt: string
  lastActiveAt: string
  isCurrent: boolean
}

function formatRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutos = Math.floor(diffMs / 60000)
  if (minutos < 1) return 'justo ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return `hace ${dias} día${dias === 1 ? '' : 's'}`
}

export default function SeguridadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [revoking, setRevoking] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [webauthnSoportado, setWebauthnSoportado] = useState(false)
  const [activandoBiometrico, setActivandoBiometrico] = useState(false)
  const [biometricoActivado, setBiometricoActivado] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const cargarSesiones = useCallback(async () => {
    const res = await fetch('/api/sessions')
    if (!res.ok) throw new Error('fetch_failed')
    const { sessions } = await res.json()
    setSessions(sessions || [])
  }, [])

  useEffect(() => {
    let mounted = true
    // Ignora el evento INITIAL_SESSION con session=null que puede llegar
    // mientras el cliente todavía está leyendo la cookie (justo después de
    // navegar aquí) — mismo criterio que app/dashboard/page.tsx, para no
    // rebotar a /login por una sesión válida que solo tardó en confirmarse.
    // Esta página en particular es donde se confirmó en vivo (Fase 2 del
    // biométrico) que la carga se quedaba pegada por esta misma carrera.
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

      try {
        await cargarSesiones()
      } catch {
        if (mounted) setLoadError(true)
      }
      if (mounted) setLoading(false)
    }
    load()
    setWebauthnSoportado(browserSupportsWebAuthn())

    return () => { mounted = false; subscription.unsubscribe() }
  }, [router, cargarSesiones])

  const activarBiometrico = async () => {
    setActivandoBiometrico(true)
    try {
      const resOpciones = await fetch('/api/webauthn/registro/opciones', { method: 'POST' })
      if (!resOpciones.ok) throw new Error('opciones_failed')
      const { options } = await resOpciones.json()

      const credencial = await startRegistration({ optionsJSON: options })

      const resVerificar = await fetch('/api/webauthn/registro/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: credencial }),
      })
      if (!resVerificar.ok) throw new Error('verificar_failed')

      setBiometricoActivado(true)
      showToast('Biométrico activado en este dispositivo', 'success')
    } catch (err: any) {
      // El usuario cancelo el prompt del sistema operativo (huella/Face ID) --
      // no es un error real, no hace falta un toast rojo por esto.
      if (err?.name === 'NotAllowedError') return
      showToast('No se pudo activar el biométrico. Intenta de nuevo.', 'error')
    } finally {
      setActivandoBiometrico(false)
    }
  }

  const revocar = async (sessionId: string, esActual: boolean) => {
    if (esActual && !window.confirm('¿Cerrar sesión en este dispositivo? Tendrás que iniciar sesión de nuevo.')) return

    setRevoking(sessionId)
    try {
      const res = await fetch('/api/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (!res.ok) throw new Error('revoke_failed')

      if (esActual) {
        window.location.href = '/login'
        return
      }

      showToast('Sesión cerrada', 'success')
      await cargarSesiones()
    } catch {
      showToast('Error al cerrar la sesión', 'error')
    } finally {
      setRevoking(null)
    }
  }

  const cerrarTodasLasDemas = async () => {
    if (!window.confirm('¿Cerrar todas las demás sesiones? Esos dispositivos tendrán que iniciar sesión de nuevo.')) return

    setRevoking('all')
    try {
      const res = await fetch('/api/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) throw new Error('revoke_all_failed')
      showToast('Se cerraron las demás sesiones', 'success')
      await cargarSesiones()
    } catch {
      showToast('Error al cerrar las demás sesiones', 'error')
    } finally {
      setRevoking(null)
    }
  }

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
        <div style={{ width: 40, height: 40, border: '3px solid #EEF2FF', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>Cargando sesiones...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const otras = sessions.filter(s => !s.isCurrent)

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={22} color="#1E3A5F" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>Seguridad</h1>
        </div>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
          Estos son los dispositivos con sesión activa en tu cuenta. Si no reconoces alguno, ciérralo de inmediato.
        </p>

        {webauthnSoportado && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E8F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Fingerprint size={20} color="#2A9D8F" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Inicio de sesión con huella o Face ID</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                Actívalo para entrar sin escribir tu contraseña en este dispositivo.
              </p>
            </div>
            {biometricoActivado ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                <CheckCircle size={16} /> Activado
              </span>
            ) : (
              <button
                onClick={activarBiometrico}
                disabled={activandoBiometrico}
                style={{
                  background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10,
                  padding: '9px 16px', fontSize: 13, fontWeight: 600,
                  cursor: activandoBiometrico ? 'not-allowed' : 'pointer', opacity: activandoBiometrico ? 0.6 : 1, flexShrink: 0,
                }}
              >
                {activandoBiometrico ? 'Activando...' : 'Activar'}
              </button>
            )}
          </div>
        )}

        {otras.length > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={cerrarTodasLasDemas}
              disabled={revoking !== null}
              style={{ background: '#fff', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: revoking ? 'not-allowed' : 'pointer', opacity: revoking ? 0.6 : 1 }}
            >
              Cerrar todas las demás sesiones
            </button>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {sessions.length === 0 && (
            <p style={{ padding: 24, color: '#9CA3AF', fontSize: 14, textAlign: 'center' }}>No hay sesiones activas.</p>
          )}
          {sessions.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Smartphone size={18} color="#7C3AED" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.device}</span>
                    {s.isCurrent && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46', background: '#D1FAE5', padding: '2px 8px', borderRadius: 99 }}>
                        Este dispositivo
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    {s.ip ? `${s.ip} · ` : ''}Última actividad {formatRelativo(s.lastActiveAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => revocar(s.id, s.isCurrent)}
                disabled={revoking !== null}
                title={s.isCurrent ? 'Cerrar esta sesión' : 'Cerrar esta sesión'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                  border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 12px',
                  fontSize: 13, fontWeight: 600, color: '#6B7280',
                  cursor: revoking ? 'not-allowed' : 'pointer', opacity: revoking ? 0.6 : 1, flexShrink: 0,
                }}
              >
                <LogOut size={14} />
                {revoking === s.id ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, background: toast.type === 'success' ? '#1E3A5F' : '#DC2626',
          color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
