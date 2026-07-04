import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(3).max(100).regex(/^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s.\-']+$/),
  specialty: z.string().min(2).max(100),
  professional_license: z.string().regex(/^\d{7,8}$/),
  specialty_council: z.string().max(100).optional(),
  license_not_current: z.boolean().optional(),
  cp: z.string().regex(/^\d{5}$/),
  estado: z.string().min(2).max(50),
  ciudad: z.string().min(2).max(50),
  colonia: z.string().min(2).max(100),
  direccion: z.string().max(200).optional(),
  turnstileToken: z.string().optional(),
})

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  const ip = getIp(request)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  try {
    const body = await request.json()
    
    const key = `registro:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 3600)
    if (count > 3) {
      return NextResponse.json({ error: 'Demasiados intentos' }, { status: 429 })
    }

    const data = schema.parse(body)

    if (data.turnstileToken) {
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
    }

    const [emailCheck, cedulaCheck] = await Promise.all([
      supabaseAdmin.from('doctors').select('id', { head: true, count: 'exact' }).eq('email', data.email),
      supabaseAdmin.from('doctors').select('id', { head: true, count: 'exact' }).eq('professional_license', data.professional_license),
    ])

    if ((emailCheck.count || 0) > 0 || (cedulaCheck.count || 0) > 0) {
      return NextResponse.json({ error: 'Email o cédula ya registrados' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: { full_name: data.full_name, role: 'doctor' }
    })
    if (authError) {
      if (authError.status === 422) {
        return NextResponse.json(
          { error: 'Este email ya tiene una cuenta registrada. Intenta iniciar sesión.' },
          { status: 400 }
        )
      }
      throw authError
    }

    // === GEOCODIFICACIÓN CON SEPOMEX (2026) ===
    let lat = null
    let lng = null
    let fullAddress = null

    if (data.direccion) {
      fullAddress = `${data.direccion}, ${data.colonia}, ${data.cp}, ${data.ciudad}, ${data.estado}, México`
    }

    // Buscar coordenadas en SEPOMEX por CP (siempre, aunque no haya dirección)
    try {
      const { data: geoData } = await supabaseAdmin
        .from('sepomex')
        .select('lat, lng')
        .eq('cp', data.cp)
        .limit(1)
        .single()
      
      if (geoData?.lat && geoData?.lng) {
        lat = parseFloat(geoData.lat)
        lng = parseFloat(geoData.lng)
        console.log('SEPOMEX geocoded:', data.cp, '→', lat, lng)
      }
    } catch (e) {
      console.error('SEPOMEX lookup failed:', e)
    }

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
        estado: data.estado,
        ciudad: data.ciudad,
        colonia: data.colonia,
        street: data.direccion || null,
        clinic_address: fullAddress,
        clinic_lat: lat,
        clinic_lng: lng,
        is_active: true,
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
    if (error.name === 'ZodError') {
      const first = error.errors?.[0]
      const field = first?.path?.[0] ?? 'campo'
      return NextResponse.json({ error: `Datos inválidos (${field})` }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Error en registro' }, { status: 400 })
  }
}