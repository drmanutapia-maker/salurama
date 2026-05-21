import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(3).max(100).regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/),
  specialty: z.string().min(2).max(50),
  professional_license: z.string().regex(/^\d{7,8}$/),
  specialty_council: z.string().max(50).optional(),
  license_not_current: z.boolean().optional(),
  cp: z.string().regex(/^\d{5}$/),
  estado: z.string().min(2).max(50),
  ciudad: z.string().min(2).max(50),
  colonia: z.string().min(2).max(100),
  direccion: z.string().max(200).optional(),
  turnstileToken: z.string(),
})

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)

  try {
    const body = await request.json()
    
    // Rate limit
    const key = `registro:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 3600)
    if (count > 3) {
      return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })
    }

    // Validar
    const data = schema.parse(body)

    // Turnstile
    const turnstile = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY!,
        response: data.turnstileToken,
        remoteip: ip,
      }),
    })
    if (!(await turnstile.json()).success) {
      return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
    }

    // Verificar duplicados (mensaje genérico para no leakear)
    const [emailCheck, cedulaCheck] = await Promise.all([
      supabaseAdmin.from('doctors').select('id', { head: true, count: 'exact' }).eq('email', data.email),
      supabaseAdmin.from('doctors').select('id', { head: true, count: 'exact' }).eq('professional_license', data.professional_license),
    ])

    if ((emailCheck.count || 0) > 0 || (cedulaCheck.count || 0) > 0) {
      return NextResponse.json({ error: 'Email o cédula ya registrados' }, { status: 400 })
    }

    // Crear usuario
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirmar
      user_metadata: { full_name: data.full_name, role: 'doctor' }
    })
    if (authError) throw authError

    // Crear doctor
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .insert({
        user_id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        specialty: data.specialty,
        professional_license: data.professional_license,
        specialty_council: data.specialty_council || null,
        license_not_current: data.license_not_current || false,
        cp: data.cp,
        location_state: data.estado,
        location_city: data.ciudad,
        location_neighborhood: data.colonia,
        address: data.direccion || null,
        is_active: false,
        review_status: 'pendiente',
      })
      .select('id')
      .single()

    if (doctorError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw doctorError
    }

    await supabaseAdmin.from('admin_verificaciones_sep').insert({
      doctor_id: doctor.id,
      professional_license: data.professional_license,
      full_name: data.full_name,
      specialty: data.specialty,
      estado_solicitud: 'pendiente_descarga',
      ip_registro: ip,
    })

    return NextResponse.json({ success: true, doctorId: doctor.id })

  } catch (error: any) {
    console.error('Registro error:', error)
    const msg = error.name === 'ZodError' ? 'Datos inválidos' : 'Error en registro'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}