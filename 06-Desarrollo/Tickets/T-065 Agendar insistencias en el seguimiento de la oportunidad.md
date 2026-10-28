---
id: T-065
titulo: Agendar insistencias en el seguimiento de la oportunidad
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: hecho
depende_de: [T-064, T-051]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-014, RF-015, RF-018, RF-019]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 27/10/26 20:47
rama: feature/T-065-agendar-insistencias-en-el-seguimiento-d
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
- **RF-014:** se cubre con el campo `notas` de la oportunidad (`PATCH`, T-063). Es un único campo editable, sin historial de interacciones; si el equipo quiere historial, hace falta otro ticket. `test_rf014_interaccion` ya pasaba en el rojo.
- **Reagendar (RF-019):** es un nuevo `POST` (la insistencia anterior no se toca) o posponer la alerta con `/alertas/{id}/posponer`.
- **RF-018:** ya funcionaba desde T-064 (`resolver_de_origen` al ganar o perder).
- La alerta siempre queda a nombre del responsable, aunque la agenden el admin o el dueño.
- **Review (opus):**
  - Agendar sobre una oportunidad `ganada` o `perdida` responde 422 (`exigir_agendable`). Lo decidió Nahuel: 422 en vez de 409, para no tocar el contrato.
  - También responde 422 una fecha de hoy o anterior.
  - `esquema_de_alerta` pasó a `presentacion/mapeos_alertas.py`, para que no haya imports entre routers.
  - Las fechas de los tests pasaron a ser relativas a `hoy()`.
- **Tests tocados con autorización:**
  - En `test_contrato_m4.py`, insistencias pasó a `IMPLEMENTADAS`.
  - En el fix se agregaron casos y se cambiaron las fechas de `test_insistencias.py`.
- **Modelos:** tests, implementación y refactor con sonnet (el refactor no tuvo cambios); review con opus. No hubo escalados.
