import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { sendB2BContactEmail } from '@/lib/email'
import { isManuelEmail } from '@/lib/manuelOnly'

export const dynamic = 'force-dynamic'

const schema = z.object({
  nombre:  z.string().min(1).max(200),
  empresa: z.string().min(1).max(200),
  correo:  z.string().email(),
  mensaje: z.string().min(1).max(5000),
})

async function getAnonSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

export async function POST(request: NextRequest) {
  // Pitch B2B de MSL Virtual: excepción de cuenta, no de plan — ver lib/manuelOnly.ts
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!isManuelEmail(user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

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
