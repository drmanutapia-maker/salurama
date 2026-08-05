-- HEMA Módulo: Usuarios HEMA
-- Afecta schema: hema
-- Reversión: DROP TABLE hema.users CASCADE;

CREATE TABLE IF NOT EXISTS hema.users (
  id                     uuid        PRIMARY KEY REFERENCES auth.users(id),
  tenant_id              uuid        NOT NULL REFERENCES hema.tenants(id),
  -- FK directa al perfil de Salurama (tabla public.doctors)
  -- NO duplica nombre ni cédula; se leen desde public.doctors
  doctor_id              uuid        REFERENCES public.doctors(id),
  role                   text        NOT NULL
                           CHECK (role IN ('admin','medico','enfermeria','farmacia','auditor')),
  totp_enrolled          boolean     DEFAULT false,
  psc_signature_provider text,
  psc_user_id            text,
  active                 boolean     DEFAULT true
);

COMMENT ON TABLE hema.users IS
  'Usuarios del módulo HEMA. El id es el mismo auth.users.id de Salurama '
  '(mismo login, sin duplicar cuenta). doctor_id apunta al perfil en public.doctors.';

COMMENT ON COLUMN hema.users.doctor_id IS
  'FK a public.doctors.id – permite leer nombre, cédula y especialidad '
  'sin duplicar datos ni requerir un JOIN por auth.users.';

COMMENT ON COLUMN hema.users.psc_signature_provider IS
  'Proveedor de firma electrónica avanzada: ''mifiel'' o ''advantage''.';
