'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Login con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('Auth error:', authError)
        
        // Si el email no está confirmado, dar mensaje claro
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Tu email no ha sido confirmado. Revisa tu bandeja de entrada o solicita un nuevo email de confirmación.')
        }
        
        throw new Error('Email o contraseña incorrectos')
      }

      if (!authData.user) {
        throw new Error('No se pudo autenticar. Intenta de nuevo.')
      }

      // 2. Verificar en tabla doctors con mejor manejo de errores
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id, is_active, review_status, email')
        .eq('email', email)
        .single()

      if (doctorError) {
        console.error('Doctor lookup error:', doctorError)
        await supabase.auth.signOut()
        
        if (doctorError.code === 'PGRST116') {
          throw new Error('No se encontró un perfil de médico con este email. Por favor regístrate primero.')
        }
        
        throw new Error('Error al verificar tu perfil. Intenta de nuevo.')
      }

      if (!doctor) {
        await supabase.auth.signOut()
        throw new Error('No tienes un perfil de médico registrado. Por favor regístrate primero.')
      }

      // 3. Verificar si está activo
      if (!doctor.is_active) {
        await supabase.auth.signOut()
        throw new Error('Tu perfil está inactivo. Contacta a privacidad@salurama.com')
      }

      // 4. Login exitoso
      router.push('/dashboard')
    } catch (err: unknown) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
        redirectTo: `${window.location.origin}/dashboard`
      })
      
      if (error) throw error
      
      setRecoverySent(true)
    } catch (err: unknown) {
      alert('Error al enviar email de recuperación: ' + (err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  // Si está mostrando recovery
  if (showRecovery) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #EEF2FF 0%, #fff 100%)', 
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
          .fade-up { animation: fadeUp 0.4s ease-out; }
        `}</style>

        <div className="fade-up" style={{ 
          background: '#fff', 
          borderRadius: 20, 
          padding: 'clamp(32px, 6vw, 48px)', 
          maxWidth: 440, 
          width: '100%', 
          boxShadow: '0 16px 48px rgba(55,48,163,0.1)' 
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#3730A3' }}>Salu</span>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: '#F4623A' }}>rama</span>
            </Link>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 }}>
              Recuperar contraseña
            </h1>
            <p style={{ fontSize: 14, color: '#6B7280' }}>
              Te enviaremos un email para restablecer tu contraseña
            </p>
          </div>

          {recoverySent ? (
            <div style={{ 
              background: '#DCFCE7', 
              border: '1px solid #86EFAC', 
              borderRadius: 10, 
              padding: '16px', 
              textAlign: 'center',
              marginBottom: 20 
            }}>
              <p style={{ fontSize: 14, color: '#059669', margin: 0, fontWeight: 600 }}>
                ✅ Email enviado
              </p>
              <p style={{ fontSize: 13, color: '#059669', marginTop: 8 }}>
                Revisa tu bandeja de entrada (y spam) para restablecer tu contraseña.
              </p>
              <button
                onClick={() => { setShowRecovery(false); setRecoverySent(false); }}
                style={{
                  marginTop: 16,
                  background: '#059669',
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    style={{ 
                      width: '100%', 
                      padding: '12px 14px 12px 42px', 
                      border: '1.5px solid #E5E7EB', 
                      borderRadius: 10, 
                      fontSize: 15, 
                      fontFamily: "'DM Sans', sans-serif", 
                      color: '#1A1A2E', 
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
                  background: loading ? '#9CA3AF' : '#3730A3',
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
                onClick={() => setShowRecovery(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
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

  // Login normal
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #EEF2FF 0%, #fff 100%)', 
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
        .fade-up { animation: fadeUp 0.4s ease-out; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.7s linear infinite; }
      `}</style>

      <div className="fade-up" style={{ 
        background: '#fff', 
        borderRadius: 20, 
        padding: 'clamp(32px, 6vw, 48px)', 
        maxWidth: 440, 
        width: '100%', 
        boxShadow: '0 16px 48px rgba(55,48,163,0.1)' 
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 900, color: '#3730A3' }}>Salu</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: '#F4623A' }}>rama</span>
          </Link>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 900, color: '#1A1A2E', marginBottom: 8 }}>
            Bienvenido de nuevo
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            Inicia sesión para gestionar tu perfil
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ 
            background: '#FEF2F2', 
            border: '1px solid #FECACA', 
            borderRadius: 10, 
            padding: '12px 14px', 
            marginBottom: 20, 
            display: 'flex', 
            gap: 10, 
            alignItems: 'flex-start' 
          }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                style={{ 
                  width: '100%', 
                  padding: '12px 14px 12px 42px', 
                  border: '1.5px solid #E5E7EB', 
                  borderRadius: 10, 
                  fontSize: 15, 
                  fontFamily: "'DM Sans', sans-serif", 
                  color: '#1A1A2E', 
                  outline: 'none' 
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ 
                  width: '100%', 
                  padding: '12px 14px 12px 42px', 
                  border: '1.5px solid #E5E7EB', 
                  borderRadius: 10, 
                  fontSize: 15, 
                  fontFamily: "'DM Sans', sans-serif", 
                  color: '#1A1A2E', 
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
                  color: '#9CA3AF' 
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Link de recuperación MEJOR UBICADO */}
            <div style={{ textAlign: 'right', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setShowRecovery(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3730A3',
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
              background: loading ? '#9CA3AF' : '#3730A3',
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

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 24, borderTop: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 13, color: '#6B7280' }}>
            ¿No tienes cuenta?{' '}
            <Link href="/registro" style={{ color: '#3730A3', fontWeight: 600, textDecoration: 'none' }}>
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}