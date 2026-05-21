import { NextResponse } from 'next/server'
import data from '@/data/sepomex.json'

export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}