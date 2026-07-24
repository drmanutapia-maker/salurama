-- Reconstruido retroactivamente (2026-07-24) para sincronizar git con la bitácora
-- remota de Supabase — este cambio ya estaba aplicado en producción desde 2026-07-10,
-- solo faltaba el archivo local. Ver diagnóstico de desincronización de migraciones.
-- Contenido extraído tal cual de supabase_migrations.schema_migrations.statements.
-- Corrige 20260708050607_msl_count_user_messages_today_fn.sql: el corte de "hoy" usaba
-- UTC en vez de hora de Ciudad de México.

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
    AND m.created_at >= date_trunc('day', now() AT TIME ZONE 'America/Mexico_City') AT TIME ZONE 'America/Mexico_City';
$function$;
