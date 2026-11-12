-- Reemplaza el bypass de email hardcodeado en la política RLS de citas
-- por una verificación contra la tabla admins.
-- NO aplicar sin revisar en staging primero.

-- Crear columna auxiliar en admins si no existe (para futura integración con roles de Supabase Auth)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS supabase_role text;

-- Crear rol de base de datos si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_roles WHERE rolname = 'salurama_admin'
  ) THEN
    CREATE ROLE salurama_admin;
  END IF;
END $$;

-- Reemplazar la política que usa (auth.jwt() ->> 'email') = 'drmanutapia@gmail.com'
DROP POLICY IF EXISTS allow_select_by_doctor_or_admin ON citas;

CREATE POLICY allow_select_by_doctor_or_admin ON citas
  FOR SELECT TO public
  USING (
    medico_id IN (SELECT id FROM doctors WHERE doctors.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.admins WHERE admins.user_id = auth.uid()
    )
  );
