import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { rotarToken } from '@/lib/chat/token'

function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

// Resuelve la chat_sala de este par médico+paciente y rota su token — mismo
// patrón que /api/chat/reenviar-link. Se llama tanto si la cita se acaba de
// confirmar como si ya estaba confirmada de antes (ver comentario en el
// handler): cualquier clic en el link de verificación debe poder llevar al
// paciente a un chat con token válido, sin importar quién confirmó primero.
async function resolverTokenDeChat(
  supabase: SupabaseClient,
  medicoId: string,
  pacienteId: string | null
): Promise<string | null> {
  if (!pacienteId) return null

  const { data: sala, error } = await supabase
    .from('chat_salas')
    .select('id')
    .eq('medico_id', medicoId)
    .eq('paciente_id', pacienteId)
    .maybeSingle()

  if (error || !sala) {
    console.warn('[verificar-cita] chat_sala no encontrada para', { medicoId, pacienteId, error })
    return null
  }

  return rotarToken(supabase, sala.id)
}

export async function POST(request: NextRequest) {
  let token: string
  try {
    const body = await request.json()
    token = body.token
  } catch {
    return NextResponse.json({ error: 'Token no válido.' }, { status: 400 })
  }

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token no válido.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: cita, error } = await supabase
    .from('citas')
    .select('id, estado, medico_id, paciente_id, paciente_nombre, paciente_email, fecha, hora, expires_at')
    .eq('verification_token', token)
    .single()

  if (error || !cita) {
    return NextResponse.json({ error: 'Este enlace no es válido o ya expiró.' }, { status: 404 })
  }

  // Ya estaba confirmada (por ejemplo, el médico la confirmó primero desde su
  // dashboard) — no hay nada que actualizar ni al médico que notificar, pero
  // igual se rota el token y se manda al paciente a su chat, en vez de
  // dejarlo en una pantalla que no lleva a ningún lado.
  if (cita.estado === 'confirmed') {
    const chatToken = await resolverTokenDeChat(supabase, cita.medico_id, cita.paciente_id)
    return NextResponse.json({ alreadyConfirmed: true, chatToken })
  }

  if (cita.expires_at && new Date(cita.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Este enlace ha expirado.' }, { status: 410 })
  }

  const { error: updateError } = await supabase
    .from('citas')
    .update({ estado: 'confirmed' })
    .eq('id', cita.id)

  if (updateError) {
    console.error('[verificar-cita] update error:', updateError)
    return NextResponse.json({ error: 'Error al confirmar la cita. Intenta de nuevo.' }, { status: 500 })
  }

  if (!cita.paciente_id) {
    console.warn('[verificar-cita] Cita sin paciente_id, se omite el link de chat:', cita.id)
  }
  const chatToken = await resolverTokenDeChat(supabase, cita.medico_id, cita.paciente_id)

  // Notificar al médico — service_role bypassa RLS, sin restricciones
  const { data: medico } = await supabase
    .from('doctors')
    .select('email, full_name')
    .eq('id', cita.medico_id)
    .single()

  if (medico?.email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fechaFormateada = new Date(cita.fecha + 'T00:00:00-06:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    const patientName = sanitize(cita.paciente_nombre ?? '')
    const hora = cita.hora?.slice(0, 5) ?? ''

    try {
      await resend.emails.send({
        from: 'Salurama <noreply@salurama.com>',
        to: [medico.email],
        subject: `Nueva cita confirmada: ${cita.paciente_nombre}`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
              <tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:white;border-radius:16px;overflow:hidden;">
                  <tr><td style="background:#1E3A5F;padding:28px;text-align:center;">
                    <h1 style="margin:0;color:white;font-size:22px;font-weight:900;">Salurama</h1>
                  </td></tr>
                  <tr><td style="padding:32px;">
                    <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">¡Nueva cita confirmada!</h2>
                    <p style="margin:0 0 12px;color:#4A5568;line-height:1.6;">
                      <strong>${patientName}</strong> ha confirmado su cita.
                    </p>
                    <div style="background:#F9FAFB;border-radius:10px;padding:16px;margin-bottom:20px;">
                      <p style="margin:0 0 4px;color:#111827;font-weight:600;">📅 ${fechaFormateada} a las ${hora}</p>
                    </div>
                    <a href="${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/dashboard/citas"
                       style="display:inline-block;background:#8B5CF6;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
                      Ver en dashboard
                    </a>
                  </td></tr>
                  <tr><td style="background:#F3F4F6;padding:20px;text-align:center;">
                    <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `,
      })
    } catch (err) {
      console.error('[verificar-cita] email error:', err)
    }
  }

  return NextResponse.json({ success: true, chatToken })
}
