'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

// ─────────────────────────────────────────────
// 🎨 PALETA DE COLORES SALURAMA 2026
// ─────────────────────────────────────────────
const COLORS = {
  primary: '#1E3A5F',
  primaryDark: '#1A3254',
  secondary: '#2A9D8F',
  tertiary: '#8B5CF6',
  success: '#059669',
  successLight: '#F0FFF4',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  warning: '#F59E0B',
  text: '#1A1A2E',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  background: '#F9FAFB',
  surface: '#FFFFFF',
}

export default function LoginMedico() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)

  // ───────────────────────────────────────────
  // HANDLER DE LOGIN - SIN CREACIÓN AUTOMÁTICA
  // ───────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Autenticar con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Tu email no ha sido confirmado. Revisa tu bandeja.')
        }
        throw new Error('Email o contraseña incorrectos')
      }

      if (!authData?.user) {
        throw new Error('No se pudo autenticar. Intenta de nuevo.')
      }

      // 2. Buscar perfil en tabla doctors (NO crear automáticamente)
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id, email, is_active, review_status')
        .eq('email', email)
        .single()

      // 3. Si no existe el perfil, mostrar error (NO crear)
      if (doctorError?.code === 'PGRST116' || !doctor) {
        await supabase.auth.signOut()
        throw new Error('No se encontró un perfil de médico con este email. Por favor regístrate primero.')
      }

      // 4. Si hay otro error, mostrar
      if (doctorError) {
        await supabase.auth.signOut()
        throw new Error('Error al verificar tu perfil. Intenta de nuevo.')
      }

      // 5. Verificar review_status
      if (doctor.review_status === 'pending') {
        await supabase.auth.signOut()
        throw new Error('Tu perfil está en revisión. Te notificaremos cuando sea aprobado.')
      }

      if (doctor.review_status === 'rejected') {
        await supabase.auth.signOut()
        throw new Error('Tu perfil fue rechazado. Contacta a privacidad@salurama.com')
      }

      // 6. Verificar is_active
      if (!doctor.is_active) {
        await supabase.auth.signOut()
        throw new Error('Tu perfil está inactivo. Contacta a privacidad@salurama.com')
      }

      // 7. Login exitoso - redirigir al dashboard
      router.push('/dashboard')

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  // ───────────────────────────────────────────
  // HANDLER DE RECUPERACIÓN
  // ───────────────────────────────────────────
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${origin}/reset-password`
      })

      if (error) throw error
      setRecoverySent(true)
    } catch (err: unknown) {
      alert('Error al enviar email: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  // ───────────────────────────────────────────
  // RESETear estados al volver al login
  // ───────────────────────────────────────────
  const handleBackToLogin = () => {
    setShowRecovery(false)
    setRecoveryEmail('')
    setRecoverySent(false)
    setError(null)
  }

  // ───────────────────────────────────────────
  // VISTA DE RECUPERACIÓN
  // ───────────────────────────────────────────
  if (showRecovery) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, ' + COLORS.background + ' 0%, ' + COLORS.surface + ' 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: "'DM Sans', sans-serif"
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;500;700&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin { to { transform: rotate(360deg); } }
          .fade-up { animation: fadeUp 0.4s ease-out; }
          .spin { animation: spin 0.7s linear infinite; }
        `}</style>

        <div className="fade-up" style={{
          background: COLORS.surface,
          borderRadius: 20,
          padding: 'clamp(32px, 6vw, 48px)',
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 16px 48px rgba(30, 58, 95, 0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: COLORS.primary }}>Salu</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: COLORS.secondary }}>rama</span>
            </Link>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: COLORS.text, marginBottom: 8 }}>
              Recuperar contraseña
            </h1>
            <p style={{ fontSize: 14, color: COLORS.textMuted }}>
              Te enviaremos un email para restablecer tu contraseña
            </p>
          </div>

          {recoverySent ? (
            <div style={{
              background: COLORS.successLight,
              border: '1px solid ' + COLORS.success,
              borderRadius: 10,
              padding: '16px',
              textAlign: 'center',
              marginBottom: 20
            }}>
              <p style={{ fontSize: 14, color: COLORS.success, margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle size={16} /> Email enviado
              </p>
              <p style={{ fontSize: 13, color: COLORS.success, marginTop: 8 }}>
                Revisa tu bandeja (y spam) para restablecer tu contraseña.
              </p>
              <button
                onClick={handleBackToLogin}
                style={{
                  marginTop: 16,
                  background: COLORS.success,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 50,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                Volver al login
              </button>
            </div>
          ) : (
            <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      border: '1.5px solid ' + COLORS.border,
                      borderRadius: 10,
                      fontSize: 15,
                      fontFamily: "'DM Sans', sans-serif",
                      color: COLORS.text,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading ? COLORS.textMuted : COLORS.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 50,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {loading ? 'Enviando...' : 'Enviar email de recuperación'}
              </button>

              <button
                type="button"
                onClick={handleBackToLogin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.textMuted,
                  fontSize: 13,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                ← Volver al login
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ───────────────────────────────────────────
  // VISTA DE LOGIN NORMAL
  // ───────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, ' + COLORS.background + ' 0%, ' + COLORS.surface + ' 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@900&family=DM+Sans:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fade-up { animation: fadeUp 0.4s ease-out; }
        .spin { animation: spin 0.7s linear infinite; }
        input:focus, select:focus, textarea:focus {
          border-color: ${COLORS.primary} !important;
          outline: none;
          box-shadow: 0 0 0 3px rgba(30, 58, 95, 0.1);
        }
      `}</style>

      <div className="fade-up" style={{
        background: COLORS.surface,
        borderRadius: 20,
        padding: 'clamp(32px, 6vw, 48px)',
        maxWidth: 440,
        width: '100%',
        boxShadow: '0 16px 48px rgba(30, 58, 95, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: COLORS.primary }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: COLORS.secondary }}>rama</span>
          </Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: COLORS.text, marginBottom: 8 }}>
            Bienvenido de nuevo
          </h1>
          <p style={{ fontSize: 14, color: COLORS.textMuted }}>
            Inicia sesión para gestionar tu perfil
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div style={{
            background: COLORS.errorLight,
            border: '1px solid ' + COLORS.error,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 20,
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={18} color={COLORS.error} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: COLORS.error, margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  border: '1.5px solid ' + COLORS.border,
                  borderRadius: 10,
                  fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  color: COLORS.text,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color={COLORS.textMuted} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  border: '1.5px solid ' + COLORS.border,
                  borderRadius: 10,
                  fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif",
                  color: COLORS.text,
                  outline: 'none',
                  paddingRight: 44
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute',
                  right: 13,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: COLORS.textMuted
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => {
                  setShowRecovery(true)
                  setError(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.primary,
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? COLORS.textMuted : COLORS.primary,
              color: '#fff',
              border: 'none',
              borderRadius: 50,
              padding: '14px',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'background 0.18s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                }} className="spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 24, borderTop: '1px solid ' + COLORS.border }}>
          <p style={{ fontSize: 13, color: COLORS.textMuted }}>
            ¿No tienes cuenta?{' '}
            <Link href="/registro" style={{ color: COLORS.primary, fontWeight: 600, textDecoration: 'none' }}>
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}