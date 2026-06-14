   import { NextResponse } from 'next/server'

   export async function POST(request: Request) {
     const { address } = await request.json()

     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=mx`

     const res = await fetch(url, {
       headers: { 'User-Agent': 'Salurama/1.0' }
     })

     const data = await res.json()

     if (!data[0]) {
       return NextResponse.json({ error: 'Not found' }, { status: 404 })
     }

     return NextResponse.json({
       lat: parseFloat(data[0].lat),
       lng: parseFloat(data[0].lon),
       formatted_address: data[0].display_name
     })
   }

   export async function GET() {
     return NextResponse.json({ status: 'geocode api ready' })
   }