-- Parte 1: columnas nuevas en doctor_licenses para vincular cédulas SEP
-- con la especialidad verificada (CONACEM) correspondiente.
ALTER TABLE doctor_licenses
  ADD COLUMN IF NOT EXISTS is_primary         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS specialty_text     text,
  ADD COLUMN IF NOT EXISTS specialty_credential_id
    uuid REFERENCES doctor_specialty_credentials(id) ON DELETE SET NULL;

-- Restricción única para soportar el UPSERT del flujo de aprobación de constancia.
-- Un médico no puede tener dos filas con el mismo número de cédula.
ALTER TABLE doctor_licenses
  ADD CONSTRAINT doctor_licenses_doctor_id_license_number_key
    UNIQUE (doctor_id, license_number);

-- Migra las cédulas ya capturadas en doctors.professional_license como
-- cédula de especialidad primaria, para no romper los perfiles existentes
-- mientras el admin reprocesa las constancias.
INSERT INTO doctor_licenses (doctor_id, license_number, license_type, is_primary, institution)
SELECT id, professional_license, 'especialidad', true, 'SEP'
FROM doctors
WHERE professional_license IS NOT NULL
ON CONFLICT (doctor_id, license_number) DO NOTHING;
