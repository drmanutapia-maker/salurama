-- Recordatorio de cita 2h antes — extiende el patrón de reminder_sent_at
-- (recordatorio 24h) con una columna independiente, porque son dos
-- recordatorios distintos que se envían en momentos distintos: reutilizar
-- la misma columna haría que el de 24h "gastara" el envío y el de 2h nunca
-- se disparara (o viceversa).
-- El cron job (pg_cron) se configura MANUALMENTE en SQL Editor — ver
-- instrucciones al final, mismo patrón que 20260715031506_citas_reminder_24h.sql.
-- Reversión:
--   ALTER TABLE citas DROP COLUMN reminder_2h_sent_at;

ALTER TABLE citas ADD COLUMN IF NOT EXISTS reminder_2h_sent_at timestamptz;

COMMENT ON COLUMN citas.reminder_2h_sent_at IS
  'Timestamp del envío del recordatorio por correo 2h antes de la cita. '
  'Independiente de reminder_sent_at (24h) — son dos envíos distintos. '
  'NULL = recordatorio pendiente o no aplica (cita no confirmada). '
  'Evita reenvíos duplicados si el cron corre más de una vez dentro de la ventana.';

-- ── pg_cron: configurar MANUALMENTE en SQL Editor ────────────────────────────
-- NO se incluye aquí porque requiere CRON_SECRET como literal (no hay
-- soporte de env vars en pg_cron SQL strings) → no debe quedar en git.
--
-- Ejecuta esto por separado en el SQL Editor de Supabase, sustituyendo
-- <CRON_SECRET> con el valor real del secreto de Edge Functions (Dashboard →
-- Edge Functions → Secrets → CRON_SECRET; es el mismo que ya usa
-- citas-reminder-24h-hourly, no hace falta uno nuevo):
--
--   SELECT cron.schedule(
--     'citas-reminder-2h-cada30min',
--     '*/30 * * * *',
--     $$
--       SELECT net.http_post(
--         url     := 'https://pwcdwxhfypaxvtqydzcg.supabase.co/functions/v1/citas-reminder-2h',
--         headers := '{"Content-Type":"application/json","X-Cron-Secret":"<CRON_SECRET>"}'::jsonb,
--         body    := '{}'::jsonb
--       ) AS request_id
--     $$
--   );
--
-- Corre cada 30 min (no cada hora, como el de 24h) porque la ventana de "2
-- horas antes" es mucho más sensible al desfase: con un cron horario, el
-- error podría ser de hasta 1h sobre un total de 2h (50%), mientras que en
-- el de 24h el mismo desfase es solo ~4%. La función usa una ventana de
-- 1h45m-2h15m (±15min, la mitad del intervalo del cron) para no duplicar
-- ni saltarse citas con esta granularidad.
--
-- Verificar que quedó agendado:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'citas-reminder-2h-cada30min';
--
-- No requiere configurar RESEND_API_KEY de nuevo — ya es un secreto de
-- Edge Functions a nivel de proyecto, compartido con citas-reminder-24h.
