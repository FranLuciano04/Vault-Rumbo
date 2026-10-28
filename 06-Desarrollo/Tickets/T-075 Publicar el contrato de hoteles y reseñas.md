---
id: T-075
titulo: Publicar el contrato de hoteles y reseñas
modulo: M5 — Hoteles y reseñas
capa: contrato
estado: tomado
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, CU-17, CU-18, CU-29, RF-105, DEC-0003]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 09:02
rama: feature/T-075-publicar-el-contrato-de-hoteles-y-resena
pr:
---
# T-075 Publicar el contrato de hoteles y reseñas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de hoteles y reseñas, incluido el `PATCH /resenas/{id}` que pide RF-105 y que el contrato del PC1 no tenía.

## Criterios de aceptación
- [ ] Las rutas del módulo `hoteles` con esquemas, roles (freelance solo consulta) y errores.
- [ ] Se agrega `PATCH /resenas/{resena_id}` (editar reseña, RF-105) con los mismos roles que el alta.
- [ ] Tipos, hooks y mocks MSW con un catálogo ficticio.

## Tests esperados
`tests/api/test_contrato_m5.py`: rutas, token, rol y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `hoteles`
- `05-Diseño/API/openapi.json` (PC1)
- [[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]]
- [[Hotel]]
- [[Reseña]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/hoteles.py`
- `src/backend/rumbo/presentacion/routers/hoteles.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/hoteles.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
- **Del plan:** Agregar `PATCH /resenas/{id}` es un cambio al contrato del PC1 que sale de RF-105: dejarlo anotado en la Bitácora técnica al cerrar el módulo.
