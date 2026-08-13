import type { SupabaseClient } from '@supabase/supabase-js'

interface GetUserSafeResult {
  user: { id: string; email?: string } | null
  networkError: boolean
}

const TIMEOUT_MS = 8000

// supabase.auth.getUser() no tiene limite de tiempo propio: si la peticion
// de red se cuelga (nunca responde, nunca falla), la promesa nunca resuelve
// ni rechaza y la pagina que espera este resultado se queda trabada para
// siempre (confirmado interceptando la peticion y dejandola colgada a
// proposito). Promise.race no cancela la peticion colgada, pero acota cuanto
// tiempo la UI espera por ella, que es lo que evita el cuelgue visible.
function getUserConTimeout(supabase: SupabaseClient) {
  return Promise.race([
    supabase.auth.getUser(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('getUserSafe: tiempo de espera agotado')), TIMEOUT_MS)
    }),
  ])
}

// getUser() del SDK de Supabase lanza (no retorna un `error`) cuando la
// petición falla a nivel de red (ej. "Failed to fetch"), a diferencia de
// cuando el servidor confirma que no hay sesión. Tratar ambos casos igual
// desconecta al usuario por un problema de conectividad transitoria en vez
// de una sesión realmente inválida. Reintenta una vez antes de reportar
// networkError. Un cuelgue de red entra por la misma rama (getUserConTimeout
// rechaza tras TIMEOUT_MS), así que también se reintenta una vez antes de
// reportarse como networkError.
export async function getUserSafe(supabase: SupabaseClient): Promise<GetUserSafeResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: { user } } = await getUserConTimeout(supabase)
      return { user, networkError: false }
    } catch (err) {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        continue
      }
      console.error('[getUserSafe] Fallo de red al verificar sesión tras reintento:', err)
      return { user: null, networkError: true }
    }
  }
  return { user: null, networkError: true }
}
