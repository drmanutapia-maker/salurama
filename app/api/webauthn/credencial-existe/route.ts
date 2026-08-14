import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const securityHeaders = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

// Version SIN sesion de /api/webauthn/estado -- se usa en /login, antes de
// autenticarse, solo para decidir si mostrar el boton de huella. Confirma
// que el credential_id que este navegador tiene guardado localmente sigue
// existiendo en el servidor (sin importar de que cuenta es). El id en si no
// sirve para nada sin el autenticador fisico que lo generó, asi que
// confirmar su existencia no revela informacion sensible de la cuenta.
export async function GET(request: NextRequest) {
  const credentialId = request.nextUrl.searchParams.get('credential_id')
  if (!credentialId) {
    return NextResponse.json({ activo: false }, { headers: securityHeaders })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: credencial } = await supabase
    .from('webauthn_credentials')
    .select('id')
    .eq('credential_id', credentialId)
    .maybeSingle()

  return NextResponse.json({ activo: !!credencial }, { headers: securityHeaders })
}
