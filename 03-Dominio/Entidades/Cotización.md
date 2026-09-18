---
tipo: entidad
estado: borrador
modulo: [cotizaciones]
responsable:
pc: pc1
actualizado: 09/09/26
---
# Cotización

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Documento que se genera desde una plantilla + formulario para responder una [[Oportunidad]]. Cotizador asistido.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| fecha | Date (dd/mm/aa) | Emisión |
| moneda | Enum | ARS / USD — moneda de la operación; al derivar en [[Viaje]] queda como su moneda de referencia ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]) |
| items | Lista | Conceptos y precios (en `moneda`) |
| total | Decimal | Total (en `moneda`) |
| estado | Enum | borrador · enviada · aceptada · rechazada |

## Relaciones
- *..1 con [[Oportunidad]]
- puede derivar en [[Viaje]] si se acepta

## Aparece en
- [[CU-01 De la consulta a la venta]] (paso 3) · [[MOD-Cotizaciones]]
