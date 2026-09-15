-- ============================================================
-- MIGRACIÓN MSL-005: metadata de literatura PubMed/PMC para el
-- corpus multipatología de MSL Virtual (Componente 1)
-- ============================================================

ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS pmid TEXT;
ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS pmcid TEXT;
ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS cie10_codes TEXT[];

-- Solo licencias del subconjunto oa_comm de PMC (uso comercial permitido)
-- deben llegar a esta tabla — la ingesta ya filtra antes de insertar, este
-- constraint es una segunda barrera para que un bug de ingesta no cuele
-- accidentalmente un artículo oa_noncomm/oa_other.
ALTER TABLE msl_documents ADD CONSTRAINT msl_documents_license_check
  CHECK (license IS NULL OR license IN ('CC0', 'CC BY', 'CC BY-SA', 'CC BY-ND'));

CREATE UNIQUE INDEX IF NOT EXISTS msl_documents_pmcid_key ON msl_documents (pmcid) WHERE pmcid IS NOT NULL;
