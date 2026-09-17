---
tipo: decision
estado: formalizado
modulo: [economia]
decisores: [Francisco, Nahuel, Paloma]
supersede: DEC-0004
fecha_aprobacion: 17/09/26
actualizado: 17/09/26
---
# DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ✅ **Ratificada en la sync del 17/09/26** (Francisco, Nahuel y Paloma). **Supersede** a [[DEC-0004 Comisión configurable por porcentaje]] (marcada `#estado/obsoleto`). Origen: [[Relevamiento — respuestas de la agencia (17-09)]] (bloque 1).

## Contexto
[[DEC-0004 Comisión configurable por porcentaje]] quedó sellada con una **cláusula de reapertura**: *"sujeta a la respuesta de la agencia sobre qué representa la comisión y su base de cálculo; si difiere, se revisa o supersede"*. La agencia respondió y **difiere**: lo central del negocio no es una comisión = `precioVenta × %` (default de empresa), sino la **ganancia** operación por operación, que **no es un porcentaje fijo** (varía por viaje, operador, producto y negociación).

## Decisión
Se modela la economía del [[Viaje]] con **tres conceptos distintos**:

1. **Ganancia de la agencia** = `precioVenta − costo`, por operación. Es un **importe**, no un porcentaje fijo.
2. **Margen / rentabilidad** = la ganancia expresada también en **porcentaje**, **sobre el precio de venta**: `margen% = ganancia / precioVenta`. *(Sync 17/09.)*
3. **Comisión del vendedor/freelancer** = concepto **separado**, por vendedor, para saber **qué vendió cada uno y cuánto pagarle**. Se puede cargar como **importe fijo o como porcentaje**, y el **% se calcula sobre la ganancia**. Tiene un **valor por defecto por vendedor** (configurable una vez) con **override por viaje**. Se registra por operación y se **liquida por vendedor**. *(Sync 17/09.)*

Reglas del modelo:
- **Carga manual por operación:** `precioVenta`, `costo` (del operador), `moneda` y `comision_vendedor`. El sistema **calcula automáticamente** `ganancia` y `margen`.
- **Multimoneda:** cada operación lleva su `moneda` (**ARS / USD**, ambas habilitadas). Reemplaza el supuesto "solo ARS" en la economía del viaje. La **cotización se carga manualmente por operación** en PC1; la consolidación de reportes en una moneda única queda para una fase posterior. *(Sync 17/09.)*
- El **`%` deja de ser un parámetro de empresa que define la comisión de la agencia**: el `%` relevante pasa a ser (a) el **margen** derivado y (b) el **% de comisión del vendedor** por operación.
- **Operador/proveedor** se modela como entidad de catálogo → [[DEC-0009 Operador-Proveedor como entidad de catálogo]]; `Viaje` gana FK `operador` (contraparte del `costo`).
- Enlaza con el rol `freelance` de [[DEC-0008 Autenticación propia y rol de vendedor freelance]] y con los reportes por vendedor de [[CU-22 Generar reportes y estadísticas]].

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Ganancia = venta − costo + margen % + comisión de vendedor aparte (multimoneda) | Refleja el negocio real relevado; separa rentabilidad de la agencia y pago al vendedor | Más atributos; regla de conversión multimoneda | ✅ |
| Comisión = `precioVenta × %` con default de empresa ([[DEC-0004 Comisión configurable por porcentaje]]) | Un solo parámetro; cero carga | No coincide con la comisión/ganancia real; no contempla comisión del vendedor ni multimoneda | ❌ (superseded) |

## Restricciones
- Fechas `dd/mm/aa`. **Moneda por operación (ARS/USD)** — nuevo respecto de la convención "solo ARS".
- No procesa pagos online: registra montos, cuotas y vencimientos ([[Pago]]). Ver [[Alcance y fuera de alcance]].

## Cuestiones resueltas en la sync 17/09
- **Base del margen %:** sobre el **precio de venta**.
- **Comisión del vendedor:** importe fijo **o** %; el % **sobre la ganancia**; **default por vendedor + override por viaje**.
- **Multimoneda:** ARS y USD; cotización **manual por operación** en PC1; consolidación multimoneda de reportes = fase posterior.
- **Operador/Proveedor pasa a entidad (13ª):** aprobado modelarlo como catálogo con ABM → [[DEC-0009 Operador-Proveedor como entidad de catálogo]].

## Impacto
- Afecta: [[RN-01 Comisión automática]], [[Viaje]] (`costoNeto` → `costo`; nuevos `moneda`, `ganancia`, `margen`, `vendedor`, `comision_vendedor`, `operador`), [[Pago]] (`moneda`, `forma_pago`), [[CU-10 Registrar economía del viaje]], [[CU-13 Configurar porcentaje de comisión]], [[CU-21 Ver dashboard y embudo]], [[CU-22 Generar reportes y estadísticas]], [[DEC-0004 Comisión configurable por porcentaje]] (superseded) y la nueva entidad **[[Operador]]** ([[DEC-0009 Operador-Proveedor como entidad de catálogo]]).

## Decisores y fecha
- Propuesta por **Paloma** (17/09/26) desde el relevamiento traído por Francisco; **ratificada en la sync del 17/09/26** (Francisco, Nahuel y Paloma presentes). **Aprobada: 17/09/26.**
