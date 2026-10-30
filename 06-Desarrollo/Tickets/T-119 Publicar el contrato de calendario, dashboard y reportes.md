---
id: T-119
titulo: Publicar el contrato de calendario, dashboard y reportes
modulo: M8 — Calendario, dashboard y reportes
capa: contrato
estado: tomado
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, CU-22, CU-23]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 14:17
rama: feature/T-119-publicar-el-contrato-de-calendario-dashb
pr:
---
# T-119 Publicar el contrato de calendario, dashboard y reportes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) del calendario, el dashboard y los reportes, con tipos, hooks y mocks.

## Criterios de aceptación
- [ ] Las rutas de `dashboard` y `calendario` con filtros (período, responsable, tipo), roles y errores.
- [ ] Los reportes admiten los formatos JSON, Excel y PDF según el contrato.
- [ ] Tipos, hooks y mocks MSW con datos ficticios.

## Tests esperados
`tests/api/test_contrato_m8.py`: rutas, token, rol y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulos `dashboard` y `calendario`
- `05-Diseño/API/openapi.json` (PC1)

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/{dashboard,calendario}.py`
- `src/backend/rumbo/presentacion/routers/{dashboard,calendario}.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/`

## Fuera de alcance
- La lógica.

## Notas de implementación
