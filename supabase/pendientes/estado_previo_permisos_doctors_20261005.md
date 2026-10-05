# Estado de permisos y políticas ANTES de las migraciones 000003 / 000004

Capturado el 2026-10-05, antes de aplicar nada de 20261005000003 ni 20261005000004.
Proyecto Supabase: pwcdwxhfypaxvtqydzcg.

## public.doctors
- Dueño: `postgres`
- RLS: activo (`relrowsecurity = true`, `relforcerowsecurity = false`)
- ACL de la tabla (`relacl`):
  `{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}`
- ACL por columna: ninguna (`attacl` nulo en todas las columnas)
- Es decir: `anon` y `authenticated` tienen TODOS los privilegios sobre TODAS las columnas.

## public.consultorios (después de 20261005000002)
- `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres,authenticated=awd/postgres}`
  más permisos SELECT por columna (sin `telefono`) para `anon` y `authenticated`.

## Storage
- Bucket `chat-archivos`: NO existe (lo eliminó `supabase storage rm ss:///chat-archivos`).

## Políticas que cambia 000003 (definición original)
Todas con `permissive = PERMISSIVE`.

| Tabla | Política | Roles | Cmd | USING | WITH CHECK |
|---|---|---|---|---|---|
| doctor_conditions | Users can manage own conditions | public | ALL | `doctor_id IN (SELECT doctors.id FROM doctors WHERE doctors.email = (auth.jwt() ->> 'email'))` | (nulo) |
| doctor_education | Users can manage own education | public | ALL | igual | (nulo) |
| doctor_experience | Users can manage own experience | public | ALL | igual | (nulo) |
| doctor_licenses | Users can manage own licenses | public | ALL | igual | (nulo) |
| doctor_social_media | Users can manage own social media | public | ALL | igual | (nulo) |
| doctor_specialties | Doctors can view own specialties | public | SELECT | `EXISTS (SELECT 1 FROM doctors WHERE doctors.id = doctor_specialties.doctor_id AND doctors.email = auth.email())` | (nulo) |
| doctor_specialties | Doctors can insert own specialties | public | INSERT | (nulo) | misma expresión |
| doctor_specialties | Doctors can update own specialties | public | UPDATE | misma expresión | (nulo) |
| doctor_specialties | Doctors can delete own specialties | public | DELETE | misma expresión | (nulo) |
| doctor_specialty_credentials | doctor_specialty_credentials_own_insert | public | INSERT | (nulo) | `EXISTS (SELECT 1 FROM doctors WHERE doctors.id = doctor_specialty_credentials.doctor_id AND doctors.email = auth.email())` |
| doctors | Usuarios pueden actualizar su propio perfil | authenticated | UPDATE | `auth.email() = email` | `auth.email() = email` |
| doctors | Usuarios pueden crear su propio perfil | authenticated | INSERT | (nulo) | `auth.email() = email` |
| doctors | Usuarios pueden eliminar su propio perfil | authenticated | DELETE | `auth.email() = email` | (nulo) |
| doctors | Usuarios pueden ver su propio perfil | authenticated | SELECT | `auth.email() = email` | (nulo) |

## Reversión
- 000004 (permisos): `supabase/pendientes/reversion_000004_restaurar_permisos_doctors.sql`
- 000003 (políticas y funciones): `supabase/pendientes/reversion_000003_politicas_y_funciones.sql`
