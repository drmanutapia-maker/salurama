-- La galería de fotos deja de ser exclusiva de plan Plus -- el directorio es
-- 100% gratis para siempre (pivote de modelo de negocio ya decidido, mismo
-- criterio que 20260804000002_revertir_chat_sala_gate_plan_gratis.sql aplicó
-- al chat). Reemplaza únicamente las 2 políticas de INSERT creadas en
-- 20260726000001_doctor_gallery_photos.sql (tabla + storage) que exigían
-- pricing_tier IN ('799','1999') -- esa migración original NO se toca, esta
-- solo reemplaza esas 2 políticas puntuales, dejando la condición final
-- equivalente a la que ya usa el bucket doctor-photos (solo dueño, sin
-- chequeo de plan).
--
-- Reversión: volver a agregar "AND d.pricing_tier IN ('799','1999')" /
-- "AND pricing_tier IN ('799','1999')" a cada WITH CHECK respectivamente
-- (texto exacto en 20260726000001_doctor_gallery_photos.sql).

-- 1. Política de la TABLA doctor_gallery_photos
DROP POLICY IF EXISTS "doctor_gallery_photos_owner_insert" ON public.doctor_gallery_photos;
CREATE POLICY "doctor_gallery_photos_owner_insert" ON public.doctor_gallery_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = doctor_id AND d.user_id = auth.uid()
    )
  );

-- 2. Política de STORAGE (bucket doctor-gallery)
DROP POLICY IF EXISTS "doctor_gallery_storage_owner_insert" ON storage.objects;
CREATE POLICY "doctor_gallery_storage_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'doctor-gallery'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.doctors WHERE user_id = auth.uid()
    )
  );
