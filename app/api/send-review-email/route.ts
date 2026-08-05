import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

function getResend() {
  if (!process.env.RESEND_API_KEY) return null
  return new Resend(process.env.RESEND_API_KEY)
}

function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

const schema = z.object({
  token: z.string().uuid(),
})

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

    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      const rateKey = `send_review_email:${user.id}`
      try {
        const count = await redis.incr(rateKey)
        if (count === 1) await redis.expire(rateKey, 3600)
        if (count > 20) {
          return NextResponse.json({ error: 'Demasiados intentos. Intenta en 1 hora.' }, { status: 429, headers: { 'Retry-After': '3600' } })
        }
      } catch (redisError) {
        console.error('[send-review-email] Redis error:', redisError)
      }
    }

    const resend = getResend()
    if (!resend) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }

    const { token } = schema.parse(await request.json())

    const { data: cita, error: citaError } = await supabaseAdmin
      .from('citas')
      .select('medico_id, paciente_email')
      .eq('review_token', token)
      .maybeSingle()

    if (citaError || !cita || !cita.paciente_email) {
      return NextResponse.json({ error: 'Token no válido.' }, { status: 404 })
    }

    const { data: medico, error: medicoError } = await supabaseAdmin
      .from('doctors')
      .select('user_id, full_name')
      .eq('id', cita.medico_id)
      .single()

    if (medicoError || !medico || medico.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const verifyUrl = `${process.env.NEXT_PUBLIC_URL}/verify-review?token=${token}`
    const doctor = sanitize(medico.full_name || 'tu médico')

    await resend.emails.send({
      from: 'Salurama <citas@salurama.com>',
      to: [cita.paciente_email],
      subject: 'Tu opinión importa - Salurama',
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
                  <h2 style="margin:0 0 16px;color:#1F2937;font-size:22px;">¿Cómo fue tu experiencia?</h2>
                  <p style="margin:0 0 16px;color:#6B7280;line-height:1.6;">Hola,</p>
                  <p style="margin:0 0 24px;color:#6B7280;line-height:1.6;">
                    Gracias por haber consultado con <strong>${doctor}</strong>. Tu opinión ayuda a otros pacientes a tomar mejores decisiones.
                  </p>
                  <p style="margin:0 0 8px;color:#6B7280;">Tómate 1 minuto para dejar tu reseña:</p>
                  <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center">
                    <a href="${verifyUrl}" style="display:inline-block;background:#2A9D8F;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Dejar mi reseña</a>
                  </td></tr></table>
                  <p style="margin:24px 0 0;color:#9CA3AF;font-size:13px;">Este enlace expira en 7 días. Si no consultaste con ${doctor}, ignora este email.</p>
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

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}