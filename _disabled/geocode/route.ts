import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { address, cp } = await request.json()

  // Si viene CP directo, úsalo
  let codigoPostal = cp

  // Si no, extráelo de la dirección
  if (!codigoPostal) {
    const cpMatch = address.match(/(\d{5})/)
    codigoPostal = cpMatch? cpMatch[1] : null
  }

  if (!codigoPostal) {
    return NextResponse.json({ error: 'No CP found' }, { status: 400 })
  }

  // Busca en Sepomex local
  const { data, error } = await supabase
   .from('sepomex')
   .select('lat, lng, estado, municipio, ciudad')
   .eq('cp', codigoPostal)
   .limit(1)
   .single()

  if (error ||!data?.lat ||!data?.lng) {
    return NextResponse.json({
      error: 'Not found',
      cp: codigoPostal
    }, { status: 404 })
  }

  return NextResponse.json({
    lat: parseFloat(data.lat),
    lng: parseFloat(data.lng),
    estado: data.estado,
    municipio: data.municipio,
    ciudad: data.ciudad,
    formatted_address: address
  })
}

export async function GET() {
  return NextResponse.json({ status: 'geocode api ready - using sepomex' })
}