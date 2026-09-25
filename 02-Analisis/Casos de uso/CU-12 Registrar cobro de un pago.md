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
2. Registra el cobro: **fecha efectiva** (`dd/mm/aa`), **forma de pago** (`forma_pago`: efectivo · transferencia · tarjeta · cheque · depósito) y la **moneda real** del cobro (`moneda_pago`: ARS / USD). Si `moneda_pago` **difiere** de la moneda de referencia del [[Viaje]], carga el **tipo de cambio** (`tipo_cambio`) del día; el sistema calcula el `monto_cobrado` real.
3. El sistema cambia el estado del [[Pago]] a `pagado`.
4. El sistema resuelve la [[Alerta]] de vencimiento asociada a ese [[Pago]].
5. El sistema actualiza el saldo pendiente del [[Viaje]] (suma de los `monto` planificados de los [[Pago|Pagos]] no cobrados, en la moneda de referencia) y el **porcentaje pagado** del total, y refleja el **checklist de pagos** (pagas / por pagar). Ver [[Alcance y fuera de alcance]] (Economía: checklist y % pagado).

## Flujos alternativos
- **A1 — Pago vencido:** si el [[Pago]] estaba `vencido`, igual pasa a `pagado` y se resuelve su [[Alerta]].
- **A0 — Cobro de la seña:** si el [[Pago]] cobrado es la **seña** y el [[Viaje]] estaba `reservado`, pasa a **`vendido`** ([[CU-08 Gestionar estado del viaje]]).
- **A2 — Último pago (viaje saldado):** al quedar el saldo en cero, el sistema pasa el [[Viaje]] de `vendido` a **`confirmado`** (= total pagado), su hito económico dentro del ciclo del viaje ([[CU-08 Gestionar estado del viaje]]).
- **A3 — Corregir cobro:** si se registró por error, el empleado revierte el cobro y el [[Pago]] vuelve a `pendiente`/`vencido` y su [[Alerta]] se reabre. Si el [[Viaje]] había pasado a `confirmado` por saldo cero, vuelve a `vendido`.

## Postcondiciones
- El [[Pago]] queda `pagado`, su [[Alerta]] resuelta y el saldo del [[Viaje]] actualizado.

## Reglas de negocio aplicadas
- Sin cobro online: solo registro de montos y vencimientos ([[Pago]]). Ver [[Alcance y fuera de alcance]].
- **Multimoneda por cobro (Q6.1):** la `moneda_pago` y el `tipo_cambio` se registran acá, al cobrar; un mismo viaje puede cobrarse parte en ARS y parte en USD. El % pagado y el saldo se calculan sobre los `monto` planificados en la moneda de referencia del [[Viaje]] ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- `forma_pago` capturada al cobrar; alimenta el reporte de **formas de pago** ([[CU-22 Generar reportes y estadísticas]]).

## Entidades del dominio involucradas
- [[Pago]] · [[Alerta]] · [[Viaje]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · [[DGM-ACT — Registrar cobro de un pago]] (actividad)

## 🔎 Revisión
> [!note] Nahuel (10/09): validado — el [[Pago]] es **indivisible** (se cobra completo, sin cobros parciales). Ratificar en sync.
>
> [!note] Nahuel (18/09, entrevista grill) — se suma la captura de `forma_pago` (Q7) y de la **moneda real + tipo de cambio** del cobro (Q6.1, multimoneda por pago). A ratificar en sync.
