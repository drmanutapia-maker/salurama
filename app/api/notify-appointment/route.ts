import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

const resend = process.env.RESEND_API_KEY? new Resend(process.env.RESEND_API_KEY) : null

const notifySchema = z.object({
  patientEmail: z.string().email(),
  patientName: z.string().max(100),
  doctorName: z.string().max(100),
  doctorEmail: z.string().email(),
  doctorSpecialty: z.string().max(50),
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
    // 1. Auth con secret (no origin)
    const auth = request.headers.get('authorization')
    if (auth!== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!resend) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }

    const body = await request.json()
    const data = notifySchema.parse(body)

    const dateFormatted = new Date(data.requestedDate + 'T00:00:00-06:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })

    // Sanitizar todo
    const safe = {
      patientName: sanitizeHtml(data.patientName),
      doctorName: sanitizeHtml(data.doctorName),
      doctorSpecialty: sanitizeHtml(data.doctorSpecialty),
      clinicAddress: data.clinicAddress? sanitizeHtml(data.clinicAddress) : '',
    }

    // Email al paciente
    const [patientResult, doctorResult] = await Promise.allSettled([
      resend.emails.send({
        from: 'Salurama <citas@salurama.com>',
        to: [data.patientEmail],
        subject: `Solicitud de cita recibida - ${safe.doctorName}`,
        html: `... usa ${safe.patientName}...`, // tu HTML aquí
      }),
      resend.emails.send({
        from: 'Salurama <citas@salurama.com>',
        to: [data.doctorEmail],
        subject: `Nueva solicitud de cita — ${safe.patientName}`,
        html: `...`,
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