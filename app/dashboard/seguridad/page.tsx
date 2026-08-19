'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { ShieldCheck, Smartphone, LogOut, Fingerprint } from 'lucide-react'
import { startRegistration, startAuthentication, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser'
import { confirmarCredencialLocal, obtenerCredencialLocal, guardarCredencialLocal, borrarCredencialLocal } from '@/lib/webauthn/dispositivoLocal'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'

interface SessionRow {
  id: string
  device: string
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
  const [loadError, setLoadError] = useState<PageErrorType | null>(null)
  const cancelRef = useRef(false)
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [revoking, setRevoking] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [webauthnSoportado, setWebauthnSoportado] = useState(false)
  const [activandoBiometrico, setActivandoBiometrico] = useState(false)
  const [desactivandoBiometrico, setDesactivandoBiometrico] = useState(false)
  const [biometricoActivado, setBiometricoActivado] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const cargarSesiones = useCallback(async () => {
    const res = await fetch('/api/sessions')
    if (!res.ok) {
      const err: any = new Error(`fetch_failed_${res.status}`)
      err.status = res.status
      throw err
    }
    const { sessions } = await res.json()
    setSessions(sessions || [])
  }, [])

  const cargarEstadoBiometrico = useCallback(async () => {
    const activo = await confirmarCredencialLocal(true)
    setBiometricoActivado(activo)
  }, [])

  const initialCheckDoneRef = useRef(false)

  // Expuesta con useCallback (no solo dentro del useEffect) para que el
  // botón "Reintentar" del estado de error pueda volver a llamarla.
  const load = useCallback(async () => {
    cancelRef.current = false
    setLoading(true)
    setLoadError(null)
    const { user, networkError } = await getUserSafe(supabase)
    initialCheckDoneRef.current = true
    if (networkError) { if (!cancelRef.current) { setLoadError('network'); setLoading(false) }; return }
    if (!user) { router.push('/login'); return }

    try {
      await cargarSesiones()
    } catch (err) {
      if (!cancelRef.current) setLoadError(classifyError(err))
    }
    // El estado del biométrico es secundario -- si falla, no bloquea la
    // página (se queda mostrando "Activar" por defecto, sin romper nada).
    await cargarEstadoBiometrico().catch(() => {})
    if (!cancelRef.current) setLoading(false)
  }, [router, cargarSesiones, cargarEstadoBiometrico])

  useEffect(() => {
    // Ignora el evento INITIAL_SESSION con session=null que puede llegar
    // mientras el cliente todavía está leyendo la cookie (justo después de
    // navegar aquí) — mismo criterio que app/dashboard/page.tsx, para no
    // rebotar a /login por una sesión válida que solo tardó en confirmarse.
    // Esta página en particular es donde se confirmó en vivo (Fase 2 del
    // biométrico) que la carga se quedaba pegada por esta misma carrera.
    initialCheckDoneRef.current = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!initialCheckDoneRef.current) return
      if (!session) router.push('/login')
    })

    load()
    setWebauthnSoportado(browserSupportsWebAuthn())

    return () => { cancelRef.current = true; subscription.unsubscribe() }
  }, [load])

  // Cuando el navegador rechaza crear una credencial nueva porque ya
  // reconoce una de la cuenta (InvalidStateError), le pedimos que la use
  // para iniciar sesión en vez de crear otra -- así el navegador nos dice
  // exactamente cuál es, y la guardamos como la de este navegador. Evita
  // el callejón sin salida de "ya existe" sin poder gestionarla.
  const intentarRecuperarCredencialExistente = async (): Promise<boolean> => {
    const resOpciones = await fetch('/api/webauthn/registro/recuperar-opciones', { method: 'POST' })
    if (!resOpciones.ok) return false
    const { options } = await resOpciones.json()
    if (!options?.allowCredentials?.length) return false

    const credencial = await startAuthentication({ optionsJSON: options })

    const resVerificar = await fetch('/api/webauthn/registro/recuperar-verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: credencial }),
    })
    if (!resVerificar.ok) return false
    const { credentialId } = await resVerificar.json()
    if (!credentialId) return false

    guardarCredencialLocal(credentialId)
    return true
  }

  const activarBiometrico = async () => {
    setActivandoBiometrico(true)
    try {
      // Pregunta en silencio (sin ningún cuadro de diálogo) si esta
      // computadora tiene su propia huella/Face ID -- si la tiene, el
      // servidor va a pedirle al navegador que vaya directo a ella, sin
      // ofrecer el menú con Gestor de contraseñas de Google / QR.
      const preferirPlataforma = await platformAuthenticatorIsAvailable().catch(() => false)

      const resOpciones = await fetch('/api/webauthn/registro/opciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferirPlataforma }),
      })
      if (!resOpciones.ok) throw new Error('opciones_failed')
      const { options } = await resOpciones.json()

      const credencial = await startRegistration({ optionsJSON: options })

      const resVerificar = await fetch('/api/webauthn/registro/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: credencial }),
      })
      if (!resVerificar.ok) throw new Error('verificar_failed')

      guardarCredencialLocal(credencial.id)
      setBiometricoActivado(true)
      showToast('Biométrico activado en este dispositivo', 'success')
    } catch (err: any) {
      // El usuario canceló el prompt del sistema operativo -- no es un
      // error real.
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return
      // El navegador ya sabe que este dispositivo tiene una credencial (por
      // excludeCredentials) y rechaza crear otra. La adopción silenciosa al
      // cargar la página (ver dispositivoLocal.ts) ya cubre el caso normal
      // de una sola credencial en la cuenta -- si de todos modos se llega
      // aquí, es porque hay más de una y no se puede saber cuál es esta sin
      // ambigüedad.
      if (err?.name === 'InvalidStateError') {
        try {
          const recuperado = await intentarRecuperarCredencialExistente()
          if (recuperado) {
            setBiometricoActivado(true)
            showToast('Ya tenías el biométrico activado en este navegador -- lo detectamos automáticamente', 'success')
            return
          }
        } catch {}
        showToast('Ya existe una credencial de este dispositivo. Recarga la página; si el problema sigue, desactiva desde el otro dispositivo y vuelve a intentar.', 'error')
        return
      }
      showToast('No se pudo activar el biométrico. Intenta de nuevo.', 'error')
    } finally {
      setActivandoBiometrico(false)
    }
  }

  const desactivarBiometrico = async () => {
    if (!window.confirm('¿Desactivar el inicio de sesión con huella o Face ID en este dispositivo? Tendrás que activarlo de nuevo si quieres volver a usarlo aquí.')) return

    const credentialId = obtenerCredencialLocal()
    if (!credentialId) {
      showToast('No se pudo confirmar cuál es este dispositivo. Recarga la página e intenta de nuevo.', 'error')
      return
    }

    setDesactivandoBiometrico(true)
    try {
      const res = await fetch('/api/webauthn/desactivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId }),
      })
      if (!res.ok) throw new Error('desactivar_failed')
      borrarCredencialLocal()
      setBiometricoActivado(false)
      showToast('Biométrico desactivado en este dispositivo', 'success')
    } catch {
      showToast('No se pudo desactivar el biométrico. Intenta de nuevo.', 'error')
    } finally {
      setDesactivandoBiometrico(false)
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <PageErrorState type={loadError} onRetry={load} />
    </div>
  )

  if (loading) return <SeguridadSkeleton />

  const otras = sessions.filter(s => !s.isCurrent)

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .seg-fila { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .seg-fila-acciones { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        @media (max-width: 480px) {
          .seg-fila-acciones { width: 100%; justify-content: flex-end; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={22} color="#1E3A5F" aria-hidden="true" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>Seguridad</h1>
        </div>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
          Estos son los dispositivos con sesión activa en tu cuenta. Si no reconoces alguno, ciérralo de inmediato.
        </p>

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
            <p style={{ padding: 24, color: '#6B7280', fontSize: 14, textAlign: 'center' }}>No hay sesiones activas.</p>
          )}
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className="seg-fila"
              style={{
                padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Smartphone size={18} color="#7C3AED" aria-hidden="true" />
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
                  <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    Última actividad {formatRelativo(s.lastActiveAt)}
                  </p>
                </div>
              </div>
              <div className="seg-fila-acciones">
                {s.isCurrent && webauthnSoportado && (
                  biometricoActivado ? (
                    <>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 13, fontWeight: 600 }} title="Ingreso con huella o Face ID en este dispositivo">
                        <Fingerprint size={16} aria-hidden="true" /> Activado
                      </span>
                      <button
                        onClick={desactivarBiometrico}
                        disabled={desactivandoBiometrico}
                        style={{
                          background: '#fff', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: 10,
                          padding: '8px 12px', fontSize: 13, fontWeight: 600,
                          cursor: desactivandoBiometrico ? 'not-allowed' : 'pointer', opacity: desactivandoBiometrico ? 0.6 : 1, flexShrink: 0,
                        }}
                      >
                        {desactivandoBiometrico ? 'Desactivando...' : 'Desactivar'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={activarBiometrico}
                      disabled={activandoBiometrico}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 10,
                        padding: '8px 12px', fontSize: 13, fontWeight: 600,
                        cursor: activandoBiometrico ? 'not-allowed' : 'pointer', opacity: activandoBiometrico ? 0.6 : 1, flexShrink: 0,
                      }}
                    >
                      <Fingerprint size={14} aria-hidden="true" />
                      {activandoBiometrico ? 'Activando...' : 'Activar en este navegador'}
                    </button>
                  )
                )}
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
                  <LogOut size={14} aria-hidden="true" />
                  {revoking === s.id ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', bottom: 20, right: 20, background: toast.type === 'success' ? '#1E3A5F' : '#DC2626',
            color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// Skeleton de la página de Seguridad — misma estructura de lista de
// sesiones (avatar + nombre + acciones) para que la carga no salte.
function SeguridadSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif" }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando sesiones…
      </span>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={22} color="#1E3A5F" aria-hidden="true" />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>Seguridad</h1>
        </div>
        <Skeleton width={340} height={14} style={{ marginBottom: 24 }} />

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton width={38} height={38} radius={10} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton width={160} height={14} />
                  <Skeleton width={200} height={12} />
                </div>
              </div>
              <Skeleton width={110} height={36} radius={10} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
