---
id: T-047
titulo: Consultar clientes desde la app mobile
modulo: M2 — Clientes
capa: mobile
estado: libre
depende_de: [T-039, T-022]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-005, RF-006, RF-009]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-047 Consultar clientes desde la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la pestaña Clientes se busca un cliente y se abre su ficha con el historial, pensado para usar en el teléfono.

## Criterios de aceptación
- [ ] Lista con búsqueda y scroll paginado.
- [ ] Ficha con datos, historial y acciones de contacto.
- [ ] El `freelance` ve solo sus clientes (lo resuelve el backend).

## Tests esperados
`describe('RF-005 búsqueda mobile')`, `describe('RF-006 ficha mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 57, 36 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-03 Gestionar ficha del cliente]]

## Archivos probables
- `src/apps/mobile/app/(pestanas)/clientes/`
- `src/apps/mobile/src/features/clientes/`

## Fuera de alcance
- Editar la ficha desde mobile (no está en el prototipo).

## Notas de implementación
- **Sumado el 24/10/26 (Francisco, de T-049):** mobile (`src/apps/mobile/app/_layout.tsx`) usa `new QueryClient()`, que reintenta los 4xx, así que una ficha 404 tarda unos 7 s en mostrarse. La web ya lo resolvió con `crearQueryClient()` (`apps/web/src/lib/queryClient.ts`). Conviene mover esa función a `@rumbo/shared`, usarla en las dos apps y alinear el `retry` propio de `consultaYo`.
