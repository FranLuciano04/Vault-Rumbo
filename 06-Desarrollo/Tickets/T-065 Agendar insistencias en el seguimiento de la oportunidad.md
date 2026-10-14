---
id: T-065
titulo: Agendar insistencias en el seguimiento de la oportunidad
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: libre
depende_de: [T-064, T-051]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-014, RF-015, RF-018, RF-019]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-065 Agendar insistencias en el seguimiento de la oportunidad

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El seguimiento de una oportunidad registra interacciones y agenda insistencias como alertas; al cerrarse la oportunidad, sus insistencias pendientes se resuelven solas.

## Criterios de aceptación
- [ ] Registrar una interacción de seguimiento queda en la oportunidad (RF-014).
- [ ] `POST /oportunidades/{id}/insistencias` crea una alerta `insistencia` con origen en la oportunidad; se puede reagendar si no hubo respuesta (A1, RF-019).
- [ ] Ganar o perder resuelve las insistencias pendientes (RF-018).

## Tests esperados
`tests/api/test_insistencias.py`: `test_rf014_interaccion`, `test_rf015_agendar_insistencia`, `test_rf019_reagendar`, `test_rf018_cerrar_resuelve_insistencias`.

## Contexto (leer solo esto)
- [[CU-05 Seguir oportunidad]] — flujo principal y A1
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/oportunidades.py`

## Fuera de alcance
- Las alertas en la agenda (M3).

## Notas de implementación
