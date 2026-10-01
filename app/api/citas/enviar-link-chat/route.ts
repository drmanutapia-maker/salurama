import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { Resend } from 'resend'
import { enviarLinkChatSiPrimeraVez } from '@/lib/chat/enviarLinkChat'
import { notificarPacientePush } from '@/lib/push/enviarPush'

const schema = z.object({
  citaId: z.string().uuid(),
})

function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: { user } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { citaId } = schema.parse(await request.json())

    const { data: cita } = await supabaseAdmin
      .from('citas')
      .select('id, estado, medico_id, paciente_id, paciente_nombre, paciente_email, fecha, hora')
      .eq('id', citaId)
      .maybeSingle()

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    const { data: medico } = await supabaseAdmin
      .from('doctors')
      .select('user_id, full_name, email')
      .eq('id', cita.medico_id)
      .single()

    if (!medico || medico.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para esta cita' }, { status: 403 })
    }

    if (cita.estado !== 'confirmed' || !cita.paciente_id || !cita.paciente_email) {
      return NextResponse.json({ success: true })
    }

    await enviarLinkChatSiPrimeraVez(supabaseAdmin, {
      medicoId: cita.medico_id,
      pacienteId: cita.paciente_id,
      pacienteEmail: cita.paciente_email,
      medicoNombre: medico.full_name,
    })

    // Push al paciente cuando su cita pasa a confirmada -- mismo evento que
    // ya dispara el link de chat arriba, así que reutiliza el mismo gate
    // (estado === 'confirmed', paciente_id y paciente_email presentes). Solo
    // llega si el paciente ya tiene una suscripción push activa (del chat);
    // notificarPacientePush no hace nada si no la tiene.
    const fechaFmt = new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    await notificarPacientePush(supabaseAdmin, cita.paciente_id, {
      title: 'Cita confirmada',
      body: `${medico.full_name} confirmó tu cita del ${fechaFmt} a las ${cita.hora?.slice(0, 5)}.`,
      url: `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/chat/recuperar`,
    })

    // Correo al médico -- contraparte de verificar-cita/route.ts (que avisa
    // cuando es el PACIENTE quien confirma). Este endpoint solo lo llama el
    // dashboard del médico, así que no hay riesgo de que ambos caminos manden
    // el correo para la misma confirmación. Mismo diseño HTML que allá, en
    // su propio try/catch para no tumbar el link de chat ni el push de arriba
    // si Resend falla.
    if (medico.email && process.env.RESEND_API_KEY) {
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
        console.error('[enviar-link-chat] email error:', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('[enviar-link-chat] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
