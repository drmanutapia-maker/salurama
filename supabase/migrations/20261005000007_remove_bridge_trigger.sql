-- Migración 000007: elimina el trigger puente doctors→consultorios y
-- lo reemplaza por un trigger más ligero que solo sincroniza ciudad/estado
-- de vuelta a doctors cuando el consultorio principal cambia.
--
-- A partir de este punto, editar-perfil escribe directamente en consultorios.

-- ── 1. Eliminar triggers y función puente ────────────────────────────────────
DROP TRIGGER IF EXISTS trg_doctors_sync_consultorio_ins ON doctors;
DROP TRIGGER IF EXISTS trg_doctors_sync_consultorio_upd ON doctors;
DROP FUNCTION IF EXISTS sync_doctor_a_consultorio_principal();

-- ── 2. Función de sincronización ciudad/estado ───────────────────────────────
CREATE OR REPLACE FUNCTION sync_ciudad_estado_a_doctors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.es_principal = true THEN
    UPDATE doctors
    SET ciudad = NEW.ciudad,
        estado = NEW.estado
    WHERE id = NEW.doctor_id
      AND (ciudad IS DISTINCT FROM NEW.ciudad OR estado IS DISTINCT FROM NEW.estado);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION sync_ciudad_estado_a_doctors() FROM anon, authenticated;

-- ── 3. Trigger de sincronización ciudad/estado ───────────────────────────────
CREATE TRIGGER trg_consultorios_sync_ciudad_estado
  AFTER INSERT OR UPDATE OF ciudad, estado, es_principal
  ON consultorios
  FOR EACH ROW
  EXECUTE FUNCTION sync_ciudad_estado_a_doctors();
