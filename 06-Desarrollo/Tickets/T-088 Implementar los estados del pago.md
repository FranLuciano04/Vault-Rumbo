---
id: T-088
titulo: Implementar los estados del pago
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-007, T-009]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-11, CU-12, RF-066, RF-067, RF-070]
origen: plan
asignado: palomap2003
tomado_el: 29/10/26 16:05
rama: feature/T-088-implementar-los-estados-del-pago
pr:
---
# T-088 Implementar los estados del pago

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`negocio/estados/pago.py` aplica EST-Pago: cobrar un pago pendiente o vencido, revertir el cobro, anular y vencer.

## Criterios de aceptación
- [ ] Transiciones de EST-Pago implementadas; las inválidas (cobrar uno anulado o pagado, anular uno pagado) lanzan `TransicionInvalida`.
- [ ] Revertir un cobro vuelve a `pendiente` o `vencido` según la fecha.
- [ ] Vencer solo aplica a pendientes con fecha pasada.

## Tests esperados
`tests/negocio/test_estados_pago.py`: una prueba por transición válida e inválida.

## Contexto (leer solo esto)
- [[EST-Pago]]
- [[CU-11 Definir plan de cuotas]]
- [[CU-12 Registrar cobro de un pago]]

## Archivos probables
- `src/backend/rumbo/negocio/estados/pago.py`

## Fuera de alcance
- El plan de pagos y los cobros (tickets propios).

## Notas de implementación
- Funciones puras sobre `Pago` (patrón de `estados/viaje.py`): `cobrar` (T2/T4), `vencer(hoy=)` (T3), `revertir_cobro(hoy=)` (T6), `anular` (T5/T7/T8) y `revertir_anulacion(hoy=)` (T10). Validan antes de mutar: una transición inválida deja el pago intacto.
- Decisiones: vencimiento == hoy cuenta como no vencido; `vencer` fuera de condición lanza `TransicionInvalida`; `revertir_cobro` limpia los datos del cobro (CU-12 A3 corrige un error de carga); se incluyó T10 por estar en EST-Pago. T9 (reprogramar, `vencido → pendiente`) queda para el ticket del plan de cuotas.
- Menores de la review que quedan para otros tickets: el proceso diario debe filtrar `pendiente` con `vencimiento < hoy` antes de llamar `vencer`; el servicio de cobro valida la guarda de T2 (forma, moneda y tipo de cambio) antes de `cobrar`; la reversión del cobro debe quedar auditada (`updated_by`, log); los servicios calculan `hoy` en `America/Argentina/Buenos_Aires`. Faltan dos tests de borde baratos (`revertir_anulacion` con vencimiento == hoy y datos del cobro intactos ante un `revertir_cobro` inválido).
- Modelos: tests sonnet, implementación y refactor opus (refactor sin cambios), review sonnet (`reviewer-seguridad`). Sin escalados.
