---
id: T-033
titulo: Gestionar el catálogo de operadores
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: [T-031]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: opus
trazabilidad: [CU-31, RF-093, RF-094, RF-095, RF-096, RF-153, DEC-0009]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-033 Gestionar el catálogo de operadores

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña mantienen el catálogo de operadores igual que el de destinos: alta, edición, baja lógica, reactivación y sin duplicados.

## Criterios de aceptación
- [ ] Mismas operaciones y roles que destinos, siguiendo su patrón.
- [ ] Nombre duplicado → 409.
- [ ] Baja lógica aunque esté en uso, y reactivación.

## Tests esperados
`tests/api/test_operadores.py`: `test_rf093_…`, `test_rf094_duplicado_409`, `test_rf095_baja_en_uso`, `test_rf096_reactivar`.

## Contexto (leer solo esto)
- [[CU-31 Gestionar operadores]]
- [[DEC-0009 Operador-Proveedor como entidad de catálogo|DEC-0009]]
- Contrato: `src/packages/shared/openapi.json` (módulo `configuracion`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- El código de destinos como patrón

## Archivos probables
- `src/backend/rumbo/negocio/servicios/configuracion.py`
- `src/backend/rumbo/presentacion/routers/configuracion.py`

## Fuera de alcance
- Pagos a proveedores (M6).

## Notas de implementación
