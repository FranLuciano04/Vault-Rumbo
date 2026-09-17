---
tipo: decision
estado: en-revision
modulo: [economia]
decisores: []
supersede: DEC-0004
actualizado: 17/09/26
---
# DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor

tags:: #tipo/decision #estado/en-revision #pc/pc1 #accion/decidir

> **Propuesta** redactada por Paloma (17/09) a partir de [[Relevamiento — respuestas de la agencia (17-09)]] (bloque 1). **A decidir en la sync.** Si se ratifica, **supersede** a [[DEC-0004 Comisión configurable por porcentaje]].

## Contexto
[[DEC-0004 Comisión configurable por porcentaje]] quedó sellada con una **cláusula de reapertura**: *"sujeta a la respuesta de la agencia sobre qué representa la comisión y su base de cálculo; si difiere, se revisa o supersede"*. La agencia respondió y **difiere**: lo central del negocio no es una comisión = `precioVenta × %` (default de empresa), sino la **ganancia** operación por operación, que **no es un porcentaje fijo** (varía por viaje, operador, producto y negociación).

## Decisión (propuesta)
Se modela la economía del [[Viaje]] con **tres conceptos distintos**:

1. **Ganancia de la agencia** = `precioVenta − costoOperador`, por operación. Es un **importe**, no un porcentaje fijo.
2. **Margen / rentabilidad** = la ganancia expresada también en **porcentaje**. _(Base a confirmar: `margen% = ganancia / precioVenta` sobre venta, o `ganancia / costo` sobre costo.)_
3. **Comisión del vendedor/freelancer** = concepto **separado**, por vendedor, para saber **qué vendió cada uno y cuánto pagarle**. Se registra por operación y se **liquida por vendedor**.

Reglas del modelo:
- **Carga manual por operación:** `precioVenta`, `costo` (del operador), `moneda` y `comision_vendedor`. El sistema **calcula automáticamente** `ganancia` y `margen`.
- **Multimoneda:** cada operación lleva su `moneda` (**ARS / USD**). Reemplaza el supuesto "solo ARS" en la economía del viaje. _(Regla de conversión para consolidar reportes: a definir.)_
- El **`%` deja de ser un parámetro de empresa que define la comisión de la agencia**: el `%` relevante pasa a ser (a) el **margen** derivado y (b), si se usa, el **% de comisión del vendedor** por operación.
- Enlaza con el rol `freelance` de [[DEC-0008 Autenticación propia y rol de vendedor freelance]] y con los reportes por vendedor de [[CU-22 Generar reportes y estadísticas]].

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Ganancia = venta − costo + margen % + comisión de vendedor aparte (multimoneda) | Refleja el negocio real relevado; separa rentabilidad de la agencia y pago al vendedor | Más atributos; regla de conversión multimoneda | ✅ (propuesta) |
| Comisión = `precioVenta × %` con default de empresa ([[DEC-0004 Comisión configurable por porcentaje]]) | Un solo parámetro; cero carga | No coincide con la comisión/ganancia real; no contempla comisión del vendedor ni multimoneda | ❌ (superseded) |

## Restricciones
- Fechas `dd/mm/aa`. **Moneda por operación (ARS/USD)** — nuevo respecto de la convención "solo ARS".
- No procesa pagos online: registra montos, cuotas y vencimientos ([[Pago]]). Ver [[Alcance y fuera de alcance]].

## Cuestiones abiertas `#accion/decidir`
- **Base del margen %** (sobre venta o sobre costo).
- **Comisión del vendedor:** ¿importe fijo o %? y ¿sobre qué base (venta o ganancia)?
- **Multimoneda:** regla de conversión/consolidación para reportes en un único visor.
- **¿Operador/Proveedor como entidad (13ª)?** Los reportes piden *ventas por operador* y *pendiente de pagar a operadores*; hoy `costoNeto` es un importe suelto. Evaluar promover **Operador/Proveedor** a entidad de catálogo (análogo a [[DEC-0006 Destino como entidad de catálogo]]).

## Impacto
- Afecta: [[RN-01 Comisión automática]], [[Viaje]] (`costoNeto` → `costo`; nuevos `moneda`, `ganancia`, `margen`, `vendedor`, `comision_vendedor`), [[Pago]] (`moneda`, `forma_pago`), [[CU-10 Registrar economía del viaje]], [[CU-13 Configurar porcentaje de comisión]], [[CU-21 Ver dashboard y embudo]], [[CU-22 Generar reportes y estadísticas]] y [[DEC-0004 Comisión configurable por porcentaje]] (a superseder). Posible nueva entidad **Operador/Proveedor**.

## Decisores y fecha
- Propuesta por: **Paloma** (17/09/26), desde el relevamiento traído por Francisco. **Pendiente de ratificar en la sync** (Francisco + Nahuel; módulo de economía es de Nahuel). Sin `fecha_aprobacion` hasta entonces.
