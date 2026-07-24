-- Reconstruido retroactivamente (2026-07-24) para sincronizar git con la bitácora
-- remota de Supabase — este cambio ya estaba aplicado en producción desde 2026-07-08,
-- solo faltaba el archivo local. Ver diagnóstico de desincronización de migraciones.
-- Contenido extraído tal cual de supabase_migrations.schema_migrations.statements.

CREATE OR REPLACE FUNCTION public.hema_get_msl_context(p_patient_id uuid)
RETURNS TABLE(diagnosis_code text, description_es text, staging text, cytogenetics jsonb)
LANGUAGE sql
STABLE
AS $function$
  SELECT
    pd.diagnosis_code,
    d.description_es,
    pd.staging,
    pd.cytogenetics
  FROM hema.patient_diagnoses pd
  JOIN hema.diagnoses d ON d.code = pd.diagnosis_code
  WHERE pd.patient_id = p_patient_id
    AND pd.is_primary = true
  LIMIT 1;
$function$;
