-- ═══════════════════════════════════════════════════════════════════════
-- Blog de contenido para pacientes — tablas base para artículos (flujo
-- borrador → revisión → publicado) y preguntas de lectores sin cuenta.
-- Diseño aprobado por Manuel 2026-08-02, parte del plan de SEO (punto 3).
--
-- blog_articulos: lectura pública SOLO de artículos publicados; crear,
-- editar o cambiar estado es admin-only vía /admin/blog (misma tabla
-- `admins` que ya gatea /admin/medicos).
--
-- blog_preguntas: sin acceso directo del cliente en absoluto — ni INSERT
-- ni SELECT vía RLS. El único camino de escritura es POST
-- /api/blog/preguntas con service role + rate limiting (mismo patrón que
-- buscar-paciente); el único camino de lectura es admin vía /admin/blog.
-- No se recolecta email ni ningún dato de contacto — decisión de producto
-- para minimizar PII, las preguntas alimentan temas, no correspondencia.
--
-- Reversión:
--   DROP TABLE IF EXISTS public.blog_preguntas;
--   DROP TABLE IF EXISTS public.blog_articulos;
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.blog_articulos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text UNIQUE NOT NULL,
  titulo              text NOT NULL,
  resumen             text NOT NULL,
  contenido           text NOT NULL,
  especialidad        text NOT NULL,
  imagen_portada_url  text,
  autor_nombre        text,
  revisor_nombre      text,
  estado              text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'revision', 'publicado')),
  publicado_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_articulos_estado_publicado_at ON public.blog_articulos (estado, publicado_at DESC);

ALTER TABLE public.blog_articulos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog_articulos_public_select" ON public.blog_articulos;
CREATE POLICY "blog_articulos_public_select" ON public.blog_articulos
  FOR SELECT USING (estado = 'publicado');

DROP POLICY IF EXISTS "blog_articulos_admin_all" ON public.blog_articulos;
CREATE POLICY "blog_articulos_admin_all" ON public.blog_articulos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.blog_preguntas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  articulo_id  uuid NOT NULL REFERENCES public.blog_articulos(id) ON DELETE CASCADE,
  pregunta     text NOT NULL,
  nombre       text,
  estado       text NOT NULL DEFAULT 'nueva' CHECK (estado IN ('nueva', 'usada', 'descartada')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_preguntas_articulo_id ON public.blog_preguntas (articulo_id);

ALTER TABLE public.blog_preguntas ENABLE ROW LEVEL SECURITY;

-- Sin política pública a propósito: ni anon ni authenticated tienen ningún
-- acceso vía RLS. El insert público pasa por service role en la API route
-- (bypassa RLS), y la única lectura es admin.
DROP POLICY IF EXISTS "blog_preguntas_admin_all" ON public.blog_preguntas;
CREATE POLICY "blog_preguntas_admin_all" ON public.blog_preguntas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );
