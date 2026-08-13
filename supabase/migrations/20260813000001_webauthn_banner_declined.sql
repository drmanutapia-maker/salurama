-- Banner de invitacion al login biometrico: si el medico elige "No, gracias"
-- explicitamente, no se le vuelve a mostrar. Si solo cierra el banner sin
-- elegir, esta columna se queda en false y el banner reaparece en su
-- siguiente login con contrasena (logica vive en el cliente).
alter table doctors
  add column if not exists webauthn_banner_declined boolean not null default false;
