---
id: T-129
titulo: Publicar el contrato de redes
modulo: M9 — Redes e IA
capa: contrato
estado: libre
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-19, CU-20, DEC-0013]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-129 Publicar el contrato de redes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) del tablero de contenido y de las propuestas con IA, con tipos, hooks y mocks.

## Criterios de aceptación
- [ ] Las rutas del módulo `redes` con esquemas, roles (con acceso a redes; nunca `freelance`) y errores (502 si falla la IA).
- [ ] Todas responden `501`.
- [ ] Tipos, hooks y mocks MSW con piezas ficticias en cada columna.

## Tests esperados
`tests/api/test_contrato_m9.py`: rutas, token, acceso a redes y 501.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `redes`
- `05-Diseño/API/openapi.json` (PC1)
- [[ContenidoRed]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/redes.py`
- `src/backend/rumbo/presentacion/routers/redes.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/redes.ts`

## Fuera de alcance
- La lógica.

## Notas de implementación
