-- HEMA: hema_add_lab_values — versión batcheada de hema_add_lab_value, para
-- cerrar el N+1 de app/hema/labs/actions.ts (un RPC por analito de un panel,
-- típicamente 10-20 por captura). No reemplaza ni borra hema_add_lab_value
-- (singular) — queda sin uso en el código pero no estorba.
-- Mismo cálculo de flag L/H que la versión singular, ahora sobre un array
-- jsonb de valores en una sola llamada — además de performance, corrige un
-- bug latente: antes, si el analito 3 de 10 fallaba, los 2 anteriores ya
-- habían quedado insertados sin rollback. Ahora todo el panel se inserta en
-- una sola transacción implícita de la función.
-- Reversión:
--   DROP FUNCTION public.hema_add_lab_values(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.hema_add_lab_values(
  p_panel_id uuid,
  p_values   jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY INVOKER
AS $$
DECLARE
  v_val jsonb;
BEGIN
  FOR v_val IN SELECT * FROM jsonb_array_elements(p_values) LOOP
    INSERT INTO hema.lab_values (
      panel_id, analyte, value, unit, reference_low, reference_high, flag, manually_edited
    )
    VALUES (
      p_panel_id,
      v_val->>'analyte',
      (v_val->>'value')::numeric,
      v_val->>'unit',
      (v_val->>'reference_low')::numeric,
      (v_val->>'reference_high')::numeric,
      CASE
        WHEN (v_val->>'reference_low')  IS NOT NULL AND (v_val->>'value')::numeric < (v_val->>'reference_low')::numeric  THEN 'L'
        WHEN (v_val->>'reference_high') IS NOT NULL AND (v_val->>'value')::numeric > (v_val->>'reference_high')::numeric THEN 'H'
        ELSE NULL
      END,
      true
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hema_add_lab_values(uuid, jsonb) TO authenticated;
