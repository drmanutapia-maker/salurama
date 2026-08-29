import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { notificarMedicoPush } from '@/lib/push/enviarPush'

// Ruta interna, no pública: app/api/citas/route.ts corre en Edge Runtime
// (export const runtime = 'edge', a propósito para preferredRegion: 'mex1'
// en el endpoint de reserva) y web-push depende de módulos de Node
// (https-proxy-agent, jws) que Edge Runtime no soporta. En vez de mover todo
// el endpoint de reserva a Node solo por esto, la notificación al médico se
// dispara como un fetch server-to-server, no bloqueante, hacia esta ruta
// (Node por omisión), protegida con el mismo INTERNAL_API_SECRET que ya
// vive en el entorno.
const bodySchema = z.object({
  medicoId: z.string().uuid(),
  pacienteNombre: z.string().min(1).max(100),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: z.string().min(1).max(10),
})

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = bodySchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const { medicoId, pacienteNombre, fecha, hora } = validation.data

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const fechaFmt = new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  await notificarMedicoPush(supabase, medicoId, {
    title: 'Nueva solicitud de cita',
    body: `${pacienteNombre} pidió una cita el ${fechaFmt} a las ${hora.slice(0, 5)}.`,
    url: `${process.env.NEXT_PUBLIC_URL || 'https://salurama.com'}/dashboard/citas`,
  })

  return NextResponse.json({ success: true })
}
