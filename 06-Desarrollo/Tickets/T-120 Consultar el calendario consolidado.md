---
id: T-120
titulo: Consultar el calendario consolidado
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: libre
depende_de: [T-119, T-012]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-23, RF-136, RF-137, RF-138, RF-139]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-120 Consultar el calendario consolidado

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El calendario devuelve en un rango los viajes (salida y regreso), los vencimientos de pagos y las alertas visibles para el rol, con filtros.

## Criterios de aceptación
- [ ] `GET /calendario` por rango (mes, semana, día) con eventos tipados y el identificador para navegar a su gestión (RF-139).
- [ ] Filtros por tipo y responsable (A1); período sin eventos → lista vacía (A2).
- [ ] Respeta la visibilidad del rol.

## Tests esperados
`tests/api/test_calendario.py`: `test_rf136_consolidado`, `test_rf138_filtros`, `test_rf151_freelance_solo_lo_suyo`, `test_sin_eventos`.

## Contexto (leer solo esto)
- [[CU-23 Ver calendario de viajes y vencimientos]]
- Contrato: `src/packages/shared/openapi.json` (módulo `calendario`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/calendario.py`
- `src/backend/rumbo/presentacion/routers/calendario.py`

## Fuera de alcance
- —

## Notas de implementación
- **DEC-0024 punto 8:** el calendario incluye las alertas programadas (CU-23). Suma `tipo = alerta` con `alerta_id` al contrato (esquema, enum del filtro, tipos y mocks) y a la consulta. El filtro por estado se resuelve en el cliente (punto 9).
