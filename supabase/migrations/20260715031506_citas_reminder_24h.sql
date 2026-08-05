-- Recordatorio de cita 24h antes — Punto 2a
-- Afecta: citas (nueva columna reminder_sent_at)
-- El cron job (pg_cron) se configura MANUALMENTE en SQL Editor — ver instrucciones al final,
-- mismo patrón que 20260701000001_hema_audit_anchor_v2.sql (service_role key no puede
-- vivir en un literal SQL versionado en git).
-- Reversión:
--   ALTER TABLE citas DROP COLUMN reminder_sent_at;

ALTER TABLE citas ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

COMMENT ON COLUMN citas.reminder_sent_at IS
  'Timestamp del envío del recordatorio por correo 24h antes de la cita. '
  'NULL = recordatorio pendiente o no aplica (cita no confirmada). '
  'Evita reenvíos duplicados si el cron corre más de una vez dentro de la ventana.';

-- ── pg_cron: configurar MANUALMENTE en SQL Editor ────────────────────────────
-- NO se incluye aquí porque requiere el service_role key como literal
-- (no hay soporte de env vars en pg_cron SQL strings) → no debe quedar en git.
--
-- Ejecuta esto por separado en el SQL Editor de Supabase,
-- sustituyendo <SERVICE_ROLE_KEY> con el valor real de:
-- Dashboard → Settings → API → "service_role (secret)"
--
--   SELECT cron.schedule(
--     'citas-reminder-24h-hourly',
--     '0 * * * *',
--     $$
--       SELECT net.http_post(
--         url     := 'https://pwcdwxhfypaxvtqydzcg.supabase.co/functions/v1/citas-reminder',
--         headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--         body    := '{}'::jsonb
--       ) AS request_id
--     $$
--   );
--
-- Verificar que quedó agendado:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'citas-reminder-24h-hourly';
--
-- Requisito adicional: la Edge Function usa RESEND_API_KEY — configúralo en
-- Dashboard → Edge Functions → citas-reminder → Secrets si no está ya como secreto global.
