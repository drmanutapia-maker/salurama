'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getUserSafe } from '@/lib/getUserSafe'
import { ShieldCheck, Smartphone, LogOut, Fingerprint } from 'lucide-react'
import { startRegistration, startAuthentication, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser'
import { confirmarCredencialLocal, obtenerCredencialLocal, guardarCredencialLocal, borrarCredencialLocal } from '@/lib/webauthn/dispositivoLocal'
import { obtenerOCrearDeviceId } from '@/lib/webauthn/deviceId'
import { Skeleton } from '@/components/Skeleton'
import { PageErrorState, classifyError, type PageErrorType } from '@/components/PageErrorState'

interface SessionRow {
  id: string
  device: string
  createdAt: string
  lastActiveAt: string
  isCurrent: boolean
  deviceId: string | null
}

interface CredencialBiometrica {
  credentialId: string
  deviceName: string | null
  createdAt: string
  deviceId: string | null
}

// Una tarjeta por dispositivo real. session y credencial son independientes
// -- puede haber solo una de las dos, o ambas si comparten deviceId. Cuando
// ninguna tiene deviceId (sesiones/credenciales de antes de esta función),
// cada una aparece en su propia tarjeta suelta -- degradación esperada
// hasta que se vuelva a iniciar sesión o registrar la huella.
interface TarjetaDispositivo {
  key: string
  deviceId: string | null
  label: string
  isCurrent: boolean
  session: SessionRow | null
  credencial: CredencialBiometrica | null
}

function construirTarjetas(sessions: SessionRow[], credenciales: CredencialBiometrica[]): TarjetaDispositivo[] {
  const porDeviceId = new Map<string, TarjetaDispositivo>()
  const sueltas: TarjetaDispositivo[] = []

  for (const s of sessions) {
    if (s.deviceId) {
      porDeviceId.set(s.deviceId, {
        key: `dev:${s.deviceId}`, deviceId: s.deviceId, label: s.device,
        isCurrent: s.isCurrent, session: s, credencial: null,
      })
    } else {
      sueltas.push({ key: `sess:${s.id}`, deviceId: null, label: s.device, isCurrent: s.isCurrent, session: s, credencial: null })
    }
  }

  for (const c of credenciales) {
    if (c.deviceId) {
      const existente = porDeviceId.get(c.deviceId)
      if (existente) {
        existente.credencial = c
      } else {
        porDeviceId.set(c.deviceId, {
          key: `dev:${c.deviceId}`, deviceId: c.deviceId, label: c.deviceName || 'Dispositivo sin nombre',
          isCurrent: false, session: null, credencial: c,
        })
      }
    } else {
      sueltas.push({ key: `cred:${c.credentialId}`, deviceId: null, label: c.deviceName || 'Dispositivo sin nombre', isCurrent: false, session: null, credencial: c })
    }
  }

  const todas = [...porDeviceId.values(), ...sueltas]
  todas.sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1))
  return todas
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
  const [credenciales, setCredenciales] = useState<CredencialBiometrica[]>([])
  const [quitandoCredencial, setQuitandoCredencial] = useState<string | null>(null)

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

  // Adopción silenciosa: si este navegador todavía no tiene ningún
  // credential_id guardado localmente pero la cuenta tiene exactamente una
  // credencial, la guarda sola (ver dispositivoLocal.ts). El resultado ya no
  // se usa para decidir qué mostrar -- eso ahora viene de deviceId -- pero el
  // efecto secundario sigue siendo útil (ej. para que quitarCredencial sepa
  // limpiar el localStorage si la credencial removida era la de este navegador).
  const cargarEstadoBiometrico = useCallback(async () => {
    await confirmarCredencialLocal(true)
  }, [])

  // Lista completa de credenciales de la cuenta (no solo la de este
  // navegador) -- para poder revocar la de un celular perdido/robado desde
  // otro dispositivo.
  const cargarCredenciales = useCallback(async () => {
    try {
      const res = await fetch('/api/webauthn/listar-credenciales')
      if (!res.ok) return
      const { credenciales } = await res.json()
      setCredenciales(Array.isArray(credenciales) ? credenciales : [])
    } catch {}
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
    await cargarCredenciales().catch(() => {})
    if (!cancelRef.current) setLoading(false)
  }, [router, cargarSesiones, cargarEstadoBiometrico, cargarCredenciales])

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
      body: JSON.stringify({ response: credencial, deviceId: obtenerOCrearDeviceId() }),
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
        body: JSON.stringify({ response: credencial, deviceId: obtenerOCrearDeviceId() }),
      })
      if (!resVerificar.ok) throw new Error('verificar_failed')

      guardarCredencialLocal(credencial.id)
      await cargarCredenciales()
      showToast('Huella o Face ID activada en este dispositivo', 'success')
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
            await cargarCredenciales()
            showToast('Ya tenías la huella o Face ID activada en este navegador, la detectamos automáticamente', 'success')
            return
          }
        } catch {}
        showToast('Ya existe una credencial de este dispositivo. Recarga la página; si el problema sigue, desactívala desde otro dispositivo y vuelve a intentar.', 'error')
        return
      }
      showToast('No se pudo activar la huella o Face ID. Intenta de nuevo.', 'error')
    } finally {
      setActivandoBiometrico(false)
    }
  }

  // Quita CUALQUIER credencial de la cuenta (no solo la de este navegador) --
  // ver /api/webauthn/desactivar, ya verifica server-side que pertenezca al
  // médico de la sesión real antes de borrarla. Es el mismo control tanto
  // para el ícono de "desactivar" (dispositivo con sesión activa) como para
  // el botón "Quitar" (dispositivo sin sesión activa, ej. un celular perdido).
  const quitarCredencial = async (credentialId: string, nombreDispositivo: string | null) => {
    if (!window.confirm(`¿Desactivar el acceso con huella o Face ID de "${nombreDispositivo || 'este dispositivo'}"?`)) return

    setQuitandoCredencial(credentialId)
    try {
      const res = await fetch('/api/webauthn/desactivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialId }),
      })
      if (!res.ok) throw new Error('desactivar_failed')

      // Si la credencial que se quitó es la de ESTE navegador, limpia
      // también el localStorage para que no quede apuntando a una credencial
      // borrada.
      if (obtenerCredencialLocal() === credentialId) {
        borrarCredencialLocal()
      }

      setCredenciales(prev => prev.filter(c => c.credentialId !== credentialId))
      showToast('Huella o Face ID desactivada', 'success')
    } catch {
      showToast('No se pudo desactivar. Intenta de nuevo.', 'error')
    } finally {
      setQuitandoCredencial(null)
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
  const tarjetas = construirTarjetas(sessions, credenciales)

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
          Estos son los dispositivos de tu cuenta: sesiones activas y accesos con huella o Face ID. Si no reconoces alguno, ciérralo o quítalo de inmediato.
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
          {tarjetas.length === 0 && (
            <p style={{ padding: 24, color: '#6B7280', fontSize: 14, textAlign: 'center' }}>No hay dispositivos que mostrar.</p>
          )}
          {tarjetas.map((t, i) => {
            const hasSession = !!t.session
            const hasCredencial = !!t.credencial
            const puedeActivarAqui = t.isCurrent && !hasCredencial && webauthnSoportado

            return (
              <div
                key={t.key}
                className="seg-fila"
                style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: hasSession ? '#F5F3FF' : '#ECFDF5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {hasSession
                      ? <Smartphone size={18} color="#7C3AED" aria-hidden="true" />
                      : <Fingerprint size={18} color="#059669" aria-hidden="true" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{t.label}</span>
                      {t.isCurrent && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#065F46', background: '#D1FAE5', padding: '2px 8px', borderRadius: 99 }}>
                          Este dispositivo
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      {hasSession
                        ? `Última actividad ${formatRelativo(t.session!.lastActiveAt)}`
                        : `Activado ${formatRelativo(t.credencial!.createdAt)}`}
                    </p>
                    <p style={{ fontSize: 12, marginTop: 2, fontWeight: hasCredencial ? 600 : 400, color: hasCredencial ? '#059669' : '#9CA3AF' }}>
                      Huella/Face ID: {hasCredencial ? 'Activado' : 'No configurada'}
                    </p>
                    {!hasSession && (
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Sin sesión activa ahora mismo</p>
                    )}
                  </div>
                </div>

                <div className="seg-fila-acciones">
                  {puedeActivarAqui && (
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
                      {activandoBiometrico ? 'Activando...' : (
                        <>
                          Activar
                          <Fingerprint size={14} aria-hidden="true" />
                          /Face ID
                        </>
                      )}
                    </button>
                  )}

                  {hasCredencial && (
                    <button
                      onClick={() => quitarCredencial(t.credencial!.credentialId, t.label)}
                      disabled={quitandoCredencial !== null}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                        background: '#fff', border: '1.5px solid #FECACA', color: '#DC2626', borderRadius: 10,
                        padding: '8px 12px', fontSize: 13, fontWeight: 600,
                        cursor: quitandoCredencial ? 'not-allowed' : 'pointer',
                        opacity: quitandoCredencial === t.credencial!.credentialId ? 0.5 : 1,
                      }}
                    >
                      <Fingerprint size={14} aria-hidden="true" />
                      {quitandoCredencial === t.credencial!.credentialId ? 'Desactivando...' : 'Desactivar'}
                    </button>
                  )}

                  {hasSession && (
                    <button
                      onClick={() => revocar(t.session!.id, t.session!.isCurrent)}
                      disabled={revoking !== null}
                      title="Cerrar esta sesión"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                        border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '8px 12px',
                        fontSize: 13, fontWeight: 600, color: '#6B7280',
                        cursor: revoking ? 'not-allowed' : 'pointer', opacity: revoking ? 0.6 : 1, flexShrink: 0,
                      }}
                    >
                      <LogOut size={14} aria-hidden="true" />
                      {revoking === t.session!.id ? 'Cerrando...' : 'Cerrar sesión'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
// tarjetas (avatar + nombre + acciones) para que la carga no salte.
function SeguridadSkeleton() {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: "'DM Sans', sans-serif" }} aria-busy="true">
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Cargando dispositivos…
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
