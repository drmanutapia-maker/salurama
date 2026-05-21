'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)
  const [magicSent, setMagicSent] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/dashboard'

  // Si ya está logueado, redirigir
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(redirectTo)
    })
  }, [router, redirectTo, supabase.auth])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      })

      if (authError) throw authError

      if (data.user) {
        // Verificar que sea médico
        const { data: doctor, error: doctorError } = await supabase
         .from('doctors')
         .select('id, is_active, review_status')
         .eq('user_id', data.user.id)
         .single()

        if (doctorError ||!doctor) {
          await supabase.auth.signOut()
          throw new Error('Esta cuenta no está registrada como médico')
        }

        // Redirigir según estado
        if (!doctor.is_active) {
          router.push('/dashboard?status=pending')
        } else {
          router.push(redirectTo)
        }
        router.refresh()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.message.includes('Invalid login') || err.message.includes('invalid')) {
        setError('Email o contraseña incorrectos')
      } else if (err.message.includes('Email not confirmed') || err.message.includes('confirm')) {
        setError('Debes confirmar tu email primero. Revisa tu bandeja de entrada.')
      } else {
        setError(err.message || 'Error al iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setError('Ingresa tu email primero')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        shouldCreateUser: false
      }
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMagicSent(true)
      setError('')
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase().trim()
    })
    setLoading(false)
    if (error) {
      setError('Error al reenviar: ' + error.message)
    } else {
      setError('Email de confirmación reenviado. Revisa tu bandeja.')
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Left - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-12 group">
            <div className="w-9 h-9 bg-[#1E3A5F] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-[#1E3A5F]">Salu</span>
              <span className="text-[#2A9D8F]">rama</span>
            </span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text- font-bold tracking-tight text-[#0F172A] mb-2">
              Bienvenido de nuevo
            </h1>
            <p className="text-[#64748B]">
              Ingresa a tu panel médico
            </p>
          </div>

          {/* Error / Success */}
          {error && (
            <div className={`mb-5 p-3.5 border rounded-xl flex gap-3 ${error.includes('reenviado') || error.includes('enviamos')? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FEF2] border-[#FECACA]'}`}>
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${error.includes('reenviado') || error.includes('enviamos')? 'text-[#16A34A]' : 'text-[#DC2626]'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${error.includes('reenviado') || error.includes('enviamos')? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>{error}</p>
                {error.includes('confirmar') && (
                  <button
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="text-xs text-[#DC2626] underline mt-1 hover:no-underline disabled:opacity-50"
                  >
                    Reenviar email de confirmación
                  </button>
                )}
              </div>
            </div>
          )}

          {magicSent && (
            <div className="mb-5 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl">
              <p className="text-sm font-medium text-[#16A34A]">¡Revisa tu email! Te enviamos un enlace para ingresar.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full h- pl-11 pr-4 bg-white border-[#E2E8F0] rounded-xl text- placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-[#334155]">
                  Contraseña
                </label>
                <Link
                  href="/reset-password"
                  className="text-sm text-[#1E3A5F] hover:text-[#2A4A70] font-medium"
                >
                  ¿Olvidaste?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" />
                <input
                  type={showPass? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h- pl-11 pr-11 bg-white border border-[#E2E8F0] rounded-xl text- placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#94A3B8] hover:text-[#64748B] rounded-lg hover:bg-[#F1F5F9] transition-colors"
                >
                  {showPass? <EyeOff className="w- h-" /> : <Eye className="w- h-" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group py-1">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-[#CBD5E1] text-[#1E3A5F] focus:ring-[#1E3A5F]/20 focus:ring-offset-0"
              />
              <span className="text-sm text-[#475569] group-hover:text-[#334155]">
                Mantener sesión iniciada
              </span>
            </label>

            <button
              type="submit"
              disabled={loading ||!email ||!password}
              className="w-full h- bg-[#1E3A5F] text-white rounded-xl font-medium hover:bg-[#172E4D] active:bg-[#0F1F33] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading? (
                <>
                  <Loader2 className="w- h- animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight className="w- h-" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-[#FAFBFC] text-xs text-[#94A3B8] uppercase tracking-wider font-medium">
                O
              </span>
            </div>
          </div>

          {/* Magic Link */}
          <button
            onClick={handleMagicLink}
            disabled={loading ||!email}
            className="w-full h- bg-white border-[#E2E8F0] text-[#334155] rounded-xl font-medium hover:bg-[#F8FAFC] hover:border-[#CBD5E1] active:bg-[#F1F5F9] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            Entrar con enlace mágico
          </button>

          {/* Footer */}
          <p className="text-center text-sm text-[#64748B] mt-8">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-[#1E3A5F] font-medium hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Right - Visual (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#1E3A5F] to-[#0F1F33]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(42,157,143,0.3),transparent_50%)]" />
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <div className="max-w-">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full text-xs font-medium mb-6 border border-white/20">
              <div className="w-1.5 h-1.5 bg-[#2A9D8F] rounded-full animate-pulse" />
              Panel médico activo
            </div>

            <h2 className="text- font-bold leading-[1.1] tracking-tight mb-4">
              Gestiona tu consulta
              <br />
              <span className="text-[#2A9D8F]">desde un solo lugar</span>
            </h2>

            <p className="text- leading-relaxed text-white/80 mb-10">
              Agenda, historial clínico y pagos. Todo integrado para que te enfoques en lo que importa: tus pacientes.
            </p>

            <div className="space-y-4">
              {[
                { label: 'Citas confirmadas hoy', value: '12' },
                { label: 'Tiempo ahorrado', value: '4.2h' },
                { label: 'Pacientes activos', value: '248' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-baseline justify-between py-3 border-b border-white/10 last:border-0">
                  <span className="text-sm text-white/70">{stat.label}</span>
                  <span className="text-2xl font-semibold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }} />
      </div>
    </div>
  )
}