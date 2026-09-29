---
tipo: entidad
estado: formalizado
modulo: [viajes, economia]
responsable:
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# Viaje

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
Reserva concreta de un cliente: destino, fechas, categoría, estado y control económico. Núcleo operativo del sistema.

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| destino | FK → [[Destino]] | Destino del catálogo — ver [[DEC-0006 Destino como entidad de catálogo]] |
| fechas | Rango | Salida / regreso |
| categoria | Enum | `grupal · individual` — `grupal` = salida grupal; `individual` = el resto. Enum cerrado el 29/09 con los dos valores del relevamiento: el tipo de producto (crucero, nacional…) se registra en [[Destino]] y el perfil del cliente en su segmento y etiquetas ([[Cliente]]) |
| estado | Enum | `reservado` (aceptó cotización; economía y plan cargados, sin cobros) · `vendido` (primer cobro: la seña, o la primera cuota si no hay seña) · `confirmado` (pagó el total) · `en curso` (inició por fecha) · `finalizado` (terminó) · `cancelado` (baja, [[CU-27 Cancelar viaje]]). Transiciones: `reservado → vendido` la dispara el **cobro de la seña** y `vendido → confirmado` el **pago total** ([[CU-12 Registrar cobro de un pago]]); `en curso`/`finalizado` van por **fecha** (sugeridas, confirma el empleado — [[CU-08 Gestionar estado del viaje]]) |
| moneda | Enum | **Moneda de la operación** (ARS / USD) — multimoneda ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]) |
| precioVenta | Decimal | Precio al cliente (en `moneda`) |
| costo | Decimal | **Costo del operador/proveedor** (en `moneda`). Renombra `costoNeto` — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| operador | FK → [[Operador]] (opcional) | Operador/proveedor al que se le compró (contraparte del `costo`) — [[DEC-0009 Operador-Proveedor como entidad de catálogo]] |
| ganancia | Decimal (calc.) | `precioVenta − costo`. Se calcula automáticamente — [[RN-01 Comisión automática]], [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| margen | Decimal % (calc.) | Ganancia en porcentaje **sobre la venta**: `ganancia / precioVenta` — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| vendedor | FK → [[Usuario]] (opcional) | Vendedor/freelancer que hizo la venta (para liquidar su comisión) — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]] |
| comision_tipo | Enum | `importe · porcentaje`: cómo se lee `comision_vendedor` — [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] |
| comision_vendedor | Decimal | Comisión a pagar al `vendedor`: **importe o %** (el % sobre la ganancia); **default por vendedor + override** por viaje. **Separada** de la ganancia — [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] |
| responsable | FK → [[Usuario]] | Empleado a cargo del viaje; define la vista personal. Ver [[DEC-0005 Autenticación y modelo de roles]] |

> ✅ **Bloque económico ratificado (sync 17/09):** `moneda`, `costo`, `operador`, `ganancia`, `margen`, `vendedor` y `comision_vendedor` según [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede a [[DEC-0004 Comisión configurable por porcentaje]]) y [[DEC-0009 Operador-Proveedor como entidad de catálogo]]. `ganancia = precioVenta − costo`; `margen% = ganancia / precioVenta`; el viejo `comision = precioVenta × %` queda **obsoleto**. La entidad completa sigue `#estado/borrador` hasta formalizar el resto de atributos.

## Relaciones
- *..1 con [[Cliente]]
- *..1 con [[Usuario]] (`responsable`, relación *gestiona*) — ver [[DEC-0005 Autenticación y modelo de roles]]
- *..1 con [[Destino]] — ver [[DEC-0006 Destino como entidad de catálogo]]
- *..1 con [[Operador]] (`operador`, opcional) — ver [[DEC-0009 Operador-Proveedor como entidad de catálogo]]
- *..0..1 con [[Usuario]] (`vendedor`, opcional) — quién vendió, para liquidar comisión ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]])
- 0..1 con [[Oportunidad]] (origen)
- **1..\* con [[Pago]]** — todo `Viaje` tiene al menos un `Pago`: [[CU-07 Confirmar reserva]] incluye (`<<include>>`) [[CU-11 Definir plan de cuotas]] y aun sin cuotas se crea un `Pago` de tipo `saldo` (A2). Confirmado 21/09, ver [[DGM — Diagrama de clases]]
- **0..\* con [[Alerta]]** — corregido 21/09 (antes decía `1..*`): un `Viaje` puede no tener ninguna alerta, y además hay [[Alerta|Alertas]] que **no cuelgan de un viaje** (insistencia sobre [[Oportunidad]], recontacto sobre [[Cliente]], vencimiento sobre [[Pago]], y las `manual` sueltas de [[CU-28 Crear recordatorio manual]])
- 0..* con [[Hotel]] (N:M vía `viaje_hotel`, con `vencimiento_pago_proveedor` por hotel → [[Alerta]] un mes antes) — ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]

## Aparece en
- [[CU-01 De la consulta a la venta]] · [[MOD-Viajes]] · [[MOD-Economia-Pagos]]
