---
tipo: caso-uso
estado: en-revision
modulo: [viajes]
responsable: Francisco
pc: pc1
actualizado: 21/09/26
---
# CU-27 Cancelar viaje

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Dar de baja un [[Viaje]] que no se concreta (el cliente desiste, fuerza mayor), registrando el motivo, desactivando los [[Pago|Pagos]] pendientes y cerrando las [[Alerta|Alertas]] vigentes, sin perder el historial.

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
4. El sistema pasa los [[Pago|Pagos]] **no cobrados** del plan (`pendientes` **y** `vencidos` — regla del 21/09) a estado **`anulado`** (baja lógica: dejan de ser exigibles pero se conservan) y **resuelve** las [[Alerta|Alertas]] vigentes del viaje.
5. El sistema deja constancia de que la **comisión proyectada no se realiza** ([[RN-01 Comisión automática]]) — **salvo que el [[Viaje]] ya estuviera `en curso`**, donde el servicio ya se prestó y la comisión **se mantiene** (ver **A4**).
6. El [[Viaje]] permanece en el historial (baja lógica; no se elimina).

## Flujos alternativos
- **A1 — Viaje finalizado:** si el [[Viaje]] ya está `finalizado`, no se cancela; el sistema lo impide.
- **A2 — Pagos ya cobrados:** si hay [[Pago|Pagos]] `pagados`, el sistema informa el importe cobrado; el **reembolso/penalidad queda fuera de alcance** (Rumbo no procesa pagos online — [[Alcance y fuera de alcance]]), solo se documenta el saldo.
- **A3 — Revertir cancelación:** si fue un error y el [[Viaje]] no está `finalizado`, el empleado reactiva el viaje, que **vuelve al estado que tenía justo antes de cancelarse**; sus [[Pago|Pagos]] vuelven a `pendiente` o `vencido` según su fecha, y sus [[Alerta|Alertas]] se reabren (21/09).
- **A4 — Viaje ya iniciado (`en curso`):** si el [[Viaje]] estaba **`en curso`**, el servicio **ya se prestó** (total o parcialmente), así que la cancelación **no toca la economía ya realizada**: la **comisión del vendedor se mantiene** (no se revierte, a diferencia del paso 5) y los [[Pago|Pagos]] ya `pagados` quedan como están. Se anulan igual los [[Pago|Pagos]] **no cobrados** (paso 4), con lo cual `Σ montos` deja de coincidir con el `precioVenta` y pasa a reflejar **lo efectivamente cobrado** ([[CU-11 Definir plan de cuotas]] A4). Es la **interrupción** de un viaje en marcha, no una venta que no ocurrió. El reembolso o la penalidad por la parte no usada siguen **fuera de alcance** (A2). Decidido el 21/09 (borrador a ratificar).

## Postcondiciones
- El [[Viaje]] queda en `cancelado`, con sus [[Pago|Pagos]] pendientes en estado `anulado` y sus [[Alerta|Alertas]] cerradas, preservando el historial.
- Si el [[Viaje]] estaba `en curso` al cancelarse, **conserva además la comisión del vendedor** y los cobros ya registrados (A4).

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]: al cancelar, la comisión proyectada no se realiza **si el viaje no había empezado** (`reservado`, `vendido` o `confirmado`). Si estaba **`en curso`**, la comisión se mantiene porque el servicio se prestó (A4). La regla en sí no cambia: sigue valiendo lo de [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]; esto es cuándo se considera realizada.
- Sin pagos online: reembolsos/penalidades fuera de alcance ([[Alcance y fuera de alcance]]).

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]] · [[Cliente]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · [[DGM-ACT — Cancelar viaje]] (actividad)

## 🔎 Revisión
> [!question] Nahuel (10/09): **borrador propuesto para cubrir el gap de baja de [[Viaje]]** (revisión de cobertura ABM). A validar por **Francisco** (dueño del módulo Viajes): (1) se agrega `cancelado` como estado terminal de [[Viaje]]; (2) el tratamiento de reembolsos/penalidades ante pagos cobrados (A2) — confirmar si queda fuera de alcance; (3) si conviene como CU propio o como estado dentro de [[CU-08 Gestionar estado del viaje]].
>
> [!note] Nahuel (21/09) — **cancelar un viaje `en curso` ya no borra la comisión.** Al dibujar [[EST-Viaje]] se vio que `en curso → cancelado` (habilitado por la precondición de este CU) arrastraba el paso 5 completo: un viaje que **ya había empezado** perdía la comisión proyectada, cuando en los hechos la agencia **ya prestó el servicio** y ya se la ganó. Se agregó el flujo **A4**: desde `en curso` la cancelación es una **interrupción** y no toca la economía realizada (comisión y cobros quedan); solo se anulan las cuotas no cobradas. Se descartó crear un estado `interrumpido` aparte (costaba enum, entidad, [[DGM — Diagrama de clases|clases]], [[DGM-ER|ER]] y CU, para un caso de borde) y se descartó también sacar `en curso` de los orígenes posibles, porque el caso de fuerza mayor durante el viaje es real. **Borrador a ratificar en la sync**, junto con el resto del batch del 21/09.
>
> [!note] Francisco (11/09) — **validado.** Resuelvo las tres dudas de Nahuel: (1) **sí**, `cancelado` es estado terminal de [[Viaje]] (ya está en la entidad); (2) **reembolsos/penalidades fuera de alcance** para PC1 (Rumbo registra el saldo cobrado, no procesa devoluciones — [[Alcance y fuera de alcance]]); (3) **queda como CU propio** (la cancelación tiene efectos colaterales sobre [[Pago|Pagos]] y [[Alerta|Alertas]] que justifican separarlo de [[CU-08 Gestionar estado del viaje]]). Pasa a `en-revision`. Gracias Nahuel por el borrador.
