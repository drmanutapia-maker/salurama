-- Rediseño del sistema de credenciales por especialidad (aprobado por Manuel).
-- Reemplaza el modelo de un solo credentials_status por médico con un modelo
-- de una fila por cada especialidad certificable (principal y adicionales
-- tratadas igual). CONACEM (47 consejos oficiales) es la única fuente de
-- verdad para qué consejo certifica cada especialidad — no specialty_councils
-- (huérfana, con 5 entradas sin respaldo oficial) ni el diccionario
-- hardcodeado del registro.

CREATE TABLE IF NOT EXISTS public.conacem_councils (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_name text NOT NULL UNIQUE,
  council_name  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.specialty_granular_mapping (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  granular_name      text NOT NULL UNIQUE,
  conacem_council_id uuid REFERENCES public.conacem_councils(id),
  exclusion_reason   text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exclusion_reason_requires_null_council
    CHECK (conacem_council_id IS NOT NULL OR exclusion_reason IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.doctor_specialty_credentials (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id                uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  specialty_mapping_id     uuid NOT NULL REFERENCES public.specialty_granular_mapping(id),
  is_primary               boolean NOT NULL DEFAULT false,
  credentials_status       text NOT NULL DEFAULT 'pendiente'
    CHECK (credentials_status IN ('pendiente', 'verificado', 'no_coincide')),
  credentials_verified_at  timestamptz,
  numero_certificacion     text,
  vigencia_hasta           date,
  self_declared_not_current boolean NOT NULL DEFAULT false,
  source_constancia_id     uuid REFERENCES public.doctor_constancia_audit_log(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, specialty_mapping_id)
);

CREATE INDEX doctor_specialty_credentials_doctor_id_idx ON public.doctor_specialty_credentials(doctor_id);

ALTER TABLE public.conacem_councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialty_granular_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specialty_credentials ENABLE ROW LEVEL SECURITY;

-- Catálogos: lectura pública (no son datos sensibles, son el mapeo de
-- especialidad -> consejo, necesarios para el registro y editar-perfil).
DROP POLICY IF EXISTS "conacem_councils_public_read" ON public.conacem_councils;
CREATE POLICY "conacem_councils_public_read" ON public.conacem_councils
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "specialty_granular_mapping_public_read" ON public.specialty_granular_mapping;
CREATE POLICY "specialty_granular_mapping_public_read" ON public.specialty_granular_mapping
  FOR SELECT USING (true);

-- doctor_specialty_credentials: el médico ve y crea sus propias filas (mismo
-- patrón por email que doctor_specialties); solo el admin aprueba/edita
-- estado, vigencia y certificación. Lectura pública solo si el médico dueño
-- está activo (mismo criterio que la política pública de doctors) — así el
-- perfil público puede filtrar por credentials_status sin necesitar sesión.
DROP POLICY IF EXISTS "doctor_specialty_credentials_public_read" ON public.doctor_specialty_credentials;
CREATE POLICY "doctor_specialty_credentials_public_read" ON public.doctor_specialty_credentials
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.doctors WHERE doctors.id = doctor_specialty_credentials.doctor_id AND doctors.is_active = true)
  );
DROP POLICY IF EXISTS "doctor_specialty_credentials_own_insert" ON public.doctor_specialty_credentials;
CREATE POLICY "doctor_specialty_credentials_own_insert" ON public.doctor_specialty_credentials
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.doctors WHERE doctors.id = doctor_specialty_credentials.doctor_id AND doctors.email = auth.email())
  );
DROP POLICY IF EXISTS "doctor_specialty_credentials_admin_all" ON public.doctor_specialty_credentials;
CREATE POLICY "doctor_specialty_credentials_admin_all" ON public.doctor_specialty_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid())
  );

-- ── Datos: 47 consejos oficiales CONACEM ────────────────────────────────────
INSERT INTO public.conacem_councils (specialty_name, council_name) VALUES
  ('Anestesiología', 'Consejo Nacional de Certificación en Anestesiología'),
  ('Angiología, Cirugía Vascular y Endovascular', 'Consejo Mexicano de Angiología, Cirugía Vascular y Endovascular'),
  ('Anatomopatología', 'Consejo Mexicano de Médicos Anatomopatólogos'),
  ('Comunicación, Audiología, Otoneurología y Foniatría', 'Consejo Mexicano de Comunicación, Audiología, Otoneurología y Foniatría'),
  ('Cardiología', 'Consejo Mexicano de Cardiología'),
  ('Cirugía General', 'Consejo Mexicano de Cirugía General'),
  ('Cirugía Oral y Maxilofacial', 'Consejo Mexicano de Cirugía Oral y Maxilofacial'),
  ('Cirugía Neurológica', 'Consejo Mexicano de Cirugía Neurológica'),
  ('Cirugía Pediátrica', 'Consejo Mexicano de Cirugía Pediátrica'),
  ('Cirugía Plástica, Estética y Reconstructiva', 'Consejo Mexicano de Cirugía Plástica, Estética y Reconstructiva'),
  ('Cirugía del Tórax', 'Consejo Nacional de Cirugía del Tórax'),
  ('Dermatología', 'Consejo Mexicano de Dermatología'),
  ('Endocrinología', 'Consejo Mexicano de Endocrinología'),
  ('Coloproctología', 'Consejo Mexicano de Especialistas en Coloproctología'),
  ('Gastroenterología', 'Consejo Mexicano de Gastroenterología'),
  ('Genética', 'Consejo Mexicano de Genética'),
  ('Geriatría', 'Consejo Mexicano de Geriatría'),
  ('Ginecología y Obstetricia', 'Consejo Mexicano de Ginecología y Obstetricia'),
  ('Hematología', 'Consejo Mexicano de Hematología'),
  ('Infectología', 'Consejo Mexicano de Certificación en Infectología'),
  ('Inmunología Clínica y Alergia', 'Consejo Nacional de Inmunología Clínica y Alergia'),
  ('Medicina Aeroespacial', 'Consejo Mexicano de Medicina Aeroespacial'),
  ('Medicina Crítica', 'Consejo Mexicano de Medicina Crítica'),
  ('Medicina del Deporte', 'Consejo Nacional de Medicina del Deporte'),
  ('Medicina Familiar', 'Consejo Mexicano de Certificación en Medicina Familiar'),
  ('Medicina Interna', 'Consejo Mexicano de Medicina Interna'),
  ('Medicina Legal y Forense', 'Consejo Mexicano de Medicina Legal y Forense'),
  ('Medicina de Rehabilitación', 'Consejo Mexicano de Medicina de Rehabilitación'),
  ('Medicina del Trabajo', 'Consejo Nacional Mexicano de Medicina del Trabajo'),
  ('Medicina de Urgencias', 'Consejo Mexicano de Medicina de Urgencias'),
  ('Medicina Nuclear e Imagen Molecular', 'Consejo Mexicano de Medicina Nuclear e Imagen Molecular'),
  ('Nefrología', 'Consejo Mexicano de Nefrología'),
  ('Neumología', 'Consejo Nacional de Neumología'),
  ('Neurofisiología Clínica', 'Consejo Mexicano de Neurofisiología Clínica'),
  ('Neurología', 'Consejo Mexicano de Neurología'),
  ('Oftalmología', 'Consejo Mexicano de Oftalmología'),
  ('Oncología', 'Consejo Mexicano de Oncología'),
  ('Ortopedia y Traumatología', 'Consejo Mexicano de Ortopedia y Traumatología'),
  ('Otorrinolaringología y Cirugía de Cabeza y Cuello', 'Consejo Mexicano de Otorrinolaringología y Cirugía de Cabeza y Cuello'),
  ('Patología Clínica y Medicina de Laboratorio', 'Consejo Mexicano de Patología Clínica y Medicina de Laboratorio'),
  ('Pediatría', 'Consejo Mexicano de Certificación en Pediatría'),
  ('Psiquiatría', 'Consejo Mexicano de Psiquiatría'),
  ('Radiología e Imagen', 'Consejo Mexicano de Radiología e Imagen'),
  ('Radioterapia', 'Consejo Mexicano de Certificación en Radioterapia'),
  ('Reumatología', 'Consejo Mexicano de Reumatología'),
  ('Salud Pública', 'Consejo Nacional de Salud Pública'),
  ('Urología', 'Consejo Nacional Mexicano de Urología')
ON CONFLICT (specialty_name) DO NOTHING;

-- ── Datos: mapeo de 112 especialidades granulares -> consejo CONACEM ────────
-- (111 = 108 actuales del registro + 3 nuevas; +1 "Medicina General", que no
-- está en el selector del registro pero puede llegar vía especialidad
-- adicional en editar-perfil)
INSERT INTO public.specialty_granular_mapping (granular_name, conacem_council_id, exclusion_reason)
SELECT v.granular_name, cc.id, v.exclusion_reason
FROM (VALUES
  ('Alergología e Inmunología Clínica', 'Inmunología Clínica y Alergia', NULL),
  ('Algología', 'Anestesiología', NULL),
  ('Anatomía Patológica', 'Anatomopatología', NULL),
  ('Anestesiología', 'Anestesiología', NULL),
  ('Anestesiología Pediátrica', 'Anestesiología', NULL),
  ('Angiología, Cirugía Vascular y Endovascular', 'Angiología, Cirugía Vascular y Endovascular', NULL),
  ('Audiología', 'Comunicación, Audiología, Otoneurología y Foniatría', NULL),
  ('Cardiología', 'Cardiología', NULL),
  ('Cardiología Intervencionista', 'Cardiología', NULL),
  ('Cardiología Pediátrica', 'Cardiología', NULL),
  ('Cirugía Bariátrica', 'Cirugía General', NULL),
  ('Cirugía Cardiaca', 'Cirugía del Tórax', NULL),
  ('Cirugía Cardiaca Pediátrica', 'Cirugía del Tórax', NULL),
  ('Cirugía Cardiotorácica', 'Cirugía del Tórax', NULL),
  ('Cirugía de Cabeza y Cuello', 'Otorrinolaringología y Cirugía de Cabeza y Cuello', NULL),
  ('Cirugía de Columna', 'Ortopedia y Traumatología', NULL),
  ('Cirugía de Tórax', 'Cirugía del Tórax', NULL),
  ('Cirugía Endovascular Neurológica', 'Cirugía Neurológica', NULL),
  ('Cirugía General', 'Cirugía General', NULL),
  ('Cirugía Maxilofacial', 'Cirugía Oral y Maxilofacial', NULL),
  ('Cirugía Neurológica', 'Cirugía Neurológica', NULL),
  ('Cirugía Oncológica', 'Oncología', NULL),
  ('Cirugía Oral y Maxilofacial', 'Cirugía Oral y Maxilofacial', NULL),
  ('Cirugía Pediátrica', 'Cirugía Pediátrica', NULL),
  ('Cirugía Plástica, Estética y Reconstructiva', 'Cirugía Plástica, Estética y Reconstructiva', NULL),
  ('Cirugía Torácica Pediátrica', 'Cirugía del Tórax', NULL),
  ('Coloproctología', 'Coloproctología', NULL),
  ('Cuidados Intensivos', 'Medicina Crítica', NULL),
  ('Cuidados Paliativos', NULL, 'Sin consejo certificador reconocido por CONACEM'),
  ('Dermatología', 'Dermatología', NULL),
  ('Dermatología Pediátrica', 'Dermatología', NULL),
  ('Dermatopatología', 'Dermatología', NULL),
  ('Ecocardiografía', 'Cardiología', NULL),
  ('Electrofisiología Cardiaca', 'Cardiología', NULL),
  ('Endocrinología', 'Endocrinología', NULL),
  ('Endocrinología Pediátrica', 'Endocrinología', NULL),
  ('Endodoncia', NULL, 'Especialidad dental — fuera del alcance de CONACEM'),
  ('Endoscopia Gastrointestinal', 'Gastroenterología', NULL),
  ('Endoscopia del Aparato Digestivo', 'Gastroenterología', NULL),
  ('Epidemiología', NULL, 'Sin consejo certificador reconocido por CONACEM'),
  ('Foniatría', 'Comunicación, Audiología, Otoneurología y Foniatría', NULL),
  ('Gastroenterología', 'Gastroenterología', NULL),
  ('Gastroenterología Pediátrica', 'Gastroenterología', NULL),
  ('Genética Médica', 'Genética', NULL),
  ('Genética Molecular', 'Genética', NULL),
  ('Geriatría', 'Geriatría', NULL),
  ('Gerontología', 'Geriatría', NULL),
  ('Ginecología Oncológica', 'Oncología', NULL),
  ('Ginecología y Obstetricia', 'Ginecología y Obstetricia', NULL),
  ('Hematología', 'Hematología', NULL),
  ('Hematología Pediátrica', 'Hematología', NULL),
  ('Imagenología Diagnóstica y Terapéutica', 'Radiología e Imagen', NULL),
  ('Infectología', 'Infectología', NULL),
  ('Infectología Pediátrica', 'Infectología', NULL),
  ('Inmunología Clínica', 'Inmunología Clínica y Alergia', NULL),
  ('Medicina Aeroespacial', 'Medicina Aeroespacial', NULL),
  ('Medicina Crítica', 'Medicina Crítica', NULL),
  ('Medicina del Deporte', 'Medicina del Deporte', NULL),
  ('Medicina del Enfermo Pediátrico en Estado Crítico', 'Medicina Crítica', NULL),
  ('Medicina Familiar', 'Medicina Familiar', NULL),
  ('Medicina Física y Rehabilitación', 'Medicina de Rehabilitación', NULL),
  ('Medicina Intensiva', 'Medicina Crítica', NULL),
  ('Medicina Interna', 'Medicina Interna', NULL),
  ('Medicina Legal y Forense', 'Medicina Legal y Forense', NULL),
  ('Medicina Materno Fetal', 'Ginecología y Obstetricia', NULL),
  ('Medicina Nuclear', 'Medicina Nuclear e Imagen Molecular', NULL),
  ('Medicina Nuclear e Imagen Molecular', 'Medicina Nuclear e Imagen Molecular', NULL),
  ('Nefrología', 'Nefrología', NULL),
  ('Nefrología Pediátrica', 'Nefrología', NULL),
  ('Neonatología', 'Pediatría', NULL),
  ('Neumología', 'Neumología', NULL),
  ('Neumología Pediátrica', 'Neumología', NULL),
  ('Neuroanestesiología', 'Anestesiología', NULL),
  ('Neurocirugía Pediátrica', 'Cirugía Neurológica', NULL),
  ('Neurofisiología Clínica', 'Neurofisiología Clínica', NULL),
  ('Neurología', 'Neurología', NULL),
  ('Neurología Pediátrica', 'Neurología', NULL),
  ('Neuropatología', 'Anatomopatología', NULL),
  ('Nutrición Clínica', NULL, 'Sin consejo certificador reconocido por CONACEM'),
  ('Nutriología Clínica', NULL, 'Sin consejo certificador reconocido por CONACEM'),
  ('Obstetricia Crítica', 'Ginecología y Obstetricia', NULL),
  ('Odontología Pediátrica', NULL, 'Especialidad dental — fuera del alcance de CONACEM'),
  ('Oftalmología', 'Oftalmología', NULL),
  ('Oncología Médica', 'Oncología', NULL),
  ('Oncología Pediátrica', 'Oncología', NULL),
  ('Ortodoncia', NULL, 'Especialidad dental — fuera del alcance de CONACEM'),
  ('Ortopedia', 'Ortopedia y Traumatología', NULL),
  ('Ortopedia Pediátrica', 'Ortopedia y Traumatología', NULL),
  ('Otoneurología', 'Comunicación, Audiología, Otoneurología y Foniatría', NULL),
  ('Otorrinolaringología', 'Otorrinolaringología y Cirugía de Cabeza y Cuello', NULL),
  ('Patología Clínica', 'Patología Clínica y Medicina de Laboratorio', NULL),
  ('Patología Pediátrica', 'Anatomopatología', NULL),
  ('Pediatría', 'Pediatría', NULL),
  ('Periodoncia', NULL, 'Especialidad dental — fuera del alcance de CONACEM'),
  ('Psiquiatría', 'Psiquiatría', NULL),
  ('Psiquiatría Infantil y de la Adolescencia', 'Psiquiatría', NULL),
  ('Radiología e Imagen', 'Radiología e Imagen', NULL),
  ('Radiología Intervencionista', 'Radiología e Imagen', NULL),
  ('Radiooncología', 'Radioterapia', NULL),
  ('Rehabilitación Cardiaca', 'Medicina de Rehabilitación', NULL),
  ('Rehabilitación Neurológica', 'Medicina de Rehabilitación', NULL),
  ('Reumatología', 'Reumatología', NULL),
  ('Reumatología Pediátrica', 'Reumatología', NULL),
  ('Terapia Endovascular Neurológica', 'Cirugía Neurológica', NULL),
  ('Terapia Intensiva Pediátrica', 'Medicina Crítica', NULL),
  ('Traumatología y Ortopedia', 'Ortopedia y Traumatología', NULL),
  ('Urología', 'Urología', NULL),
  ('Urología Pediátrica', 'Urología', NULL),
  ('Medicina del Trabajo', 'Medicina del Trabajo', NULL),
  ('Medicina de Urgencias', 'Medicina de Urgencias', NULL),
  ('Salud Pública', 'Salud Pública', NULL),
  ('Medicina General', NULL, 'Sin consejo certificador reconocido por CONACEM')
) AS v(granular_name, council_specialty_name, exclusion_reason)
LEFT JOIN public.conacem_councils cc ON cc.specialty_name = v.council_specialty_name
ON CONFLICT (granular_name) DO NOTHING;

-- ── Retira de doctors los campos de visibilidad a nivel-médico ─────────────
-- (su rol lo cumple ahora doctor_specialty_credentials, por especialidad)
ALTER TABLE public.doctors
  DROP COLUMN IF EXISTS credentials_status,
  DROP COLUMN IF EXISTS credentials_verified_at,
  DROP COLUMN IF EXISTS specialty_verification_status,
  DROP COLUMN IF EXISTS specialty_council;

-- ── Simplifica doctor_constancia_audit_log ──────────────────────────────────
-- estado y specialty_vigencia_hasta ya no aplican a nivel de documento (un
-- documento puede certificar varias especialidades) — se mueven a
-- doctor_specialty_credentials (credentials_status, vigencia_hasta), que
-- referencia de vuelta al documento vía source_constancia_id.
ALTER TABLE public.doctor_constancia_audit_log
  DROP COLUMN IF EXISTS estado,
  DROP COLUMN IF EXISTS specialty_vigencia_hasta;
