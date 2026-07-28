-- ═══════════════════════════════════════════════════════════════════════
-- Corrige un bug introducido por la migración anterior (20260727000001),
-- detectado con una prueba end-to-end real: el EXISTS dentro del
-- with_check de reviews_insert_public consulta `citas`, y esa consulta
-- también queda sujeta al nuevo RLS de `citas` (solo el médico dueño lee).
-- Resultado: un paciente anónimo legítimo, con token válido, no podía
-- insertar su propia reseña porque no podía "ver" su propia cita.
--
-- Solución: función SECURITY DEFINER que valida la cita con privilegios
-- elevados (bypassa RLS de citas solo para esta comprobación puntual),
-- sin exponer ninguna columna de citas al que llama.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cita_completada_valida(p_cita_id uuid, p_doctor_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM citas
    WHERE citas.id = p_cita_id
      AND citas.estado = 'completed'
      AND citas.medico_id = p_doctor_id
  );
$$;

REVOKE ALL ON FUNCTION public.cita_completada_valida(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.cita_completada_valida(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS reviews_insert_public ON reviews;

CREATE POLICY reviews_insert_public ON reviews
  FOR INSERT
  TO public
  WITH CHECK (
    cita_id IS NOT NULL
    AND public.cita_completada_valida(cita_id, doctor_id)
  );
