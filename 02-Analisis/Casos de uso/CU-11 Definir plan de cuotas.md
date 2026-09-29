---
tipo: caso-uso
estado: formalizado
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-11 Definir plan de cuotas

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Configurar los [[Pago|Pagos]] de un [[Viaje]] (seña, cuotas y saldo) con sus montos y vencimientos escalonados; el sistema agenda una [[Alerta]] de vencimiento por cada pago.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: recibe los recordatorios de vencimiento).

## Precondiciones
- El [[Viaje]] tiene su economía registrada ([[CU-10 Registrar economía del viaje]]), por lo que se conoce el `precioVenta`.

## Flujo principal
1. El empleado abre el [[Viaje]] y entra a **plan de pagos**.
2. Define la cantidad de cuotas y, opcionalmente, una **seña** inicial.
3. Para cada [[Pago]] carga: `monto` (en la **moneda de referencia del [[Viaje]]**, `Viaje.moneda`), `tipo` (seña · cuota · saldo) y `vencimiento` (`dd/mm/aa`). La **moneda real** con que se pagará cada cuota **no se fija acá**: se elige al cobrar ([[CU-12 Registrar cobro de un pago]]).
4. El sistema valida que la suma de los [[Pago|Pagos]] coincida con el `precioVenta` del [[Viaje]] (en la moneda de referencia).
5. El sistema guarda los [[Pago|Pagos]] en estado `pendiente`.
6. El sistema genera una [[Alerta]] de vencimiento por cada [[Pago]] (aviso un mes antes).

## Flujos alternativos
- **A1 — La suma no coincide:** `Σ montos ≠ precioVenta` → el sistema rechaza y muestra la diferencia hasta corregir.
- **A2 — Pago único:** sin cuotas, se crea un solo [[Pago]] `saldo` por el total.
- **A3 — Reprogramar:** mientras un [[Pago]] **no esté cobrado ni anulado** (`pendiente` o `vencido`), se pueden editar monto o vencimiento; el sistema reagenda su [[Alerta]]. Si estaba `vencido` y la fecha nueva es futura, vuelve a `pendiente` (21/09).
- **A4 — Anular un pago:** mientras **no esté cobrado** (es decir, `pendiente` **o** `vencido` — regla del 21/09), el empleado anula un [[Pago]] del plan (cambió el esquema); el sistema lo pasa a estado **`anulado`** (baja lógica, conserva el registro), cierra su [[Alerta]] y vuelve a exigir que `Σ montos = precioVenta` sobre los pagos no anulados.
- **A5 — Cambió el `precioVenta`:** si se edita la economía del [[Viaje]] ([[CU-10 Registrar economía del viaje]] A4) y el plan queda descalzado, el sistema exige rebalancear los [[Pago|Pagos]] `pendientes` hasta volver a cumplir `Σ montos = precioVenta`.
- **A6 — Dividir una cuota (pago parcial):** si el cliente va a pagar solo una parte de un [[Pago]] `pendiente` o `vencido`, el empleado lo divide en dos: uno por el importe que se cobra ahora y otro por el resto, con su propio vencimiento. Se sigue cumpliendo `Σ montos = precioVenta` y el sistema agenda la [[Alerta]] del pago nuevo. Después se cobra el primero en [[CU-12 Registrar cobro de un pago]] (el [[Pago]] es indivisible).

## Postcondiciones
- El [[Viaje]] queda con su plan de [[Pago|Pagos]] definido y las [[Alerta|Alertas]] de vencimiento agendadas.

## Reglas de negocio aplicadas
- La suma de los [[Pago|Pagos]] **no anulados** del plan debe igualar el `precioVenta` del [[Viaje]], **en la moneda de referencia del viaje** (`Viaje.moneda`).
- **Multimoneda (Q6.1):** el plan se denomina íntegro en la moneda de referencia, por eso `Σ montos = precioVenta` cierra exacto sin cotizaciones. Un mismo viaje puede luego cobrarse parte en ARS y parte en USD: la moneda real y el `tipo_cambio` se registran al cobrar cada cuota ([[CU-12 Registrar cobro de un pago]], [[Pago]], [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Nahuel (10/09): validado — la regla "Σ pagos = precioVenta" queda como regla del CU (sin RN propia por ahora) y el aviso "un mes antes" ([[Alerta]], [[CU-01 De la consulta a la venta]] A2) se mantiene. Ratificar en sync.
>
> [!note] Nahuel (18/09, entrevista grill) — **actualizado a multimoneda (Q6.1, a ratificar):** el plan se denomina en la moneda de referencia del [[Viaje]] (se quitó el "ARS" fijo); la moneda real de cada cobro se define en [[CU-12 Registrar cobro de un pago]]. A4 pasa a estado **`anulado`** (Q4) en vez de eliminar el pago.
