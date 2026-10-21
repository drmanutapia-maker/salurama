import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { notificarMedicoPush } from '@/lib/push/enviarPush'

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

const ESTADOS_CERRADOS = ['cancelled', 'cancelada_paciente', 'completed']

function formatFechaMX(fecha: string): string {
  const d = new Date(fecha + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatHoraMX(hora: string): string {
  return hora.slice(0, 5)
}

// GET — devuelve los datos de la cita para mostrarlos antes de confirmar
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404, headers: securityHeaders })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: cita } = await supabase
    .from('citas')
    .select('id, estado, fecha, hora, paciente_nombre, medico_id, consultorio_id')
    .eq('cancel_token', token)
    .maybeSingle()

  if (!cita) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404, headers: securityHeaders })
  }

  if (ESTADOS_CERRADOS.includes(cita.estado)) {
    return NextResponse.json({ error: 'ya_procesada' }, { status: 200, headers: securityHeaders })
  }

  // Verificar ventana de cancelación
  let ventanaHoras = 12
  let whatsappRecepcion: string | null = null
  if (cita.consultorio_id) {
    const { data: consultorio } = await supabase
      .from('consultorios')
      .select('ventana_cancelacion_horas, whatsapp_recepcion')
      .eq('id', cita.consultorio_id)
      .maybeSingle()
    if (consultorio) {
      ventanaHoras = consultorio.ventana_cancelacion_horas ?? 12
      whatsappRecepcion = consultorio.whatsapp_recepcion ?? null
    }
  }
  const citaDateTime = new Date(`${cita.fecha}T${cita.hora}`)
  const horasRestantes = (citaDateTime.getTime() - Date.now()) / (60 * 60 * 1000)
  if (horasRestantes < ventanaHoras) {
    return NextResponse.json(
      { fuera_de_ventana: true, whatsapp_recepcion: whatsappRecepcion },
      { headers: securityHeaders }
    )
  }

  const { data: medico } = await supabase
    .from('doctors')
    .select('full_name, display_name')
    .eq('id', cita.medico_id)
    .maybeSingle()

  return NextResponse.json({
    cita: {
      pacienteNombre: cita.paciente_nombre,
      medicoNombre: medico?.display_name || medico?.full_name || 'el médico',
      fechaFmt: formatFechaMX(cita.fecha),
      horaFmt: formatHoraMX(cita.hora),
    },
  }, { headers: securityHeaders })
}

// POST — ejecuta la cancelación
const bodySchema = z.object({
  cancelToken: z.string().min(10).max(200),
})

export async function POST(request: NextRequest) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415, headers: securityHeaders })
  }

  const validation = bodySchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400, headers: securityHeaders })
  }
  const { cancelToken } = validation.data

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: cita } = await supabase
    .from('citas')
    .select('id, estado, fecha, hora, paciente_nombre, medico_id')
    .eq('cancel_token', cancelToken)
    .maybeSingle()

  if (!cita) {
    return NextResponse.json({ error: 'no_encontrado' }, { status: 404, headers: securityHeaders })
  }

  if (ESTADOS_CERRADOS.includes(cita.estado)) {
    return NextResponse.json({ error: 'Esta cita ya fue procesada.' }, { status: 400, headers: securityHeaders })
  }

  const { error: updateError } = await supabase
    .from('citas')
    .update({
      estado: 'cancelada_paciente',
      cancelled_at: new Date().toISOString(),
      cancel_token: null,
    })
    .eq('id', cita.id)

  if (updateError) {
    console.error('[cancelar-por-token] Error cancelando cita:', updateError)
    return NextResponse.json({ error: 'No se pudo cancelar la cita.' }, { status: 500, headers: securityHeaders })
  }

  // Push al médico — falla en silencio
  try {
    const fechaFmt = formatFechaMX(cita.fecha)
    const horaFmt = formatHoraMX(cita.hora)
    await notificarMedicoPush(supabase, cita.medico_id, {
      title: 'Cita cancelada',
      body: `${cita.paciente_nombre} canceló su cita del ${fechaFmt} a las ${horaFmt}.`,
      url: '/dashboard/citas',
    })
  } catch (pushErr) {
    console.error('[cancelar-por-token] push error:', pushErr)
  }

  return NextResponse.json({ ok: true }, { headers: securityHeaders })
}
