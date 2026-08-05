-- HEMA Sesión 12 – Punto 2: audit_anchors v2 + bucket hema-audit-anchors
-- Afecta: hema.audit_anchors (columnas + inmutabilidad), storage.buckets
-- El cron job (pg_cron) se configura MANUALMENTE en SQL Editor — ver instrucciones al final.
-- Reversión:
--   ALTER TABLE hema.audit_anchors RENAME COLUMN storage_path TO s3_path;
--   ALTER TABLE hema.audit_anchors DROP COLUMN ots_proof;
--   DROP RULE audit_anchors_no_update ON hema.audit_anchors;
--   DROP RULE audit_anchors_no_delete ON hema.audit_anchors;
--   DROP POLICY IF EXISTS "hema_audit_anchors_select" ON storage.objects;
--   DELETE FROM storage.objects WHERE bucket_id = 'hema-audit-anchors';
--   DELETE FROM storage.buckets WHERE id = 'hema-audit-anchors';

-- ── 1. Renombrar columna ──────────────────────────────────────────────────────
-- s3_path asumía AWS S3 object-lock (no disponible); ahora es Supabase Storage + OTS.

ALTER TABLE hema.audit_anchors RENAME COLUMN s3_path TO storage_path;

COMMENT ON COLUMN hema.audit_anchors.storage_path IS
  'Path relativo en bucket hema-audit-anchors: YYYY-MM-DD/snapshot.json';

-- ── 2. Columna OTS proof ──────────────────────────────────────────────────────

ALTER TABLE hema.audit_anchors ADD COLUMN IF NOT EXISTS ots_proof text;

COMMENT ON COLUMN hema.audit_anchors.ots_proof IS
  'OpenTimestamps incomplete proof en base64 '
  '(POST raw SHA-256 a https://a.pool.opentimestamps.org/digest). '
  'NULL si OTS no respondió — el anchor sigue siendo válido via Storage hash chain. '
  'El proof completo (confirmación Bitcoin ~1h) se almacena en YYYY-MM-DD/proof.ots. '
  'Verificable offline: ots verify YYYY-MM-DD/proof.ots';

-- ── 3. Inmutabilidad en audit_anchors ────────────────────────────────────────
-- Gap del diseño original: audit_log ya las tenía; audit_anchors no.
-- Las RULES aplican a TODOS los roles incluyendo service_role (a diferencia de RLS).

CREATE RULE audit_anchors_no_update
  AS ON UPDATE TO hema.audit_anchors DO INSTEAD NOTHING;

CREATE RULE audit_anchors_no_delete
  AS ON DELETE TO hema.audit_anchors DO INSTEAD NOTHING;

-- ── 4. Bucket hema-audit-anchors ─────────────────────────────────────────────
-- Privado: la Edge Function escribe con service_role (bypasea RLS).
-- admin/director_medico pueden leer via política SELECT abajo.
-- 1 MB por snapshot diario es suficiente para años de entradas.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hema-audit-anchors',
  'hema-audit-anchors',
  false,
  1048576,
  ARRAY['application/json', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- ── 5. Storage policy: lectura para admin y director_medico ──────────────────
-- hema.users.id = auth.uid() porque el PK de hema.users IS el auth.users.id.

DROP POLICY IF EXISTS "hema_audit_anchors_select" ON storage.objects;
CREATE POLICY "hema_audit_anchors_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hema-audit-anchors'
    AND EXISTS (
      SELECT 1 FROM hema.users
      WHERE hema.users.id = auth.uid()
        AND hema.users.role IN ('admin', 'director_medico')
    )
  );

-- ── 6. pg_cron: configurar MANUALMENTE en SQL Editor ─────────────────────────
-- NO se incluye aquí porque requiere el service_role key como literal
-- (no hay soporte de env vars en pg_cron SQL strings) → no debe quedar en git.
--
-- Ejecuta esto por separado en el SQL Editor de Supabase,
-- sustituyendo <SERVICE_ROLE_KEY> con el valor real de:
-- Dashboard → Settings → API → "service_role (secret)"
--
--   SELECT cron.schedule(
--     'hema-audit-anchor-daily',
--     '1 0 * * *',
--     $$
--       SELECT net.http_post(
--         url     := 'https://pwcdwxhfypaxvtqydzcg.supabase.co/functions/v1/hema-audit-anchor',
--         headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--         body    := '{}'::jsonb
--       ) AS request_id
--     $$
--   );
--
-- Verificar que quedó agendado:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'hema-audit-anchor-daily';
