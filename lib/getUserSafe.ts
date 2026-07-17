import type { SupabaseClient } from '@supabase/supabase-js'

interface GetUserSafeResult {
  user: { id: string; email?: string } | null
  networkError: boolean
}

// getUser() del SDK de Supabase lanza (no retorna un `error`) cuando la
// petición falla a nivel de red (ej. "Failed to fetch"), a diferencia de
// cuando el servidor confirma que no hay sesión. Tratar ambos casos igual
// desconecta al usuario por un problema de conectividad transitorio en vez
// de una sesión realmente inválida. Reintenta una vez antes de reportar
// networkError.
export async function getUserSafe(supabase: SupabaseClient): Promise<GetUserSafeResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
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
