-- Reemplazar es_principal por orden=1 como señal del consultorio principal.
--
-- idx_consultorios_principal garantizaba un solo es_principal=true por doctor.
-- idx_consultorios_orden_primero da la misma garantía: un solo orden=1 por doctor.
--
-- El trigger de sincronización ciudad/estado (migración 000007) comparaba
-- NEW.es_principal = true. Aquí se reemplaza por NEW.orden = 1 antes de
-- dropear la columna, para no romper el trigger en runtime.

-- ── 1. Índice anterior ────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_consultorios_principal;

-- ── 2. Nuevo índice único parcial ─────────────────────────────────────────────
CREATE UNIQUE INDEX idx_consultorios_orden_primero
  ON public.consultorios (doctor_id)
  WHERE orden = 1;

-- ── 3. Corregir función y trigger de sincronización ciudad/estado ─────────────
CREATE OR REPLACE FUNCTION sync_ciudad_estado_a_doctors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.orden = 1 THEN
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

DROP TRIGGER IF EXISTS trg_consultorios_sync_ciudad_estado ON consultorios;

CREATE TRIGGER trg_consultorios_sync_ciudad_estado
  AFTER INSERT OR UPDATE OF ciudad, estado, orden
  ON consultorios
  FOR EACH ROW
  EXECUTE FUNCTION sync_ciudad_estado_a_doctors();

-- ── 4. Eliminar columna ───────────────────────────────────────────────────────
ALTER TABLE public.consultorios DROP COLUMN IF EXISTS es_principal;
