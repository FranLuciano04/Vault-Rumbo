---
tipo: caso-uso
estado: en-revision
modulo: [viajes]
responsable: Francisco
pc: pc1
actualizado: 11/09/26
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
4. El sistema pasa los [[Pago|Pagos]] `pendientes` del plan a estado **`anulado`** (baja lógica: dejan de ser exigibles pero se conservan) y **resuelve** las [[Alerta|Alertas]] vigentes del viaje.
5. El sistema deja constancia de que la **comisión proyectada no se realiza** ([[RN-01 Comisión automática]]).
6. El [[Viaje]] permanece en el historial (baja lógica; no se elimina).

## Flujos alternativos
- **A1 — Viaje finalizado:** si el [[Viaje]] ya está `finalizado`, no se cancela; el sistema lo impide.
- **A2 — Pagos ya cobrados:** si hay [[Pago|Pagos]] `pagados`, el sistema informa el importe cobrado; el **reembolso/penalidad queda fuera de alcance** (Rumbo no procesa pagos online — [[Alcance y fuera de alcance]]), solo se documenta el saldo.
- **A3 — Revertir cancelación:** si fue un error y el [[Viaje]] no está `finalizado`, el empleado reactiva el viaje y se reponen sus [[Pago|Pagos]]/[[Alerta|Alertas]].

## Postcondiciones
- El [[Viaje]] queda en `cancelado`, con sus [[Pago|Pagos]] pendientes en estado `anulado` y sus [[Alerta|Alertas]] cerradas, preservando el historial.

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]: al cancelar, la comisión proyectada no se realiza.
- Sin pagos online: reembolsos/penalidades fuera de alcance ([[Alcance y fuera de alcance]]).

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]] · [[Cliente]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!question] Nahuel (10/09): **borrador propuesto para cubrir el gap de baja de [[Viaje]]** (revisión de cobertura ABM). A validar por **Francisco** (dueño del módulo Viajes): (1) se agrega `cancelado` como estado terminal de [[Viaje]]; (2) el tratamiento de reembolsos/penalidades ante pagos cobrados (A2) — confirmar si queda fuera de alcance; (3) si conviene como CU propio o como estado dentro de [[CU-08 Gestionar estado del viaje]].
>
> [!note] Francisco (11/09) — **validado.** Resuelvo las tres dudas de Nahuel: (1) **sí**, `cancelado` es estado terminal de [[Viaje]] (ya está en la entidad); (2) **reembolsos/penalidades fuera de alcance** para PC1 (Rumbo registra el saldo cobrado, no procesa devoluciones — [[Alcance y fuera de alcance]]); (3) **queda como CU propio** (la cancelación tiene efectos colaterales sobre [[Pago|Pagos]] y [[Alerta|Alertas]] que justifican separarlo de [[CU-08 Gestionar estado del viaje]]). Pasa a `en-revision`. Gracias Nahuel por el borrador.
