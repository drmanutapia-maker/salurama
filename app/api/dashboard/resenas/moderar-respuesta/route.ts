import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { moderarContenido } from '@/lib/moderacion'

const schema = z.object({
  responseId: z.string().uuid(),
})

// Disparada por el dashboard justo después de crear una respuesta nueva (no
// al editar) — mismo patrón Bearer que /api/citas/rechazar. La llamada a
// Haiku vive server-side porque necesita ANTHROPIC_API_KEY y porque el
// veredicto se escribe con service role (review_responses no tiene una
// política de UPDATE que permita al médico tocar las columnas moderation_*
// directamente... en realidad sí podría, pero centralizar aquí evita que el
// cliente decida su propio veredicto).
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

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const validation = schema.safeParse(await request.json())
    if (!validation.success) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }
    const { responseId } = validation.data

    const { data: response } = await supabaseAdmin
      .from('review_responses')
      .select('id, respuesta, doctor_id')
      .eq('id', responseId)
      .maybeSingle()

    if (!response) {
      return NextResponse.json({ error: 'Respuesta no encontrada' }, { status: 404 })
    }

    const { data: medico } = await supabaseAdmin
      .from('doctors')
      .select('user_id')
      .eq('id', response.doctor_id)
      .single()

    if (!medico || medico.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado para esta respuesta' }, { status: 403 })
    }

    await moderarContenido(supabaseAdmin, 'review_response', response.id, response.respuesta)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[moderar-respuesta] Error:', error)
    return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 })
  }
}
