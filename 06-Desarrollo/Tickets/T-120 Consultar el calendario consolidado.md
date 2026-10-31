---
id: T-120
titulo: Consultar el calendario consolidado
modulo: M8 — Calendario, dashboard y reportes
capa: backend
estado: hecho
depende_de: [T-119, T-012]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-23, RF-136, RF-137, RF-138, RF-139]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 18:12
rama: feature/T-120-consultar-el-calendario-consolidado
pr:
---
# T-120 Consultar el calendario consolidado

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El calendario devuelve en un rango los viajes (salida y regreso), los vencimientos de pagos y las alertas visibles para el rol, con filtros.

## Criterios de aceptación
- [x] `GET /calendario` por rango (mes, semana, día) con eventos tipados y el identificador para navegar a su gestión (RF-139).
- [x] Filtros por tipo y responsable (A1); período sin eventos → lista vacía (A2).
- [x] Respeta la visibilidad del rol.

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
- `GET /api/calendario` consolida:
  - viajes: un evento de la salida al regreso, si se superpone con el rango;
  - vencimientos: todos los pagos menos los anulados, con su estado (DEC-0024 §9);
  - alertas: de cualquier estado, con `alerta_id` (DEC-0024 §8).
- Cada evento trae `viaje_id`, `pago_id` o `alerta_id` para navegar (RF-139).
- Rango inclusivo en hora de Argentina:
  - sin fechas, el mes en curso;
  - con un solo extremo, el mes de ese extremo;
  - `desde > hasta` o más de 62 días → 422.
- Visibilidad:
  - admin y dueño: todo;
  - empleado: toda la agencia (CU-23), salvo las alertas ajenas (`_RESTRINGIDO_SALVO_JEFES`);
  - freelance: lo de DEC-0008, e ignora `responsable_id`.
- `mios` y `responsable_id` filtran por el responsable del viaje, o por el propietario en las alertas.
- Se ajustó `test_contrato_m8.py` con autorización: enum `alerta`, y salen los tests del 501 del calendario.
- Review de Opus: 0 bloqueantes, 1 importante (pagos cobrados según DEC-0024 §9) y 5 menores. Todos arreglados, con tests modificados y agregados bajo autorización.
- El mock del calendario quedó alineado con el backend (títulos y visibilidad del freelance).
- Sin refactor aparte, por la poca memoria de la PC. Modelos: tests sonnet, implementación sonnet, review opus.
