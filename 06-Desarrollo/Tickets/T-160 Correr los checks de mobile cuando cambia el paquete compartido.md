---
id: T-160
titulo: Correr los checks de mobile cuando cambia el paquete compartido
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: haiku
modelo_impl: haiku
modelo_review: sonnet
trazabilidad: [DEC-0015, RNF-15]
origen: review-codex M0
asignado: Nahuel Viniegra
tomado_el: 23/10/26 18:39
rama: feature/T-160-correr-los-checks-de-mobile-cuando-cambi
pr:
---
# T-160 Correr los checks de mobile cuando cambia el paquete compartido

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Un PR que solo toca `src/packages/shared/` corre también el job de mobile del CI (lint, typecheck y tests), porque la app mobile depende de `@rumbo/shared` desde T-022. Hoy el filtro del job `cambios` no incluye esa carpeta, y «CI ok» puede aprobar un cambio que rompe mobile (hallazgo H-03 de [[M0 — review Codex]]).

## Criterios de aceptación
- [ ] En `.github/workflows/ci.yml`, la salida `mobile` incluye `^src/packages/shared/`, y se borra el comentario «Mobile todavía no consume @rumbo/shared».
- [ ] Con la lista de archivos `src/packages/shared/src/hooks/useYo.ts`, las expresiones dan `web=true` y `mobile=true`. Con `src/backend/rumbo/main.py`, siguen dando `mobile=false`.

## Tests esperados
Ticket de infra: se verifica ejecutando las expresiones del paso `cambios` con esas dos listas de archivos (por ejemplo, con un script de bash local que reproduzca `hay()`) y, si se puede, con el PR mismo tocando un archivo de `shared`.

## Contexto (leer solo esto)
- [[M0 — review Codex]] — H-03 y su triage
- `.github/workflows/ci.yml` — job `cambios`
- `src/apps/mobile/package.json` — dependencia `@rumbo/shared`

## Archivos probables
- `.github/workflows/ci.yml`

## Fuera de alcance
- Reorganizar el resto de los filtros o los jobs del CI.

## Notas de implementación
- `ci.yml`, job `cambios`: `mobile` ahora también se activa con `^src/packages/shared/`, y se borró el comentario que decía que mobile no consumía el paquete.
- Verificación: se evaluaron las expresiones sacadas directamente de `ci.yml` (no una copia a mano):
  - `shared/…/useYo.ts` → `web=true`, `mobile=true`;
  - `backend/rumbo/main.py` → `mobile=false`;
  - `apps/mobile/…` → `mobile=true`;
  - `pnpm-lock.yaml` → todo `true`.
  En GitHub, este PR toca `ci.yml` (regla de raíz), así que corren todos los jobs.
- Review (Sonnet): 0 bloqueantes y 0 importantes. Un menor ya existía y queda fuera de alcance: si se edita a mano `src/packages/shared/openapi.json` sin tocar `src/backend/`, no corre el job `backend` ni su check de contrato al día. Si se quiere cubrir, va en un ticket aparte.
- Modelos: implementación con Haiku y review con Sonnet. Sin escalados.
