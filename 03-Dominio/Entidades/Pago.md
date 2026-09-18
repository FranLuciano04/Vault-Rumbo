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
| monto | Decimal | Importe (en `moneda`) |
| moneda | Enum | ARS / USD — coherente con la `moneda` del [[Viaje]] ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]) |
| tipo | Enum | seña · cuota · saldo |
| forma_pago | Enum | `efectivo · transferencia · tarjeta_credito · tarjeta_debito · cheque · deposito` — alimenta el reporte de **formas de pago** ([[CU-22 Generar reportes y estadísticas]]). ⚠️ **Borrador sin validar:** no está en el relevamiento; son los medios de pago habituales de una agencia PyME argentina, propuestos por Nahuel. Falta confirmarlos con la agencia (¿usan Mercado Pago, cuenta corriente con el cliente, otro?). |
| vencimiento | Date (dd/mm/aa) | Fecha límite |
| estado | Enum | pendiente · pagado · vencido |

## Relaciones
- *..1 con [[Viaje]]
- genera [[Alerta]] de vencimiento (aviso un mes antes)

## Reglas / invariantes
- El `Pago` es **indivisible**: se cobra completo, sin cobros parciales ([[CU-12 Registrar cobro de un pago]]).
- **Transición `pendiente → vencido` automática:** un proceso del sistema marca el `Pago` como `vencido` al superar su `vencimiento` sin cobro, y actualiza su [[Alerta]] asociada. No requiere acción humana (no es un CU con actor).

## Aparece en
- [[CU-01 De la consulta a la venta]] · [[RN-01 Comisión automática]] · [[MOD-Economia-Pagos]]

## 🔎 Revisión
> [!note] Nahuel (18/09) — cerrado el enum `forma_pago` como **propuesta borrador** (no hay dato del relevamiento): `efectivo · transferencia · tarjeta_credito · tarjeta_debito · cheque · deposito`. #accion/decidir — validar con la agencia en la próxima sync; si usan Mercado Pago u otro medio digital, se agrega.
