---
id: T-161
titulo: Limitar el largo de las etiquetas del cliente
modulo: M2 — Clientes
capa: backend
estado: libre
depende_de: [T-041]
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, CU-03, RF-031]
origen: hallazgo T-041
asignado:
tomado_el:
rama:
pr:
---
# T-161 Limitar el largo de las etiquetas del cliente

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al dar de alta o editar un cliente, sus etiquetas respetan el mismo tope que ya usa la búsqueda de T-041: como máximo 20 etiquetas de hasta 80 caracteres cada una. Así no se guarda ninguna etiqueta que después no se pueda buscar.

## Criterios de aceptación
- [ ] `POST /clientes` y `PATCH /clientes/{id}` responden 422 (`problem+json`) si llegan más de 20 etiquetas o una de más de 80 caracteres.
- [ ] El tope sale de una única constante compartida con los filtros de `GET /clientes`, no de dos números sueltos.
- [ ] `openapi.json` y `tipos.gen.ts` se regeneran con el `maxItems` y el `maxLength` nuevos.

## Tests esperados
`tests/api/test_clientes.py`:
- `test_rf031_alta_rechaza_mas_de_20_etiquetas`
- `test_rf031_alta_rechaza_etiqueta_de_mas_de_80_caracteres`
- `test_rf031_alta_acepta_20_etiquetas_de_80_caracteres` (el borde)
- el mismo par sobre `PATCH`, si el endpoint ya está implementado; si sigue siendo un stub, solo lo comprueba el contrato.

## Contexto (leer solo esto)
- Notas de implementación de T-041: topes de la búsqueda
- `src/backend/rumbo/presentacion/routers/clientes.py` (`_MAX_ETIQUETAS`, `_MAX_LARGO_ETIQUETA`)
- `src/backend/rumbo/presentacion/esquemas/clientes.py` (`ClienteCrear`, `ClienteEditar`)

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/clientes.py`
- `src/backend/rumbo/presentacion/routers/clientes.py`

## Fuera de alcance
- Normalizar o deduplicar las etiquetas.
- El tope en el front: alcanza con el 422 del backend.

## Notas de implementación
