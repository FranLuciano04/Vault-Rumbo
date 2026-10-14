---
id: T-061
titulo: Publicar el contrato de oportunidades y cotizaciones
modulo: M4 — Oportunidades y cotizaciones
capa: contrato
estado: libre
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, CU-05, CU-06, DEC-0002]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-061 Publicar el contrato de oportunidades y cotizaciones

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de oportunidades (embudo, consulta, seguimiento, acciones de estado e insistencias) y cotizaciones (versiones, documento, enviar, aceptar, rechazar), con tipos, hooks y mocks.

## Criterios de aceptación
- [ ] Las 16 rutas del módulo `oportunidades` con esquemas, roles y errores (409 por estado).
- [ ] Importes como texto decimal y moneda `ARS`/`USD`; el documento como `application/pdf`.
- [ ] Tipos, hooks y mocks MSW con un embudo ficticio.

## Tests esperados
`tests/api/test_contrato_m4.py`: rutas, token y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `oportunidades`
- `05-Diseño/API/openapi.json` (PC1)
- [[Oportunidad]]
- [[Cotización]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/oportunidades.py`
- `src/backend/rumbo/presentacion/routers/oportunidades.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/oportunidades.ts`

## Fuera de alcance
- `confirmar-reserva` (contrato de M6).

## Notas de implementación
