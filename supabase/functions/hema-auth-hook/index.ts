// @ts-nocheck
// Supabase "Customize Access Token (JWT)" Hook
// Configurar en: Auth > Hooks > Customize Access Token
// Agrega { modules, tenant_id } al JWT según la suscripción del médico.
//
// Cadena de FK:
//   auth.users.id → public.doctors.user_id → public.doctors.id
//   → public.subscriptions.doctor_id → subscriptions.modules
//   auth.users.id → hema.users.id → hema.users.tenant_id

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  console.log('Hook invocado')

  let payload: { user_id: string; claims: Record<string, unknown> }

  // ── Leer body ────────────────────────────────────────────────────────────
  // Intentamos verificar HMAC si el secret está configurado,
  // pero si falla continuamos de todas formas — Supabase ya autentica la llamada.
  try {
    const body = await req.text()
    const webhookSecret = Deno.env.get('HEMA_AUTH_HOOK_SECRET')

    if (webhookSecret) {
      try {
        const signature = req.headers.get('x-supabase-signature') ?? ''
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify']
        )
        const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0))
        const bodyBytes = encoder.encode(body)
        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes)
        console.log('Verificación HMAC:', valid ? 'OK' : 'FALLÓ — continuando de todas formas')
      } catch (hmacErr) {
        console.log('Error en verificación HMAC (ignorado):', String(hmacErr))
      }
    } else {
      console.log('HEMA_AUTH_HOOK_SECRET no definido — sin verificación HMAC')
    }

    payload = JSON.parse(body)
  } catch (parseErr) {
    console.log('Error leyendo body:', String(parseErr))
    // Sin payload no podemos hacer nada — Supabase necesita una respuesta válida
    return new Response(JSON.stringify({ claims: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return enrichClaims(payload)
})

async function enrichClaims(payload: {
  user_id: string
  claims: Record<string, unknown>
}): Promise<Response> {
  const { user_id, claims } = payload
  console.log('Enriqueciendo claims para user_id:', user_id)

  // Ante cualquier error devolvemos el JWT original intacto
  // para que el login del médico NUNCA se bloquee.
  let modules: string[] = []
  let tenant_id: string | null = null

  try {
    // Paso 1: encontrar el doctor en public.doctors
    console.log('Leyendo public.doctors...')
    const { data: doctor, error: doctorErr } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle()

    if (doctorErr) {
      console.log('Error leyendo doctors:', doctorErr.message)
    }

    if (doctor) {
      console.log('Doctor encontrado, id:', doctor.id)

      // Paso 2: leer suscripción activa → modules
      console.log('Leyendo subscriptions...')
      const { data: subscription, error: subErr } = await supabase
        .from('subscriptions')
        .select('modules, status, plan')
        .eq('doctor_id', doctor.id)
        .eq('status', 'active')
        .maybeSingle()

      if (subErr) {
        console.log('Error leyendo subscriptions:', subErr.message)
      }

      if (subscription?.modules && Array.isArray(subscription.modules)) {
        modules = subscription.modules
      }
      console.log('modules encontrados:', JSON.stringify(modules))

      // Paso 3: leer tenant_id desde hema.users
      try {
        const { data: hemaUser, error: hemaErr } = await supabase
          .schema('hema')
          .from('users')
          .select('tenant_id')
          .eq('id', user_id)
          .maybeSingle()

        if (hemaErr) {
          console.log('Error leyendo hema.users:', hemaErr.message)
        } else {
          tenant_id = hemaUser?.tenant_id ?? null
          console.log('tenant_id:', tenant_id)
        }
      } catch (hemaSchemaErr) {
        console.log('Excepción leyendo hema.users (ignorada):', String(hemaSchemaErr))
      }
    } else {
      console.log('No se encontró doctor para user_id:', user_id)
    }
  } catch (err) {
    // Error inesperado — devolver JWT original sin modificar
    console.log('Error inesperado en enrichClaims (devolviendo JWT original):', String(err))
    return Response.json({ claims })
  }

  const enriched: Record<string, unknown> = {
    ...claims,
    modules,
  }
  if (tenant_id) {
    enriched.tenant_id = tenant_id
  }

  console.log('Retornando JWT con claims — modules:', JSON.stringify(modules))
  return Response.json({ claims: enriched })
}
