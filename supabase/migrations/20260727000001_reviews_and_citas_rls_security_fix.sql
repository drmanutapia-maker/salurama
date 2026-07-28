-- ═══════════════════════════════════════════════════════════════════════
-- Corrección de seguridad: RLS de citas y reviews permitía escritura/lectura
-- sin restricción real. Confirmado con pruebas controladas el 2026-07-28.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. citas: solo el médico dueño puede actualizar sus propias citas.
--    La política anterior ("allow_update_by_token") tenía with_check: true,
--    sin validar token, sesión ni propiedad — cualquiera podía marcar
--    CUALQUIER cita como 'completed' (o cambiar cualquier otro campo).
DROP POLICY IF EXISTS allow_update_by_token ON citas;

CREATE POLICY allow_update_by_doctor ON citas
  FOR UPDATE
  TO public
  USING (
    medico_id IN (SELECT id FROM doctors WHERE doctors.user_id = auth.uid())
  )
  WITH CHECK (
    medico_id IN (SELECT id FROM doctors WHERE doctors.user_id = auth.uid())
  );

-- 2. citas: solo el médico dueño (o la cuenta admin de Manuel) puede leer
--    citas. La política anterior ("allow_verify_by_token") tenía qual: true,
--    exponiendo nombre/email/teléfono de TODOS los pacientes de la plataforma.
DROP POLICY IF EXISTS allow_verify_by_token ON citas;

CREATE POLICY allow_select_by_doctor_or_admin ON citas
  FOR SELECT
  TO public
  USING (
    medico_id IN (SELECT id FROM doctors WHERE doctors.user_id = auth.uid())
    OR (auth.jwt() ->> 'email') = 'drmanutapia@gmail.com'
  );

-- 3. reviews: el INSERT ya no acepta cualquier fila. Exige que cita_id sea
--    una cita real, completada, del mismo doctor referenciado.
DROP POLICY IF EXISTS reviews_insert_public ON reviews;

CREATE POLICY reviews_insert_public ON reviews
  FOR INSERT
  TO public
  WITH CHECK (
    cita_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM citas
      WHERE citas.id = reviews.cita_id
        AND citas.estado = 'completed'
        AND citas.medico_id = reviews.doctor_id
    )
  );

-- 4. reviews: evita más de una reseña por cita (el UNIQUE(doctor_id, user_id)
--    existente no protege nada porque user_id nunca se escribe).
ALTER TABLE reviews ADD CONSTRAINT reviews_cita_id_key UNIQUE (cita_id);

-- 5. reviews: el rating nunca debe ser 0 (la UI solo ofrece 1-5).
ALTER TABLE reviews DROP CONSTRAINT reviews_rating_check;
ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);
