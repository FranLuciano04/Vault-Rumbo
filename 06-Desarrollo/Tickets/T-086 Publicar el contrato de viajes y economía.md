---
id: T-086
titulo: Publicar el contrato de viajes y economía
modulo: M6 — Viajes y economía
capa: contrato
estado: libre
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-07, CU-08, CU-09, CU-10, CU-11, CU-12, CU-27, DEC-0007, DEC-0013]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-086 Publicar el contrato de viajes y economía

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de viajes (reserva, ficha, estados, cancelación, itinerario) y economía (economía, plan de pagos, ajustes y cobros), con tipos, hooks y mocks.

## Criterios de aceptación
- [ ] Las 20 rutas de los módulos `viajes` y `economia` con esquemas, roles y errores (409 por estado).
- [ ] Importes como texto decimal, moneda y tipo de cambio según DEC-0007/DEC-0013; ficha con ganancia, margen, comisión y saldo.
- [ ] Tipos, hooks y mocks MSW con un viaje ficticio en cada estado.

## Tests esperados
`tests/api/test_contrato_m6.py`: rutas, token y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulos `viajes` y `economia`
- `05-Diseño/API/openapi.json` (PC1)
- [[Viaje]]
- [[Pago]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/{viajes,economia}.py`
- `src/backend/rumbo/presentacion/routers/{viajes,economia}.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/{viajes,economia}.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
