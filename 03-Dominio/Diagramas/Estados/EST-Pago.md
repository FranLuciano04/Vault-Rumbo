---
tipo: diagrama
estado: borrador
modulo: [economia]
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# EST-Pago — Especificación de estados

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> **Especificación** del ciclo de vida de [[Pago]], lista para dibujar. Derivada de [[CU-11 Definir plan de cuotas]], [[CU-12 Registrar cobro de un pago]] y [[CU-27 Cancelar viaje]], más la regla de vencimiento automático de la nota de [[Pago]]. El enum vive en [[DGM — Diagrama de clases]] (`EstadoPago`).
>
> ⚠️ **El diagrama todavía no está dibujado.** Esta nota existe para que se pueda dibujar sin volver a leer los CU.

## Para la sesión que dibuje este diagrama

1. **Con esta nota alcanza.** No hace falta abrir los CU ni las entidades.
2. Dibujar un `stateDiagram-v2` de Mermaid y **pegarlo en la sección `## Diagrama`** de esta misma nota.
3. Usar el encabezado común del vault (motor ELK, líneas rectas):
   ```
   %%{init: {'layout':'elk','theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'14px','primaryColor':'#f8fafc','primaryBorderColor':'#64748b','primaryTextColor':'#0f172a','lineColor':'#94a3b8'}}}%%
   ```
4. **Etiquetar cada transición** con el evento disparador, no con el número.
5. **Marcar visualmente T3**, que es la única transición **sin actor humano** (la dispara un proceso del sistema).
6. **Validar renderizando** con `mermaid-cli` antes de commitear.
7. **No resolver los huecos** de la sección final.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `pendiente` | Cuota planificada, **todavía no cobrada** y sin vencer. | Estado inicial: lo crea [[CU-11 Definir plan de cuotas]] | No |
| `pagado` | Se cobró **completo** (el `Pago` es indivisible). | [[CU-12 Registrar cobro de un pago]] | No (reversible, T6) |
| `vencido` | Pasó su `vencimiento` sin cobrarse. **Sigue siendo exigible.** | **Proceso automático del sistema** | No |
| `anulado` | **Baja lógica**: se dio de baja del plan. Deja de ser exigible y de contar para `Σ montos = precioVenta`, pero se conserva el registro. | [[CU-11 Definir plan de cuotas]] A4 o [[CU-27 Cancelar viaje]] | **Sí** (reversible, ver hueco 3) |

**Estado inicial:** `pendiente`.
**Estados finales:** `pagado` y `anulado`.

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `pendiente` | Se define el plan de cuotas del [[Viaje]] | empleado | [[CU-11 Definir plan de cuotas]] paso 5 | `Σ montos = precioVenta` en la moneda de referencia del [[Viaje]] | Se genera **una [[Alerta]] de vencimiento por cada `Pago`** (aviso un mes antes) |
| T2 | `pendiente` | `pagado` | El empleado **registra el cobro** | empleado | [[CU-12 Registrar cobro de un pago]] paso 3 | Se cargan `forma_pago`, `moneda_pago` y, si difiere de `Viaje.moneda`, el `tipo_cambio` | **Resuelve** la [[Alerta]] de vencimiento; actualiza saldo y **% pagado** del [[Viaje]]; si es la **seña** el [[Viaje]] pasa a `vendido`; si el saldo queda en **cero**, pasa a `confirmado` |
| T3 | `pendiente` | `vencido` | **Se superó la fecha de `vencimiento` sin cobro** | **sistema** (proceso automático) | *ninguno* — no es un CU con actor | — | Actualiza la [[Alerta]] asociada. **No requiere acción humana** |
| T4 | `vencido` | `pagado` | El empleado registra el cobro de una cuota ya vencida | empleado | [[CU-12 Registrar cobro de un pago]] A1 | Igual que T2 | Igual que T2: la [[Alerta]] se resuelve lo mismo |
| T5 | `pendiente` | `anulado` | Se **cambió el esquema** del plan de cuotas | empleado | [[CU-11 Definir plan de cuotas]] A4 | Solo mientras el `Pago` esté **`pendiente`** | Cierra su [[Alerta]]; vuelve a exigirse `Σ montos = precioVenta` **sobre los no anulados** |
| T6 | `pagado` | `pendiente` · `vencido` | **Reversión del cobro** (se registró por error) | empleado | [[CU-12 Registrar cobro de un pago]] A3 | Vuelve al estado que tenía según su `vencimiento` | Su [[Alerta]] **se reabre**; si el [[Viaje]] había pasado a `confirmado` por saldo cero, vuelve a `vendido` |
| T7 | `pendiente` | `anulado` | **Se canceló el [[Viaje]]** | empleado | [[CU-27 Cancelar viaje]] paso 4 | El CU dice explícitamente "los [[Pago|Pagos]] **pendientes**" (ver hueco 1) | Se resuelven las [[Alerta|Alertas]] vigentes del viaje |

## Invariantes y reglas

- **El `Pago` es indivisible:** se cobra completo, **sin cobros parciales** ([[CU-12 Registrar cobro de un pago]], nota de [[Pago]]). Por eso no existe un estado "parcialmente pagado".
- **`Σ montos = precioVenta`** sobre los [[Pago|Pagos]] **no anulados**, en la **moneda de referencia** del [[Viaje]] ([[CU-11 Definir plan de cuotas]] paso 4 y A4).
- **Multimoneda por cobro:** el plan se denomina íntegro en `Viaje.moneda`; la moneda real (`moneda_pago`) y el `tipo_cambio` se eligen recién **al cobrar** (T2/T4). El **% pagado** y el saldo se calculan siempre sobre los `monto` planificados ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- **`vencido` sigue siendo exigible**: es un aviso de atraso, no una baja. La baja es `anulado`.
- **Mientras esté `pendiente` se puede reprogramar** monto o vencimiento sin cambiar de estado; el sistema reagenda su [[Alerta]] ([[CU-11 Definir plan de cuotas]] A3). Dibujar como auto-transición si se quiere reflejar.
- **T3 es la única transición sin actor humano** de todo el modelo de Rumbo.

## Huecos y ambigüedades detectadas

Señalados, **no resueltos** — decisión del equipo en la sync:

1. **¿Qué pasa con un `Pago` `vencido` cuando se cancela el [[Viaje]]?** [[CU-27 Cancelar viaje]] paso 4 dice que pasa a `anulado` los [[Pago|Pagos]] **`pendientes`**, y [[CU-11 Definir plan de cuotas]] A4 también limita la anulación a los `pendientes`. Un `Pago` `vencido` de un viaje cancelado **quedaría exigible para siempre**, que claramente no es la intención. Falta la transición `vencido → anulado`.
2. **Tampoco se puede anular un `vencido` por cambio de plan.** Mismo problema que 1 pero por [[CU-11 Definir plan de cuotas]] A4: si una cuota venció y el esquema cambia, no hay forma de sacarla del plan.
3. **¿`anulado` es reversible?** [[CU-27 Cancelar viaje]] A3 dice que al revertir la cancelación "se reponen sus [[Pago|Pagos]]", lo que implica `anulado → pendiente`. Pero no está escrito como transición del `Pago` ni se dice a qué estado vuelve (¿`pendiente` o `vencido`, según la fecha?).
4. **Reprogramar un `vencido`.** [[CU-11 Definir plan de cuotas]] A3 permite editar monto y vencimiento "mientras siga `pendiente`". Si se le corre la fecha a una cuota vencida, ¿vuelve a `pendiente`? No hay transición `vencido → pendiente` definida.

> Los cuatro huecos son la misma raíz: **los CU tratan `vencido` como si no existiera** a la hora de anular o reprogramar. Conviene resolverlos juntos.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Pago]] · enum `EstadoPago` en [[DGM — Diagrama de clases]]
- CU: [[CU-11 Definir plan de cuotas]] · [[CU-12 Registrar cobro de un pago]] · [[CU-27 Cancelar viaje]] · [[CU-10 Registrar economía del viaje]]
- Decisiones: [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]
- Relacionado: [[EST-Viaje]] (T2 y T3 de acá disparan T2 y T3 de allá)
