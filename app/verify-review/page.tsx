'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { CheckCircle2, XCircle, Star, Loader2, ShieldCheck, Calendar, User, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

function VerifyReviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'submitted'>('loading')
  const [appointment, setAppointment] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setErrorMsg('Token no proporcionado')
      return
    }

    let cancelled = false

    supabase
     .from('appointment_requests')
     .select(`id, doctor_id, patient_name, patient_email, requested_date, doctors (full_name)`)
     .eq('review_token', token)
     .eq('review_sent', true)
     .eq('review_verified', false)
     .maybeSingle()
     .then(({ data, error }) => {
        if (cancelled) return
        if (error ||!data) {
          setStatus('error')
          setErrorMsg('Este enlace ya fue usado, expiró o es inválido')
          return
        }
        setAppointment(data)
        setStatus('success')
      })

    return () => { cancelled = true }
  }, [searchParams, supabase])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appointment || submitting) return

    setSubmitting(true)
    setErrorMsg('')

    try {
      await supabase.from('reviews').insert({
        doctor_id: appointment.doctor_id,
        user_name: appointment.patient_name,
        user_email: appointment.patient_email,
        rating,
        comment: comment.trim() || null,
        email_verified: true,
        verified_at: new Date().toISOString(),
        is_visible: true,
        appointment_id: appointment.id
      })

      await supabase
      .from('appointment_requests')
      .update({ review_verified: true, review_verified_at: new Date().toISOString() })
      .eq('id', appointment.id)

      setStatus('submitted')
      setTimeout(() => router.replace(`/doctor/${appointment.doctor_id}?review=thanks`), 2000)
    } catch (error: any) {
      setErrorMsg(error.message?.includes('duplicate')? 'Ya enviaste una reseña' : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }, [appointment, rating, comment, submitting, supabase, router])

  const doctorName = appointment?.doctors?.[0]?.full_name || appointment?.doctors?.full_name || ''
  const formattedDate = appointment?.requested_date
  ? new Date(appointment.requested_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : ''

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-[#1E3A5F]" />
          <p className="text- text-[#64748B]">Verificando...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4">
        <div className="w-full max-w- bg-white rounded- border border-[#E2E8F0] p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#FEF2F2] flex items-center justify-center">
            <XCircle className="w-8 h-8 text-[#DC2626]" />
          </div>
          <h1 className="text- font-bold text-[#0F172A] mb-2">Enlace no válido</h1>
          <p className="text- text-[#64748B] mb-8">{errorMsg}</p>
          <Link href="/" className="inline-flex items-center gap-2 h-11 px-6 bg-[#0F172A] text-white rounded-xl text- font-medium">
            Ir al inicio <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'submitted') {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4">
        <div className="w-full max-w- bg-white rounded- border border-[#E2E8F0] p-10 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#F0FDF4] flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          </div>
          <h1 className="text- font-bold text-[#0F172A] mb-2">¡Gracias!</h1>
          <p className="text- text-[#64748B]">Tu reseña verificada ayuda a otros pacientes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-[#1E3A5F] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text- font-semibold"><span className="text-[#1E3A5F]">Salu</span><span className="text-[#2A9D8F]">rama</span></span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-full">
            <ShieldCheck size={14} className="text-[#16A34A]" />
            <span className="text- font-medium text-[#15803D]">Reseña verificada</span>
          </div>
        </div>

        <div className="bg-white rounded- border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="bg-[#F8FAFC] px-8 pt-8 pb-6 border-b border-[#F1F5F9]">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#2A9D8F] flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text- font-bold text-[#0F172A] leading-snug">¿Cómo te fue con el Dr. {doctorName}?</h1>
                <div className="flex gap-4 mt-2 text- text-[#64748B]">
                  <span className="flex items-center gap-1.5"><User size={14} />{appointment?.patient_name}</span>
                  {formattedDate && <span className="flex items-center gap-1.5"><Calendar size={14} />{formattedDate}</span>}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            {errorMsg && (
              <div className="mb-6 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-2xl flex gap-3">
                <XCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <p className="text- text-[#DC2626]">{errorMsg}</p>
              </div>
            )}

            <div className="mb-8">
              <label className="block text- font-medium text-[#0F172A] mb-3">Califica tu experiencia</label>
              <div className="flex justify-center gap-1.5 p-4 bg-[#F8FAFC] rounded-2xl">
                {[1,2,3,4,5].map((star) => (
                  <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-2">
                    <Star size={36} className={`transition-all ${star <= (hoverRating || rating)? 'fill-[#F59E0B] text-[#F59E0B] scale-110' : 'text-[#CBD5E1]'}`} strokeWidth={1.5} />
                  </button>
                ))}
              </div>
              <p className="text-center text- text-[#64748B] mt-2 font-medium">
                {['','Malo','Regular','Bueno','Muy bueno','Excelente'][rating]}
              </p>
            </div>

            <div className="mb-8">
              <div className="flex justify-between mb-2.5">
                <label className="text- font-medium text-[#0F172A]">Tu experiencia</label>
                <span className="text- text-[#94A3B8]">{comment.length}/500</span>
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value.slice(0,500))} rows={4} placeholder="¿Qué te gustó de la consulta?" className="w-full px-4 py-3.5 border border-[#E2E8F0] rounded-2xl text- outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] resize-none" />
            </div>

            <button type="submit" disabled={submitting} className="w-full h-12 bg-[#0F172A] text-white rounded-2xl font-medium hover:bg-[#1E293B] disabled:opacity-60 flex items-center justify-center gap-2">
              {submitting? <><Loader2 size={18} className="animate-spin" />Enviando...</> : <><ShieldCheck size={18} />Publicar reseña verificada</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function VerifyReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#1E3A5F]" /></div>}>
      <VerifyReviewContent />
    </Suspense>
  )
}