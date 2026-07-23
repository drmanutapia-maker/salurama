'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function ConfirmPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Confirmando tu email...')

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError ||!session) {
          throw new Error('No se pudo confirmar la sesión')
        }

        const userId = session.user.id

        // Confirmar el correo activa la cuenta (is_active) — nunca debe
        // tocar review_status, que es un concepto distinto (revisión de
        // credenciales por un admin, no algo que decida el propio médico
        // al confirmar su email). Antes esto escribía 'aprobado', un valor
        // que ningún otro lugar del sistema reconoce (los únicos válidos
        // son 'pendiente'/'revisado'/'rechazado'), lo cual descuadraba los
        // contadores de /admin/medicos sin que se notara en el badge.
        const { error: updateError } = await supabase
        .from('doctors')
        .update({
            is_active: true,
          })
        .eq('user_id', userId)

        if (updateError) {
          console.error('Error activando perfil:', updateError)
        }

        setStatus('success')
        setMessage('¡Email confirmado! Activando tu perfil...')

        setTimeout(() => {
          router.push('/dashboard/editar-perfil?welcome=true')
        }, 1500)

      } catch (err: any) {
        console.error('Error en confirmación:', err)
        setStatus('error')
        setMessage(err.message || 'Error al confirmar email')

        setTimeout(() => {
          router.push('/login')
        }, 3000)
      }
    }

    confirmEmail()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EEF2FF] to-white flex items-center justify-center p-4">
      <div className="w-full max-w- bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-[#EEF2FF] rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-[#1E3A5F] animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
              {message}
            </h1>
            <p className="text-[#64748B]">Esto tomará solo un momento...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">
              ¡Todo listo!
            </h1>
            <p className="text-[#64748B]">Redirigiendo a tu perfil...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-[#FEE2E2] rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-[#DC2626]" />
            </div>
            <h1 className="text-2xl font-bold text-[#DC2626] mb-2">
              Error
            </h1>
            <p className="text-[#64748B] mb-4">{message}</p>
            <p className="text-sm text-[#94A3B8]">Redirigiendo al login...</p>
          </>
        )}
      </div>
    </div>
  )
}