-- HEMA: Número de expediente por tenant (Sesión 11 pre-ajustes)
-- Afecta schema: hema (patients, nueva tabla tenant_patient_counters, función + trigger)
-- Reversión:
--   DROP TRIGGER hema_set_expediente_sequential ON hema.patients;
--   DROP FUNCTION hema.set_patient_expediente();
--   DROP FUNCTION public.hema_next_expediente_sequential(uuid);
--   DROP TABLE hema.tenant_patient_counters;
--   ALTER TABLE hema.patients DROP COLUMN expediente_sequential;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Contador atómico por tenant
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE hema.tenant_patient_counters (
  tenant_id       uuid    PRIMARY KEY REFERENCES hema.tenants(id),
  last_sequential int     NOT NULL DEFAULT 0
);

COMMENT ON TABLE hema.tenant_patient_counters IS
  'Contador de expedientes por tenant. Nunca borrar filas — solo incrementar.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Columna en hema.patients
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE hema.patients
  ADD COLUMN expediente_sequential INT;

COMMENT ON COLUMN hema.patients.expediente_sequential IS
  'Consecutivo de expediente dentro del tenant, asignado por trigger. '
  'El número legible se arma al leer: tenant_code || ''-'' || LPAD(expediente_sequential::text,6,''0'').';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Función atómica que devuelve el siguiente consecutivo
--    SECURITY DEFINER porque el trigger se ejecuta como el usuario que inserta
--    y RLS en tenant_patient_counters bloquearía la escritura. Mismo patrón
--    que hema_sign_order y hema_approve_protocol.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_next_expediente_sequential(p_tenant_id uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_next int;
BEGIN
  INSERT INTO hema.tenant_patient_counters (tenant_id, last_sequential)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id) DO UPDATE
    SET last_sequential = hema.tenant_patient_counters.last_sequential + 1
  RETURNING last_sequential INTO v_next;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hema_next_expediente_sequential(uuid) TO authenticated;

COMMENT ON FUNCTION public.hema_next_expediente_sequential(uuid) IS
  'Incrementa y devuelve el contador de expedientes para el tenant dado. '
  'Atómico: INSERT ... ON CONFLICT DO UPDATE es un solo lock por fila, sin FOR UPDATE adicional.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger BEFORE INSERT: llena expediente_sequential si viene NULL
--    SECURITY DEFINER para que pueda llamar hema_next_expediente_sequential
--    desde el contexto del trigger (usuario autenticado bajo RLS).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION hema.set_patient_expediente()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NEW.expediente_sequential IS NULL THEN
    NEW.expediente_sequential := public.hema_next_expediente_sequential(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER hema_set_expediente_sequential
  BEFORE INSERT ON hema.patients
  FOR EACH ROW EXECUTE FUNCTION hema.set_patient_expediente();

COMMENT ON FUNCTION hema.set_patient_expediente() IS
  'SECURITY DEFINER: necesario para escribir en hema.tenant_patient_counters bajo RLS.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Backfill: pacientes existentes reciben consecutivos en orden de created_at
--    Llama a la función atómica para cada paciente por tenant, manteniendo
--    el orden cronológico dentro de cada tenant.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, tenant_id
    FROM   hema.patients
    WHERE  expediente_sequential IS NULL
    ORDER  BY tenant_id, created_at
  LOOP
    UPDATE hema.patients
    SET    expediente_sequential = public.hema_next_expediente_sequential(rec.tenant_id)
    WHERE  id = rec.id;
  END LOOP;
END;
$$;
