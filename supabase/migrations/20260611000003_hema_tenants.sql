-- HEMA Módulo: Tenants (instituciones/clínicas)
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.tenants CASCADE;

CREATE TABLE IF NOT EXISTS hema.tenants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  rfc              text,
  clues            text,
  cofepris_license text,
  created_at       timestamptz DEFAULT now()
);

COMMENT ON TABLE hema.tenants IS
  'Instituciones o clínicas que usan el módulo HEMA. '
  'Un tenant = un hospital / consultorio / grupo médico.';

COMMENT ON COLUMN hema.tenants.clues IS
  'Clave Única de Establecimiento de Salud (CLUES) – catálogo DGIS/SSA.';

COMMENT ON COLUMN hema.tenants.cofepris_license IS
  'Número de licencia sanitaria COFEPRIS del establecimiento.';
