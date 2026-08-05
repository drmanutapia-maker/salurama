-- HEMA Módulo: Paneles de laboratorio y valores
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.lab_values CASCADE;
--            DROP TABLE hema.lab_panels CASCADE;

CREATE TABLE IF NOT EXISTS hema.lab_panels (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                uuid        NOT NULL REFERENCES hema.patients(id),
  tenant_id                 uuid        NOT NULL REFERENCES hema.tenants(id),
  collected_at              timestamptz NOT NULL,
  source                    text        CHECK (source IN ('manual','ocr','fhir')),
  ocr_image_path            text,
  ocr_raw_json              jsonb,
  ocr_confidence            numeric,
  reviewed_by               uuid        REFERENCES hema.users(id),
  reviewed_at               timestamptz,
  fhir_diagnostic_report_id text
);

COMMENT ON TABLE hema.lab_panels IS
  'Panel de laboratorio de un paciente. reviewed_by debe estar lleno '
  'antes de que el panel pueda vincularse a una orden (regla clínica del plan).';

COMMENT ON COLUMN hema.lab_panels.ocr_image_path IS
  'Path en Storage hema-lab-images/{tenant_id}/{patient_id}/{uuid}.{ext}';

COMMENT ON COLUMN hema.lab_panels.ocr_raw_json IS
  'Respuesta cruda de Google Cloud Document AI. Solo para trazabilidad; '
  'los valores procesados están en hema.lab_values.';

COMMENT ON COLUMN hema.lab_panels.reviewed_by IS
  'NULL = pendiente de revisión médica. Solo paneles revisados '
  'pueden usarse en el wizard de órdenes (Step 2).';

COMMENT ON COLUMN hema.lab_panels.fhir_diagnostic_report_id IS
  'ID del DiagnosticReport HL7/FHIR para futura integración con HIS/LIS.';

-- ─────────────────────────────────────────
-- Valores individuales de cada analito
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hema.lab_values (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id        uuid    NOT NULL REFERENCES hema.lab_panels(id) ON DELETE CASCADE,
  loinc           text,
  analyte         text    NOT NULL,
  value           numeric,
  unit            text,
  reference_low   numeric,
  reference_high  numeric,
  flag            text    CHECK (flag IN ('L','H','LL','HH')),
  ocr_confidence  numeric CHECK (ocr_confidence BETWEEN 0 AND 1),
  manually_edited boolean DEFAULT false
);

COMMENT ON TABLE hema.lab_values IS
  'Valores individuales de analitos de un panel. '
  'ocr_confidence < 0.85 requiere revisión visual del médico antes de usar.';

COMMENT ON COLUMN hema.lab_values.loinc IS
  'Código LOINC del analito (ej: 751-8 = Neutrófilos absolutos). '
  'Mapeado por el diccionario en hema-labs-ocr-ingest.';

COMMENT ON COLUMN hema.lab_values.flag IS
  'L=bajo, H=alto, LL=crítico bajo, HH=crítico alto. '
  'Derivado de reference_low/high en la Edge Function de ingesta.';

COMMENT ON COLUMN hema.lab_values.ocr_confidence IS
  'Confianza del OCR (0–1). Celdas <0.85 se resaltan en amarillo '
  'en la UI de revisión y bloquean el uso del panel hasta corrección manual.';

COMMENT ON COLUMN hema.lab_values.manually_edited IS
  'true cuando el médico corrigió el valor extraído por OCR. '
  'Registrado para trazabilidad de auditoría.';
