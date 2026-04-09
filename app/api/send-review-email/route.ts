import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email, token, doctorName, appointmentDate } = await request.json()
    
    const verifyUrl = `${process.env.NEXT_PUBLIC_URL}/verify-review?token=${token}`
    
    const { data, error } = await resend.emails.send({
      from: 'Salurama <onboarding@resend.dev>',
      to: [email],
      subject: 'Tu opinión importa - Salurama',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tu opinión importa</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'DM Sans', Arial, sans-serif; background-color: #f9fafb;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-collapse: collapse;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 30px 30px; text-align: center;">
                      <h1 style="font-family: 'Fraunces', serif; font-size: 28px; font-weight: 900; color: #3730A3; margin: 0 0 10px;">¡Gracias por tu cita!</h1>
                      <p style="font-size: 16px; color: #6B7280; margin: 0;">Nos gustaría conocer tu experiencia</p>
                    </td>
                  </tr>
                  
                  <!-- Contenido -->
                  <tr>
                    <td style="padding: 0 30px 30px;">
                      <p style="font-size: 15px; color: #4B5563; line-height: 1.6; margin: 0 0 20px;">
                        Tu cita ha concluido. Tu opinión ayuda a otros pacientes a tomar mejores decisiones.
                      </p>
                      
                      <div style="background: #EEF2FF; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
                        <p style="color: #3730A3; font-weight: 600; margin: 0; font-size: 15px;">
                          ✓ Reseña verificada
                        </p>
                        <p style="color: #6B7280; font-size: 13px; margin: 8px 0 0;">
                          Las reseñas verificadas generan más confianza
                        </p>
                      </div>
                      
                      <!-- Botón -->
                      <div style="text-align: center; margin: 32px 0;">
                        <a href="${verifyUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #3730A3 0%, #4F46E5 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(55, 48, 163, 0.2);">
                          Dejar mi opinión
                        </a>
                      </div>
                      
                      <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin: 32px 0 0;">
                        Si no agendaste esta cita, puedes ignorar este email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px 30px; border-top: 1px solid #E5E7EB; text-align: center;">
                      <p style="color: #6B7280; font-size: 13px; margin: 0 0 8px;">
                        Salurama - Conectando pacientes con médicos de confianza
                      </p>
                      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                        Este email fue enviado a ${email}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('Email enviado exitosamente:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}