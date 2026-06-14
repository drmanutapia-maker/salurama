'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

// ─── Estilos ───────────────────────────────────────────────────────────────────
const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin   { to   { transform: rotate(360deg); } }
  .fade-up { animation: fadeUp 0.4s ease-out; }
  body { font-family: 'DM Sans', sans-serif; background: #F4F6F9; }

  .reset-input {
    width: 100%;
    height: 48px;
    padding: 0 44px 0 14px;
    background: #fff;
    border: 1.5px solid #D1D5DB;
    border-radius: 12px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    color: #111827;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .reset-input::placeholder { color: #9CA3AF; }
  .reset-input:focus {
    border-color: #1E3A5F;
    box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.08);
  }
  .reset-input:disabled { opacity: 0.5; cursor: not-allowed; }
`

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validatePassword(password: string, confirm: string): string | null {
  if (password.length < 8)     return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Z]/.test(password)) return 'Incluye al menos una letra mayúscula'
  if (!/[0-9]/.test(password)) return 'Incluye al menos un número'
  if (password !== confirm)    return 'Las contraseñas no coinciden'
  return null
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Una letra mayúscula',  ok: /[A-Z]/.test(password) },
    { label: 'Un número',           ok: /[0-9]/.test(password) },
  ]
  return (
    <div style={{ background: '#F9FAFB', borderRadius: 10, padding: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Requisitos:</p>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {checks.map(({ label, ok }) => (
          <li key={label} style={{ fontSize: 12, color: ok ? '#059669' : '#6B7280', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.2s' }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              background: ok ? '#DCFCE7' : '#E5E7EB',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.2s',
            }}>
              {ok && <CheckCircle size={10} color="#059669" />}
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Estados de la sesión de recuperación ─────────────────────────────────────
type SessionState = 'checking' | 'ready' | 'invalid'

// ─── Componente ────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState(false)

  // 'checking' = esperando que Supabase confirme la sesión
  // 'ready'    = sesión de recuperación activa, formulario habilitado
  // 'invalid'  = no hay sesión válida de recuperación
  const [sessionState, setSessionState] = useState<SessionState>('checking')

  // ── Detectar sesión de recuperación ───────────────────────────────────────
  //
  // Supabase v2 con PKCE (default en Next.js) NO manda el token en el hash.
  // El flujo correcto es:
  //   1. Usuario hace clic en el link del email
  //   2. Supabase redirige a /auth/callback?code=XXXX
  //   3. El callback route intercambia el code por una sesión
  //   4. Redirige a /reset-password — en este punto la sesión YA existe
  //
  // Por eso: primero verificamos si ya hay sesión activa (getSession),
  // y como respaldo escuchamos el evento PASSWORD_RECOVERY del auth listener.
  useEffect(() => {
    // Verificar sesión existente (caso normal con PKCE)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionState('ready')
      } else {
        // Sin sesión aún — esperar el evento PASSWORD_RECOVERY (flujo hash legacy)
        // Si en 3 segundos no llega nada, marcar como inválido
        const timeout = setTimeout(() => {
          setSessionState('invalid')
        }, 3000)

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            clearTimeout(timeout)
            setSessionState('ready')
          }
          if (event === 'SIGNED_IN') {
            clearTimeout(timeout)
            setSessionState('ready')
          }
        })

        return () => {
          clearTimeout(timeout)
          subscription.unsubscribe()
        }
      }
    })
  }, [])

  // ── Redirección post-éxito ─────────────────────────────────────────────────
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => router.push('/login?password_changed=true'), 2500)
    return () => clearTimeout(timer)
  }, [success, router])

  // ── Envío del formulario ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validatePassword(password, confirmPassword)
    if (validationError) { setError(validationError); return }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla de éxito ──────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={WRAPPER_STYLE}>
        <style>{PAGE_STYLES}</style>
        <div className="fade-up" style={{ ...CARD_STYLE, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#059669" />
          </div>
          <h1 style={HEADING_STYLE}>¡Contraseña actualizada!</h1>
          <p style={{ color: '#4B5563', marginTop: 12, lineHeight: 1.6 }}>
            Tu contraseña ha sido cambiada exitosamente.<br />
            Serás redirigido al inicio de sesión...
          </p>
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: '2px solid #E5E7EB', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        </div>
      </div>
    )
  }

  // ── Pantalla de verificando sesión ─────────────────────────────────────────
  if (sessionState === 'checking') {
    return (
      <div style={WRAPPER_STYLE}>
        <style>{PAGE_STYLES}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#1E3A5F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 14, color: '#6B7280', fontFamily: "'DM Sans', sans-serif" }}>Verificando enlace...</p>
        </div>
      </div>
    )
  }

  // ── Pantalla de link inválido ──────────────────────────────────────────────
  if (sessionState === 'invalid') {
    return (
      <div style={WRAPPER_STYLE}>
        <style>{PAGE_STYLES}</style>
        <div className="fade-up" style={{ ...CARD_STYLE, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#FEF2F2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertCircle size={32} color="#DC2626" />
          </div>
          <h1 style={{ ...HEADING_STYLE, fontSize: 20 }}>Enlace inválido o expirado</h1>
          <p style={{ color: '#4B5563', marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
            Este enlace de recuperación ya no es válido.<br />
            Solicita uno nuevo desde el inicio de sesión.
          </p>
          <Link
            href="/login"
            style={{
              display: 'inline-block', marginTop: 24,
              padding: '12px 28px', background: '#1E3A5F', color: '#fff',
              borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  // ── Formulario principal ───────────────────────────────────────────────────
  return (
    <div style={WRAPPER_STYLE}>
      <style>{PAGE_STYLES}</style>

      <div className="fade-up" style={CARD_STYLE}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #1E3A5F 0%, #2A9D8F 100%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={28} color="#fff" />
          </div>
          <h1 style={HEADING_STYLE}>Nueva contraseña</h1>
          <p style={{ color: '#4B5563', fontSize: 14, marginTop: 8 }}>Ingresa tu nueva contraseña segura</p>
        </div>

        {/* Error de validación */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#DC2626', lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contraseña nueva */}
          <div>
            <label htmlFor="password" style={LABEL_STYLE}>Contraseña nueva *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Mínimo 8 caracteres"
                required
                disabled={loading}
                autoComplete="new-password"
                className="reset-input"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Ocultar' : 'Mostrar'} tabIndex={-1} style={EYE_BTN}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Indicador de fuerza — solo cuando escribe */}
          {password.length > 0 && <PasswordStrength password={password} />}

          {/* Confirmar contraseña */}
          <div>
            <label htmlFor="confirm" style={LABEL_STYLE}>Confirmar contraseña *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                placeholder="Repite tu contraseña"
                required
                disabled={loading}
                autoComplete="new-password"
                className="reset-input"
                style={{
                  borderColor: confirmPassword.length > 0
                    ? confirmPassword === password ? '#059669' : '#EF4444'
                    : undefined,
                }}
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Ocultar' : 'Mostrar'} tabIndex={-1} style={EYE_BTN}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8, height: 50,
              background: loading ? '#9CA3AF' : '#1E3A5F',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#172E4D' }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#1E3A5F' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                Cambiando contraseña...
              </>
            ) : 'Cambiar contraseña'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 24, paddingTop: 20, textAlign: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, color: '#1E3A5F', textDecoration: 'none', fontWeight: 600 }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Estilos estáticos ─────────────────────────────────────────────────────────

const WRAPPER_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#F4F6F9', padding: 20,
}

const CARD_STYLE: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '44px 40px',
  maxWidth: 440, width: '100%',
  boxShadow: '0 2px 24px rgba(30,58,95,0.09)',
  border: '1px solid #E5E7EB',
}

const HEADING_STYLE: React.CSSProperties = {
  fontFamily: "'Fraunces', serif", fontSize: 24,
  fontWeight: 900, color: '#111827',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: '#374151', marginBottom: 6,
}

const EYE_BTN: React.CSSProperties = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#9CA3AF', display: 'flex', alignItems: 'center', padding: 4,
}
