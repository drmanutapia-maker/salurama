import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  let token: string
  try {
    const body = await request.json()
    token = body.token
  } catch {
    return NextResponse.json({ error: 'Token no válido.' }, { status: 400 })
  }

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token no válido.' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: cita, error } = await supabase
    .from('citas')
    .select('id, medico_id, paciente_nombre, fecha')
    .eq('review_token', token)
    .eq('estado', 'completed')
    .maybeSingle()

  if (error || !cita) {
    return NextResponse.json({ error: 'Este enlace ya fue usado, expiró o es inválido' }, { status: 404 })
  }

  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('cita_id', cita.id)
    .maybeSingle()

  if (existingReview) {
    return NextResponse.json({ error: 'Ya enviaste una reseña para esta cita. ¡Gracias!' }, { status: 409 })
  }

  const { data: medico } = await supabase
    .from('doctors')
    .select('full_name')
    .eq('id', cita.medico_id)
    .single()

  return NextResponse.json({
    appointment: {
      id: cita.id,
      medico_id: cita.medico_id,
      paciente_nombre: cita.paciente_nombre,
      fecha: cita.fecha,
      doctorName: medico?.full_name || '',
    },
  })
}
