import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { email, doctorName, patientName, fecha, hora } = await request.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email no configurado' }, { status: 503 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: 'Salurama <noreply@salurama.com>',
      to: [email],
      subject: `Nueva cita confirmada - ${patientName}`,
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
                    <p style="margin:0 0 4px;color:#111827;font-weight:600;">📅 ${fecha} a las ${hora}</p>
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/dashboard/citas" style="display:inline-block;background:#8B5CF6;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Ver en dashboard</a>
                </td></tr>
                <tr><td style="background:#F3F4F6;padding:20px;text-align:center;">
                  <p style="margin:0;color:#9CA3AF;font-size:12px;">Salurama - Verifica. Elige. Confía.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error enviando notificación:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}