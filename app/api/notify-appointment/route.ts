import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(request: Request) {
  try {
    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    // Validar origen: solo permitir llamadas desde nuestro propio servidor
    const origin = request.headers.get('origin') || ''
    const referer = request.headers.get('referer') || ''
    const allowedOrigin = process.env.NEXT_PUBLIC_URL || ''
    const isInternal =
      !origin ||
      origin === allowedOrigin ||
      referer.startsWith(allowedOrigin)

    if (allowedOrigin && !isInternal) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const {
      patientEmail,
      patientName,
      doctorName,
      doctorEmail,
      doctorSpecialty,
      requestedDate,
      requestedTime,
      clinicAddress,
      price,
      dashboardUrl,
    } = await request.json()

    const dateFormatted = new Date(requestedDate + 'T00:00:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    // Email al paciente
    const patientEmail_ = resend.emails.send({
      from: 'Salurama <citas@salurama.com>',
      to: [patientEmail],
      subject: `Solicitud de cita recibida - ${doctorName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td align="center" style="padding:40px 20px;">
              <table style="max-width:600px;width:100%;background:#fff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.05);border-collapse:collapse;">
                <tr><td style="padding:40px 30px 20px;text-align:center;">
                  <h1 style="font-size:26px;font-weight:900;color:#1E3A5F;margin:0 0 8px;">✓ Solicitud enviada</h1>
                  <p style="font-size:15px;color:#6B7280;margin:0;">El médico confirmará tu cita pronto</p>
                </td></tr>
                <tr><td style="padding:20px 30px;">
                  <div style="background:#F9FAFB;border-radius:12px;padding:20px;">
                    <p style="font-size:13px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin:0 0 12px;">Resumen de tu solicitud</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#1A1A2E;"><strong>Médico:</strong> ${doctorName}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#1A1A2E;"><strong>Especialidad:</strong> ${doctorSpecialty}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#1A1A2E;"><strong>Fecha:</strong> ${dateFormatted}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#1A1A2E;"><strong>Hora:</strong> ${requestedTime}</p>
                    ${clinicAddress ? `<p style="margin:0 0 8px;font-size:14px;color:#1A1A2E;"><strong>Dirección:</strong> ${clinicAddress}</p>` : ''}
                    ${price ? `<p style="margin:0;font-size:14px;color:#1A1A2E;border-top:1px solid #E5E7EB;padding-top:10px;margin-top:10px;"><strong>Costo estimado:</strong> $${price} MXN</p>` : ''}
                  </div>
                  <p style="font-size:13px;color:#6B7280;line-height:1.6;margin:20px 0 0;">
                    Recibirás un email de confirmación cuando el médico acepte tu cita. Si no recibes respuesta en 24 horas, contáctalo directamente.
                  </p>
                </td></tr>
                <tr><td style="padding:20px 30px 30px;border-top:1px solid #E5E7EB;text-align:center;">
                  <p style="color:#9CA3AF;font-size:12px;margin:0;">Salurama — Conectando pacientes con médicos de confianza</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    })

    // Email al médico
    const doctorEmail_ = resend.emails.send({
      from: 'Salurama <citas@salurama.com>',
      to: [doctorEmail],
      subject: `Nueva solicitud de cita — ${patientName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td align="center" style="padding:40px 20px;">
              <table style="max-width:600px;width:100%;background:#fff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.05);border-collapse:collapse;">
                <tr><td style="padding:40px 30px 20px;text-align:center;">
                  <h1 style="font-size:26px;font-weight:900;color:#1E3A5F;margin:0 0 8px;">📅 Nueva solicitud de cita</h1>
                  <p style="font-size:15px;color:#6B7280;margin:0;">Revisa los detalles y confirma o rechaza</p>
                </td></tr>
                <tr><td style="padding:20px 30px;">
                  <div style="background:#EEF2FF;border-radius:12px;padding:20px;">
                    <p style="font-size:13px;font-weight:700;color:#3730A3;text-transform:uppercase;margin:0 0 12px;">Datos del paciente</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#1A1A2E;"><strong>Paciente:</strong> ${patientName}</p>
                    <p style="margin:0 0 8px;font-size:14px;color:#1A1A2E;"><strong>Fecha solicitada:</strong> ${dateFormatted}</p>
                    <p style="margin:0;font-size:14px;color:#1A1A2E;"><strong>Hora:</strong> ${requestedTime}</p>
                  </div>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${dashboardUrl}" style="display:inline-block;background:#1E3A5F;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                      Ver en mi panel de citas →
                    </a>
                  </div>
                </td></tr>
                <tr><td style="padding:20px 30px 30px;border-top:1px solid #E5E7EB;text-align:center;">
                  <p style="color:#9CA3AF;font-size:12px;margin:0;">Salurama — Conectando pacientes con médicos de confianza</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    })

    await Promise.all([patientEmail_, doctorEmail_])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending appointment notifications:', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
