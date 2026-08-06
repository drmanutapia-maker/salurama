---
name: git-commits-alcance-explicito
description: Regla permanente para crear commits en este repo — siempre usar `git commit -- <archivos> -m "..."` en vez de `git commit -m "..."` a secas, para evitar arrastrar archivos pendientes no relacionados que ya estén en el índice. Se activa siempre que se vaya a crear un commit en este proyecto.
---

# Alcance explícito en cada commit

Este repo casi siempre tiene cambios pendientes sin commitear de trabajo
previo del usuario (ej. archivos eliminados y dejados en stage) que no
deben mezclarse con el commit que se está armando en el turno actual.

## Regla

Nunca uses `git commit -m "mensaje"` a secas — commitea SIEMPRE el índice
completo, incluyendo cualquier cosa que ya estuviera en stage antes de
este turno de trabajo, sin importar que solo se haya hecho `git add` de
los archivos que sí corresponden al cambio actual.

En su lugar, usa siempre:

    git commit -m "mensaje" -- archivo1 archivo2 ...

con la lista explícita de archivos que pertenecen a ESTE cambio, al
final del comando, después de `--`. Esto commitea solo esos archivos y
deja todo lo demás intacto en el índice y en el working tree — pero ver
la nota de abajo sobre archivos nuevos sin trackear, donde sí hace falta
un paso previo.

## Por qué

`git commit -m` sin pathspec commitea todo lo que esté en stage en ese
momento, no solo lo que se acaba de agregar con `git add` en el turno
actual. En una sesión anterior esto causó que `lib/planGates.ts` (una
eliminación pendiente del usuario, sin relación con el trabajo en curso)
se colara en varios commits seguidos, cada uno requiriendo una corrección
manual (`git restore --source=HEAD~1 --staged --worktree -- <archivo>` +
`git commit --amend --no-edit` + volver a dejarlo en stage).

## Cuidado con el orden de `--`

`--` debe ir INMEDIATAMENTE antes de la lista de archivos, nunca antes de
`-m`. Si `--` se coloca antes de `-m`, git interpreta `-m` y el mensaje
como pathspecs también, y el comando falla con "pathspec ... did not
match any file(s)". Orden correcto siempre:

    git commit -m "mensaje" -- archivo1 archivo2

## Archivos nuevos sin trackear: hace falta `git add` primero

`git commit -- <archivo>` por sí solo NO recoge archivos nuevos sin
trackear (los que aparecen como `??` en `git status`) — falla con
"pathspec ... did not match any file(s) known to git", porque git no
considera un archivo "conocido" hasta que se agrega al menos una vez.

- Archivo ya trackeado con modificaciones (`M` en `git status`): el
  patrón normal funciona directo, sin `git add` previo —
  `git commit -m "mensaje" -- archivo.ts` alcanza.
- Archivo nuevo sin trackear (`??` en `git status`): hace falta
  `git add archivo.ts` primero, y LUEGO `git commit -m "mensaje" --
  archivo.ts`. El `git add` en este caso es seguro y no reintroduce el
  problema que esta regla evita, porque solo agrega ese archivo
  puntual al índice — no todo lo demás que ya estuviera en stage.

## Cuándo aplica

Siempre que se cree un commit en este repo, sin excepción — no es
específica de cambios de base de datos ni de ninguna auditoría puntual.
