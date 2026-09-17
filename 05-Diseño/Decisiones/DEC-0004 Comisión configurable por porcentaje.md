---
tipo: decision
estado: formalizado
modulo: [economia]
decisores: [Francisco]
fecha_aprobacion: 11/09/26
supersede:
actualizado: 10/09/26
---
# DEC-0004 Comisión configurable por porcentaje

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ⚠️ **En revisión — probable supersesión.** La agencia respondió la pregunta de la que dependía esta DEC (ver [[Relevamiento — respuestas de la agencia (17-09)]], bloque 1) y el modelo **difiere**: la comisión no es `precioVenta × %`, sino **ganancia = venta − costo** + margen % + comisión del vendedor aparte, con multimoneda. Se propone superseder esta DEC con [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (`en-revision`). Se marcará `#estado/obsoleto` solo si la sync ratifica DEC-0007.

## Contexto
[[RN-01 Comisión automática]] dejaba abierto si la comisión de un [[Viaje]] es una **diferencia fija** (`precioVenta − costoNeto`) o un **porcentaje configurable**.

## Decisión
La comisión se **calcula automáticamente** y es **configurable por porcentaje**:

`comisión = precioVenta × %comisión`

- El **`%comisión` lo configura el rol admin** a nivel de la empresa (valor por defecto).
- El agente **no** carga la comisión a mano; el sistema la calcula al registrar la economía del [[Viaje]].
- Se permite **ajuste manual por viaje** (override) cuando un caso puntual lo requiera. _(Supuesto a validar en la sync.)_
- La diferencia `precioVenta − costoNeto` se mantiene como dato informativo de **margen**, no como la comisión.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Porcentaje configurable | Se adapta a cada agencia; un solo parámetro | Requiere pantalla de configuración | ✅ |
| Diferencia fija `precioVenta − costoNeto` | Cero configuración | No siempre coincide con la comisión real del negocio | ❌ |

## Restricciones
- Moneda **ARS**, fechas `dd/mm/aa`.
- No procesa pagos online: registra montos, cuotas y vencimientos ([[Pago]]). Ver [[Alcance y fuera de alcance]].

## Impacto
- Afecta: [[RN-01 Comisión automática]], [[Viaje]] (`comision`, `%comision`/config), [[Pago]], [[CU-01 De la consulta a la venta]] (paso 4).

## Decisores y fecha
- Decisores: Francisco (10/09/26) — **Aprobada: 11/09/26** (sync; Francisco y Nahuel presentes). ⚠️ Sujeta a la respuesta de la agencia sobre **qué representa la comisión y su base de cálculo** (pregunta que lleva Francisco a Valentina); si difiere, se revisa o supersede esta DEC.
