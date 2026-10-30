---
tipo: caso-uso
estado: formalizado
modulo: [viajes]
responsable: Francisco
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-27 Cancelar viaje

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Dar de baja un [[Viaje]] que no se concreta (el cliente desiste, fuerza mayor), registrando el motivo, anulando los [[Pago|Pagos]] no cobrados y cerrando las [[Alerta|Alertas]] vigentes, sin perder el historial.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: origen de la cancelación).

## Precondiciones
- Existe un [[Viaje]] en estado `reservado`, `vendido`, `confirmado` o `en curso` (no `finalizado` ni ya `cancelado`).

## Flujo principal
1. El empleado abre el [[Viaje]] y elige **cancelar**.
2. Registra el **motivo** y la fecha de cancelación (`dd/mm/aa`).
3. El sistema cambia el `estado` del [[Viaje]] a **`cancelado`**.
4. El sistema pasa los [[Pago|Pagos]] **no cobrados** del plan (`pendientes` **y** `vencidos`) a estado **`anulado`** (baja lógica: dejan de ser exigibles pero se conservan) y **resuelve** las [[Alerta|Alertas]] vigentes del viaje, **marcándolas como cerradas por la cancelación** (`cerrada_por_cancelacion`).
5. El sistema deja constancia de que la **comisión proyectada no se realiza** ([[RN-01 Comisión automática]]) — **salvo que el [[Viaje]] ya estuviera `en curso`**, donde el servicio ya se prestó y la comisión **se mantiene** (ver **A4**).
6. El [[Viaje]] permanece en el historial (baja lógica; no se elimina).

## Flujos alternativos
- **A1 — Viaje finalizado:** si el [[Viaje]] ya está `finalizado`, no se cancela; el sistema lo impide.
- **A2 — Pagos ya cobrados:** si hay [[Pago|Pagos]] `pagados`, el sistema informa el importe cobrado; el **reembolso/penalidad queda fuera de alcance** (Rumbo no procesa pagos online — [[Alcance y fuera de alcance]]), solo se documenta el saldo.
- **A3 — Revertir cancelación:** si fue un error y el [[Viaje]] no está `finalizado`, el empleado reactiva el viaje, que **vuelve al estado que tenía justo antes de cancelarse**; los [[Pago|Pagos]] que anuló la cancelación (marcados con `anulado_por_cancelacion`, [[DEC-0024 Pagos anulados por la cancelación|DEC-0024]]) vuelven a `pendiente` o `vencido` según su fecha, y los anulados antes por otro motivo siguen anulados; y se reabren **solo las [[Alerta|Alertas]] que cerró la cancelación** (las marcadas en el paso 4); las que ya estaban resueltas por otro motivo (un pago cobrado, un formulario entregado) no vuelven. Si el paso 5 había dejado constancia de que la comisión no se realizaba, esa constancia se anula y la **comisión vuelve a quedar proyectada** ([[RN-01 Comisión automática]]).
- **A4 — Viaje ya iniciado (`en curso`):** si el [[Viaje]] estaba **`en curso`**, el servicio **ya se prestó** (total o parcialmente), así que la cancelación **no toca la economía ya realizada**: la **comisión del vendedor se mantiene** (no se revierte, a diferencia del paso 5) y los [[Pago|Pagos]] ya `pagados` quedan como están. Se anulan igual los [[Pago|Pagos]] **no cobrados** (paso 4), con lo cual `Σ montos` deja de coincidir con el `precioVenta` y pasa a reflejar **lo efectivamente cobrado** ([[CU-11 Definir plan de cuotas]] A4). Es la **interrupción** de un viaje en marcha, no una venta que no ocurrió. El reembolso o la penalidad por la parte no usada siguen **fuera de alcance** (A2).

## Postcondiciones
- El [[Viaje]] queda en `cancelado`, con sus [[Pago|Pagos]] no cobrados (`pendientes` y `vencidos`) en estado `anulado` y sus [[Alerta|Alertas]] cerradas, preservando el historial.
- Si el [[Viaje]] estaba `en curso` al cancelarse, **conserva además la comisión del vendedor** y los cobros ya registrados (A4).

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]: al cancelar, la comisión proyectada no se realiza **si el viaje no había empezado** (`reservado`, `vendido` o `confirmado`). Si estaba **`en curso`**, la comisión se mantiene porque el servicio se prestó (A4). El cálculo de la comisión no cambia; esta regla solo define cuándo se considera realizada.
- Sin pagos online: reembolsos/penalidades fuera de alcance ([[Alcance y fuera de alcance]]).

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]] · [[Cliente]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · [[DGM-ACT — Cancelar viaje]] (actividad) · [[DGM-SEC — Cancelar viaje]] (secuencia, clases del sistema)

## 🔎 Revisión
> [!question] Nahuel (10/09): **borrador propuesto para cubrir el gap de baja de [[Viaje]]** (revisión de cobertura ABM). A validar por **Francisco** (dueño del módulo Viajes): (1) se agrega `cancelado` como estado terminal de [[Viaje]]; (2) el tratamiento de reembolsos/penalidades ante pagos cobrados (A2) — confirmar si queda fuera de alcance; (3) si conviene como CU propio o como estado dentro de [[CU-08 Gestionar estado del viaje]].
>
> [!note] Nahuel (21/09) — **cancelar un viaje `en curso` ya no borra la comisión.** Al dibujar [[EST-Viaje]] se vio que `en curso → cancelado` (habilitado por la precondición de este CU) arrastraba el paso 5 completo: un viaje que **ya había empezado** perdía la comisión proyectada, cuando en los hechos la agencia **ya prestó el servicio** y ya se la ganó. Se agregó el flujo **A4**: desde `en curso` la cancelación es una **interrupción** y no toca la economía realizada (comisión y cobros quedan); solo se anulan las cuotas no cobradas. Se descartó crear un estado `interrumpido` aparte (costaba enum, entidad, [[DGM — Diagrama de clases|clases]], [[DGM-ER|ER]] y CU, para un caso de borde) y se descartó también sacar `en curso` de los orígenes posibles, porque el caso de fuerza mayor durante el viaje es real. **Borrador a ratificar en la sync**, junto con el resto del batch del 21/09.
>
> [!note] Francisco (11/09) — **validado.** Resuelvo las tres dudas de Nahuel: (1) **sí**, `cancelado` es estado terminal de [[Viaje]] (ya está en la entidad); (2) **reembolsos/penalidades fuera de alcance** para PC1 (Rumbo registra el saldo cobrado, no procesa devoluciones — [[Alcance y fuera de alcance]]); (3) **queda como CU propio** (la cancelación tiene efectos colaterales sobre [[Pago|Pagos]] y [[Alerta|Alertas]] que justifican separarlo de [[CU-08 Gestionar estado del viaje]]). Pasa a `en-revision`. Gracias Nahuel por el borrador.
