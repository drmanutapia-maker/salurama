-- Cierra dos huecos reales en normalizar_telefono(), encontrados al auditar
-- la lógica de agrupación de pacientes (a raíz del bug de tarjetas
-- duplicadas en /dashboard/citas):
--
-- 1) La rama "11 dígitos que empiezan con 1" asumía sin fundamento que ese 1
--    era una lada de larga distancia a recortar. En México los números no
--    llevan ese prefijo (el de móvil ya se cubre aparte con "521"), así que
--    un número de 11 dígitos que empieza con 1 es ambiguo: podría ser un
--    número real de EE. UU./Canadá (código de país 1 + 10 dígitos) o un
--    error de captura. Recortarlo a ciegas podía hacer que ese número
--    terminara coincidiendo con el número real de OTRO paciente distinto —
--    justo el tipo de fusión silenciosa e incorrecta que se quiere evitar.
--    Se elimina la rama: ahora cae a NULL (no se usa para match), igual que
--    ya hace cualquier otro formato que no se reconoce con certeza.
--
-- 2) Faltaba reconocer el prefijo 044/045, usado en México para marcar a
--    celulares antes de la reforma de marcación de 2019-2020. Un paciente
--    que tenga guardado su número en ese formato antiguo (ej. "044 55 1234
--    5678") no lograba coincidir con el mismo número capturado en formato
--    normal, aunque sea exactamente la misma persona. A diferencia del caso
--    anterior, este prefijo es inequívoco (siempre significa "recorta estos
--    3 dígitos"), así que no introduce riesgo de fusión incorrecta.
--
-- Solo afecta comparaciones futuras (match al agendar/buscar/actualizar) —
-- no se reprocesan datos ya guardados, por acuerdo explícito de no tocar
-- los datos de prueba actuales.
--
-- Reversión: restaurar la versión anterior de la función (ver migración
-- 20260724081417_busqueda_paciente_medico.sql).

CREATE OR REPLACE FUNCTION normalizar_telefono(p_telefono text)
RETURNS text AS $$
DECLARE
  v_tel text;
BEGIN
  IF p_telefono IS NULL OR p_telefono = '' THEN
    RETURN NULL;
  END IF;
  v_tel := regexp_replace(p_telefono, '\D', '', 'g');
  IF length(v_tel) = 12 AND left(v_tel, 2) = '52' THEN v_tel := right(v_tel, 10);
  ELSIF length(v_tel) = 13 AND left(v_tel, 3) = '521' THEN v_tel := right(v_tel, 10);
  ELSIF length(v_tel) = 13 AND left(v_tel, 3) IN ('044', '045') THEN v_tel := right(v_tel, 10);
  END IF;
  IF length(v_tel) <> 10 THEN RETURN NULL; END IF;
  RETURN v_tel;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalizar_telefono(text) IS
  'Normaliza un teléfono a 10 dígitos (recorta 52/521 de país o 044/045 de '
  'marcación antigua a celular). NULL si no queda en exactamente 10 dígitos '
  '(no confiable para match). Ya NO recorta un 1 inicial en números de 11 '
  'dígitos -- era una rama ambigua que podía fusionar a dos pacientes '
  'distintos por error (ver 20260820000001).';
