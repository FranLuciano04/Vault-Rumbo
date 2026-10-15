---
id: T-014
titulo: Generar los tipos compartidos desde el OpenAPI
modulo: M0 — Fundaciones
capa: shared
estado: tomado
depende_de: [T-002]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0001, DEC-0015]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 15/10/26 17:46
rama: feature/T-014-generar-los-tipos-compartidos-desde-el-o
pr:
---
# T-014 Generar los tipos compartidos desde el OpenAPI

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`@rumbo/shared` genera los tipos TypeScript desde `openapi.json` y ofrece el cliente HTTP (Axios con el ID token), la traducción de errores problem+json y la base de MSW que usan web y mobile.

## Criterios de aceptación
- [ ] `pnpm --filter @rumbo/shared generar` produce `src/tipos.gen.ts` desde `openapi.json`.
- [ ] `cliente.ts` agrega `Authorization: Bearer <token>` usando una función `obtenerToken` inyectada por cada app, y convierte un problem+json en un error tipado.
- [ ] Hay utilidades de MSW (handlers por módulo y servidor para tests) usables desde Vitest y Jest.

## Tests esperados
`describe('cliente HTTP')`: agrega el token, no lo agrega si no hay sesión, traduce un 409 problem+json a error tipado; un handler MSW de ejemplo responde.

## Contexto (leer solo esto)
- [[Spec de implementación]] §5 (`packages/shared`)
- [[Contrato de la API (OpenAPI)]] — «Convenciones» y «Errores»

## Archivos probables
- `src/packages/shared/package.json`
- `src/packages/shared/src/cliente.ts`
- `src/packages/shared/src/mocks/`
- `src/packages/shared/src/tipos.gen.ts`

## Fuera de alcance
- Hooks y esquemas de cada módulo (los agrega su ticket de contrato).

## Notas de implementación
