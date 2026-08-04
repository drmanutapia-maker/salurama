-- Chat médico-paciente: bucket de Storage para chat_archivos (Parte 1 de la
-- infraestructura de adjuntar archivos). Afecta schema storage (bucket +
-- policies), no toca chat_salas/chat_mensajes/chat_archivos.
-- Reversión:
--   DELETE FROM storage.objects WHERE bucket_id = 'chat-archivos';
--   DELETE FROM storage.buckets WHERE id = 'chat-archivos';
--   DROP POLICY IF EXISTS "chat_archivos_storage_medico_select" ON storage.objects;
--   DROP POLICY IF EXISTS "chat_archivos_storage_medico_insert" ON storage.objects;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Bucket — privado, sin acceso público directo. Mismos límites que
--    app/api/chat/paciente/archivo/route.ts ya usa como "provisionales"
--    (tomados de hema-lab-images) — quedan definitivos aquí.
--    Path: chat-archivos/{sala_id}/{archivo_id}-{nombre_original}
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-archivos', 'chat-archivos', false,
  15728640, -- 15 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. RLS en storage.objects — solo para el médico, scoped por sala_id vía el
--    primer segmento del path. Mismo criterio que chat_archivos_medico_select
--    / chat_archivos_medico_insert en 20260724000001. El paciente nunca tiene
--    auth.uid() (identidad por token, no por sesión de Supabase Auth) — su
--    acceso pasa siempre por endpoints con service_role, nunca por RLS.
--    Sin UPDATE ni DELETE: igual que chat_archivos a nivel tabla, los archivos
--    del chat nunca se editan ni se borran (retención NOM-004).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "chat_archivos_storage_medico_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'chat-archivos'
    AND EXISTS (
      SELECT 1 FROM chat_salas cs
      JOIN doctors d ON d.id = cs.medico_id
      WHERE cs.id::text = (storage.foldername(name))[1]
        AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_archivos_storage_medico_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-archivos'
    AND EXISTS (
      SELECT 1 FROM chat_salas cs
      JOIN doctors d ON d.id = cs.medico_id
      WHERE cs.id::text = (storage.foldername(name))[1]
        AND d.user_id = auth.uid()
    )
  );
