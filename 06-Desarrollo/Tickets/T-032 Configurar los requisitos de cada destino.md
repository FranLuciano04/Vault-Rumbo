---
id: T-032
titulo: Configurar los requisitos de cada destino
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
depende_de: [T-031]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-15, RF-086, RF-087, RF-088, RF-034]
origen: plan
asignado: palomap2003
tomado_el: 22/10/26 18:56
rama: feature/T-032-configurar-los-requisitos-de-cada-destin
pr:
---
# T-032 Configurar los requisitos de cada destino

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña definen los requisitos de cada destino (visa, vacunación, documentación…) con su anticipación, que después generan alertas al confirmar una reserva.

## Criterios de aceptación
- [ ] Listar, agregar, editar y dar de baja (lógica) requisitos de un destino.
- [ ] Editar un requisito no modifica las alertas ya emitidas (RF-087).
- [ ] Datos inválidos → 422; escritura solo `admin`/`dueno`.

## Tests esperados
`tests/api/test_requisitos.py`: `test_rf086_agregar_requisito`, `test_rf087_editar_no_toca_alertas_emitidas`, `test_rf088_baja_logica`.

## Contexto (leer solo esto)
- [[CU-15 Configurar recordatorios por destino]]
- Contrato: `src/packages/shared/openapi.json` (módulo `configuracion`) y [[Contrato de la API (OpenAPI)]] §Convenciones
- [[RequisitoDestino]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/configuracion.py`
- `src/backend/rumbo/presentacion/routers/configuracion.py`

## Fuera de alcance
- Generar las alertas al confirmar la reserva (M6).

## Notas de implementación
- **Sumado el 22/10/26 (hallazgo T-031):** seguir el patrón de destinos de T-031 (repositorio, servicio y router con `ActorDep`) y sumar las rutas de requisitos a `IMPLEMENTADAS` en `test_contrato_m1.py` (la convención autorizada).
- **Hecho:** `RepositorioRequisitos` (activos de un destino, ordenados por nombre normalizado, paginados), servicio en `configuracion.py` y las 4 rutas con `ActorDep`. Escritura solo `admin`/`dueno` (403 antes de leer); lectura para todos los roles. Destino inexistente → 404; crear y listar funcionan con el destino de baja. Baja idempotente. `descripcion: null` vacía el campo; un `null` en un campo obligatorio da 422. RF-087: `Alerta` no tiene referencia a `RequisitoDestino`, así que editar o dar de baja no puede tocar alertas emitidas (con test).
- **Esquema:** `RequisitoDestino` con `from_attributes` y un validador `before` que pasa el enum `TipoRequisito` a texto (sin cambios en el contrato).
- **Tests de soporte (`--tocar-tests`):** las 4 rutas en `IMPLEMENTADAS` de `test_contrato_m1.py` y `ruff format` de `test_requisitos.py` (solo saltos de línea; lo pedía el lint del CI).
- **Desvío, autorizado por Paloma:** `concurrency = ["greenlet", "thread"]` en `[tool.coverage.run]` de `pyproject.toml`, que adelanta T-148. Sin eso, la cobertura de `negocio/` daba 79,93 % y el CI fallaba; con eso da 99 %. T-148 queda por cerrar solo verificando.
- **Hallazgo importante, a un ticket aparte (decisión de Paloma):** un `anticipacion_dias` fuera del rango de INTEGER da 500 en vez de 422. Pasa lo mismo en `ConfiguracionEditar`. Ticket transversal: traducir el `DataError` de Postgres a 422.
- **Menor:** se puede editar un requisito dado de baja (200). No lo contradice CU-15, y no hay ruta para reactivarlo. ✅ Decidido el 24/10/26 por Francisco: pasa a 404 (CU-15 A3). Se implementa en T-042.
- **Modelos:** tests sonnet, implementación/refactor/fix sonnet, review opus. Sin escalados.
