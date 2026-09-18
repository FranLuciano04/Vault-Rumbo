---
tipo: entidad
estado: borrador
modulo: [economia]
responsable:
pc: pc1
actualizado: 18/09/26
---
# Pago

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Registro de un pago o cuota de un [[Viaje]], con vencimiento y estado. El sistema **registra**, no cobra online ([[Alcance y fuera de alcance]]).

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| monto | Decimal | Importe **planificado**, en la **moneda de referencia del [[Viaje]]** (`Viaje.moneda`). La regla `Σ montos = precioVenta` se valida en esa moneda (ver Reglas y [[CU-11 Definir plan de cuotas]]) |
| tipo | Enum | seña · cuota · saldo |
| vencimiento | Date (dd/mm/aa) | Fecha límite |
| estado | Enum | `pendiente · pagado · vencido · anulado` — `anulado` es la **baja lógica** de un pago del plan (se cambió el esquema o se canceló el viaje), conserva el registro ([[CU-11 Definir plan de cuotas]] A4, [[CU-27 Cancelar viaje]]) |
| forma_pago | Enum (se completa al cobrar) | `efectivo · transferencia · tarjeta_credito · tarjeta_debito · cheque · deposito` — se captura **al registrar el cobro** ([[CU-12 Registrar cobro de un pago]]); alimenta el reporte de **formas de pago** ([[CU-22 Generar reportes y estadísticas]]). ⚠️ **Borrador sin validar:** no está en el relevamiento; son los medios habituales de una agencia PyME argentina, propuestos por Nahuel. Falta confirmar con la agencia (¿Mercado Pago, cuenta corriente con el cliente, otro?) |
| moneda_pago | Enum (se completa al cobrar) | ARS / USD — **moneda real** en que se cobró el pago; **puede diferir** de `Viaje.moneda` (un mismo viaje admite pagos parte en ARS y parte en USD). Ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| tipo_cambio | Decimal (se completa al cobrar, opcional) | Cotización que **carga el empleado al cobrar** cuando `moneda_pago` ≠ `Viaje.moneda`; permite reconstruir el equivalente en la moneda de referencia |
| monto_cobrado | Decimal (se completa al cobrar) | Importe **real recibido** en `moneda_pago` (= `monto` si misma moneda; `monto × tipo_cambio` si difiere). Sirve para caja y para el reporte de formas de pago |

## Relaciones
- *..1 con [[Viaje]]
- genera [[Alerta]] de vencimiento (aviso un mes antes)

## Reglas / invariantes
- El `Pago` es **indivisible**: se cobra completo, sin cobros parciales ([[CU-12 Registrar cobro de un pago]]).
- **Plan en moneda de referencia; moneda real al cobrar (multimoneda, Q6.1):** el plan de cuotas se denomina íntegro en la `moneda` del [[Viaje]] (por eso `Σ montos = precioVenta` cierra exacto, sin cotizaciones). La **moneda real** del pago y su **`tipo_cambio`** se eligen y cargan recién **al registrar el cobro** ([[CU-12 Registrar cobro de un pago]]). El **% pagado** y el **saldo** del viaje se calculan sobre los `monto` planificados (moneda de referencia). Ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]].
- **Estado `anulado`:** un `Pago` del plan que se da de baja (cambió el esquema, [[CU-11 Definir plan de cuotas]] A4; o se canceló el viaje, [[CU-27 Cancelar viaje]]) pasa a `anulado` (baja lógica); deja de ser exigible y de contar para `Σ montos = precioVenta`, pero se conserva.
- **Transición `pendiente → vencido` automática:** un proceso del sistema marca el `Pago` como `vencido` al superar su `vencimiento` sin cobro, y actualiza su [[Alerta]] asociada. No requiere acción humana (no es un CU con actor).

## Aparece en
- [[CU-01 De la consulta a la venta]] · [[RN-01 Comisión automática]] · [[MOD-Economia-Pagos]]

## 🔎 Revisión
> [!note] Nahuel (18/09) — cerrado el enum `forma_pago` como **propuesta borrador** (no hay dato del relevamiento): `efectivo · transferencia · tarjeta_credito · tarjeta_debito · cheque · deposito`. #accion/decidir — validar con la agencia en la próxima sync; si usan Mercado Pago u otro medio digital, se agrega.
>
> [!note] Nahuel (18/09, entrevista grill) — **Multimoneda por pago (Q6.1, a ratificar en sync):** un viaje se puede pagar parte en ARS y parte en USD. El plan se denomina en la moneda de referencia del viaje; al cobrar se registran `moneda_pago`, `tipo_cambio` y `monto_cobrado`. Se agregó el estado **`anulado`** (Q4) para la baja lógica de un pago (unifica el "desactivar/eliminar" de [[CU-11 Definir plan de cuotas]] A4 y [[CU-27 Cancelar viaje]]). `forma_pago` se captura al cobrar (Q7).
