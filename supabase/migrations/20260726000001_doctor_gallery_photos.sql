-- Galería de fotos del consultorio/equipo médico — exclusiva de plan Plus
-- (proxy actual: pricing_tier '799'/'1999', ver lib/pricingTiers.ts).
-- El médico sube directo a Storage desde el cliente (RLS hace el trabajo
-- de seguridad, mismo patrón que doctor-photos/handleFoto), sin endpoint
-- de servidor. Máximo 10 fotos por médico (trigger).
--
-- Reversión:
--   DROP TRIGGER doctor_gallery_photos_limit_trigger ON public.doctor_gallery_photos;
--   DROP FUNCTION public.enforce_gallery_photo_limit();
--   DROP TABLE public.doctor_gallery_photos;
--   DELETE FROM storage.objects WHERE bucket_id = 'doctor-gallery';
--   DELETE FROM storage.buckets WHERE id = 'doctor-gallery';
--   DROP POLICY ... ON storage.objects; (las 4 creadas abajo)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabla
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.doctor_gallery_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  photo_url    text NOT NULL,
  caption      text,           -- opcional, editable por el médico; base para SEO futuro
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX doctor_gallery_photos_doctor_id_idx ON public.doctor_gallery_photos(doctor_id, position);

CREATE OR REPLACE FUNCTION public.enforce_gallery_photo_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.doctor_gallery_photos WHERE doctor_id = NEW.doctor_id) >= 10 THEN
    RAISE EXCEPTION 'Límite de 10 fotos en la galería alcanzado';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER doctor_gallery_photos_limit_trigger
  BEFORE INSERT ON public.doctor_gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_gallery_photo_limit();

ALTER TABLE public.doctor_gallery_photos ENABLE ROW LEVEL SECURITY;

-- SELECT: pública si el médico está activo, o el dueño, o admin.
DROP POLICY IF EXISTS "doctor_gallery_photos_select" ON public.doctor_gallery_photos;
CREATE POLICY "doctor_gallery_photos_select" ON public.doctor_gallery_photos
  FOR SELECT USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.doctors d WHERE d.id = doctor_id AND d.is_active = true)
  );

-- INSERT: solo el dueño, y solo si su plan es Plus (defensa en profundidad;
-- la UI ya oculta el uploader a médicos que no son Plus).
DROP POLICY IF EXISTS "doctor_gallery_photos_owner_insert" ON public.doctor_gallery_photos;
CREATE POLICY "doctor_gallery_photos_owner_insert" ON public.doctor_gallery_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id AND d.user_id = auth.uid()
        AND d.pricing_tier IN ('799', '1999')
    )
  );

-- UPDATE/DELETE: el dueño, sin gate de plan (si baja de plan puede seguir
-- gestionando lo que ya subió, solo no puede agregar más).
DROP POLICY IF EXISTS "doctor_gallery_photos_owner_update" ON public.doctor_gallery_photos;
CREATE POLICY "doctor_gallery_photos_owner_update" ON public.doctor_gallery_photos
  FOR UPDATE USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()))
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "doctor_gallery_photos_owner_delete" ON public.doctor_gallery_photos;
CREATE POLICY "doctor_gallery_photos_owner_delete" ON public.doctor_gallery_photos
  FOR DELETE USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "doctor_gallery_photos_admin_all" ON public.doctor_gallery_photos;
CREATE POLICY "doctor_gallery_photos_admin_all" ON public.doctor_gallery_photos
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Bucket — público (mismo criterio que doctor-photos)
--    Path: doctor-gallery/{doctor_id}/{slug}-{uuid}.{ext}
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'doctor-gallery', 'doctor-gallery', true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "doctor_gallery_storage_select" ON storage.objects;
CREATE POLICY "doctor_gallery_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'doctor-gallery');

DROP POLICY IF EXISTS "doctor_gallery_storage_owner_insert" ON storage.objects;
CREATE POLICY "doctor_gallery_storage_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'doctor-gallery'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.doctors WHERE user_id = auth.uid() AND pricing_tier IN ('799', '1999')
    )
  );

DROP POLICY IF EXISTS "doctor_gallery_storage_owner_delete" ON storage.objects;
CREATE POLICY "doctor_gallery_storage_owner_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'doctor-gallery'
    AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.doctors WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "doctor_gallery_storage_admin_all" ON storage.objects;
CREATE POLICY "doctor_gallery_storage_admin_all" ON storage.objects
  FOR ALL USING (
    bucket_id = 'doctor-gallery' AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  ) WITH CHECK (
    bucket_id = 'doctor-gallery' AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );
