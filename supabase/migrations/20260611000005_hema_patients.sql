-- HEMA Módulo: Pacientes
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.patients CASCADE;

CREATE TABLE hema.patients (
  id                      uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid  NOT NULL REFERENCES hema.tenants(id),
  -- CURP: 18 caracteres, formato oficial RENAPO
  curp                    text  NOT NULL
                            CHECK (curp ~ '^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]$'),
  nss                     text,
  full_name_encrypted     bytea NOT NULL,
  birth_date              date  NOT NULL,
  sex                     text  CHECK (sex IN ('M','F')),
  contact_phone_encrypted bytea,
  allergies               text,
  created_at              timestamptz DEFAULT now(),

  -- Un CURP no puede repetirse dentro del mismo tenant
  UNIQUE (tenant_id, curp)
);

COMMENT ON TABLE hema.patients IS
  'Pacientes oncohematológicos. full_name y contact_phone se almacenan '
  'cifrados con pgsodium para cumplimiento NOM-024 / LFPDPPP.';

COMMENT ON COLUMN hema.patients.curp IS
  'CURP validado con regex oficial RENAPO (18 caracteres). '
  'Único por tenant para prevenir duplicados.';

COMMENT ON COLUMN hema.patients.full_name_encrypted IS
  'Nombre completo cifrado con pgsodium.crypto_secretbox. '
  'Descifrar solo en servidor (Edge Function o RPC), nunca en cliente.';

COMMENT ON COLUMN hema.patients.allergies IS
  'Texto libre de alergias conocidas. Visible en cada indicación impresa '
  'conforme NOM-004-SSA3-2012.';
