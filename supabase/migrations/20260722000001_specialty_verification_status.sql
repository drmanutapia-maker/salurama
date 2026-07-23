-- Verificación de certificación de especialidad — totalmente independiente
-- de la cédula profesional (review_status/verification_status/license_verified).
-- Mismo patrón de 3 estados que ya existe para cédula, pero en un campo propio
-- para que ambas verificaciones puedan avanzar por separado (ej. cédula
-- aprobada + especialidad pendiente, o viceversa).
--
-- pendiente     = default, sin revisar todavía (o el médico declaró que no
--                 está vigente vía el checkbox de registro — mismo estado,
--                 el dashboard distingue el mensaje usando license_not_current)
-- verificado    = un admin confirmó la certificación contra el consejo
-- no_coincide   = un admin revisó y no coincide

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS specialty_verification_status text NOT NULL DEFAULT 'pendiente'
    CHECK (specialty_verification_status IN ('pendiente', 'verificado', 'no_coincide'));
