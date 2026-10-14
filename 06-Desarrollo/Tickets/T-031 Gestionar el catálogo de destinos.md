---
id: T-031
titulo: Gestionar el catálogo de destinos
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: [T-026, T-012, T-011]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-26, RF-089, RF-090, RF-091, RF-092, RF-153, DEC-0006]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-031 Gestionar el catálogo de destinos

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña mantienen el catálogo de destinos (alta, edición, baja lógica y reactivación); todos los roles lo consultan. Es el **primer ABM**: fija el patrón de repositorio, servicio, router y tests que copian los demás catálogos.

## Criterios de aceptación
- [ ] Listar (activos por defecto, con filtro de inactivos), ver, alta y edición; escritura solo `admin`/`dueno`.
- [ ] Nombre duplicado (normalizado: sin tildes ni mayúsculas) → 409 (A1).
- [ ] Baja lógica aunque el destino esté en uso (A2) y reactivación (A3).

## Tests esperados
`tests/api/test_destinos.py`: `test_rf089_alta_y_listado`, `test_rf090_nombre_duplicado_409`, `test_rf091_baja_logica_en_uso`, `test_rf092_reactivar`, roles.

## Contexto (leer solo esto)
- [[CU-26 Gestionar destinos]]
- [[DEC-0006 Destino como entidad de catálogo|DEC-0006]]
- Contrato: `src/packages/shared/openapi.json` (módulo `configuracion`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/datos/repositorios/configuracion.py`
- `src/backend/rumbo/negocio/servicios/configuracion.py`
- `src/backend/rumbo/presentacion/routers/configuracion.py`

## Fuera de alcance
- Requisitos del destino (ticket propio).

## Notas de implementación
