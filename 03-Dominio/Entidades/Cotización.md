---
tipo: entidad
estado: formalizado
modulo: [cotizaciones]
responsable:
pc: pc1
actualizado: 11/11/26
fecha_aprobacion: 29/09/26
---
# Cotización

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
Documento que se genera desde una plantilla + formulario para responder una [[Oportunidad]]. Cotizador asistido.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| fecha | Date (dd/mm/aa) | Emisión |
| moneda | Enum | ARS / USD — moneda de la operación; al derivar en [[Viaje]] queda como su moneda de referencia ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]) |
| items | Lista (JSONB) | Conceptos y precios (en `moneda`). Un ítem puede llevar `hotel_id` (FK → [[Hotel]] del catálogo, abierto), `check_in` y `check_out`. Si tiene hotel, las dos fechas son obligatorias. Con estos ítems se arma el itinerario al confirmar la reserva ([[CU-09 Armar itinerario de hoteles|CU-09]] A6, [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]) |
| total | Decimal | Total (en `moneda`) |
| validez_hasta | Date (dd/mm/aa) | **Hasta cuándo vale la cotización.** Default: `fecha` + **1 mes** (parámetro global configurable por `admin`). Pasada esa fecha, el sistema la pasa a `vencida`. Valor **validado con la agencia** (29/09) — ver [[EST-Cotización]] |
| estado | Enum | borrador · enviada · aceptada · rechazada · **vencida** — `vencida` la pone un **proceso automático** al superarse `validez_hasta` sin respuesta; solo vencen las `enviada` (un `borrador` no vence). Sumado 21/09, ver [[EST-Cotización]] |

## Relaciones
- *..1 con [[Oportunidad]]: varias cotizaciones **alternativas** por oportunidad, con una sola `aceptada` ([[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]])
- puede derivar en [[Viaje]] si se acepta: su `moneda` y su `total` precargan la reserva ([[CU-07 Confirmar reserva|CU-07]])
- sus ítems pueden referenciar [[Hotel|Hoteles]] del catálogo

## Aparece en
- [[CU-01 De la consulta a la venta]] (paso 3) · [[MOD-Cotizaciones]]
