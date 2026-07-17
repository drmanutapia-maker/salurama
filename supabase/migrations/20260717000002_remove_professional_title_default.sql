-- Quita el DEFAULT 'Dr.' de doctors.professional_title. El registro ya
-- manda el valor explícito elegido por el médico (Dr./Dra./Mtro./Mtra.);
-- dejar el default silencioso invita a que cualquier otro camino futuro
-- (scripts, admin, otra feature) reintroduzca el mismo bug de asumir
-- "Dr." sin preguntar. La columna sigue siendo nullable — un INSERT que
-- omita professional_title ahora guarda NULL en vez de 'Dr.', no falla
-- con error. Ver reporte de validación sobre si conviene agregar NOT NULL.
alter table public.doctors alter column professional_title drop default;
