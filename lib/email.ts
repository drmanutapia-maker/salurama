import { Resend } from 'resend'
import { OTP_EXPIRY_MINUTES } from './pacienteOtp'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  medicoNombre: string,
  citaFecha: string
) {
  const resend = getResend()
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
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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

export async function sendPacienteOtpEmail(
  to: string,
  code: string,
  medicoNombre: string
) {
  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: `Tu código de verificación: ${code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">Confirma que eres tú</h2>
                  <p style="margin:0 0 24px;color:#6B7280;line-height:1.6;">Recibimos una solicitud para autocompletar tus datos al agendar con <strong>${medicoNombre}</strong>. Usa este código para continuar:</p>
                  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;width:100%;"><tr><td align="center">
                    <div style="display:inline-block;background:#F3F4F6;border-radius:12px;padding:20px 32px;font-size:32px;font-weight:900;letter-spacing:8px;color:#1E3A5F;">${code}</div>
                  </td></tr></table>
                  <p style="margin:0;color:#9CA3AF;font-size:14px;">Este código expira en ${OTP_EXPIRY_MINUTES} minutos. Si tú no hiciste esta solicitud, puedes ignorar este correo.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de código OTP:', error)
    throw new Error('No se pudo enviar el email de verificación')
  }
}

export async function sendChatLinkEmail(
  to: string,
  chatUrl: string,
  medicoNombre: string
) {
  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: `Tu chat con ${medicoNombre} ya está disponible`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">Tu cita quedó confirmada</h2>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola,</p>
                  <p style="margin:0 0 24px;color:#6B7280;line-height:1.6;">Ya puedes escribirle directamente a <strong>${medicoNombre}</strong> desde este link, para coordinar tu consulta o resolver dudas antes de la cita.</p>
                  <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
                    <a href="${chatUrl}" style="display:inline-block;background:#2A9D8F;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Abrir mi chat</a>
                  </td></tr></table>
                  <p style="margin:24px 0 0;color:#9CA3AF;font-size:14px;">Guarda este enlace: es el mismo para todas tus citas con este médico.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email del link de chat:', error)
    throw new Error('No se pudo enviar el email del link de chat')
  }
}

export async function sendChatLinkReenvioEmail(
  to: string,
  chats: { medicoNombre: string; chatUrl: string }[]
) {
  const resend = getResend()
  const esMultiple = chats.length > 1

  const botones = chats.map(({ medicoNombre, chatUrl }) => `
    <div style="margin:0 0 20px;padding:16px;background:#F9FAFB;border-radius:12px;">
      <p style="margin:0 0 12px;color:#1F2937;font-weight:600;">${medicoNombre}</p>
      <table cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${chatUrl}" style="display:inline-block;background:#2A9D8F;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Abrir chat</a>
      </td></tr></table>
    </div>
  `).join('')

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: esMultiple ? 'Aquí están tus accesos a tus chats' : 'Aquí está tu acceso al chat',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">${esMultiple ? 'Tus accesos al chat' : 'Tu acceso al chat'}</h2>
                  <p style="margin:0 0 24px;color:#6B7280;line-height:1.6;">
                    ${esMultiple
                      ? 'Encontramos varias conversaciones activas asociadas a este correo. Aquí tienes el acceso a cada una:'
                      : `Recibimos tu solicitud para recuperar el acceso a tu chat con <strong>${chats[0].medicoNombre}</strong>.`}
                  </p>
                  ${esMultiple ? botones : `
                    <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
                      <a href="${chats[0].chatUrl}" style="display:inline-block;background:#2A9D8F;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Abrir mi chat</a>
                    </td></tr></table>
                  `}
                  <p style="margin:24px 0 0;color:#9CA3AF;font-size:14px;">Por seguridad, si tenías guardado ${esMultiple ? 'algún enlace anterior, ya no funcionará' : 'un enlace anterior, ya no funcionará'}. Usa ${esMultiple ? 'estos enlaces nuevos' : 'este enlace nuevo'} a partir de ahora.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de reenvío de chat:', error)
    throw new Error('No se pudo enviar el email de reenvío de chat')
  }
}

export async function sendCitaCanceladaPorPacienteEmail(
  to: string,
  pacienteNombre: string,
  citaFechaHora: string
) {
  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: `${pacienteNombre} canceló su cita`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">Una cita fue cancelada</h2>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola,</p>
                  <p style="margin:0 0 24px;color:#6B7280;line-height:1.6;"><strong>${pacienteNombre}</strong> canceló su cita del <strong>${citaFechaHora}</strong>.</p>
                  <p style="margin:0;color:#9CA3AF;font-size:14px;">Ese horario ya quedó libre en tu agenda. Puedes ver el detalle en tu panel de citas.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de cancelación de cita:', error)
    throw new Error('No se pudo enviar el email de cancelación de cita')
  }
}

export async function sendCitaRechazadaEmail(
  to: string,
  medicoNombre: string,
  citaFechaHora: string,
  motivo: string
) {
  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: `Tu cita con ${medicoNombre} fue rechazada`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">Tu cita fue rechazada</h2>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola,</p>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;"><strong>${medicoNombre}</strong> no pudo confirmar tu cita del <strong>${citaFechaHora}</strong>.</p>
                  <div style="background:#F9FAFB;border-radius:10px;padding:16px;margin-bottom:20px;">
                    <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-transform:uppercase;font-weight:700;">Motivo</p>
                    <p style="margin:0;color:#1F2937;">${motivo}</p>
                  </div>
                  <p style="margin:0;color:#9CA3AF;font-size:14px;">Puedes agendar de nuevo en otro horario cuando quieras.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de rechazo de cita:', error)
    throw new Error('No se pudo enviar el email de rechazo de cita')
  }
}

export async function sendCitaCanceladaPorMedicoEmail(
  to: string,
  medicoNombre: string,
  citaFechaHora: string,
  motivo: string
) {
  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: `Tu cita confirmada con ${medicoNombre} fue cancelada`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">Tu cita confirmada fue cancelada</h2>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola,</p>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;"><strong>${medicoNombre}</strong> tuvo que cancelar tu cita ya confirmada del <strong>${citaFechaHora}</strong>.</p>
                  <div style="background:#F9FAFB;border-radius:10px;padding:16px;margin-bottom:20px;">
                    <p style="margin:0 0 4px;color:#9CA3AF;font-size:12px;text-transform:uppercase;font-weight:700;">Motivo</p>
                    <p style="margin:0;color:#1F2937;">${motivo}</p>
                  </div>
                  <p style="margin:0;color:#9CA3AF;font-size:14px;">Puedes agendar de nuevo en otro horario cuando quieras.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de cancelación de cita confirmada:', error)
    throw new Error('No se pudo enviar el email de cancelación de cita confirmada')
  }
}

export async function sendAccountConfirmationEmail(
  to: string,
  confirmUrl: string,
  medicoNombre: string
) {
  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [to],
      subject: 'Confirma tu cuenta de Salurama',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:24px;">Confirma tu cuenta</h2>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola${medicoNombre ? ` ${medicoNombre}` : ''},</p>
                  <p style="margin:0 0 24px;color:#6B7280;line-height:1.6;">Gracias por registrarte en Salurama. Confirma tu correo para activar tu cuenta y completar tu perfil médico:</p>
                  <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
                    <a href="${confirmUrl}" style="display:inline-block;background:#2A9D8F;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Confirmar mi cuenta</a>
                  </td></tr></table>
                  <p style="margin:24px 0 0;color:#9CA3AF;font-size:14px;">Si tú no creaste esta cuenta, puedes ignorar este correo.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de confirmación de cuenta:', error)
    throw new Error('No se pudo enviar el email de confirmación')
  }
}

export async function sendNewDoctorRegistrationEmail(
  fullName: string,
  professionalLicense: string,
  specialtyCouncil: string | null
) {
  const resend = getResend()
  const adminUrl = `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/admin/medicos`

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: ['drmanutapia@gmail.com'],
      subject: `Nuevo médico registrado: ${fullName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:22px;">Nuevo médico registrado</h2>
                  <p style="margin:0 0 8px;color:#6B7280;line-height:1.6;"><strong>Nombre:</strong> ${fullName}</p>
                  <p style="margin:0 0 8px;color:#6B7280;line-height:1.6;"><strong>Cédula:</strong> ${professionalLicense}</p>
                  <p style="margin:0 0 20px;color:#6B7280;line-height:1.6;"><strong>Consejo de especialidad declarado:</strong> ${specialtyCouncil || 'No declaró ninguno'}</p>
                  <table cellpadding="0" cellspacing="0" style="margin:8px 0;"><tr><td align="center">
                    <a href="${adminUrl}" style="display:inline-block;background:#1E3A5F;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Ver en el panel de administración</a>
                  </td></tr></table>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de notificación de registro:', error)
    throw new Error('No se pudo enviar el email de notificación de registro')
  }
}

export async function sendB2BContactEmail(
  nombre: string,
  empresa: string,
  correo: string,
  mensaje: string
) {
  const resend = getResend()

  try {
    const { data, error } = await resend.emails.send({
      from: 'Salurama <contacto@salurama.com>',
      to: ['contacto@salurama.com'],
      replyTo: correo,
      subject: `Nuevo contacto B2B: ${empresa}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;">
                <tr><td style="background:#1E3A5F;padding:32px;text-align:center;">
                  <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
                </td></tr>
                <tr><td style="padding:40px 32px;">
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:22px;">Nuevo contacto: Para Empresas</h2>
                  <p style="margin:0 0 8px;color:#6B7280;line-height:1.6;"><strong>Nombre:</strong> ${nombre}</p>
                  <p style="margin:0 0 8px;color:#6B7280;line-height:1.6;"><strong>Empresa:</strong> ${empresa}</p>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;"><strong>Correo:</strong> ${correo}</p>
                  <div style="background:#F9FAFB;border-radius:10px;padding:16px;margin-bottom:20px;">
                    <p style="margin:0;color:#111827;white-space:pre-wrap;">${mensaje}</p>
                  </div>
                  <p style="margin:0;color:#9CA3AF;font-size:13px;">Responde directamente a este correo: el reply-to ya apunta a ${correo}.</p>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:24px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama. Verifica. Elige. Confía.</p>
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
    console.error('Error enviando email de contacto B2B:', error)
    throw new Error('No se pudo enviar el mensaje')
  }
}