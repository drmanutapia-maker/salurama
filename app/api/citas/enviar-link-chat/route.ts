import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { enviarLinkChatSiPrimeraVez } from '@/lib/chat/enviarLinkChat'

const schema = z.object({
  citaId: z.string().uuid(),
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

    const { citaId } = schema.parse(await request.json())

    const { data: cita } = await supabaseAdmin
      .from('citas')
      .select('id, estado, medico_id, paciente_id, paciente_email')
      .eq('id', citaId)
      .maybeSingle()

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    const { data: medico } = await supabaseAdmin
      .from('doctors')
      .select('user_id, full_name')
      .eq('id', cita.medico_id)
      .single()

    if (!medico || medico.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para esta cita' }, { status: 403 })
    }

    if (cita.estado !== 'confirmed' || !cita.paciente_id || !cita.paciente_email) {
      return NextResponse.json({ success: true })
    }

    await enviarLinkChatSiPrimeraVez(supabaseAdmin, {
      medicoId: cita.medico_id,
      pacienteId: cita.paciente_id,
      pacienteEmail: cita.paciente_email,
      medicoNombre: medico.full_name,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    console.error('[enviar-link-chat] Error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
