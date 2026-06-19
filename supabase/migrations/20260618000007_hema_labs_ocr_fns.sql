-- HEMA: Extiende hema_create_lab_panel con imagen de referencia OCR (Sesión 10)
-- Afecta schema: public (función), no toca hema
-- Reversión:
--   DROP FUNCTION public.hema_create_lab_panel(uuid,uuid,text,timestamptz,uuid,text);
--   -- recrear la versión de 5 args desde 20260618000002_hema_labs_fns.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- hema_create_lab_panel — agrega p_ocr_image_path (Storage hema-lab-images).
--
-- Sin Document AI conectado todavía, el médico sigue capturando los valores
-- a mano (ver app/hema/labs/nuevo/OcrDropzone.tsx) — esta columna solo
-- archiva la imagen subida como referencia/evidencia, y deja el campo
-- ocr_image_path poblado para cuando se conecte el OCR real (Sesión futura).
-- ocr_raw_json y ocr_confidence quedan NULL: no hay extracción automática.
--
-- p_source lo decide el caller (TS): 'ocr' si se adjuntó imagen, 'manual'
-- si no. La función no infiere nada — solo persiste lo que recibe.
--
-- DROP explícito porque Postgres identifica funciones por tipos de
-- parámetro: agregar un 6° argumento NO reemplaza la firma de 5 args,
-- crea un overload paralelo. Se elimina la vieja para no dejar dos
-- versiones coexistiendo.
-- ─────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.hema_create_lab_panel(uuid, uuid, text, timestamptz, uuid);

CREATE FUNCTION public.hema_create_lab_panel(
  p_patient_id      uuid,
  p_tenant_id       uuid,
  p_source          text DEFAULT 'manual',
  p_collected_at    timestamptz DEFAULT now(),
  p_reviewed_by     uuid DEFAULT NULL,
  p_ocr_image_path  text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql SECURITY INVOKER
AS $$
  INSERT INTO hema.lab_panels (
    patient_id, tenant_id, source, collected_at, reviewed_by, reviewed_at, ocr_image_path
  )
  VALUES (
    p_patient_id, p_tenant_id, p_source, p_collected_at,
    p_reviewed_by, CASE WHEN p_reviewed_by IS NOT NULL THEN now() END,
    p_ocr_image_path
  )
  RETURNING id;
$$;

GRANT EXECUTE ON FUNCTION public.hema_create_lab_panel(uuid, uuid, text, timestamptz, uuid, text) TO authenticated;
