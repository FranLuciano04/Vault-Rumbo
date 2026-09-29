---
tipo: caso-uso
estado: formalizado
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-12 Registrar cobro de un pago

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

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
2. Registra el cobro: **fecha efectiva** (`dd/mm/aa`), **forma de pago** (`forma_pago`: efectivo · transferencia —incluye billeteras virtuales— · tarjeta de crédito · tarjeta de débito · cheque · depósito) y la **moneda real** del cobro (`moneda_pago`: ARS / USD). Si `moneda_pago` **difiere** de la moneda de referencia del [[Viaje]], carga el **tipo de cambio** (`tipo_cambio`) del día; el sistema calcula el `monto_cobrado` real.
3. El sistema cambia el estado del [[Pago]] a `pagado`.
4. El sistema resuelve la [[Alerta]] de vencimiento asociada a ese [[Pago]].
5. El sistema actualiza el saldo pendiente del [[Viaje]] (suma de los `monto` planificados de los [[Pago|Pagos]] no cobrados, en la moneda de referencia) y el **porcentaje pagado** del total, y refleja el **checklist de pagos** (pagas / por pagar). Ver [[Alcance y fuera de alcance]] (Economía: checklist y % pagado).

## Flujos alternativos
- **A1 — Pago vencido:** si el [[Pago]] estaba `vencido`, igual pasa a `pagado` y se resuelve su [[Alerta]].
- **A0 — Primer cobro del viaje:** si el [[Viaje]] estaba `reservado`, el **primer cobro, de cualquier tipo** (seña, cuota o pago único), lo pasa a **`vendido`** ([[CU-08 Gestionar estado del viaje]]). Así un plan **sin seña** (pago único, [[CU-11 Definir plan de cuotas]] A2) no deja el viaje trabado en `reservado`. Si con ese mismo cobro el saldo llega a cero, en la misma operación sigue a `confirmado` (A2): la secuencia se respeta, no se saltea `vendido`.
- **A2 — Último pago (viaje saldado):** al quedar el saldo en cero, el sistema pasa el [[Viaje]] de `vendido` a **`confirmado`** (= total pagado), su hito económico dentro del ciclo del viaje ([[CU-08 Gestionar estado del viaje]]).
- **A3 — Corregir cobro:** si se registró por error, el empleado revierte el cobro y el [[Pago]] vuelve a `pendiente`/`vencido` y su [[Alerta]] se reabre. Si el [[Viaje]] había pasado a `confirmado` por saldo cero, vuelve a `vendido`. Si ese era el **único cobro** del viaje (el que lo había pasado a `vendido` en A0), el [[Viaje]] vuelve a **`reservado`**.

## Postcondiciones
- El [[Pago]] queda `pagado`, su [[Alerta]] resuelta y el saldo del [[Viaje]] actualizado.

## Reglas de negocio aplicadas
- Sin cobro online: solo registro de montos y vencimientos ([[Pago]]). Ver [[Alcance y fuera de alcance]].
- **El [[Pago]] es indivisible:** se cobra completo, sin cobros parciales. Si el cliente paga solo una parte de una cuota, antes de cobrar se **divide la cuota en dos** en [[CU-11 Definir plan de cuotas]] A6 y se cobra la parte que corresponde. Si por el tipo de cambio el importe real difiere del planificado, la diferencia queda registrada en `monto_cobrado` y `tipo_cambio`; el saldo se sigue calculando sobre los `monto` planificados.
- **Multimoneda por cobro:** la `moneda_pago` y el `tipo_cambio` se registran acá, al cobrar; un mismo viaje puede cobrarse parte en ARS y parte en USD. El % pagado y el saldo se calculan sobre los `monto` planificados en la moneda de referencia del [[Viaje]] ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- `forma_pago` capturada al cobrar (las billeteras virtuales se registran como `transferencia`); alimenta el reporte de **formas de pago** ([[CU-22 Generar reportes y estadísticas]]).

## Entidades del dominio involucradas
- [[Pago]] · [[Alerta]] · [[Viaje]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]] · [[DGM-ACT — Registrar cobro de un pago]] (actividad) · [[DGM-SEC — Registrar cobro de un pago]] (secuencia, clases del sistema)

## 🔎 Revisión
> [!note] Nahuel (10/09): validado — el [[Pago]] es **indivisible** (se cobra completo, sin cobros parciales). Ratificar en sync.
>
> [!note] Nahuel (18/09, entrevista grill) — se suma la captura de `forma_pago` (Q7) y de la **moneda real + tipo de cambio** del cobro (Q6.1, multimoneda por pago). A ratificar en sync.
