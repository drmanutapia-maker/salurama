-- HEMA: RPC para listado de paneles de laboratorio recientes (Sesión 9, /hema/labs)
-- Afecta schema: public (función), no toca hema
-- Reversión: DROP FUNCTION public.hema_list_recent_lab_panels(int);

CREATE OR REPLACE FUNCTION public.hema_list_recent_lab_panels(p_limit int DEFAULT 30)
RETURNS TABLE (
  id            uuid,
  patient_id    uuid,
  patient_name  text,
  collected_at  timestamptz,
  source        text,
  reviewed_by   uuid,
  value_count   int
)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    p.id,
    p.patient_id,
    convert_from(pt.full_name_encrypted, 'UTF8') AS patient_name,
    p.collected_at,
    p.source,
    p.reviewed_by,
    (SELECT count(*)::int FROM hema.lab_values v WHERE v.panel_id = p.id) AS value_count
  FROM hema.lab_panels p
  JOIN hema.patients pt ON pt.id = p.patient_id
  ORDER BY p.collected_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.hema_list_recent_lab_panels(int) TO authenticated;
