---
id: T-095
titulo: Revertir un cobro registrado por error
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-094]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-12, RF-070]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 11:46
rama: feature/T-095-revertir-un-cobro-registrado-por-error
pr:
---
# T-095 Revertir un cobro registrado por error

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Un cobro cargado por error se revierte: el pago vuelve a pendiente o vencido, su alerta se reabre y el viaje retrocede si el cobro lo había hecho avanzar.

## Criterios de aceptación
- [ ] `POST /pagos/{id}/revertir-cobro` sobre un pago `pagado`; sobre otro estado → 409.
- [ ] Si el viaje estaba `confirmado` por saldo cero vuelve a `vendido`; si era el único cobro, vuelve a `reservado` (A3).
- [ ] La alerta del pago se reabre.

## Tests esperados
`tests/api/test_cobros.py`: `test_rf070_revertir`, `test_rf070_vuelve_a_vendido`, `test_rf070_unico_cobro_vuelve_a_reservado`, `test_rf070_reabre_alerta`.

## Contexto (leer solo esto)
- [[CU-12 Registrar cobro de un pago]] — A3
- [[EST-Pago]]
- [[EST-Viaje]]

## Archivos probables
- `src/backend/rumbo/negocio/servicios/economia.py`

## Fuera de alcance
- —

## Notas de implementación
- **Implementación (30/10/26, Francisco):**
  - `economia.revertir_cobro` sigue el patrón de `registrar_cobro`.
    - Lee el pago con visibilidad: un pago ajeno da 404.
    - Bloquea el viaje (`obtener_para_modificar`) y exige escritura: quien no puede escribir recibe 403.
    - Vuelve a leer el pago con el viaje bloqueado.
    - Aplica `estado_pago.revertir_cobro`: el pago pasa a `pendiente` o `vencido` según su vencimiento, y se limpian los 5 datos del cobro.
    - Aplica `estado_viaje.al_revertir_cobro`: `confirmado` pasa a `vendido`, y a `reservado` si no queda ningún cobro.
    - Reabre las alertas del pago con `reabrir_de_origen`.
  - Un viaje `en_curso`, `finalizado` o `cancelado` da 409 por `TransicionInvalida`, y el rollback del pedido deja el pago intacto.
  - `test_contrato_m6.py` suma la ruta a `_IMPLEMENTADAS` (`--tocar-tests`).
  - Review de seguridad (Sonnet): 0 bloqueantes, 0 importantes y 2 menores, anotados sin arreglar.
    1. Al revertir se reabre también una alerta del pago que alguien había resuelto a mano antes del cobro. Para distinguirlas, se podría filtrar como `solo_por_cancelacion`. Es una decisión de negocio.
    2. No hay un test de revertir sobre un viaje `cancelado`. Hoy da 409. CU-12 no lo define y la cancelación es T-099, así que no se fijó el comportamiento.
  - Modelos: tests con Sonnet; implementación y refactor con Opus (el refactor, sin cambios); review con Sonnet.
