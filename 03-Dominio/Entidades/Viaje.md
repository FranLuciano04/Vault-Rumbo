---
tipo: entidad
estado: borrador
modulo: [viajes, economia]
responsable:
pc: pc1
actualizado: 09/09/26
---
# Viaje

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Reserva concreta de un cliente: destino, fechas, categoría, estado y control económico. Núcleo operativo del sistema.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| destino | FK → [[Destino]] | Destino del catálogo — ver [[DEC-0006 Destino como entidad de catálogo]] |
| fechas | Rango | Salida / regreso |
| categoria | Enum | ej. salida grupal, individual |
| estado | Enum | armado · confirmado · en curso · finalizado · cancelado — ver [[CU-27 Cancelar viaje]] |
| precioVenta | Decimal (ARS) | Precio al cliente |
| costoNeto | Decimal (ARS) | Costo del proveedor |
| comision | Decimal (ARS) | Calculada por % configurable — [[RN-01 Comisión automática]], [[DEC-0004 Comisión configurable por porcentaje]] |
| responsable | FK → [[Usuario]] | Empleado a cargo del viaje; define la vista personal. Ver [[DEC-0005 Autenticación y modelo de roles]] |

## Relaciones
- *..1 con [[Cliente]]
- *..1 con [[Usuario]] (`responsable`, relación *gestiona*) — ver [[DEC-0005 Autenticación y modelo de roles]]
- *..1 con [[Destino]] — ver [[DEC-0006 Destino como entidad de catálogo]]
- 0..1 con [[Oportunidad]] (origen)
- 1..* con [[Pago]] · 1..* con [[Alerta]]
- 0..* con [[Hotel]] (N:M vía `viaje_hotel`) — ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]

## Aparece en
- [[CU-01 De la consulta a la venta]] · [[MOD-Viajes]] · [[MOD-Economia-Pagos]]
