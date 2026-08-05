-- Chat médico-paciente, Paso 1: identificación persistente de pacientes
-- Afecta: nueva tabla pacientes; citas gana paciente_id y completed_at
-- Riesgo aceptado: dos personas que compartan teléfono podrían quedar
-- vinculadas al mismo paciente_id — no se resuelve en este paso.
-- Citas históricas quedan con paciente_id NULL (sin backfill).
--
-- Reversión:
--   DROP TRIGGER IF EXISTS trg_citas_vincular_paciente ON citas;
--   DROP FUNCTION IF EXISTS vincular_paciente_cita();
--   DROP TRIGGER IF EXISTS trg_citas_completed_at ON citas;
--   DROP FUNCTION IF EXISTS set_cita_completed_at();
--   ALTER TABLE citas DROP COLUMN paciente_id;
--   ALTER TABLE citas DROP COLUMN completed_at;
--   DROP TABLE pacientes;

-- ── pacientes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  telefono text,                    -- normalizado a 10 dígitos, NULL si no se dio o no es confiable
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pacientes_email ON pacientes(email);
CREATE INDEX idx_pacientes_telefono ON pacientes(telefono) WHERE telefono IS NOT NULL;

COMMENT ON TABLE pacientes IS
  'Identificador persistente de paciente, deducido por email/teléfono al agendar una cita. '
  'Base del chat médico-paciente (Paso 1 de 8).';

-- ── columnas nuevas en citas ──────────────────────────────────────────────
ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_id uuid REFERENCES pacientes(id);
ALTER TABLE citas ADD COLUMN IF NOT EXISTS completed_at timestamptz;

COMMENT ON COLUMN citas.paciente_id IS
  'Vínculo al paciente deducido por email/teléfono al agendar. NULL en citas anteriores a este cambio (sin backfill).';
COMMENT ON COLUMN citas.completed_at IS
  'Timestamp exacto en que estado pasó a completed. Se llena solo vía trigger, no se reescribe.';

-- ── completed_at se llena solo ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_cita_completed_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.estado = 'completed' AND OLD.estado IS DISTINCT FROM 'completed' THEN
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_citas_completed_at
BEFORE UPDATE ON citas
FOR EACH ROW EXECUTE FUNCTION set_cita_completed_at();

-- ── vincular o crear paciente al agendar ──────────────────────────────────
CREATE OR REPLACE FUNCTION vincular_paciente_cita()
RETURNS trigger AS $$
DECLARE
  v_tel text;
  v_paciente_id uuid;
BEGIN
  IF NEW.paciente_telefono IS NOT NULL AND NEW.paciente_telefono <> '' THEN
    v_tel := regexp_replace(NEW.paciente_telefono, '\D', '', 'g');
    IF length(v_tel) = 12 AND left(v_tel, 2) = '52' THEN v_tel := right(v_tel, 10);
    ELSIF length(v_tel) = 13 AND left(v_tel, 3) = '521' THEN v_tel := right(v_tel, 10);
    ELSIF length(v_tel) = 11 AND left(v_tel, 1) = '1' THEN v_tel := right(v_tel, 10);
    END IF;
    IF length(v_tel) <> 10 THEN v_tel := NULL; END IF;  -- no confiable → no se usa para match
  END IF;

  SELECT id INTO v_paciente_id
  FROM pacientes
  WHERE email = lower(trim(NEW.paciente_email))
     OR (v_tel IS NOT NULL AND telefono = v_tel)
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_paciente_id IS NULL THEN
    INSERT INTO pacientes (email, telefono)
    VALUES (lower(trim(NEW.paciente_email)), v_tel)
    RETURNING id INTO v_paciente_id;
  END IF;

  NEW.paciente_id := v_paciente_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_citas_vincular_paciente
BEFORE INSERT ON citas
FOR EACH ROW EXECUTE FUNCTION vincular_paciente_cita();
