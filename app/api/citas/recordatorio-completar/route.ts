import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'
import { notificarMedicoPush } from '@/lib/push/enviarPush'

// Ruta interna — llamada por la Edge Function citas-completar-recordatorio
// (Deno, Edge Runtime), que no puede usar web-push ni Resend directamente.
// Mismo patrón de autenticación que app/api/citas/notificar-nueva/route.ts.

const bodySchema = z.object({
  citaId: z.string().uuid(),
  medicoId: z.string().uuid(),
  pacienteNombre: z.string().min(1).max(100),
  medicoEmail: z.string().email(),
})

function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

function buildEmailHtml(pacienteNombre: string): string {
  const paciente = sanitize(pacienteNombre)
  const url = process.env.NEXT_PUBLIC_URL || 'https://salurama.com'
  return `
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
              <h2 style="margin:0 0 16px;color:#111827;font-size:18px;">¿Cómo resultó tu cita?</h2>
              <p style="margin:0 0 12px;color:#4A5568;line-height:1.6;">
                Tu cita con <strong>${paciente}</strong> ya debería haber terminado.
              </p>
              <p style="margin:0 0 20px;color:#4A5568;line-height:1.6;">
                Marca el resultado desde tu dashboard para que <strong>${paciente}</strong>
                reciba la invitación a dejarte una reseña.
              </p>
              <a href="${url}/dashboard/citas"
                 style="display:inline-block;background:#2A9D8F;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
                Ir a mis citas
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
  `
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = bodySchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const { medicoId, pacienteNombre, medicoEmail } = validation.data

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // Push al médico — falla en silencio, no debe bloquear el correo
  try {
    await notificarMedicoPush(supabase, medicoId, {
      title: '¿Cómo resultó tu cita?',
      body: `Marca el resultado de tu cita con ${pacienteNombre} para recibir su reseña.`,
      url: '/dashboard/citas',
    })
  } catch (pushErr) {
    console.error('[recordatorio-completar] push error:', pushErr)
  }

  // Correo al médico
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Salurama <citas@salurama.com>',
        to: [medicoEmail],
        subject: `¿Cómo resultó tu cita con ${pacienteNombre}?`,
        html: buildEmailHtml(pacienteNombre),
      })
    } catch (emailErr) {
      console.error('[recordatorio-completar] email error:', emailErr)
    }
  }

  return NextResponse.json({ ok: true })
}
