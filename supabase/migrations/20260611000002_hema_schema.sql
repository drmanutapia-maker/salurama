-- HEMA Módulo: Schema base
-- Afecta schema: hema (nuevo – no toca public)
-- Reversión: DROP SCHEMA hema CASCADE;

CREATE SCHEMA IF NOT EXISTS hema;

-- Permite que el service_role y authenticated lean el schema
GRANT USAGE ON SCHEMA hema TO service_role, authenticated;

-- Todo lo nuevo dentro de hema es propiedad del service_role
ALTER DEFAULT PRIVILEGES IN SCHEMA hema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA hema
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA hema
  GRANT ALL ON SEQUENCES TO service_role, authenticated;

COMMENT ON SCHEMA hema IS
  'Módulo clínico HEMA – indicaciones de quimioterapia e infusiones. '
  'Schema aislado para auditoría COFEPRIS independiente del schema public de Salurama.';
