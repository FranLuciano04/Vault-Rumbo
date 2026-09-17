---
tipo: entidad
estado: borrador
modulo: [economia]
responsable:
pc: pc1
actualizado: 09/09/26
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
| forma_pago | Enum | Efectivo · transferencia · tarjeta · … — alimenta el reporte de **formas de pago** ([[CU-22 Generar reportes y estadísticas]]). ⚠️ Valores a cerrar por Nahuel |
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
