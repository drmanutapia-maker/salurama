import webpush, { WebPushError } from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

let configurado = false
function asegurarConfiguracion() {
  if (configurado) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
  configurado = true
}

export interface PayloadPush {
  title: string
  body: string
  url: string
}

/**
 * Envía un push a todos los dispositivos suscritos de un paciente. Nunca
 * lanza — un fallo de push no debe tumbar el flujo que lo dispara (ej. el
 * envío del mensaje del médico, que ya se guardó exitosamente). Las
 * suscripciones que el navegador dio de baja (404/410) se borran solas.
 */
export async function notificarPacientePush(
  supabase: SupabaseClient,
  pacienteId: string,
  payload: PayloadPush
): Promise<void> {
  asegurarConfiguracion()

  const { data: suscripciones, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('paciente_id', pacienteId)

  if (error) {
    console.error('[push] Error leyendo suscripciones:', error)
    return
  }
  if (!suscripciones || suscripciones.length === 0) return

  const payloadJson = JSON.stringify(payload)

  await Promise.allSettled(
    suscripciones.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson
        )
      } catch (err) {
        if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('[push] Error enviando notificación:', err)
        }
      }
    })
  )
}
