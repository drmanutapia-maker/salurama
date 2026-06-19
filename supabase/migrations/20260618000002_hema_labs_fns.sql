-- HEMA: RPCs para módulo de Labs (Sesión 9)
-- Afecta schema: public (funciones), no toca hema
-- Reversión: DROP FUNCTION public.hema_create_lab_panel(uuid,uuid,text,timestamptz,uuid);
--            DROP FUNCTION public.hema_add_lab_value(uuid,text,numeric,text,numeric,numeric);
--            DROP FUNCTION public.hema_get_lab_panels(uuid,int);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. hema_create_lab_panel
--    p_reviewed_by: para captura manual se pasa el médico que la captura
--    (auto-revisado, regla de negocio en COMMENT de lab_panels.reviewed_by).
--    Para OCR (Sesión 10) se dejará NULL hasta revisión explícita.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_create_lab_panel(
  p_patient_id   uuid,
  p_tenant_id    uuid,
  p_source       text DEFAULT 'manual',
  p_collected_at timestamptz DEFAULT now(),
  p_reviewed_by  uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql SECURITY INVOKER
AS $$
  INSERT INTO hema.lab_panels (
    patient_id, tenant_id, source, collected_at, reviewed_by, reviewed_at
  )
  VALUES (
    p_patient_id, p_tenant_id, p_source, p_collected_at,
    p_reviewed_by, CASE WHEN p_reviewed_by IS NOT NULL THEN now() END
  )
  RETURNING id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. hema_add_lab_value
--    Nota: la tabla hema.lab_values usa reference_low/reference_high
--    (2 columnas numéricas), no un solo "reference_range" — se adapta
--    la firma del plan original a la columna real. flag se calcula aquí.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_add_lab_value(
  p_panel_id        uuid,
  p_analyte         text,
  p_value           numeric,
  p_unit            text DEFAULT NULL,
  p_reference_low   numeric DEFAULT NULL,
  p_reference_high  numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql SECURITY INVOKER
AS $$
  INSERT INTO hema.lab_values (
    panel_id, analyte, value, unit, reference_low, reference_high, flag, manually_edited
  )
  VALUES (
    p_panel_id, p_analyte, p_value, p_unit, p_reference_low, p_reference_high,
    CASE
      WHEN p_reference_low  IS NOT NULL AND p_value < p_reference_low  THEN 'L'
      WHEN p_reference_high IS NOT NULL AND p_value > p_reference_high THEN 'H'
      ELSE NULL
    END,
    true
  )
  RETURNING id;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. hema_get_lab_panels — últimos N paneles con valores anidados (jsonb)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hema_get_lab_panels(
  p_patient_id uuid,
  p_limit      int DEFAULT 10
)
RETURNS TABLE (
  id            uuid,
  collected_at  timestamptz,
  source        text,
  reviewed_by   uuid,
  reviewed_at   timestamptz,
  lab_values    jsonb
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    p.id,
    p.collected_at,
    p.source,
    p.reviewed_by,
    p.reviewed_at,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'analyte', v.analyte,
               'value', v.value,
               'unit', v.unit,
               'reference_low', v.reference_low,
               'reference_high', v.reference_high,
               'flag', v.flag
             ))
      FROM hema.lab_values v
      WHERE v.panel_id = p.id
    ), '[]'::jsonb) AS lab_values
  FROM hema.lab_panels p
  WHERE p.patient_id = p_patient_id
  ORDER BY p.collected_at DESC
  LIMIT p_limit;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos
-- ─────────────────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.hema_create_lab_panel(uuid, uuid, text, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hema_add_lab_value(uuid, text, numeric, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hema_get_lab_panels(uuid, int) TO authenticated;
