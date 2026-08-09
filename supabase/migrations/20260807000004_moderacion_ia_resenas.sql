-- Moderación de contenido (IA + reporte de usuarios) para reviews y
-- review_responses. Nunca bloquea publicación — is_visible sigue siendo el
-- único campo que controla visibilidad pública; esto es solo una bandeja de
-- trabajo interna para que el admin decida.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pendiente_revision_ia'
    CHECK (moderation_status IN ('pendiente_revision_ia', 'aprobado', 'señalado')),
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderation_flagged_by text
    CHECK (moderation_flagged_by IN ('ia', 'usuario')),
  ADD COLUMN IF NOT EXISTS moderation_reviewed_at timestamptz;

ALTER TABLE public.review_responses
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pendiente_revision_ia'
    CHECK (moderation_status IN ('pendiente_revision_ia', 'aprobado', 'señalado')),
  ADD COLUMN IF NOT EXISTS moderation_reason text,
  ADD COLUMN IF NOT EXISTS moderation_flagged_by text
    CHECK (moderation_flagged_by IN ('ia', 'usuario')),
  ADD COLUMN IF NOT EXISTS moderation_reviewed_at timestamptz;

CREATE INDEX IF NOT EXISTS reviews_moderation_status_idx ON public.reviews(moderation_status) WHERE moderation_status = 'señalado';
CREATE INDEX IF NOT EXISTS review_responses_moderation_status_idx ON public.review_responses(moderation_status) WHERE moderation_status = 'señalado';
