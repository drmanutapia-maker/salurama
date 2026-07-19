-- Módulo de Aviso de Publicidad COFEPRIS (opcional, no bloquea visibilidad
-- del perfil). has_aviso_funcionamiento es autodeclarado por el médico,
-- sin verificación automática — mismo principio "el médico declara, la
-- plataforma facilita" que ya rige review_status/verification_status.

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS cofepris_aviso_numero text,
  ADD COLUMN IF NOT EXISTS cofepris_acuse_url text,
  ADD COLUMN IF NOT EXISTS cofepris_aviso_fecha date,
  ADD COLUMN IF NOT EXISTS has_aviso_funcionamiento boolean;

-- El bucket doctor-documents ya existe (creado fuera de git, con RLS por
-- auth.uid() como primer segmento del path) pero sin límites — se venía
-- arrastrando desde antes de que este módulo tuviera un uso real para él.
-- Mismo patrón que hema-order-pdfs: solo PDF, 10 MB.
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'doctor-documents';
