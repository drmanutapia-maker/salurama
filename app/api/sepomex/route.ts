import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _client
}

const HEADERS = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET(req: NextRequest) {
  const supabaseAdmin = getClient()
  const cp = req.nextUrl.searchParams.get('cp')
  const q = req.nextUrl.searchParams.get('q')

  if (cp) {
    const { data, error } = await supabaseAdmin
      .from('sepomex')
      .select('cp, estado, municipio, ciudad, colonia, lat, lng')
      .eq('cp', cp)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { headers: HEADERS })
  }

  if (q && q.length >= 3) {
    const { data, error } = await supabaseAdmin
      .from('sepomex')
      .select('cp, colonia, estado')
      .ilike('colonia', `%${q}%`)
      .limit(10)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { headers: HEADERS })
  }

  return NextResponse.json({ error: 'cp o q requerido' }, { status: 400 })
}