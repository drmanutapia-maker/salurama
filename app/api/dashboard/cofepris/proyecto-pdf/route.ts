import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Redis } from '@upstash/redis'
import { buildAvisoPublicidadPdf } from '@/lib/avisoPublicidadPdf'
import { isManuelEmail } from '@/lib/manuelOnly'

export const dynamic = 'force-dynamic'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

async function getAnonSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()      { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch {}
        },
      },
    }
  )
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET() {
  const anonClient = await getAnonSupabase()
  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Aviso de Publicidad COFEPRIS: excepción de cuenta, no de plan — ver lib/manuelOnly.ts
  if (!isManuelEmail(user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const rateKey = `cofepris_proyecto_pdf:${user.id}`
    const count = await redis.incr(rateKey)
    if (count === 1) await redis.expire(rateKey, 600)
    if (count > 20) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
        { status: 429, headers: { 'Retry-After': '600' } }
      )
    }
  } catch (redisError) {
    console.error('[cofepris/proyecto-pdf] Redis error:', redisError)
  }

  const db = getServiceSupabase()
  const { data: doctor, error: doctorError } = await db
    .from('doctors')
    .select('full_name, professional_title, specialty, professional_license, about_me, photo_url')
    .eq('user_id', user.id)
    .single()

  if (doctorError || !doctor) {
    return NextResponse.json({ error: 'Perfil de médico no encontrado' }, { status: 404 })
  }

  const pdfBytes = await buildAvisoPublicidadPdf({
    fullName: doctor.full_name,
    professionalTitle: doctor.professional_title,
    specialty: doctor.specialty,
    professionalLicense: doctor.professional_license,
    aboutMe: doctor.about_me,
    photoUrl: doctor.photo_url,
  })

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="proyecto-anuncio-cofepris.pdf"',
    },
  })
}
