import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const revalidate = 3600

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabase
    .from('specialty_granular_mapping')
    .select('granular_name')
    .eq('is_active', true)
    .order('granular_name', { ascending: true })

  if (error) {
    return NextResponse.json({ especialidades: [] }, { status: 500 })
  }

  return NextResponse.json(
    { especialidades: data.map(r => r.granular_name) },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  )
}
