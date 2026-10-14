---
id: T-026
titulo: Publicar el contrato de usuarios y configuración
modulo: M1 — Usuarios y configuración
capa: contrato
estado: libre
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-25, CU-13, CU-26, CU-15, CU-31, DEC-0013, DEC-0016]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-026 Publicar el contrato de usuarios y configuración

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de usuarios, parámetros, comisión por defecto, destinos, requisitos de destino y operadores, con roles en el contrato, tipos generados, hooks y mocks MSW, para que web avance en paralelo con el backend.

## Criterios de aceptación
- [ ] Las rutas del módulo `seguridad` (usuarios) y `configuracion` del contrato del PC1 existen con sus esquemas, roles y errores, **sin** `restablecer-password` (DEC-0016).
- [ ] Todas responden `501` problem+json y exigen el rol del contrato (403 al resto).
- [ ] Tipos regenerados, hooks de TanStack Query y mocks MSW con datos ficticios para cada ruta.

## Tests esperados
`tests/api/test_contrato_m1.py`: cada ruta existe, exige token y rol, y responde 501; en shared, los mocks respetan los esquemas.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulos `seguridad` y `configuracion`
- `05-Diseño/API/openapi.json` (PC1, referencia de esquemas)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]] — endpoints eliminados
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/{usuarios,configuracion}.py`
- `src/backend/rumbo/presentacion/routers/{usuarios,configuracion}.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/`

## Fuera de alcance
- La lógica de cada endpoint.

## Notas de implementación
