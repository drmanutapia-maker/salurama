-- HEMA Módulo: Diagnósticos CIE-10 y diagnósticos de paciente
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.patient_diagnoses CASCADE;
--            DROP TABLE hema.diagnoses CASCADE;

CREATE TABLE IF NOT EXISTS hema.diagnoses (
  code           text PRIMARY KEY,
  description_es text NOT NULL,
  description_en text,
  category       text CHECK (
    category IN ('mieloma','linfoma','leucemia','mds','mpn','otro')
  )
);

COMMENT ON TABLE hema.diagnoses IS
  'Catálogo CIE-10 relevante para hematología oncológica. '
  'Sembrado por migración hema_seed_cie10. No se modifica en runtime.';

COMMENT ON COLUMN hema.diagnoses.code IS
  'Código CIE-10 oficial (ej: C90.0 = Mieloma múltiple). PK de texto.';

COMMENT ON COLUMN hema.diagnoses.category IS
  'Categoría clínica para filtrar protocolos compatibles en el wizard de órdenes.';

-- ─────────────────────────────────────────
-- Diagnósticos activos por paciente
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hema.patient_diagnoses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     uuid NOT NULL REFERENCES hema.patients(id),
  diagnosis_code text NOT NULL REFERENCES hema.diagnoses(code),
  diagnosed_at   date NOT NULL,
  staging        text,
  cytogenetics   jsonb,
  is_primary     boolean DEFAULT true
);

COMMENT ON TABLE hema.patient_diagnoses IS
  'Diagnósticos oncohematológicos asignados a un paciente. '
  'Un paciente puede tener diagnóstico primario + secundarios.';

COMMENT ON COLUMN hema.patient_diagnoses.staging IS
  'Estadificación clínica libre (ej: ISS III, Ann Arbor IVB, IPSS-R Alto).';

COMMENT ON COLUMN hema.patient_diagnoses.cytogenetics IS
  'Alteraciones citogenéticas como JSON (ej: {"del17p": true, "t_4_14": false}). '
  'Usadas por el motor de validación para reglas protocolo-específicas.';

COMMENT ON COLUMN hema.patient_diagnoses.is_primary IS
  'true = diagnóstico principal que determina los protocolos disponibles.';
