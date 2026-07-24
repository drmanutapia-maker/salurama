import { SupabaseClient } from '@supabase/supabase-js'
import { emitirTokenSiFalta } from './token'
import { sendChatLinkEmail } from '@/lib/email'

interface EnviarLinkChatParams {
  medicoId: string
  pacienteId: string
  pacienteEmail: string
  medicoNombre: string
}

/**
 * Emite el link del chat solo si es la primera cita confirmada de este par
 * médico+paciente (token_hash aún NULL en su chat_sala). Si el correo falla,
 * queda logueado pero no lanza — el token ya se marcó como emitido en
 * chat_salas (recuperarlo es tarea del Paso 8, "reenviar mi link").
 */
export async function enviarLinkChatSiPrimeraVez(
  supabase: SupabaseClient,
  { medicoId, pacienteId, pacienteEmail, medicoNombre }: EnviarLinkChatParams
): Promise<void> {
  const { data: sala, error } = await supabase
    .from('chat_salas')
    .select('id')
    .eq('medico_id', medicoId)
    .eq('paciente_id', pacienteId)
    .maybeSingle()

  if (error || !sala) {
    console.warn('[chat-link] chat_sala no encontrada para', { medicoId, pacienteId, error })
    return
  }

  const token = await emitirTokenSiFalta(supabase, sala.id)
  if (!token) return // ya tenía token_hash — no es la primera vez, no se reenvía

  const chatUrl = `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/chat/${token}`

  try {
    await sendChatLinkEmail(pacienteEmail, chatUrl, medicoNombre)
  } catch (emailError) {
    console.error('[chat-link] Error enviando correo del link de chat:', {
      salaId: sala.id,
      medicoId,
      pacienteId,
      error: emailError,
    })
  }
}
