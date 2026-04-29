'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Eye, EyeOff, Shield, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Redirigir después de éxito con cleanup
  useEffect(() => {
    if (!success) return
    const timeout = setTimeout(() => {
      router.push('/login?password_changed=true')
    }, 2000)
    return () => clearTimeout(timeout)
  }, [success, router])

   useEffect(() => {
    // Verificar si hay un hash de recuperación en la URL
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (hash) {
      // Extraer access_token del hash
      const params = new URLSearchParams(hash.substring(1))
      const accessToken = params.get('access_token')
      
      if (accessToken) {
        // Establecer sesión con el token de recuperación
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: params.get('refresh_token') || ''
        }).then(({ error }) => {
          if (error) {
            setError('Link de recuperación inválido o expirado')
          }
        })
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      
      // Esperar 2 segundos y redirigir al login
      const timeout = setTimeout(() => {
        router.push('/login?password_changed=true')
      }, 2000)
      return () => clearTimeout(timeout)
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ width: 64, height: 64, background: '#DCFCE7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} color="#059669" />
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#111827', marginBottom: 12 }}>
            ¡Contraseña actualizada!
          </h1>
          <p style={{ color: '#6B7280', marginBottom: 24 }}>
            Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;900&family=DM+Sans:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease-out; }
      `}</style>

      <div className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 40, maxWidth: 440, width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #1E3A5F 0%, #2A9D8F 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={28} color="#fff" />
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 900, color: '#111827' }}>
            Nueva contraseña
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 8 }}>
            Ingresa tu nueva contraseña
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Contraseña nueva */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              Contraseña nueva *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif"
                }}
                placeholder="Mínimo 8 caracteres"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
              Confirmar contraseña *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 12px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif"
                }}
                placeholder="Repite tu contraseña"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF'
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Requisitos */}
          <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Requisitos:</p>
            <ul style={{ fontSize: 12, color: '#6B7280', paddingLeft: 16 }}>
              <li style={{ marginBottom: 4 }}>Mínimo 8 caracteres</li>
            </ul>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #1E3A5F 0%, #2A9D8F 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: 14,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              marginTop: 8
            }}
          >
            {loading ? 'Cambiando contraseña...' : 'Cambiar contraseña'}
          </button>
        </form>

        {/* Link volver */}
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B7280' }}>
          <a href="/login" style={{ color: '#1E3A5F', textDecoration: 'none', fontWeight: 600 }}>
            ← Volver al login
          </a>
        </p>
      </div>
    </div>
  )
}