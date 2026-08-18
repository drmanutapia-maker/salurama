import type { SupabaseClient } from '@supabase/supabase-js'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'

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

// getUser() del SDK de Supabase NO SIEMPRE lanza cuando la petición falla a
// nivel de red — ese era el supuesto original de esta función, y resultó
// estar incompleto. Cuando la sesión local todavía luce "vigente" según su
// propio reloj, getUser() hace una llamada de verificación al servidor de
// Auth; si ESA llamada específica falla por red, GoTrue la envuelve como
// AuthRetryableFetchError y la regresa como resultado normal
// {data:{user:null}, error} en vez de lanzarla (ver GoTrueClient._getUser en
// @supabase/auth-js — el catch interno solo relanza cuando NO es un
// AuthError). Esta función antes solo leía `user` e ignoraba `error` por
// completo, así que trataba esa falla de red exactamente igual que un logout
// real: user=null. Bajo una caída de red sostenida, con varias páginas del
// panel (todas usando esta función) verificando la sesión al mismo tiempo,
// eso causaba un rebote real a /login y de regreso en vez de mostrar el
// error de conexión — confirmado interceptando la red hacia Supabase con
// varias páginas montadas a la vez.
//
// isAuthRetryableFetchError() es la función que el propio SDK expone para
// reconocer justo este caso. Deliberadamente NO se trata así cualquier otro
// AuthError: un AuthApiError por un refresh token realmente inválido, o un
// AuthSessionMissingError por una sesión realmente ausente, siguen
// resolviendo como `user: null` sin marcar networkError — esos SÍ son un
// logout genuino y deben seguir mandando a /login como antes.
//
// Reintenta una vez antes de reportar networkError. Un cuelgue de red entra
// por la misma rama (getUserConTimeout rechaza tras TIMEOUT_MS), así que
// también se reintenta una vez antes de reportarse como networkError.
export async function getUserSafe(supabase: SupabaseClient): Promise<GetUserSafeResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: { user }, error } = await getUserConTimeout(supabase)
      if (error && isAuthRetryableFetchError(error)) {
        throw error
      }
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
