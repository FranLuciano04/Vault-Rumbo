---
id: T-054
titulo: Crear recordatorios manuales
modulo: M3 — Alertas
capa: backend
estado: hecho
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
- [x] `POST /alertas` crea una alerta `manual` con descripción y fecha; la asociación es a un registro visible para quien la crea (si no, 404) (RF-081).
- [x] `PATCH /alertas/{id}` edita fecha o descripción solo de un recordatorio pendiente (409 si no) (A2).
- [x] Un recordatorio sin asociación es personal (A1).

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
- **Implementación (25/10/26):**
  - `POST /alertas` (201) crea un recordatorio `manual`, `pendiente` y propio, con la ayuda de `crear` (T-051). La entidad asociada se busca con la visibilidad del actor (`obtener_origen`): si no la ve o no existe, responde 404, que ahora figura en el contrato.
  - `PATCH /alertas/{id}` toma la alerta con `obtener_para_modificar` y después aplica `exigir_escritura`. Solo se puede editar un recordatorio `manual` (si no, `Conflicto` 409) que esté `pendiente` (la regla vive en `estados.alerta.editar` y da `TransicionInvalida` 409).
- **Decisión de Francisco (enmienda de DEC-0005, 25/10/26):** admin y dueña **atienden** las alertas ajenas, como en T-053 y la pantalla 49. El texto y la fecha de un recordatorio, en cambio, **solo los edita su propietario**: la dirección recibe 403 si lo intenta, y empleado y freelance reciben 404 porque no ven la alerta.
- **RN-08:** `resolver_de_origen` con `tipos=None` deja afuera los `manual`, así un cierre automático no cierra el recordatorio de un empleado.
- **Otras decisiones:** una fecha pasada en el POST se acepta, porque CU-28 no la restringe. `test_contrato_m3.py` ya no tiene stubs: se borró el test de 501.
- **Review (opus):** 0 bloqueantes, 2 importantes y 4 menores, todos arreglados.
  - Los importantes: la edición ajena por parte de la dirección, que se resolvió con la decisión de arriba, y la regla de «solo pendiente», que se pasó a la máquina de estados.
  - Los menores: el mock fiel, el test muerto, la auditoría y RN-08.
  - **Queda como estaba antes de este ticket:** `Alerta` expone `cliente_id`, `viaje_id` y `oportunidad_id` en crudo, aunque el `contexto` salga `null`.
- **Modelos:** sonnet en tests, implementación y refactor (sin cambios); opus en la review. No hubo escalados.
