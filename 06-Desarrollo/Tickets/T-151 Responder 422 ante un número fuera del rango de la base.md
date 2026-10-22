---
id: T-151
titulo: Responder 422 ante un número fuera del rango de la base
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-15, RF-086, RF-087, DEC-0001]
origen: hallazgo T-032
asignado:
tomado_el:
rama:
pr:
---
# T-151 Responder 422 ante un número fuera del rango de la base

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Si un cuerpo trae un entero que no entra en la columna de Postgres (por ejemplo `anticipacion_dias: 10000000000`), la API responde 422 problem+json en vez de 500. Lo encontró la review de T-032. Se resuelve en el manejador de errores, que traduce el `DataError` de la base, así cubre a todos los módulos sin cambiar el contrato ni inventar un tope de negocio (decisión de Paloma, 22/10/26).

## Criterios de aceptación
- [ ] `POST /api/destinos/{destino_id}/requisitos` y `PATCH /api/requisitos-destino/{requisito_id}` con `anticipacion_dias` fuera del rango de INTEGER → 422 problem+json, sin fila creada ni modificada.
- [ ] Lo mismo con un entero fuera de rango en `ConfiguracionEditar` (parámetros del negocio).
- [ ] Un 500 por cualquier otro error sigue siendo 500. Solo se traduce el error de dato fuera de rango.

## Tests esperados
`tests/api/test_errores.py` (o el archivo de cada módulo): `test_rf086_anticipacion_fuera_de_rango_da_422`, `test_rf087_editar_anticipacion_fuera_de_rango_da_422` y un caso de parámetros del negocio fuera de rango.

## Contexto (leer solo esto)
- `src/backend/rumbo/presentacion/errores.py` — manejadores de errores
- [[Contrato de la API (OpenAPI)]] §Convenciones — formato problem+json

## Archivos probables
- `src/backend/rumbo/presentacion/errores.py`

## Fuera de alcance
- Topes de negocio en los esquemas (`le=`) y cambios en `openapi.json`.

## Notas de implementación
