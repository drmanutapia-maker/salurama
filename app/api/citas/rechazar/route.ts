import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendCitaRechazadaEmail } from '@/lib/email'

const schema = z.object({
  citaId: z.string().uuid(),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio').max(500),
})

function sanitize(str: string): string {
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

function formatFechaHora(fecha: string, hora: string): string {
  const d = new Date(fecha + 'T00:00:00')
  const fechaFmt = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${fechaFmt} · ${hora.slice(0, 5)}`
}

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

    const validation = schema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { citaId, motivo } = validation.data

    const { data: cita } = await supabaseAdmin
      .from('citas')
      .select('id, estado, medico_id, paciente_email, paciente_nombre, fecha, hora')
      .eq('id', citaId)
      .maybeSingle()

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    const { data: medico } = await supabaseAdmin
      .from('doctors')
      .select('user_id, full_name, display_name')
      .eq('id', cita.medico_id)
      .single()

    if (!medico || medico.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para esta cita' }, { status: 403 })
    }

    if (cita.estado !== 'pending_verification') {
      return NextResponse.json({ error: 'Esta cita ya no se puede rechazar' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('citas')
      .update({ estado: 'cancelled', rejection_reason: motivo })
      .eq('id', citaId)

    if (updateError) {
      console.error('[rechazar] Error actualizando cita:', updateError)
      return NextResponse.json({ error: 'Error al rechazar la cita' }, { status: 500 })
    }

    if (cita.paciente_email) {
      try {
        await sendCitaRechazadaEmail(
          cita.paciente_email,
          medico.display_name || medico.full_name,
          formatFechaHora(cita.fecha, cita.hora),
          sanitize(motivo)
        )
      } catch (emailError) {
        console.error('[rechazar] Error enviando correo al paciente:', emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[rechazar] Error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
