---
id: T-053
titulo: Atender las alertas con el progreso del día
modulo: M3 — Alertas
capa: backend
estado: tomado
depende_de: [T-052]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-076, RF-077, RF-155]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 17:34
rama: feature/T-053-atender-las-alertas-con-el-progreso-del
pr:
---
# T-053 Atender las alertas con el progreso del día

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la agenda se marca una alerta como vista, se la resuelve o se la pospone, y se consulta el progreso del día.

## Criterios de aceptación
- [ ] `POST /alertas/{id}/vista|resolver|posponer` aplican EST-Alerta; posponer exige una fecha futura (422).
- [ ] `GET /alertas/progreso-del-dia` cuenta las resueltas hoy sobre el total del día.
- [ ] Una alerta de pago no se resuelve a mano: se resuelve al cobrar (409 con el motivo) (A2).

## Tests esperados
`tests/api/test_alertas.py`: `test_rf076_resolver`, `test_rf077_posponer`, `test_rf155_progreso_del_dia`, `test_rf079_alerta_de_pago_no_se_resuelve_a_mano`.

## Contexto (leer solo esto)
- [[CU-14 Ver y atender alertas del día]] — A2 y A4
- [[EST-Alerta]]
- Contrato: `src/packages/shared/openapi.json` (módulo `alertas`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/alertas.py`
- `src/backend/rumbo/presentacion/routers/alertas.py`

## Fuera de alcance
- El «Deshacer» del prototipo: el front demora el envío; si hace falta un endpoint, es un cambio de contrato (preguntar).

## Notas de implementación
- **Del plan:** Confirmar en CU-14 A2 si la alerta de pago se puede resolver a mano; si el CU dice otra cosa, manda el CU.
- **De la review de T-051 (25/10/26):** el endpoint que marca vista, resuelve o pospone una alerta tiene que leerla con `FOR UPDATE` (`with_for_update()` y `populate_existing`). Si no, puede chocar con un cierre automático que corre al mismo tiempo (`resolver_de_origen`), violar `alerta_resuelta_en_ck` y responder 500 en lugar de 409. Para posponer se usa `estados.alerta.posponer`, que por defecto compara contra `core.fechas.hoy()`.
