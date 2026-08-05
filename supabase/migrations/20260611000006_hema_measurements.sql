-- HEMA Módulo: Mediciones de paciente (peso, talla, BSA)
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.patient_measurements CASCADE;

CREATE TABLE IF NOT EXISTS hema.patient_measurements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid        NOT NULL REFERENCES hema.patients(id),
  measured_at timestamptz NOT NULL,

  weight_kg   numeric(5,2) NOT NULL
                CHECK (weight_kg BETWEEN 20 AND 250),
  height_cm   numeric(5,1) NOT NULL
                CHECK (height_cm BETWEEN 100 AND 220),

  -- BSA Mosteller: sqrt((kg × cm) / 3600)
  -- Verificación: 66 kg / 160 cm → sqrt(10560/3600) = sqrt(2.9333) ≈ 1.71 m²
  bsa_mosteller numeric(4,2) GENERATED ALWAYS AS (
    ROUND(CAST(sqrt((weight_kg * height_cm) / 3600.0) AS numeric), 2)
  ) STORED,

  -- BSA DuBois: 0.007184 × kg^0.425 × cm^0.725
  bsa_dubois  numeric(4,2) GENERATED ALWAYS AS (
    ROUND(CAST(0.007184 * power(weight_kg, 0.425) * power(height_cm, 0.725) AS numeric), 2)
  ) STORED,

  recorded_by uuid NOT NULL REFERENCES hema.users(id)
);

COMMENT ON TABLE hema.patient_measurements IS
  'Mediciones versionadas de peso y talla. Nunca se editan; '
  'cada nueva toma genera una fila nueva (trazabilidad completa).';

COMMENT ON COLUMN hema.patient_measurements.bsa_mosteller IS
  'BSA Mosteller (columna generada). Fórmula por defecto para cálculo de dosis. '
  'Caso de prueba: 66 kg / 160 cm = 1.71 m².';

COMMENT ON COLUMN hema.patient_measurements.bsa_dubois IS
  'BSA DuBois (columna generada). Se guarda para trazabilidad y '
  'comparación; no se usa como base de dosis salvo decisión explícita del médico.';
