import type { SupabaseClient } from '@supabase/supabase-js'

// Slug se genera UNA sola vez, al crear el médico — no se regenera si edita su
// nombre/especialidad después, para no romper URLs ya indexadas por Google.

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function buildDoctorSlugBase(fullName: string, specialty: string, title?: string | null): string {
  const titlePart = title ? slugify(title.replace(/\./g, '')) : 'dr'
  return [titlePart, slugify(fullName), slugify(specialty)].filter(Boolean).join('-')
}

export async function generateUniqueDoctorSlug(
  supabase: SupabaseClient,
  fullName: string,
  specialty: string,
  title?: string | null
): Promise<string> {
  const base = buildDoctorSlugBase(fullName, specialty, title)
  let candidate = base
  let suffix = 2

  // Único punto de verdad: consulta directa a la BD, no supone nada sobre
  // colisiones previas. Con pocos médicos por especialidad/ciudad esto casi
  // nunca itera más de una vez.
  while (true) {
    const { count } = await supabase
      .from('doctors')
      .select('id', { head: true, count: 'exact' })
      .eq('slug', candidate)

    if (!count) return candidate
    candidate = `${base}-${suffix}`
    suffix++
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}
