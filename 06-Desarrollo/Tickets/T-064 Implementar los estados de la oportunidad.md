---
id: T-064
titulo: Implementar los estados de la oportunidad
modulo: M4 — Oportunidades y cotizaciones
capa: backend
estado: hecho
depende_de: [T-063]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-05, RF-016, RF-017, RF-020, DEC-0002]
origen: plan
asignado: palomap2003
tomado_el: 26/10/26 18:07
rama: feature/T-064-implementar-los-estados-de-la-oportunida
pr:
---
# T-064 Implementar los estados de la oportunidad

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La oportunidad avanza y se cierra solo por las transiciones de EST-Oportunidad: pasar a en gestión, perder con motivo, reactivar una perdida y ganar sin cotización formal.

## Criterios de aceptación
- [ ] `negocio/estados/oportunidad.py` implementa EST-Oportunidad; cada acción `POST` aplica una transición y las inválidas → 409.
- [ ] Perder exige un motivo del enum (422 si falta) (A2); reactivar vuelve al estado que define EST-Oportunidad (A3).
- [ ] Ganar sin cotización deja la oportunidad lista para confirmar la reserva (A4).

## Tests esperados
`tests/negocio/test_estados_oportunidad.py`: cada transición válida e inválida; `tests/api/…`: `test_rf017_perder_con_motivo`, `test_rf020_reactivar`, `test_rf016_ganar_sin_cotizacion`.

## Contexto (leer solo esto)
- [[EST-Oportunidad]]
- [[CU-05 Seguir oportunidad]] — A2, A3 y A4
- [[DEC-0002 Modelar la consulta como Oportunidad|DEC-0002]]
- Contrato: `src/packages/shared/openapi.json` (módulo `oportunidades`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/estados/oportunidad.py`
- `src/backend/rumbo/negocio/servicios/oportunidades.py`

## Fuera de alcance
- Pasar a `cotizada` (lo hace la cotización) y crear el viaje (M6).

## Notas de implementación
- **Modelos:** tests con sonnet; verde, refactor y fix con opus; review de seguridad con sonnet. No hubo escalados. El refactor no cambió nada.
- **Contrato:** un segundo commit `test(T-064)` sumó las 4 acciones a `IMPLEMENTADAS` en `test_contrato_m4.py`, como T-052 y T-063. Siguen en 501 las 9 rutas restantes de M4.
- **Decisiones (EST-Oportunidad manda sobre el CU):** ganar vale desde `nueva`, `en_gestion` y `cotizada` (T4). Perder y ganar resuelven las alertas pendientes o vistas de la oportunidad con `resolver_de_origen`, sin tocar las `manual` (RN-08). Reactivar vuelve a `en_gestion` y limpia el motivo (lo exige también el CHECK `oportunidad_motivo_perdida_ck`), pero no reabre las alertas resueltas al perder.
- **Permisos:** los mismos que el PATCH de T-063, en el orden 404 (visibilidad) → 403 (escritura) → 409 (transición). Así, un empleado no responsable no puede deducir el estado de una oportunidad ajena.
- **Concurrencia (hallazgo de la review, DEC-0019):** las transiciones y el PATCH leen con `RepositorioOportunidades.obtener_para_modificar` (`with_for_update`), igual que alertas. Antes, perder y ganar en paralelo terminaban en un 500 por el CHECK. `tests/api/test_oportunidades_concurrencia.py` lo fija con conexiones separadas y commit real: es el primer test del repo que confirma en la base, y borra lo que crea en un `finally`.
- **Hallazgos de la review:** 0 bloqueantes, 1 importante y 2 menores, todos arreglados. El importante: ningún test fijaba el 403 antes del 409 (sobrevivía la mutación de invertir el orden). Los menores: casos de API que faltaban (ganar desde `cotizada`, alerta `vista`, reactivar sin reabrir) y el bloqueo de fila. Se autorizó tocar los tests.
