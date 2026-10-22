---
id: T-032
titulo: Configurar los requisitos de cada destino
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: [T-031]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-15, RF-086, RF-087, RF-088, RF-034]
origen: plan
asignado:
tomado_el:
rama:
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
