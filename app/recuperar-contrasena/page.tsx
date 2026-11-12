'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

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
    align-items: center;
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

export default function RecuperarContrasena() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Siempre llamamos a Supabase, pero el mensaje al usuario es siempre
    // el mismo sin importar si el email existe o no (evita enumeración de cuentas).
    await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}/auth/confirm/callback`,
    })

    setLoading(false)
    setEnviado(true)
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

        {enviado ? (
          /* ── Estado enviado ── */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#F0FDF4', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <CheckCircle size={28} color="#16A34A" />
            </div>
            <h1 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 24, fontWeight: 900, color: '#111827', marginBottom: 12,
            }}>
              Revisa tu correo
            </h1>
            <p style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.6, marginBottom: 28 }}>
              Si existe una cuenta con ese correo, recibirás un enlace para
              restablecer tu contraseña en los próximos minutos.
            </p>
            <Link
              href="/login"
              style={{
                fontSize: 14, color: '#1E3A5F', fontWeight: 600,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          /* ── Formulario ── */
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 26, fontWeight: 900, color: '#111827', marginBottom: 6,
              }}>
                Recuperar contraseña
              </h1>
              <p style={{ fontSize: 15, color: '#4B5563', lineHeight: 1.5 }}>
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
                    disabled={loading}
                    className="login-input"
                    style={{ paddingLeft: 42, paddingRight: 16 }}
                  />
                </div>
              </div>

              <button type="submit" disabled={loading || !email.trim()} className="btn-primary" style={{ marginTop: 4 }}>
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar enlace
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div style={{ borderTop: '1px solid #E5E7EB', margin: '28px 0' }} />

            <p style={{ textAlign: 'center', fontSize: 14, color: '#4B5563' }}>
              <Link
                href="/login"
                style={{ color: '#1E3A5F', fontWeight: 600, textDecoration: 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
