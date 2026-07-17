-- Confirmado (2026-07-17) que no hay filas existentes con professional_title
-- NULL — el registro es el único INSERT en toda la app y ya manda el valor
-- explícito desde el fix anterior. NOT NULL hace que un futuro INSERT que
-- omita el campo falle con error visible, en vez de guardar NULL en silencio.
alter table public.doctors alter column professional_title set not null;
