---
id: T-054
titulo: Crear recordatorios manuales
modulo: M3 — Alertas
capa: backend
estado: tomado
depende_de: [T-050, T-051]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-28, RF-080, RF-081, RF-082]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 18:17
rama: feature/T-054-crear-recordatorios-manuales
pr:
---
# T-054 Crear recordatorios manuales

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada persona crea recordatorios manuales en su agenda, opcionalmente asociados a un cliente, oportunidad o viaje que puede ver, y los edita mientras están pendientes.

## Criterios de aceptación
- [ ] `POST /alertas` crea una alerta `manual` con descripción y fecha; la asociación es a un registro visible para quien la crea (si no, 404) (RF-081).
- [ ] `PATCH /alertas/{id}` edita fecha o descripción solo de un recordatorio pendiente (409 si no) (A2).
- [ ] Un recordatorio sin asociación es personal (A1).

## Tests esperados
`tests/api/test_recordatorios.py`: `test_rf080_crear`, `test_rf081_asociar_a_registro_visible`, `test_rf082_editar_pendiente`, `test_rf082_editar_resuelto_409`.

## Contexto (leer solo esto)
- [[CU-28 Crear recordatorio manual]]
- Contrato: `src/packages/shared/openapi.json` (módulo `alertas`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/alertas.py`
- `src/backend/rumbo/presentacion/routers/alertas.py`

## Fuera de alcance
- —

## Notas de implementación
