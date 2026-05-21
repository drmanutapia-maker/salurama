// Salurama - Supabase Client (2026 Best Practice)
// Usa @supabase/ssr para App Router

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan variables de entorno de Supabase')
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}