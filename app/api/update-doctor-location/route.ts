import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { doctorId, lat, lng, formattedAddress } = await request.json()

    if (!doctorId || !lat || !lng) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const { error } = await supabase
      .from('doctors')
      .update({
        clinic_lat: lat,
        clinic_lng: lng,
        clinic_address: formattedAddress
      })
      .eq('id', doctorId)

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}