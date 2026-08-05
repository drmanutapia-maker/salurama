-- ═══════════════════════════════════════════════════════════════════════
-- Corrección de seguridad: auditoría del flujo completo de citas
-- (2026-07-28). Cierra 3 hallazgos confirmados con pruebas controladas:
--
-- 1. /api/citas/buscar-paciente devolvía nombre/email/teléfono completos
--    de cualquier paciente con solo adivinar su contacto — sin prueba de
--    identidad. Se reemplaza por verificación de código de un solo uso.
-- 2. actualizar_paciente_contacto sobrescribía el contacto real de un
--    paciente sin validar que quien llama sea esa persona — mismo
--    mecanismo de verificación lo cierra.
-- 3. Ninguna ruta de confirmación (verificar-cita ni el botón del médico)
--    revisaba conflictos de horario antes de pasar a 'confirmed' — sin
--    duplicados hoy, confirmado por consulta directa.
-- ═══════════════════════════════════════════════════════════════════════

-- 1 y 2: columnas para el código OTP de un solo uso. otp_verified_at
-- funciona como "token de sesión corto" basado en estado de BD (mismo
-- patrón que review_token/verification_token en este proyecto) — válido
-- ~15 minutos, verificado en el código de la aplicación, no en SQL.
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS otp_code_hash text,
  ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS otp_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS otp_verified_at timestamptz;

-- Ya no hace falta que anon/authenticated llamen estas funciones directo —
-- solo las rutas del servidor (con service role) las necesitan de aquí en
-- adelante.
REVOKE EXECUTE ON FUNCTION public.buscar_paciente_medico(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.actualizar_paciente_contacto(uuid, text, text) FROM anon, authenticated;

-- 3: bloquea el doble-booking a nivel de base de datos, sin importar qué
-- ruta intente confirmar la cita.
CREATE UNIQUE INDEX citas_no_doble_reserva ON citas (medico_id, fecha, hora) WHERE estado = 'confirmed';
