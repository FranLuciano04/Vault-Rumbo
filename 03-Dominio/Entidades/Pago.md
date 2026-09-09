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
| monto | Decimal (ARS) | Importe |
| tipo | Enum | seña · cuota · saldo |
| vencimiento | Date (dd/mm/aa) | Fecha límite |
| estado | Enum | pendiente · pagado · vencido |

## Relaciones
- *..1 con [[Viaje]]
- genera [[Alerta]] de vencimiento (aviso un mes antes)

## Aparece en
- [[CU-01 De la consulta a la venta]] · [[RN-01 Comisión automática]] · [[MOD-Economia-Pagos]]
