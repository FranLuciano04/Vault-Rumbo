---
tipo: caso-uso
estado: en-revision
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 10/09/26
---
# CU-12 Registrar cobro de un pago

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Marcar un [[Pago]] como cobrado y actualizar el estado económico del [[Viaje]]. El sistema **registra** el cobro; no procesa pagos online ([[Alcance y fuera de alcance]]).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
-

## Precondiciones
- Existe un [[Pago]] en estado `pendiente` o `vencido` para el [[Viaje]].

## Flujo principal
1. El empleado abre el [[Viaje]] y ubica el [[Pago]] a cobrar.
2. Registra el cobro: fecha efectiva (`dd/mm/aa`) y, como dato informativo, el medio.
3. El sistema cambia el estado del [[Pago]] a `pagado`.
4. El sistema resuelve la [[Alerta]] de vencimiento asociada a ese [[Pago]].
5. El sistema actualiza el saldo pendiente del [[Viaje]] (suma de [[Pago|Pagos]] no cobrados).

## Flujos alternativos
- **A1 — Pago vencido:** si el [[Pago]] estaba `vencido`, igual pasa a `pagado` y se resuelve su [[Alerta]].
- **A2 — Último pago:** al quedar el saldo en cero, el sistema marca el [[Viaje]] como saldado (dato para reportes; no cambia su `estado` operativo).
- **A3 — Corregir cobro:** si se registró por error, el empleado revierte el cobro y el [[Pago]] vuelve a `pendiente`/`vencido` y su [[Alerta]] se reabre.

## Postcondiciones
- El [[Pago]] queda `pagado`, su [[Alerta]] resuelta y el saldo del [[Viaje]] actualizado.

## Reglas de negocio aplicadas
- Sin cobro online: solo registro de montos y vencimientos ([[Pago]]). Ver [[Alcance y fuera de alcance]].

## Entidades del dominio involucradas
- [[Pago]] · [[Alerta]] · [[Viaje]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Nahuel (10/09): validado — el [[Pago]] es **indivisible** (se cobra completo, sin cobros parciales). Ratificar en sync.
