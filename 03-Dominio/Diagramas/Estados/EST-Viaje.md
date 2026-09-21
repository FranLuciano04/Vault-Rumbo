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
6. Los huecos de la sección final **ya están resueltos** (21/09): respetar lo que dicen, son parte de la especificación.

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
| T7 | `en curso` · `finalizado` | *estado inmediato anterior* | **Corrección**: se cargó un estado por error | empleado | [[CU-08 Gestionar estado del viaje]] A2 | Solo deshace transiciones **manuales** (T4, T5). Las automáticas (T2, T3) se deshacen revirtiendo el cobro | Línea punteada en el diagrama |
| T8 | `confirmado` | `vendido` | **Reversión de un cobro** que había dejado el saldo en cero | empleado | [[CU-12 Registrar cobro de un pago]] A3 | El cobro se había registrado por error | El [[Pago]] vuelve a `pendiente`/`vencido` y su [[Alerta]] se reabre |
| T9 | `cancelado` | *el estado que tenía justo antes de cancelarse* | **Reversión de la cancelación** (fue un error) | empleado | [[CU-27 Cancelar viaje]] A3 | El viaje **no** está `finalizado` | Se reponen sus [[Pago|Pagos]] (a `pendiente` o `vencido` según su fecha) y [[Alerta|Alertas]]. Línea punteada |

## Invariantes y reglas

- **`confirmado` es económico, no operativo.** Significa "total pagado" y **no** debe confundirse con el acto de confirmar la reserva, que es [[CU-07 Confirmar reserva]] y produce `reservado` ([[CU-07 Confirmar reserva]], nota de la descripción).
- **T2 y T3 son automáticas.** Las dispara el cobro en [[CU-12 Registrar cobro de un pago]]; el empleado no las ejecuta a mano ([[CU-08 Gestionar estado del viaje]] paso 2).
- **T4 y T5 nunca se fuerzan por fecha.** El sistema sugiere, la persona confirma. Caso de referencia: si el vuelo de regreso está retrasado, el empleado **mantiene el viaje `en curso`** aunque la fecha de regreso ya haya pasado ([[CU-08 Gestionar estado del viaje]] A1).
- **La secuencia es estricta** (resuelto 21/09): no se saltea `confirmado`. Un [[Viaje]] no pasa a `en curso` sin estar **totalmente pagado**, aunque ya haya llegado la fecha de salida.
- **`finalizado` no se cancela** ([[CU-27 Cancelar viaje]] A1).
- Si al cancelar hay [[Pago|Pagos]] ya `pagados`, el sistema **informa el importe cobrado** pero el reembolso/penalidad está **fuera de alcance** ([[CU-27 Cancelar viaje]] A2, [[Alcance y fuera de alcance]]).
- Todo [[Viaje]] tiene al menos un [[Pago]] desde T1 (ver [[DGM — Diagrama de clases]]).

## Huecos y ambigüedades — resueltos el 21/09

Se detectaron al especificar y **Nahuel los resolvió el mismo día**. Quedan **a ratificar en la sync**; lo que dice acá ya es lo que hay que dibujar.

1. ✅ **Resuelto 21/09 (Nahuel): la secuencia es estricta.** **No** se puede pasar de `vendido` a `en curso` sin pasar por `confirmado`: un [[Viaje]] no arranca hasta estar **totalmente pagado**. El ciclo `reservado → vendido → confirmado → en curso → finalizado` de [[CU-08 Gestionar estado del viaje]] se respeta al pie de la letra. **Para dibujar:** no hay flecha `vendido → en curso`. **Consecuencia operativa a tener presente:** si llega la fecha de salida con saldo pendiente, el [[Viaje]] **se queda en `vendido`** — el sistema no lo deja avanzar. La salida es cobrar el saldo ([[CU-12 Registrar cobro de un pago]]) o cancelar ([[CU-27 Cancelar viaje]]).
2. ✅ **Resuelto 21/09 (Nahuel): la corrección manual (T7) solo aplica a las transiciones manuales.** Es decir, solo permite deshacer T4 (`en curso → confirmado`) y T5 (`finalizado → en curso`). **No** se puede retroceder `vendido → reservado` ni `confirmado → vendido` a mano, porque esas las produjo un cobro: para deshacerlas hay que **revertir el cobro** ([[CU-12 Registrar cobro de un pago]] A3), que ya cambia el estado del [[Viaje]] solo (T8). Así se evita el estado incoherente de un viaje `reservado` con la seña cobrada. **Para dibujar:** T7 sale únicamente de `en curso` y `finalizado`.
3. ✅ **Resuelto 21/09 (Nahuel): T9 vuelve al estado que el [[Viaje]] tenía inmediatamente antes de cancelarse**, no siempre a `reservado`.
4. ✅ **Resuelto 21/09 (Nahuel): `cancelado` es terminal para el flujo de negocio.** T9 no es un paso del flujo sino la **corrección de un error de carga**, igual que T7. Se mantiene lo que dice [[CU-08 Gestionar estado del viaje]]. **Para dibujar:** T7, T8 y T9 van en **línea punteada** (correcciones), y T1-T6 en línea llena (flujo de negocio).

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Viaje]] · enum `EstadoViaje` en [[DGM — Diagrama de clases]]
- CU: [[CU-07 Confirmar reserva]] · [[CU-08 Gestionar estado del viaje]] · [[CU-12 Registrar cobro de un pago]] · [[CU-27 Cancelar viaje]] · [[CU-17 Registrar reseña de hotel]]
- Decisiones: [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] · [[RN-01 Comisión automática]]
