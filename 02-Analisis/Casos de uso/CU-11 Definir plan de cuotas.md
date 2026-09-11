---
tipo: caso-uso
estado: en-revision
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 10/09/26
---
# CU-11 Definir plan de cuotas

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

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
3. Para cada [[Pago]] carga: `monto` (ARS), `tipo` (seña · cuota · saldo) y `vencimiento` (`dd/mm/aa`).
4. El sistema valida que la suma de los [[Pago|Pagos]] coincida con el `precioVenta` del [[Viaje]].
5. El sistema guarda los [[Pago|Pagos]] en estado `pendiente`.
6. El sistema genera una [[Alerta]] de vencimiento por cada [[Pago]] (aviso un mes antes).

## Flujos alternativos
- **A1 — La suma no coincide:** `Σ montos ≠ precioVenta` → el sistema rechaza y muestra la diferencia hasta corregir.
- **A2 — Pago único:** sin cuotas, se crea un solo [[Pago]] `saldo` por el total.
- **A3 — Reprogramar:** mientras un [[Pago]] siga `pendiente`, se pueden editar monto o vencimiento; el sistema reagenda su [[Alerta]].
- **A4 — Anular un pago:** mientras esté `pendiente`, el empleado anula un [[Pago]] del plan (cambió el esquema); el sistema lo elimina, cierra su [[Alerta]] y vuelve a exigir que `Σ montos = precioVenta`.

## Postcondiciones
- El [[Viaje]] queda con su plan de [[Pago|Pagos]] definido y las [[Alerta|Alertas]] de vencimiento agendadas.

## Reglas de negocio aplicadas
- _(candidata)_ La suma de [[Pago|Pagos]] debe igualar el `precioVenta` del [[Viaje]] — ver Revisión.

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Alerta]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Nahuel (10/09): validado — la regla "Σ pagos = precioVenta" queda como regla del CU (sin RN propia por ahora) y el aviso "un mes antes" ([[Alerta]], [[CU-01 De la consulta a la venta]] A2) se mantiene. Ratificar en sync.
