-- HEMA: Campos institucionales del tenant (Sesión 11 pre-ajustes)
-- Afecta schema: hema (tenants), storage (bucket logos)
-- Reversión:
--   ALTER TABLE hema.tenants DROP COLUMN tenant_type, DROP COLUMN tenant_code, DROP COLUMN logo_path;
--   DELETE FROM storage.objects WHERE bucket_id = 'hema-tenant-logos';
--   DELETE FROM storage.buckets WHERE id = 'hema-tenant-logos';
--   DROP POLICY "hema_tenant_logos_select_own_tenant" ON storage.objects;
--   DROP POLICY "hema_tenant_logos_insert_own_tenant" ON storage.objects;
--   DROP POLICY "hema_tenant_logos_update_own_tenant" ON storage.objects;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Nuevas columnas en hema.tenants
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE hema.tenants
  ADD COLUMN IF NOT EXISTS tenant_type TEXT NOT NULL DEFAULT 'independiente'
    CHECK (tenant_type IN ('independiente', 'clinica')),
  ADD COLUMN IF NOT EXISTS tenant_code TEXT UNIQUE,  -- nullable por ahora; lo llenamos manualmente, luego NOT NULL
  ADD COLUMN IF NOT EXISTS logo_path   TEXT;         -- ruta en bucket hema-tenant-logos

COMMENT ON COLUMN hema.tenants.tenant_type IS
  'independiente = consultorio/médico privado; clinica = hospital o grupo que comparte logo institucional.';

COMMENT ON COLUMN hema.tenants.tenant_code IS
  'Código corto del tenant (ej. TAPIA, LARAZA). Se usa como prefijo del número de expediente. '
  'Nullable en esta migración; poner NOT NULL una vez que todos los tenants activos tengan el valor.';

COMMENT ON COLUMN hema.tenants.logo_path IS
  'Path en bucket hema-tenant-logos, ej. {tenant_id}/logo.png. NULL = sin logo configurado.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Bucket privado hema-tenant-logos
--    Path: hema-tenant-logos/{tenant_id}/logo.{ext}
--    Límite 2 MB, solo PNG/JPG — mismo patrón que hema-order-pdfs/hema-lab-images
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hema-tenant-logos', 'hema-tenant-logos', false,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: mismo patrón que hema-order-pdfs — primer segmento del path = tenant_id

DROP POLICY IF EXISTS "hema_tenant_logos_select_own_tenant" ON storage.objects;
CREATE POLICY "hema_tenant_logos_select_own_tenant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hema-tenant-logos'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "hema_tenant_logos_insert_own_tenant" ON storage.objects;
CREATE POLICY "hema_tenant_logos_insert_own_tenant" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hema-tenant-logos'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "hema_tenant_logos_update_own_tenant" ON storage.objects;
CREATE POLICY "hema_tenant_logos_update_own_tenant" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'hema-tenant-logos'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  ) WITH CHECK (
    bucket_id = 'hema-tenant-logos'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );
