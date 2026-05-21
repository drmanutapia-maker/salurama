'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react'

function LoginContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)
  const [magicSent, setMagicSent] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTo)
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
        const { data: doctor, error: doctorError } = await supabase
         .from('doctors')
         .select('id, is_active, review_status')
         .eq('user_id', data.user.id)
         .maybeSingle()

        if (doctorError ||!doctor) {
          await supabase.auth.signOut()
          throw new Error('Esta cuenta no está registrada como médico')
        }

        router.replace(doctor.is_active? redirectTo : '/dashboard?status=pending')
        router.refresh()
      }
    } catch (err: any) {
      console.error('Login error:', err)
      const msg = err.message?.toLowerCase() || ''
      if (msg.includes('invalid') || msg.includes('incorrect')) {
        setError('Email o contraseña incorrectos')
      } else if (msg.includes('confirm') || msg.includes('email not confirmed')) {
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
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        shouldCreateUser: false
      }
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMagicSent(true)
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
    setError(error? `Error: ${error.message}` : 'Email de confirmación reenviado. Revisa tu bandeja.')
  }

  const isSuccess = error.includes('reenviado') || error.includes('Revisa')
  const showConfirmBtn = error.includes('confirmar')

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Left */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-10 group">
            <div className="w-10 h-10 bg-[#1E3A5F] rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-[1.02] transition-all">
              <span className="text-white font-bold text-">S</span>
            </div>
            <span className="text- font-semibold tracking-tight">
              <span className="text-[#1E3A5F]">Salu</span>
              <span className="text-[#2A9D8F]">rama</span>
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="text- font-bold tracking-[-0.02em] text-[#0F172A] mb-2">
              Bienvenido de nuevo
            </h1>
            <p className="text- text-[#64748B] leading-relaxed">
              Ingresa a tu panel médico
            </p>
          </div>

          {error && (
            <div className={`mb-5 p-3.5 border rounded-2xl flex gap-3 ${isSuccess? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FEF2F2] border-[#FECACA]'}`}>
              <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isSuccess? 'text-[#16A34A]' : 'text-[#DC2626]'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text- leading-snug font-medium ${isSuccess? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                  {error}
                </p>
                {showConfirmBtn && (
                  <button
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="text- text-[#DC2626] underline underline-offset-2 mt-1.5 hover:no-underline disabled:opacity-50"
                  >
                    Reenviar email
                  </button>
                )}
              </div>
            </div>
          )}

          {magicSent && (
            <div className="mb-5 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl flex gap-3">
              <Mail className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
              <p className="text- font-medium text-[#15803D] leading-snug">
                Revisa tu email. Te enviamos un enlace seguro para ingresar.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text- font-medium text-[#334155] mb-1.5">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w- h- text-[#94A3B8] group-focus-within:text-[#1E3A5F] transition-colors pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@clinica.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="w-full h-12 pl-11 pr-4 bg-white border border-[#E2E8F0] rounded-2xl text- placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text- font-medium text-[#334155]">
                  Contraseña
                </label>
                <Link href="/reset-password" className="text- text-[#1E3A5F] hover:text-[#2A4A70] font-medium">
                  ¿Olvidaste?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w- h- text-[#94A3B8] group-focus-within:text-[#1E3A5F] transition-colors pointer-events-none" />
                <input
                  id="password"
                  type={showPass? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full h-12 pl-11 pr-11 bg-white border border-[#E2E8F0] rounded-2xl text- placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 text-[#94A3B8] hover:text-[#475569] rounded-xl hover:bg-[#F1F5F9] transition-colors"
                >
                  {showPass? <EyeOff className="w- h-" /> : <Eye className="w- h-" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group py-1 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded- border-[#CBD5E1] text-[#1E3A5F] focus:ring-[#1E3A5F]/20 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text- text-[#475569] group-hover:text-[#334155] transition-colors">
                Mantener sesión iniciada
              </span>
            </label>

            <button
              type="submit"
              disabled={loading ||!email ||!password}
              className="w-full h-12 bg-[#1E3A5F] text-white rounded-2xl font-medium text- hover:bg-[#172E4D] active:bg-[#0F1F33] disabled:opacity-[0.6] disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow"
            >
              {loading? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E2E8F0]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-[#FAFBFC] text- text-[#94A3B8] uppercase tracking-wider font-medium">
                o continúa con
              </span>
            </div>
          </div>

          <button
            onClick={handleMagicLink}
            disabled={loading ||!email}
            className="w-full h-12 bg-white border border-[#E2E8F0] text-[#334155] rounded-2xl font-medium text- hover:bg-[#F8FAFC] hover:border-[#CBD5E1] active:bg-[#F1F5F9] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-[#2A9D8F]" />
            Enlace mágico al email
          </button>

          <p className="text-center text- text-[#64748B] mt-8">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="text-[#1E3A5F] font-medium hover:underline underline-offset-2">
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Right - 2026 Glassmorphism */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#0F1F33]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(42,157,143,0.25),transparent_60%)]" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#2A9D8F]/20 rounded-full blur-" />

        <div className="relative z-10 flex flex-col justify-center p-16 text-white w-full">
          <div className="max-w-">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-xl rounded-full text- font-medium mb-8 border border-white/15 shadow-sm">
              <div className="w-1.5 h-1.5 bg-[#2A9D8F] rounded-full animate-pulse" />
              Sistema activo · 99.9% uptime
            </div>

            <h2 className="text- font-bold leading-[1.05] tracking-[-0.02em] mb-5">
              Tu consulta,
              <br />
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                simplificada
              </span>
            </h2>

            <p className="text- leading-relaxed text-white/75 mb-12">
              Agenda inteligente, expediente clínico y cobros automáticos. Diseñado para médicos que valoran su tiempo.
            </p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Citas hoy', value: '12', trend: '+3' },
                { label: 'Ahorro', value: '4.2h', trend: '+18%' },
                { label: 'Activos', value: '248', trend: '+7' },
              ].map((stat) => (
                <div key={stat.label} className="group relative">
                  <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl group-hover:bg-white/10 transition-all" />
                  <div className="relative bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:bg-white/[0.08] transition-all">
                    <div className="text- text-white/60 mb-1">{stat.label}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text- font-semibold tracking-tight">{stat.value}</span>
                      <span className="text- text-[#2A9D8F] font-medium">{stat.trend}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 opacity-[0.04] mix-blend-soft-light" style={{
          backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
          backgroundSize: '72px 72px'
        }} />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}