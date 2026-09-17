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
| estado | Enum | `reservado` (aceptó cotización; economía y plan cargados, seña sin cobrar) · `vendido` (pagó la seña) · `confirmado` (pagó el total) · `en curso` (inició por fecha) · `finalizado` (terminó) · `cancelado` (baja, [[CU-27 Cancelar viaje]]). Transiciones: `reservado → vendido` la dispara el **cobro de la seña** y `vendido → confirmado` el **pago total** ([[CU-12 Registrar cobro de un pago]]); `en curso`/`finalizado` van por **fecha** (sugeridas, confirma el empleado — [[CU-08 Gestionar estado del viaje]]) |
| moneda | Enum | **Moneda de la operación** (ARS / USD) — multimoneda. ⚠️ Propuesto por [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| precioVenta | Decimal | Precio al cliente (en `moneda`) |
| costo | Decimal | **Costo del operador/proveedor** (en `moneda`). ⚠️ Renombra `costoNeto` — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| ganancia | Decimal (calc.) | `precioVenta − costo`. Se calcula automáticamente — [[RN-01 Comisión automática]], [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| margen | Decimal % (calc.) | Ganancia en porcentaje (base a confirmar) — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| vendedor | FK → [[Usuario]] (opcional) | Vendedor/freelancer que hizo la venta (para liquidar su comisión). ⚠️ [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]] |
| comision_vendedor | Decimal | Comisión a pagar al `vendedor` (importe o %, a definir). **Separada** de la ganancia — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| responsable | FK → [[Usuario]] | Empleado a cargo del viaje; define la vista personal. Ver [[DEC-0005 Autenticación y modelo de roles]] |

> ⚠️ **Bloque económico en revisión (17/09):** los atributos `moneda`, `costo`, `ganancia`, `margen`, `vendedor` y `comision_vendedor` son propuesta de [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede a [[DEC-0004 Comisión configurable por porcentaje]]); reemplazan al viejo `comision = precioVenta × %`. Ratificar en la sync (módulo de economía = Nahuel).

## Relaciones
- *..1 con [[Cliente]]
- *..1 con [[Usuario]] (`responsable`, relación *gestiona*) — ver [[DEC-0005 Autenticación y modelo de roles]]
- *..1 con [[Destino]] — ver [[DEC-0006 Destino como entidad de catálogo]]
- 0..1 con [[Oportunidad]] (origen)
- 1..* con [[Pago]] · 1..* con [[Alerta]]
- 0..* con [[Hotel]] (N:M vía `viaje_hotel`, con `vencimiento_pago_proveedor` por hotel → [[Alerta]] un mes antes) — ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]

## Aparece en
- [[CU-01 De la consulta a la venta]] · [[MOD-Viajes]] · [[MOD-Economia-Pagos]]
