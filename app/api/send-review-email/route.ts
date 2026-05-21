import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

const resend = process.env.RESEND_API_KEY? new Resend(process.env.RESEND_API_KEY) : null

const schema = z.object({
  email: z.string().email(),
  token: z.string().uuid(),
  doctorName: z.string().max(100).optional(),
})

export async function POST(request: Request) {
  try {
    // Auth
    if (request.headers.get('authorization')!== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!resend) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }

    const { email, token } = schema.parse(await request.json())

    const verifyUrl = `${process.env.NEXT_PUBLIC_URL}/verify-review?token=${token}`

    await resend.emails.send({
      from: 'Salurama <citas@salurama.com>',
      to: [email],
      subject: 'Tu opinión importa - Salurama',
      html: `...`, // tu HTML
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}