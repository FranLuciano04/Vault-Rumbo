---
id: T-163
titulo: Forzar la versión con parche de undici
modulo: M0 — Fundaciones
capa: infra
estado: libre
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-15]
origen: hallazgo T-028
asignado:
tomado_el:
rama:
pr:
---
# T-163 Forzar la versión con parche de undici

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El job `web` del CI vuelve a pasar `pnpm audit --audit-level=high`. Desde el 23/10/26 falla en todos los PR que tocan el front (lo destapó el PR #59 de T-028) por GHSA-xjj6-f33q-929c, una vulnerabilidad alta de `undici` (`>=8.0.0 <8.12.2`, DoS por exceso de content-encodings). Llega por `jsdom` (`apps__web>jsdom>undici`, `vitest>jsdom>undici` y otras rutas: 6 en total), que solo corre en los tests. A diferencia de zod (T-162), **sí hay parche** (`>=8.12.2`), así que se fuerza la versión con un override en lugar de aceptar el riesgo.

## Criterios de aceptación
- [ ] `src/pnpm-workspace.yaml` suma en `overrides` `"undici": "^8.12.2"`, con el mismo formato de comentario que `@grpc/grpc-js` (GHSA, severidad, «con parche» y por dónde entra); el lockfile queda regenerado.
- [ ] `pnpm why undici -r` muestra solo versiones `>=8.12.2`. Si alguna ruta queda en una versión mayor incompatible (por ejemplo, `jsdom` exige `undici` 7), se para y se avisa en lugar de ignorar la advertencia.
- [ ] `pnpm audit --audit-level=high`, ejecutado desde `src`, termina con código 0, y siguen en verde `pnpm --filter @rumbo/web test` y `pnpm --filter @rumbo/mobile test`.

## Contexto (leer solo esto)
- `src/pnpm-workspace.yaml` (bloques `overrides` y `audit.ignore`)
- [[T-162 Aceptar el riesgo de zod en el CLI de Expo]] y [[T-019 Sumar los análisis de seguridad al CI]]
- Aviso: https://github.com/advisories/GHSA-xjj6-f33q-929c

## Archivos probables
- `src/pnpm-workspace.yaml`
- `src/pnpm-lock.yaml`

## Fuera de alcance
- Actualizar `jsdom` o `vitest` de versión mayor.
- Cambios en T-028: su PR #59 se vuelve a correr una vez mergeado este ticket.

## Notas de implementación
