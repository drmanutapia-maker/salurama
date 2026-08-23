-- Respuesta del médico a una reseña (Parte 1) + bitácora interna de
-- ediciones/borrados (no visible al público) + política admin faltante en
-- `reviews` (necesaria para que el admin pueda borrar reseñas, Parte 3).

CREATE TABLE IF NOT EXISTS public.review_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  doctor_id    uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  respuesta    text NOT NULL CHECK (char_length(respuesta) BETWEEN 1 AND 1000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- NULL = correo de aviso (Parte 2) aún no enviado. Se marca una sola vez,
  -- solo en la creación — nunca se resetea al editar. Si la fila se borra
  -- antes de que el cron la recoja, el aviso queda cancelado sin más trámite
  -- (el cron solo puede enviar lo que todavía existe en esta tabla).
  notified_at  timestamptz
);

CREATE INDEX IF NOT EXISTS review_responses_doctor_id_idx ON public.review_responses(doctor_id);

-- Bitácora interna, nunca expuesta al público. Sin FK a review_responses (esa
-- fila puede desaparecer) ni FK dura a reviews (una reseña puede ser borrada
-- por el admin y el historial debe sobrevivir esa acción).
CREATE TABLE IF NOT EXISTS public.review_responses_audit_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id          uuid NOT NULL,
  doctor_id          uuid NOT NULL,
  accion             text NOT NULL CHECK (accion IN ('editado', 'eliminado')),
  contenido_anterior text NOT NULL,
  actor_user_id      uuid NOT NULL DEFAULT auth.uid(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_responses_audit_log_review_id_idx ON public.review_responses_audit_log(review_id);

-- Trigger simple (no el esquema con hash-chain de hema.audit_log — aquí no
-- hace falta, es solo historial interno) que registra el estado ANTERIOR
-- cada vez que una respuesta se edita o se borra.
CREATE OR REPLACE FUNCTION public.review_responses_audit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.review_responses_audit_log (review_id, doctor_id, accion, contenido_anterior, actor_user_id)
  VALUES (
    OLD.review_id,
    OLD.doctor_id,
    CASE TG_OP WHEN 'UPDATE' THEN 'editado' ELSE 'eliminado' END,
    OLD.respuesta,
    auth.uid()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS review_responses_audit_trigger ON public.review_responses;
CREATE TRIGGER review_responses_audit_trigger
  BEFORE UPDATE OR DELETE ON public.review_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.review_responses_audit();

ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses_audit_log ENABLE ROW LEVEL SECURITY;

-- review_responses: público ve respuestas de reseñas visibles
DROP POLICY IF EXISTS "review_responses_select_public" ON public.review_responses;
CREATE POLICY "review_responses_select_public" ON public.review_responses
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.is_visible = true));

-- review_responses: el médico ve/crea/edita/borra solo las suyas, y solo
-- sobre reseñas que efectivamente le pertenecen (defensa adicional: no basta
-- con mandar su propio doctor_id, review_id también debe ser de ese médico).
DROP POLICY IF EXISTS "review_responses_select_doctor" ON public.review_responses;
CREATE POLICY "review_responses_select_doctor" ON public.review_responses
  FOR SELECT
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "review_responses_write_doctor" ON public.review_responses;
CREATE POLICY "review_responses_write_doctor" ON public.review_responses
  FOR ALL
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
  WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.doctor_id = review_responses.doctor_id)
  );

DROP POLICY IF EXISTS "review_responses_admin_all" ON public.review_responses;
CREATE POLICY "review_responses_admin_all" ON public.review_responses
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

DROP POLICY IF EXISTS "review_responses_service_role" ON public.review_responses;
CREATE POLICY "review_responses_service_role" ON public.review_responses
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- review_responses_audit_log: admin-only, mismo patrón que
-- doctor_constancia_audit_log_admin_only. Nunca visible al médico ni al público.
DROP POLICY IF EXISTS "review_responses_audit_log_admin_only" ON public.review_responses_audit_log;
CREATE POLICY "review_responses_audit_log_admin_only" ON public.review_responses_audit_log
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- No hace falta una política de INSERT aparte para el trigger: la función es
-- SECURITY DEFINER y su dueño (postgres, creado por la migración) tiene
-- rolbypassrls=true, así que el INSERT del trigger nunca pasa por RLS. A
-- propósito NO se agrega una política permisiva de INSERT aquí — eso abriría
-- la puerta a que cualquier médico inserte filas falsas en su propia
-- bitácora directo vía supabase-js.

-- reviews: faltaba una política admin (hoy solo público, dueño y
-- service_role) — la necesita el panel de admin para borrar reseñas (Parte 3).
DROP POLICY IF EXISTS "reviews_admin_all" ON public.reviews;
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));
