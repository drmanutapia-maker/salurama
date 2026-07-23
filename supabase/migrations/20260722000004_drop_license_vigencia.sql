-- La cédula profesional de licenciatura en México es vitalicia (no expira),
-- a diferencia de la certificación de especialidad, que sí tiene vigencia.
-- license_vigencia_hasta no aplicaba y se elimina antes de tener datos reales
-- (solo existió en una fila de prueba, ya borrada).
ALTER TABLE public.doctor_constancia_audit_log
  DROP COLUMN license_vigencia_hasta;
