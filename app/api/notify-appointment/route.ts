import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

const notifySchema = z.object({
  patientEmail: z.string().email(),
  patientName: z.string().max(100),
  doctorName: z.string().max(100),
  doctorEmail: z.string().email(),
  doctorSpecialty: z.string().max(100),
  requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requestedTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  clinicAddress: z.string().max(200).optional(),
  price: z.number().int().min(0).max(100000).optional(),
  dashboardUrl: z.string().url(),
})

function sanitizeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]!))
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resend = getResend()
    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    const body = await request.json()
    const data = notifySchema.parse(body)

    const dateFormatted = new Date(data.requestedDate + 'T00:00:00-06:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    const safe = {
      patientName: sanitizeHtml(data.patientName),
      doctorName: sanitizeHtml(data.doctorName),
      doctorSpecialty: sanitizeHtml(data.doctorSpecialty),
      clinicAddress: data.clinicAddress ? sanitizeHtml(data.clinicAddress) : '',
      time: data.requestedTime,
      date: dateFormatted,
    }

    const baseStyle = `margin:0;padding:0;background:#F9FAFB;font-family:sans-serif;`
    const cardStyle = `max-width:600px;background:white;border-radius:16px;overflow:hidden;`
    const headerStyle = `background:#1E3A5F;padding:32px;text-align:center;`
    const bodyStyle = `padding:40px 32px;`
    const footerStyle = `background:#F3F4F6;padding:24px;text-align:center;`

    const patientHtml = `
      <!DOCTYPE html><html><body style="${baseStyle}">
        <table width="100%" cellpadding="0" cellspacing="0" style="${baseStyle}padding:40px 20px;">
          <tr><td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="${cardStyle}">
              <tr><td style="${headerStyle}">
                <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
              </td></tr>
              <tr><td style="${bodyStyle}">
                <h2 style="margin:0 0 16px;color:#1F2937;font-size:22px;">✅ Solicitud de cita recibida</h2>
                <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola, <strong>${safe.patientName}</strong></p>
                <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Tu solicitud de cita fue enviada al <strong>Dr. ${safe.doctorName}</strong> (${safe.doctorSpecialty}).</p>
                <table width="100%" cellpadding="12" style="background:#F3F4F6;border-radius:8px;margin:20px 0;">
                  <tr><td style="color:#374151;font-size:14px;">
                    <strong>📅 Fecha:</strong> ${safe.date}<br/>
                    <strong>🕐 Hora:</strong> ${safe.time}${safe.clinicAddress ? `<br/><strong>📍 Consultorio:</strong> ${safe.clinicAddress}` : ''}
                  </td></tr>
                </table>
                <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">El médico confirmará tu cita a la brevedad. Te notificaremos por email.</p>
              </td></tr>
              <tr><td style="${footerStyle}">
                <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama &mdash; Verifica. Elige. Confía.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body></html>
    `

    const doctorHtml = `
      <!DOCTYPE html><html><body style="${baseStyle}">
        <table width="100%" cellpadding="0" cellspacing="0" style="${baseStyle}padding:40px 20px;">
          <tr><td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="${cardStyle}">
              <tr><td style="${headerStyle}">
                <h1 style="margin:0;color:white;font-size:28px;font-weight:900;">Salurama</h1>
              </td></tr>
              <tr><td style="${bodyStyle}">
                <h2 style="margin:0 0 16px;color:#1F2937;font-size:22px;">🔔 Nueva solicitud de cita</h2>
                <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Dr. <strong>${safe.doctorName}</strong>, tienes una nueva solicitud:</p>
                <table width="100%" cellpadding="12" style="background:#F3F4F6;border-radius:8px;margin:20px 0;">
                  <tr><td style="color:#374151;font-size:14px;">
                    <strong>👤 Paciente:</strong> ${safe.patientName}<br/>
                    <strong>📅 Fecha:</strong> ${safe.date}<br/>
                    <strong>🕐 Hora:</strong> ${safe.time}${safe.clinicAddress ? `<br/><strong>📍 Consultorio:</strong> ${safe.clinicAddress}` : ''}
                  </td></tr>
                </table>
                <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
                  <a href="${sanitizeHtml(data.dashboardUrl)}" style="display:inline-block;background:#1E3A5F;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Ver en mi dashboard</a>
                </td></tr></table>
              </td></tr>
              <tr><td style="${footerStyle}">
                <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama &mdash; Verifica. Elige. Confía.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body></html>
    `

    const [patientResult, doctorResult] = await Promise.allSettled([
      resend.emails.send({
        from: 'Salurama <citas@salurama.com>',
        to: [data.patientEmail],
        subject: `Solicitud de cita recibida - ${safe.doctorName}`,
        html: patientHtml,
      }),
      resend.emails.send({
        from: 'Salurama <citas@salurama.com>',
        to: [data.doctorEmail],
        subject: `Nueva solicitud de cita — ${safe.patientName}`,
        html: doctorHtml,
      })
    ])

    if (patientResult.status === 'rejected' || doctorResult.status === 'rejected') {
      console.error('Email failed:', { patientResult, doctorResult })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}