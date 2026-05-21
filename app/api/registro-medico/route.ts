import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email, password, full_name, specialty, professional_license,
      specialty_council, license_not_current, cp, estado, ciudad,
      colonia, direccion
    } = body

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const key = `registro:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 3600)
    if (count > 3) {
      return NextResponse.json({ error: 'Demasiados intentos. Intenta en 1 hora.' }, { status: 429 })
    }

    // Validaciones
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Contraseña mínimo 8 caracteres' }, { status: 400 })
    }
    if (!/^\d{7,8}$/.test(professional_license.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Cédula debe tener 7 u 8 dígitos' }, { status: 400 })
    }

    // Verificar duplicados
    const { data: existingEmail } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existingEmail) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 400 })
    }

    const { data: existingCedula } = await supabaseAdmin
      .from('doctors')
      .select('id')
      .eq('professional_license', professional_license.replace(/\s/g, ''))
      .maybeSingle()

    if (existingCedula) {
      return NextResponse.json({ error: 'Esta cédula ya está registrada' }, { status: 400 })
    }

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: false, 
      user_metadata: {
        full_name: full_name.trim(),
        role: 'doctor'
      }
    })

    if (authError) throw authError

    // 2. Crear perfil de doctor (vinculado con user_id)
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .insert({
        user_id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        specialty,
        professional_license: professional_license.replace(/\s/g, ''),
        specialty_council: specialty_council?.trim() || null,
        license_not_current: license_not_current || false,
        cp: cp,
        location_state: estado,
        location_city: ciudad,
        location_neighborhood: colonia,
        address: direccion?.trim() || null,
        license_verified: false,
        is_active: false, // Inactivo hasta revisión admin
        review_status: 'pendiente',
        license_visible: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (doctorError) {
      // Rollback: eliminar usuario de auth si falla doctor
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw doctorError
    }

    // 3. Crear bitácora para admin (descargar PDF SEP)
    await supabaseAdmin
      .from('admin_verificaciones_sep')
      .insert({
        doctor_id: doctor.id,
        professional_license: professional_license.replace(/\s/g, ''),
        full_name: full_name.trim(),
        specialty,
        estado_solicitud: 'pendiente_descarga',
        fecha_registro: new Date().toISOString(),
        ip_registro: ip,
      })

    return NextResponse.json({
      success: true,
      message: 'Registro exitoso',
      doctorId: doctor.id
    })

  } catch (error: any) {
    console.error('Error registro:', error)
    return NextResponse.json({
      error: error.message || 'Error en el registro'
    }, { status: 500 })
  }
}