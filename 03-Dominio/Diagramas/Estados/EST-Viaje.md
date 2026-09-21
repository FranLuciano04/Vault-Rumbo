---
tipo: diagrama
estado: borrador
modulo: [viajes]
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# EST-Viaje — Especificación de estados

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> **Especificación** del ciclo de vida de [[Viaje]], lista para dibujar. Derivada de [[CU-07 Confirmar reserva]], [[CU-08 Gestionar estado del viaje]], [[CU-12 Registrar cobro de un pago]] y [[CU-27 Cancelar viaje]]. El enum vive en [[DGM — Diagrama de clases]] (`EstadoViaje`).
>
> ⚠️ **El diagrama todavía no está dibujado.** Esta nota existe para que se pueda dibujar sin volver a leer los CU.

## Para la sesión que dibuje este diagrama

1. **Con esta nota alcanza.** No hace falta abrir los CU ni las entidades: todo lo necesario está en las tablas de abajo.
2. Dibujar un `stateDiagram-v2` de Mermaid y **pegarlo en la sección `## Diagrama`** de esta misma nota (no crear una nota nueva).
3. Usar el mismo encabezado que el resto de los diagramas del vault (motor ELK, líneas rectas):
   ```
   %%{init: {'layout':'elk','theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'14px','primaryColor':'#f8fafc','primaryBorderColor':'#64748b','primaryTextColor':'#0f172a','lineColor':'#94a3b8'}}}%%
   ```
4. **Etiquetar cada transición** con el evento disparador de la tabla (columna *Evento*), no con el número.
5. **Validar renderizando** con `mermaid-cli` antes de commitear (el validador del MCP de Mermaid falla con algunas directivas; el motor real es el que manda).
6. **No resolver los huecos** de la sección final: son decisiones del equipo para la sync.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `reservado` | El cliente aceptó la cotización. Economía y plan de pagos cargados, **seña sin cobrar**. | Estado inicial: lo crea [[CU-07 Confirmar reserva]] | No |
| `vendido` | Se cobró la **seña**. | Cobro de la seña ([[CU-12 Registrar cobro de un pago]]) | No |
| `confirmado` | Se pagó el **total**: saldo en cero. Es el hito **económico**, no el operativo. | Último cobro que deja el saldo en cero ([[CU-12 Registrar cobro de un pago]]) | No |
| `en curso` | El viaje **inició** (pasó la fecha de salida y el empleado lo confirmó). | Sugerido por fecha, confirmado por el empleado ([[CU-08 Gestionar estado del viaje]]) | No |
| `finalizado` | El viaje **terminó**. Habilita la post-venta. | Sugerido por fecha, confirmado por el empleado ([[CU-08 Gestionar estado del viaje]]) | **Sí** |
| `cancelado` | Baja lógica: el viaje no se concreta. Se conserva el historial. | [[CU-27 Cancelar viaje]] | **Sí** (reversible solo por corrección, ver T9) |

**Estado inicial:** `reservado`.
**Estados finales:** `finalizado` y `cancelado`.

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `reservado` | Se confirma la reserva desde una [[Oportunidad]] `ganada` | empleado | [[CU-07 Confirmar reserva]] | Existe `Oportunidad` ganada o [[Cotización]] aceptada; destino y fechas cargados | Se crea el [[Viaje]]; se generan las [[Alerta|Alertas]] `formulario` del destino y la `salida`; se encadenan [[CU-10 Registrar economía del viaje|CU-10]] y [[CU-11 Definir plan de cuotas|CU-11]] |
| T2 | `reservado` | `vendido` | **Cobro de la seña** | sistema | [[CU-12 Registrar cobro de un pago]] A0 | El [[Pago]] cobrado es de `tipo = seña` | Automática, **no es una acción manual** |
| T3 | `vendido` | `confirmado` | **Saldo en cero** (se cobró el último pago) | sistema | [[CU-12 Registrar cobro de un pago]] A2 | Σ de los [[Pago|Pagos]] no cobrados y no anulados = 0 | Automática |
| T4 | `confirmado` | `en curso` | Llegó la **fecha de salida** | sistema **sugiere**, empleado **confirma** | [[CU-08 Gestionar estado del viaje]] | Nunca se fuerza por fecha (ver A1 en Invariantes) | Actualiza calendario y dashboard |
| T5 | `en curso` | `finalizado` | Llegó la **fecha de regreso** | sistema **sugiere**, empleado **confirma** | [[CU-08 Gestionar estado del viaje]] | Nunca se fuerza por fecha | Habilita la post-venta: agenda una [[Alerta]] de tipo `reseña` ([[CU-17 Registrar reseña de hotel]]) |
| T6 | `reservado` · `vendido` · `confirmado` · `en curso` | `cancelado` | El empleado cancela el viaje | empleado | [[CU-27 Cancelar viaje]] | **No** desde `finalizado` (A1) ni desde `cancelado` | Registra motivo y fecha; pasa los [[Pago|Pagos]] `pendientes` a `anulado`; resuelve las [[Alerta|Alertas]] vigentes; deja constancia de que la comisión proyectada no se realiza ([[RN-01 Comisión automática]]) |
| T7 | `vendido` · `confirmado` · `en curso` | *estado inmediato anterior* | **Corrección**: se cargó un estado por error | empleado | [[CU-08 Gestionar estado del viaje]] A2 | Solo al **inmediato anterior**, mientras sea coherente y el viaje no esté `finalizado` ni `cancelado` | — |
| T8 | `confirmado` | `vendido` | **Reversión de un cobro** que había dejado el saldo en cero | empleado | [[CU-12 Registrar cobro de un pago]] A3 | El cobro se había registrado por error | El [[Pago]] vuelve a `pendiente`/`vencido` y su [[Alerta]] se reabre |
| T9 | `cancelado` | *estado previo a la cancelación* | **Reversión de la cancelación** (fue un error) | empleado | [[CU-27 Cancelar viaje]] A3 | El viaje **no** está `finalizado` | Se reponen sus [[Pago|Pagos]] y [[Alerta|Alertas]] |

## Invariantes y reglas

- **`confirmado` es económico, no operativo.** Significa "total pagado" y **no** debe confundirse con el acto de confirmar la reserva, que es [[CU-07 Confirmar reserva]] y produce `reservado` ([[CU-07 Confirmar reserva]], nota de la descripción).
- **T2 y T3 son automáticas.** Las dispara el cobro en [[CU-12 Registrar cobro de un pago]]; el empleado no las ejecuta a mano ([[CU-08 Gestionar estado del viaje]] paso 2).
- **T4 y T5 nunca se fuerzan por fecha.** El sistema sugiere, la persona confirma. Caso de referencia: si el vuelo de regreso está retrasado, el empleado **mantiene el viaje `en curso`** aunque la fecha de regreso ya haya pasado ([[CU-08 Gestionar estado del viaje]] A1).
- **`finalizado` no se cancela** ([[CU-27 Cancelar viaje]] A1).
- Si al cancelar hay [[Pago|Pagos]] ya `pagados`, el sistema **informa el importe cobrado** pero el reembolso/penalidad está **fuera de alcance** ([[CU-27 Cancelar viaje]] A2, [[Alcance y fuera de alcance]]).
- Todo [[Viaje]] tiene al menos un [[Pago]] desde T1 (ver [[DGM — Diagrama de clases]]).

## Huecos y ambigüedades detectadas

Señalados, **no resueltos** — decisión del equipo en la sync, según [[CLAUDE|CLAUDE.md#Orden de autoridad del cerebro]]:

1. **¿Se puede pasar de `vendido` a `en curso` sin pasar por `confirmado`?** [[CU-08 Gestionar estado del viaje]] describe el ciclo como `reservado → vendido → confirmado → en curso → finalizado`, lo que sugiere que **no**. Pero eso implica que un viaje que sale con saldo pendiente no puede marcarse `en curso`, y ningún CU dice qué hacer en ese caso. Hay que definir si la secuencia es estricta o si `confirmado` se puede saltear.
2. **T7 dice "estado inmediato anterior", pero T2 y T3 son automáticas.** Si el empleado retrocede de `vendido` a `reservado` a mano, ¿qué pasa con el [[Pago]] de la seña que ya está `pagado`? Queda un estado incoherente (viaje `reservado` con seña cobrada) que ningún CU contempla.
3. **T9 no dice a qué estado vuelve.** [[CU-27 Cancelar viaje]] A3 dice "reactiva el viaje" sin precisar si vuelve al estado previo a la cancelación o siempre a `reservado`. Hace falta definirlo para poder dibujar la flecha.
4. **`cancelado` está declarado terminal** en [[CU-08 Gestionar estado del viaje]] ("`cancelado` es terminal"), pero T9 lo contradice: [[CU-27 Cancelar viaje]] A3 permite revertirlo. Hay que decidir si es terminal de verdad o terminal-salvo-corrección; afecta cómo se dibuja.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Viaje]] · enum `EstadoViaje` en [[DGM — Diagrama de clases]]
- CU: [[CU-07 Confirmar reserva]] · [[CU-08 Gestionar estado del viaje]] · [[CU-12 Registrar cobro de un pago]] · [[CU-27 Cancelar viaje]] · [[CU-17 Registrar reseña de hotel]]
- Decisiones: [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] · [[RN-01 Comisión automática]]
