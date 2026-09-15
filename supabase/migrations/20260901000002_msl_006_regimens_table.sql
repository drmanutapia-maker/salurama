-- ============================================================
-- MIGRACIÓN MSL-006: tabla curada de esquemas de tratamiento
-- (Componente 2) — separada del RAG semántico normal. El LLM
-- solo puede citar textualmente estas filas, nunca redactarlas
-- libremente, y ninguna se usa en el chat hasta aprobación
-- clínica explícita por esquema (review_status = 'aprobado').
-- ============================================================

CREATE TABLE IF NOT EXISTS msl_regimens (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  regimen_name        TEXT        NOT NULL,
  pathology           TEXT        NOT NULL,
  cie10_codes         TEXT[]      NOT NULL,
  treatment_line      TEXT,
  drugs               JSONB       NOT NULL,
  cycles              TEXT,
  source_document_id  UUID        REFERENCES msl_documents(id) ON DELETE SET NULL,
  source_pmcid        TEXT,
  source_license       TEXT,
  source_excerpt       TEXT        NOT NULL,
  review_status        TEXT        NOT NULL DEFAULT 'pendiente_revision',
  reviewed_by          TEXT,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE msl_regimens ADD CONSTRAINT msl_regimens_review_status_check
  CHECK (review_status IN ('pendiente_revision', 'aprobado', 'rechazado'));

ALTER TABLE msl_regimens ADD CONSTRAINT msl_regimens_source_license_check
  CHECK (source_license IN ('CC0', 'CC BY', 'CC BY-SA', 'CC BY-ND'));

-- RLS habilitado sin políticas — solo el service role (server-side) puede
-- leer/escribir hasta que exista la UI de aprobación y su gate específico.
-- No se ingresa una política "Authenticated can read" a propósito, a
-- diferencia de msl_documents/msl_chunks — este contenido no debe llegar a
-- ningún cliente hasta la revisión esquema por esquema.
ALTER TABLE msl_regimens ENABLE ROW LEVEL SECURITY;
