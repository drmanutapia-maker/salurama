-- Chat médico-paciente: cifrado de archivos a nivel de aplicación (Parte 2).
-- El bucket ya no puede validar el tipo real del archivo — llega como
-- application/octet-stream (bytes cifrados AES-256-GCM, ver lib/chat/crypto.ts).
-- La validación real de MIME/tamaño ya ocurre antes de cifrar, en
-- app/api/chat/paciente/archivo/route.ts, contra el archivo original.
-- Idempotente (UPDATE ... WHERE), se puede correr más de una vez sin error.
--
-- Reversión:
--   UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'] WHERE id = 'chat-archivos';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream']
WHERE id = 'chat-archivos';
