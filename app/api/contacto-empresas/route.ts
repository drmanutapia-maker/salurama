import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendB2BContactEmail } from '@/lib/email'

const schema = z.object({
  nombre:  z.string().min(1).max(200),
  empresa: z.string().min(1).max(200),
  correo:  z.string().email(),
  mensaje: z.string().min(1).max(5000),
})

export async function POST(request: NextRequest) {
  try {
    const { nombre, empresa, correo, mensaje } = schema.parse(await request.json())

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email no configurado' }, { status: 503 })
    }

    await sendB2BContactEmail(nombre, empresa, correo, mensaje)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('Error en contacto-empresas:', error)
    return NextResponse.json({ error: 'No se pudo enviar el mensaje' }, { status: 500 })
  }
}
