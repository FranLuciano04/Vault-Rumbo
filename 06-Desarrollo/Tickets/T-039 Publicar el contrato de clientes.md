---
id: T-039
titulo: Publicar el contrato de clientes
modulo: M2 — Clientes
capa: contrato
estado: libre
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, CU-03, RF-031]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-039 Publicar el contrato de clientes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de clientes (buscar, registrar, ver, editar e historial), con tipos, hooks y mocks MSW.

## Criterios de aceptación
- [ ] Las cinco rutas del módulo `clientes` con sus esquemas, filtros (texto, etiquetas, «lo mío», paginación) y errores.
- [ ] La respuesta de alta contempla el aviso de posible duplicado y la confirmación explícita.
- [ ] Tipos, hooks y mocks MSW con clientes ficticios.

## Tests esperados
`tests/api/test_contrato_m2.py`: rutas, token y 501; mocks que respetan los esquemas.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `clientes`
- `05-Diseño/API/openapi.json` (PC1)
- [[CU-02 Registrar cliente]] — A1
- [[Cliente]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/clientes.py`
- `src/backend/rumbo/presentacion/routers/clientes.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/clientes.ts`

## Fuera de alcance
- La lógica de cada endpoint.

## Notas de implementación
