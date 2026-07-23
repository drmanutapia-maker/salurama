-- Corrige el bug real encontrado 2026-07-23: doctors.is_active solo se
-- activaba desde el código del navegador en app/auth/confirm/page.tsx, que
-- depende de que esa pantalla cargue y logre leer la sesión. Si algo falla
-- ahí (enlace de un solo uso ya usado, un navegador/dispositivo distinto,
-- el médico entra directo por /login en vez de terminar ese flujo) la cuenta
-- se queda inactiva para siempre, en silencio — confirmado con un caso real
-- (Juan Perez Garcia / surpak_87@hotmail.com).
--
-- Este trigger mueve la activación a la base de datos: en cuanto Supabase
-- Auth marca el correo como confirmado (auth.users.email_confirmed_at), sin
-- importar por qué camino llegó ahí, se activa el perfil. Ya no depende del
-- navegador del médico en absoluto.
CREATE OR REPLACE FUNCTION public.sync_doctor_is_active_on_email_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
    UPDATE public.doctors SET is_active = true WHERE user_id = NEW.id AND is_active = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_doctor_is_active ON auth.users;

CREATE TRIGGER trg_sync_doctor_is_active
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_doctor_is_active_on_email_confirm();

-- Corrige de una vez el caso real que ya quedó atrapado por el bug antes de
-- que existiera este trigger (el trigger solo dispara hacia adelante, no
-- reacciona a filas que ya tenían email_confirmed_at desde antes).
UPDATE public.doctors d
SET is_active = true
FROM auth.users u
WHERE d.user_id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND d.is_active = false;
