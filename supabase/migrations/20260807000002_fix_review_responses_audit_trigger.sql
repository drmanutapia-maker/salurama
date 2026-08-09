-- Bug encontrado en pruebas E2E: un trigger BEFORE UPDATE que devuelve OLD
-- (en vez de NEW) hace que Postgres descarte el cambio — la fila queda
-- exactamente igual, sin error visible para el cliente (el UPDATE "corre"
-- pero no persiste nada, y el .select().single() posterior devuelve la fila
-- vieja sin quejarse). Solo DELETE debe devolver OLD; UPDATE debe devolver NEW
-- para que la edición realmente se escriba.

CREATE OR REPLACE FUNCTION public.review_responses_audit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
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
