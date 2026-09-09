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
| items | Lista | Conceptos y precios |
| total | Decimal (ARS) | Total |
| estado | Enum | borrador · enviada · aceptada · rechazada |

## Relaciones
- *..1 con [[Oportunidad]]
- puede derivar en [[Viaje]] si se acepta

## Aparece en
- [[CU-01 De la consulta a la venta]] (paso 3) · [[MOD-Cotizaciones]]
