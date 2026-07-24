-- Reconstruido retroactivamente (2026-07-24) para sincronizar git con la bitácora
-- remota de Supabase — este cambio ya estaba aplicado en producción desde 2026-07-08,
-- solo faltaba el archivo local. Ver diagnóstico de desincronización de migraciones.
-- Contenido extraído tal cual de supabase_migrations.schema_migrations.statements.
-- Nota: esta versión de la función tenía un problema de zona horaria,
-- corregido después en 20260710055200_msl_count_user_messages_today_fn_tz_fix.sql.

CREATE OR REPLACE FUNCTION public.count_msl_user_messages_today(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $function$
  SELECT count(*)
  FROM msl_messages m
  JOIN msl_conversations c ON c.id = m.conversation_id
  WHERE c.user_id = p_user_id
    AND m.role = 'user'
    AND m.created_at >= date_trunc('day', now());
$function$;
