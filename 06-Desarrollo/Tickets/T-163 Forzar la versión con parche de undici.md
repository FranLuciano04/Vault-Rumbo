---
id: T-163
titulo: Forzar la versión con parche de undici
modulo: M1 — Usuarios y configuración
capa: infra
estado: hecho
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-15]
origen: hallazgo T-028
asignado: Nahuel Viniegra
tomado_el: 23/10/26 22:31
rama: feature/T-163-forzar-la-version-con-parche-de-undici
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
- Override `undici: "^8.12.2"` en `src/pnpm-workspace.yaml`: queda una sola versión, `undici@8.12.3`. Su único dependiente es `jsdom@30.1.3`, que pide `^8.12.1`, así que entra en el rango.
- `pnpm audit --audit-level=high`: código 0. Pasan web (211 tests, 93,4 %), mobile (43 tests), lint, typecheck y build.
- El lockfile (+8 −59) cambia también la resolución de peers de `firebase` en `apps/web`: pasa a usar la misma variante que mobile. Es determinista (regenerar desde `main` con este `pnpm-workspace.yaml` da un lockfile idéntico) y no cambia el bundle web.
- Se pasó a M1 porque M0 ya estaba cerrado (`mod-0`). Para tomarlo hubo que liberar T-028, que espera la aprobación del PR #59, y retomarlo después.
- Review (opus): 0 bloqueantes, 0 importantes, 1 menor (anotar el cambio de peers de firebase), anotado acá. Modelos: impl sonnet, review opus.
