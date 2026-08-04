# HEMA — Decisiones arquitectónicas críticas

Contexto rescatado de las notas de sesión de desarrollo de HEMA (`HEMA_CONTEXTO_V3.md`, Sesión 7, y `HEMA_PLAN_2.md`, Sesión 9), ya cerradas y eliminadas del repo — el módulo está construido al 100%. Se conserva solo esta sección porque documenta el *por qué* de varias decisiones no obvias a partir del código o del seed (el JSON de protocolos no admite comentarios), útil como referencia si algo de esto necesita tocarse en el futuro.

## Seed clínico
- **BLIN (Blinatumomab):** la dosis 28µg se guarda como `0.028` mg porque `dose_unit` no soporta microgramos.
- **HIERRO-DEXT:** tiene 2 `protocol_drugs` a propósito — dosis de prueba (25mg, seq:1) + dosis completa (500mg, seq:2) — vinculado a la regla `R-HIERRO-01`.
- **MATRIX:** los días de aplicación fueron reordenados respecto al esquema original: RTX d1/d6, MTX d7, AraC d8-9, Tiotepa d10.
- **AZA-VEN:** `total_cycles: 12` es representativo, no un límite clínico real.

## Auth y routing
- `proxy.ts` (NO `middleware.ts`) — Next.js 16 usa proxy.
- `createBrowserClient` (NO `createClient`) — la sesión vive en cookies, no en localStorage.
- `window.location.href` en login (NO `router.push`) — así las cookies llegan al proxy.
- `proxy.ts` maneja el prefijo `base64-` en cookies de Supabase con `atob()`.
- `login.tsx` lee el parámetro `next` (y `redirect` como fallback).
- `modules` viene del JWT decodificado (NO de `user_metadata`).
- `router.refresh()` después de `router.push()` para invalidar cache.

## Base de datos / API
- Schema `hema` NO expuesto en la Data API → todo vía RPCs en `public` con `SECURITY DEFINER`.
- `protocol_references` (NO `references` — palabra reservada de SQL).
- PostgREST retorna objeto singular (no array) en relaciones FK muchos-a-uno.
