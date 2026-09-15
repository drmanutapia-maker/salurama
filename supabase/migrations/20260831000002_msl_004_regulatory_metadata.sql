-- ============================================================
-- MIGRACIÓN MSL-004: metadata regulatoria para expandir el
-- corpus de MSL Virtual más allá de papers (NOMs, guías CENETEC)
-- ============================================================

ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'paper';
ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS document_code TEXT;
ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS publication_date DATE;
ALTER TABLE msl_documents ADD COLUMN IF NOT EXISTS regulatory_status TEXT;

ALTER TABLE msl_documents ADD CONSTRAINT msl_documents_regulatory_status_check
  CHECK (regulatory_status IS NULL OR regulatory_status IN ('vigente', 'en_proceso_no_vigente'));
