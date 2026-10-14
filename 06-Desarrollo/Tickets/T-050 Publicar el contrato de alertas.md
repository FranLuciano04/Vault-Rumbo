---
id: T-050
titulo: Publicar el contrato de alertas
modulo: M3 — Alertas
capa: contrato
estado: libre
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, CU-28]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-050 Publicar el contrato de alertas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de alertas (agenda, detalle, recordatorio manual, vista, resolver, posponer y progreso del día), con tipos, hooks y mocks MSW.

## Criterios de aceptación
- [ ] Las ocho rutas del módulo `alertas` con esquemas, filtros (hoy, próximas, responsable) y errores.
- [ ] Todas responden `501`.
- [ ] Tipos, hooks y mocks MSW con una agenda ficticia de cada tipo de alerta.

## Tests esperados
`tests/api/test_contrato_m3.py`: rutas, token y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `alertas`
- `05-Diseño/API/openapi.json` (PC1)
- [[Alerta]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/alertas.py`
- `src/backend/rumbo/presentacion/routers/alertas.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/alertas.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
