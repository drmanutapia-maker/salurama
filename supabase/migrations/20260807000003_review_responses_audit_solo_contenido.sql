-- Segundo bug encontrado en pruebas E2E: el trigger de auditoría se disparaba
-- para CUALQUIER UPDATE de review_responses, incluyendo el UPDATE de sistema
-- que hace la Edge Function de Parte 2 para marcar notified_at (sin cambiar
-- respuesta). Esa conexión es directa a Postgres sin JWT de usuario, así que
-- auth.uid() da NULL ahí — con actor_user_id NOT NULL, ese UPDATE fallaría
-- y notified_at nunca se marcaría, causando reenvíos duplicados del aviso en
-- cada corrida del cron.
--
-- Fix: el trigger solo registra auditoría cuando el contenido de la
-- respuesta realmente cambia (edición real) o se borra la fila — nunca por
-- un cambio de bookkeeping como notified_at. Se relaja además actor_user_id
-- a NULLABLE, para no bloquear un DELETE legítimo hecho vía service_role
-- (ej. un borrado en cascada disparado por limpieza administrativa).

ALTER TABLE public.review_responses_audit_log ALTER COLUMN actor_user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.review_responses_audit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.respuesta IS NOT DISTINCT FROM NEW.respuesta THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.review_responses_audit_log (review_id, doctor_id, accion, contenido_anterior, actor_user_id)
  VALUES (
    OLD.review_id,
    OLD.doctor_id,
    CASE TG_OP WHEN 'UPDATE' THEN 'editado' ELSE 'eliminado' END,
    OLD.respuesta,
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
