import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const estado = req.nextUrl.searchParams.get('estado')
  const q = req.nextUrl.searchParams.get('q') || ''

  if (!estado) return NextResponse.json([])

  // Buscar en SEPOMEX (tienes todos los CP)
  const { data } = await supabase
   .from('sepomex')
   .select('municipio')
   .ilike('estado', `%${estado}%`)
   .ilike('municipio', `%${q}%`)
   .limit(20)

  const ciudades = [...new Set(data?.map(d => d.municipio) || [])]
   .sort()
   .slice(0, 15)

  return NextResponse.json(ciudades)
}