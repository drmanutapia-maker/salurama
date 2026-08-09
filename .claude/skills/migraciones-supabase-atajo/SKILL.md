---
name: migraciones-supabase-atajo
description: Reglas obligatorias para aplicar cambios de esquema a la base de datos de Supabase de este proyecto — cuándo usar db push vs. el atajo de SQL directo, y el proceso de reparación de historial que debe seguir cualquier atajo. Se activa siempre que se trabaje con el esquema de la base de datos (tablas, columnas, políticas, funciones, buckets), no solo en auditorías.
---

# Migraciones de Supabase: atajo y reparación de historial

Reglas permanentes para cualquier cambio de esquema en la base de datos de
este proyecto (tablas, columnas, políticas RLS, funciones, buckets de
storage, etc.). Aplican siempre, para cualquier tarea futura — no son
específicas de ninguna auditoría puntual.

## 1. Método normal: `supabase db push`

El camino estándar es crear el archivo en `supabase/migrations/` y correr:

    npx supabase db push --linked

Esto aplica las migraciones pendientes en orden y las registra en el
historial remoto automáticamente. Es el método por defecto — úsalo salvo
que haya un motivo puntual para no hacerlo (ver punto 2).

## 2. Cuándo usar el atajo

Solo te saltas `db push` cuando no es viable por un motivo puntual y
explicable, por ejemplo:

- Hay desfase de historial (migraciones locales sin registrar en remoto,
  o viceversa) y aplicar en cascada arrastraría migraciones pendientes no
  relacionadas, de riesgo desconocido o no verificadas todavía.
- El cambio necesita aplicarse ya (ej. cerrar una fuga de seguridad
  activa) y correr todas las migraciones pendientes en cascada no es
  seguro sin auditarlas primero.

"Es más rápido" o "es una migración chica" NO son motivos válidos por sí
solos — el atajo es la excepción, no la costumbre.

El atajo consiste en aplicar el cambio directo contra el proyecto real:
`npx supabase db query --linked -f <archivo.sql>` para SQL, o la llamada
directa correspondiente al SDK/Management API cuando el cambio no es SQL
puro (ej. `supabase.storage.updateBucket()` para un bucket).

## 3. Reparación de historial — obligatoria e inmediata

Cada vez que se use el atajo para aplicar un cambio de esquema, en el
MISMO turno de trabajo, sin excepción, corre inmediatamente después:

    npx supabase migration repair --status applied <version> --linked

donde `<version>` es el timestamp del archivo de migración recién
aplicado por el atajo. Nunca se deja para después ni para una sesión
futura — si se usó el atajo, el repair se corre en el acto, antes de
continuar con cualquier otra cosa.

## 4. Verificación final — antes de dar la tarea por completada

Después de reparar el historial, confirma con:

    npx supabase migration list

que la versión en cuestión aparece con `Local` y `Remote` coincidiendo
(ninguna columna vacía para esa fila). Solo entonces se considera cerrado
el cambio de esquema. Si no coincide, algo falló en el repair — hay que
investigarlo antes de seguir, nunca dejarlo así.
