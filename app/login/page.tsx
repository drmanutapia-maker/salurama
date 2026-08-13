'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  Fingerprint,
} from 'lucide-react'
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'

// ─── Estilos fuera del componente ─────────────────────────────────────────────
const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  .fade-up { animation: fadeUp 0.35s ease-out; }
  body { font-family: 'DM Sans', sans-serif; background: #F4F6F9; }

  .login-input {
    width: 100%;
    height: 48px;
    background: #fff;
    border: 1.5px solid #D1D5DB;
    border-radius: 12px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    color: #111827;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .login-input::placeholder { color: #9CA3AF; }
  .login-input:focus {
    border-color: #1E3A5F;
    box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.08);
  }
  .login-input:disabled { opacity: 0.55; cursor: not-allowed; }

  .btn-primary {
    width: 100%;
    height: 50px;
    background: #1E3A5F;
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: 'center';
    justify-content: center;
    gap: 8px;
    transition: background 0.15s, box-shadow 0.15s;
  }
  .btn-primary:hover:not(:disabled) {
    background: #172E4D;
    box-shadow: 0 4px 14px rgba(30, 58, 95, 0.25);
  }
  .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
`

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface Feedback {
  message: string
  isSuccess?: boolean
  showResend?: boolean
}

// ─── Helper de errores ─────────────────────────────────────────────────────────

function parseAuthError(err: unknown): Feedback {
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  if (msg.includes('invalid') || msg.includes('incorrect'))
    return { message: 'Email o contraseña incorrectos' }
  if (msg.includes('confirm') || msg.includes('email not confirmed'))
    return {
      message: 'Debes confirmar tu email. Revisa tu bandeja de entrada.',
      showResend: true,
    }
  return { message: err instanceof Error ? err.message : 'Error al iniciar sesión' }
}

// ─── Componente de contenido ───────────────────────────────────────────────────

function LoginContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const redirectTo = searchParams.get('next') || searchParams.get('redirect') || '/dashboard'
  const [checking, setChecking] = useState(true)
  const [webauthnSoportado, setWebauthnSoportado] = useState(false)
  const [iniciandoBiometrico, setIniciandoBiometrico] = useState(false)

  // Corre solo una vez al montar. Deps vacías evitan que router.replace()
  // provoque una re-ejecución del effect (que flashearía el formulario).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        router.replace(redirectTo)
      } else {
        setChecking(false)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setWebauthnSoportado(browserSupportsWebAuthn())
  }, [])

  // Verifica que la cuenta ya autenticada (por contraseña o biometrico) sea
  // un medico registrado y activo, y redirige -- mismo criterio para ambos
  // metodos de login, para no duplicarlo.
  const redirigirSegunDoctor = async (userId: string) => {
    const { data: doctor, error: doctorError } = await supabase
      .from('doctors')
      .select('id, is_active')
      .eq('user_id', userId)
      .maybeSingle()

    if (doctorError || !doctor) {
      await supabase.auth.signOut()
      throw new Error('Esta cuenta no está registrada como médico')
    }

    window.location.href = doctor.is_active ? redirectTo : '/dashboard?status=pending'
  }

  // ── Login biométrico ───────────────────────────────────────────────────────
  const handleLoginBiometrico = async () => {
    setFeedback(null)
    setIniciandoBiometrico(true)

    try {
      const resOpciones = await fetch('/api/webauthn/login/opciones', { method: 'POST' })
      if (!resOpciones.ok) throw new Error('No se pudo iniciar el login biométrico')
      const { options, challengeId } = await resOpciones.json()

      const credencial = await startAuthentication({ optionsJSON: options })

      const resVerificar = await fetch('/api/webauthn/login/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, response: credencial }),
      })
      if (!resVerificar.ok) {
        const data = await resVerificar.json().catch(() => null)
        throw new Error(data?.error || 'No se pudo verificar la credencial')
      }
      const { tokenHash } = await resVerificar.json()

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      })
      if (verifyError) throw verifyError
      if (!data.user) throw new Error('No se pudo iniciar sesión')

      await redirigirSegunDoctor(data.user.id)
    } catch (err: any) {
      // El usuario cancelo el prompt del sistema operativo, o el flujo por QR
      // (celular) se agoto esperando -- ninguno de los dos es un error real.
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') { setIniciandoBiometrico(false); return }
      setFeedback(parseAuthError(err))
      setIniciandoBiometrico(false)
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })
      if (authError) throw authError

      if (data.user) {
        // Marca de una sola lectura para el banner de invitacion al
        // biometrico -- solo en login con contrasena (no en el biometrico,
        // no tendria sentido invitar a activarlo a quien ya lo usa). El
        // layout del dashboard la consume y borra al montar.
        try { sessionStorage.setItem('salurama_mostrar_banner_biometrico', '1') } catch {}
        await redirigirSegunDoctor(data.user.id)
      }
    } catch (err) {
      setFeedback(parseAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Reenviar confirmación ──────────────────────────────────────────────────
  const handleResend = async () => {
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase().trim(),
    })
    setLoading(false)
    setFeedback(
      error
        ? { message: `Error: ${error.message}` }
        : { message: 'Email de confirmación reenviado. Revisa tu bandeja.', isSuccess: true }
    )
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6F9' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Loader2 size={28} color="#1E3A5F" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#F4F6F9',
    }}>
      <style>{PAGE_STYLES}</style>

      <div className="fade-up" style={{
        width: '100%',
        maxWidth: 440,
        background: '#fff',
        borderRadius: 20,
        padding: '44px 40px',
        boxShadow: '0 2px 24px rgba(30, 58, 95, 0.09)',
        border: '1px solid #E5E7EB',
      }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', marginBottom: 32 }}>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1E3A5F' }}>
            Salu<span style={{ color: '#2A9D8F' }}>rama</span>
          </span>
        </Link>

        {/* Encabezado */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 26,
            fontWeight: 900,
            color: '#111827',
            marginBottom: 6,
          }}>
            Bienvenido de nuevo
          </h1>
          <p style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.5 }}>
            Ingresa a tu panel médico
          </p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: 10,
            border: `1px solid ${feedback.isSuccess ? '#BBF7D0' : '#FECACA'}`,
            background: feedback.isSuccess ? '#F0FDF4' : '#FEF2F2',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <AlertCircle
              size={17}
              color={feedback.isSuccess ? '#16A34A' : '#DC2626'}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 13,
                fontWeight: 500,
                color: feedback.isSuccess ? '#15803D' : '#DC2626',
                lineHeight: 1.5,
              }}>
                {feedback.message}
              </p>
              {feedback.showResend && (
                <button
                  onClick={handleResend}
                  disabled={loading}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, color: '#DC2626', textDecoration: 'underline',
                    marginTop: 4, padding: 0, fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Reenviar email de confirmación
                </button>
              )}
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Email */}
          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@clinica.com"
                required
                autoComplete="email"
                autoFocus
                className="login-input"
                style={{ paddingLeft: 42, paddingRight: 16 }}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="password" style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                Contraseña
              </label>
              
<button
  type="button"
  onClick={async () => {
    if (!email.trim()) {
      setFeedback({ message: 'Ingresa tu email para recuperar tu contraseña' })
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}/auth/confirm/callback`,
    })
    setLoading(false)
    if (error) {
      setFeedback({ message: error.message })
    } else {
      setFeedback({ message: 'Te enviamos un link de recuperación. Revisa tu email.', isSuccess: true })
    }
  }}
  style={{
    fontSize: 13, color: '#1E3A5F', fontWeight: 500,
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", padding: 0
  }}
  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
>
  ¿Olvidaste tu contraseña?
</button>

            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="login-input"
                style={{ paddingLeft: 42, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                tabIndex={-1}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9CA3AF', display: 'flex', alignItems: 'center', padding: 4,
                }}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Botón ingresar */}
          <button type="submit" disabled={loading || !email || !password} className="btn-primary" style={{ marginTop: 4 }}>
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                Ingresando...
              </>
            ) : (
              <>
                Ingresar
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {webauthnSoportado && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>o</span>
              <div style={{ flex: 1, borderTop: '1px solid #E5E7EB' }} />
            </div>
            <button
              type="button"
              onClick={handleLoginBiometrico}
              disabled={iniciandoBiometrico}
              style={{
                width: '100%', minHeight: 50, background: '#fff', color: '#1E3A5F',
                border: '1.5px solid #1E3A5F', borderRadius: 12, fontSize: 14, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif", cursor: iniciandoBiometrico ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 12px', opacity: iniciandoBiometrico ? 0.6 : 1,
              }}
            >
              {iniciandoBiometrico ? (
                <>
                  <Loader2 size={16} style={{ flexShrink: 0, animation: 'spin 0.7s linear infinite' }} />
                  Verificando...
                </>
              ) : (
                <>
                  <Fingerprint size={18} style={{ flexShrink: 0 }} />
                  Entrar con huella o Face ID
                </>
              )}
            </button>
          </>
        )}

        {/* Divisor */}
        <div style={{ borderTop: '1px solid #E5E7EB', margin: '28px 0' }} />

        {/* Registro */}
        <p style={{ textAlign: 'center', fontSize: 14, color: '#4B5563' }}>
          ¿No tienes cuenta?{' '}
          <Link
            href="/registro"
            style={{ color: '#1E3A5F', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            Crear cuenta gratis
          </Link>
        </p>
      </div>
    </div>
  )
}

// ─── Export con Suspense ───────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6F9' }}>
        <Loader2 size={28} color="#1E3A5F" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}