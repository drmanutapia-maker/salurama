import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendVerificationEmail } from '@/lib/email'
import { Redis } from '@upstash/redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const { medicoId, pacienteNombre, pacienteEmail, pacienteTelefono, fecha, hora, motivo, turnstileToken } = await request.json()

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const key = `rate_limit:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 3600)
    if (count > 5) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en 1 hora.' }, { status: 429 })
    }

    // Turnstile verification
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${turnstileToken}`
    })
    const turnstileData = await turnstileRes.json()
    if (!turnstileData.success) {
      return NextResponse.json({ error: 'Verificación de seguridad fallida' }, { status: 400 })
    }

    // Validaciones básicas
    if (!medicoId ||!pacienteNombre ||!pacienteEmail ||!fecha ||!hora) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(pacienteEmail)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    // Verificar médico existe
    const { data: medico, error: medicoError } = await supabase
     .from('doctors')
     .select('id, full_name, horario, duracion_cita_minutos')
     .eq('id', medicoId)
     .single()

    if (medicoError ||!medico) {
      return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 })
    }

    // Validar fecha no sea pasada
    const citaDate = new Date(`${fecha}T${hora}:00`)
    const now = new Date()
    if (citaDate < now) {
      return NextResponse.json({ error: 'No puedes agendar citas en el pasado' }, { status: 400 })
    }

    // Validar horario del médico
    const dayOfWeek = citaDate.getDay()
    const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const dayName = days[dayOfWeek]
    const horarioDia = medico.horario?.[dayName]

    if (!horarioDia ||!horarioDia.activo) {
      return NextResponse.json({
        error: `El médico no atiende los ${dayName}s`
      }, { status: 400 })
    }

    const [horaH, horaM] = hora.split(':').map(Number)
    const citaMinutos = horaH * 60 + horaM
    const [inicioH, inicioM] = horarioDia.inicio.split(':').map(Number)
    const [finH, finM] = horarioDia.fin.split(':').map(Number)
    const inicioMinutos = inicioH * 60 + inicioM
    const finMinutos = finH * 60 + finM

    if (citaMinutos < inicioMinutos || citaMinutos >= finMinutos) {
      return NextResponse.json({
        error: `Horario no disponible. El médico atiende de ${horarioDia.inicio} a ${horarioDia.fin} los ${dayName}s`
      }, { status: 400 })
    }

    // Validar hora de comida/descanso
    if (horarioDia.descanso_inicio && horarioDia.descanso_fin) {
      const [dIH, dIM] = horarioDia.descanso_inicio.split(':').map(Number)
      const [dFH, dFM] = horarioDia.descanso_fin.split(':').map(Number)
      const descansoInicio = dIH * 60 + dIM
      const descansoFin = dFH * 60 + dFM

      if (citaMinutos >= descansoInicio && citaMinutos < descansoFin) {
        return NextResponse.json({
          error: `El médico no atiende en su hora de comida (${horarioDia.descanso_inicio} - ${horarioDia.descanso_fin})`
        }, { status: 400 })
      }
    }

    // Verificar si ya existe cita pendiente del mismo paciente
    const { data: existing } = await supabase
     .from('citas')
     .select('id')
     .eq('paciente_email', pacienteEmail)
     .eq('medico_id', medicoId)
     .eq('estado', 'pending_verification')
     .gte('created_at', new Date(Date.now() - 3600000).toISOString())
     .maybeSingle()

    if (existing) {
      return NextResponse.json({
        error: 'Ya tienes una cita pendiente de confirmación. Revisa tu email.'
      }, { status: 400 })
    }

    // Verificar que no haya otra cita en el mismo horario (ya confirmada)
    const { data: conflicto } = await supabase
     .from('citas')
     .select('id')
     .eq('medico_id', medicoId)
     .eq('fecha', fecha)
     .eq('hora', hora)
     .in('estado', ['confirmed', 'pending_doctor'])
     .maybeSingle()

    if (conflicto) {
      return NextResponse.json({
        error: 'Este horario ya fue reservado. Por favor elige otro.'
      }, { status: 400 })
    }

    // Crear cita pendiente de verificación
    const verificationToken = crypto.randomUUID()
    const { data: cita, error } = await supabase
     .from('citas')
     .insert({
        medico_id: medicoId,
        paciente_nombre: pacienteNombre,
        paciente_email: pacienteEmail,
        paciente_telefono: pacienteTelefono,
        fecha,
        hora,
        motivo: motivo || null,
        estado: 'pending_verification',
        verification_token: verificationToken,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString() // 24 horas
      })
     .select()
     .single()

    if (error) throw error

    // Enviar email de verificación
    await sendVerificationEmail(
      pacienteEmail,
      verificationToken,
      medico.full_name,
      `${fecha} a las ${hora}`
    )

    return NextResponse.json({
      success: true,
      message: 'Revisa tu email para confirmar la cita.',
      citaId: cita.id
    })

  } catch (error: any) {
    console.error('Error creando cita:', error)
    return NextResponse.json({
      error: error.message || 'Error interno del servidor'
    }, { status: 500 })
  }
}