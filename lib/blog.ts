import { createClient } from '@supabase/supabase-js'

export interface BlogArticulo {
  id: string
  slug: string
  titulo: string
  resumen: string
  contenido: string
  especialidad: string
  imagen_portada_url: string | null
  autor_nombre: string | null
  revisor_nombre: string | null
  estado: 'borrador' | 'revision' | 'publicado'
  publicado_at: string | null
  created_at: string
  updated_at: string
}

export type BlogArticuloResumen = Pick<
  BlogArticulo,
  'id' | 'slug' | 'titulo' | 'resumen' | 'especialidad' | 'imagen_portada_url' | 'publicado_at'
>

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const RESUMEN_COLUMNAS = 'id, slug, titulo, resumen, especialidad, imagen_portada_url, publicado_at'

// Lectura pública: la anon key ya está limitada por RLS a estado = 'publicado'
// (blog_articulos_public_select), así que el filtro de estado aquí es
// defensa en profundidad, no la única barrera.
export async function getArticulosPublicados(limit = 50): Promise<BlogArticuloResumen[]> {
  const { data } = await getSupabase()
    .from('blog_articulos')
    .select(RESUMEN_COLUMNAS)
    .eq('estado', 'publicado')
    .order('publicado_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getArticuloPublicado(slug: string): Promise<BlogArticulo | null> {
  const { data } = await getSupabase()
    .from('blog_articulos')
    .select('*')
    .eq('slug', slug)
    .eq('estado', 'publicado')
    .maybeSingle()
  return data
}

// Para el interlink bidireccional (mismo especialidad, excluyendo el
// artículo actual) — usado en el pie de cada artículo. Comparación exacta a
// nivel DB porque especialidad ahí siempre viene del catálogo CONACEM
// controlado (se elige al redactar el artículo), sin texto libre de por medio.
export async function getArticulosRelacionados(especialidad: string, excludeId?: string, limit = 3): Promise<BlogArticuloResumen[]> {
  let query = getSupabase()
    .from('blog_articulos')
    .select(RESUMEN_COLUMNAS)
    .eq('estado', 'publicado')
    .eq('especialidad', especialidad)
    .order('publicado_at', { ascending: false })
    .limit(limit)
  if (excludeId) query = query.neq('id', excludeId)
  const { data } = await query
  return data ?? []
}

const norm = (t: string | null | undefined): string =>
  t ? t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() : ''

// Mitad del interlink bidireccional: artículos para la tarjeta en
// /buscar?especialidad=X. A diferencia de getArticulosRelacionados, aquí el
// query viene de un parámetro de URL/búsqueda libre (puede llegar sin
// acentos o con mayúsculas distintas), así que se compara normalizado en
// vez de con .eq() exacto en la base de datos. El total de artículos es
// chico (1/semana), así que traer todos los publicados y filtrar en memoria
// es más simple que además duplicar la lógica de normalización en SQL.
export async function getArticulosPorEspecialidadTexto(especialidadQuery: string, limit = 3): Promise<BlogArticuloResumen[]> {
  const target = norm(especialidadQuery)
  if (!target) return []
  const { data } = await getSupabase()
    .from('blog_articulos')
    .select(RESUMEN_COLUMNAS)
    .eq('estado', 'publicado')
    .order('publicado_at', { ascending: false })
  return (data ?? []).filter(a => norm(a.especialidad) === target).slice(0, limit)
}
