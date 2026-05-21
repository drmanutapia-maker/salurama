import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(
  to: string,
  token: string,
  medicoNombre: string,
  citaFecha: string
) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/verificar-cita?token=${token}`

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: `Confirma tu cita con ${medicoNombre}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#0F4C75;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">Confirma tu cita médica</h2>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola,</p>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Recibimos tu solicitud con <strong>${medicoNombre}</strong> para el <strong>${citaFecha}</strong>.</p>
                  <p style="margin:0 0 24px;color:#6B7280;">Para confirmar, haz clic:</p>
                  <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
                    <a href="${verificationUrl}" style="display:inline-block;background:#FF6B6B;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar mi cita</a>
                  </td></tr></table>
                  <p style="margin:24px 0 0;color:#9CA3AF;font-size:14px;">Este enlace expira en 24 horas.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama - Verifica. Elige. Confía.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })
    if (error) throw error
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('Error enviando email:', error)
    throw new Error('No se pudo enviar email')
  }
}