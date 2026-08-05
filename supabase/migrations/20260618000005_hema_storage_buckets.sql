-- HEMA: Buckets de Storage para PDFs de órdenes e imágenes de labs (Sesión 10)
-- Afecta schema: storage (buckets + policies), no toca hema ni public
-- Reversión:
--   DELETE FROM storage.objects WHERE bucket_id IN ('hema-order-pdfs','hema-lab-images');
--   DELETE FROM storage.buckets WHERE id IN ('hema-order-pdfs','hema-lab-images');
--   DROP POLICY ... ON storage.objects;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Buckets — privados, sin acceso público directo
--    Path: hema-order-pdfs/{tenant_id}/{order_id}.pdf
--    Path: hema-lab-images/{tenant_id}/{patient_id}/{uuid}.{ext}
--          (convención ya documentada en hema.lab_panels.ocr_image_path)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hema-order-pdfs', 'hema-order-pdfs', false,
  10485760, -- 10 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hema-lab-images', 'hema-lab-images', false,
  15728640, -- 15 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS en storage.objects — aislamiento por tenant vía primer segmento
--    del path. Mismo criterio que hema.current_tenant_id() usado en
--    20260611000013_hema_rls.sql. RLS ya viene habilitado por Supabase
--    en storage.objects; solo agregamos las políticas.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "hema_order_pdfs_select_own_tenant" ON storage.objects;
CREATE POLICY "hema_order_pdfs_select_own_tenant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hema-order-pdfs'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "hema_order_pdfs_insert_own_tenant" ON storage.objects;
CREATE POLICY "hema_order_pdfs_insert_own_tenant" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hema-order-pdfs'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "hema_order_pdfs_update_own_tenant" ON storage.objects;
CREATE POLICY "hema_order_pdfs_update_own_tenant" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'hema-order-pdfs'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  ) WITH CHECK (
    bucket_id = 'hema-order-pdfs'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "hema_lab_images_select_own_tenant" ON storage.objects;
CREATE POLICY "hema_lab_images_select_own_tenant" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hema-lab-images'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "hema_lab_images_insert_own_tenant" ON storage.objects;
CREATE POLICY "hema_lab_images_insert_own_tenant" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hema-lab-images'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );

DROP POLICY IF EXISTS "hema_lab_images_update_own_tenant" ON storage.objects;
CREATE POLICY "hema_lab_images_update_own_tenant" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'hema-lab-images'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  ) WITH CHECK (
    bucket_id = 'hema-lab-images'
    AND (storage.foldername(name))[1] = hema.current_tenant_id()::text
  );
