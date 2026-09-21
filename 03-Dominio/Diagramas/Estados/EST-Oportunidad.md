---
tipo: diagrama
estado: borrador
modulo: [clientes, cotizaciones]
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# EST-Oportunidad — Especificación de estados

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> **Especificación** del embudo de ventas de [[Oportunidad]], lista para dibujar. Derivada de [[CU-04 Registrar consulta]], [[CU-05 Seguir oportunidad]], [[CU-06 Emitir cotización]] y [[CU-07 Confirmar reserva]]. El enum vive en [[DGM — Diagrama de clases]] (`EstadoOportunidad`).
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
5. **Validar renderizando** con `mermaid-cli` antes de commitear.
6. **No resolver los huecos** de la sección final.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `nueva` | Consulta recibida, **sin atender** todavía. | Estado inicial: la crea [[CU-04 Registrar consulta]] | No |
| `en_gestión` | Se está **atendiendo/asesorando**, antes de cotizar. | El empleado empieza a trabajarla ([[CU-05 Seguir oportunidad]]) | No |
| `cotizada` | Se emitió y **envió** una [[Cotización]]. | [[CU-06 Emitir cotización]] | No |
| `ganada` | El cliente compró. Deriva en [[Viaje]]. | Cierre en [[CU-05 Seguir oportunidad]] | **Sí** |
| `perdida` | No se concretó, **con motivo** registrado. | Cierre en [[CU-05 Seguir oportunidad]] | **Sí** (reabrible, ver T8) |

**Estado inicial:** `nueva`.
**Estados finales:** `ganada` y `perdida`.

> `en_gestión` se sumó el 18/09 en la entrevista de consistencia (Q1): cubre el período de atención previo a la cotización, que antes no tenía estado. Ver [[DEC-0002 Modelar la consulta como Oportunidad]].

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `nueva` | Llega una consulta por Instagram, WhatsApp o presencial y se registra | empleado | [[CU-04 Registrar consulta]] | Hay que identificar o crear el [[Cliente]] ([[CU-02 Registrar cliente]]) | Se crea la [[Oportunidad]] asociada al `Cliente` y al empleado que la registra (`responsable`) |
| T2 | `nueva` | `en_gestión` | El empleado **empieza a atender** la consulta | empleado | [[CU-05 Seguir oportunidad]] paso 2 | — | Se registran interacciones; se puede agendar una [[Alerta]] de tipo `insistencia` |
| T3 | `en_gestión` | `cotizada` | Se **envía** la [[Cotización]] al cliente | empleado | [[CU-06 Emitir cotización]] paso 5 | Existe una [[Cotización]] que pasó a `enviada` | La [[Cotización]] queda asociada a la [[Oportunidad]] |
| T4 | `nueva` · `en_gestión` · `cotizada` | `ganada` | El cliente **confirma la compra** | empleado | [[CU-05 Seguir oportunidad]] paso 6 | — | **Resuelve las [[Alerta|Alertas]] de `insistencia` pendientes** (paso 7); habilita [[CU-07 Confirmar reserva]], que crea el [[Viaje]] |
| T5 | `nueva` · `en_gestión` · `cotizada` | `perdida` | El cliente desiste o no hay acuerdo | empleado | [[CU-05 Seguir oportunidad]] paso 6 / A2 | **Obligatorio registrar el motivo** (ver Invariantes) | Resuelve las [[Alerta|Alertas]] de `insistencia` pendientes; queda en el historial para el embudo y los reportes |
| T6 | `cotizada` | `en_gestión` | El cliente pide cambios y se vuelve a asesorar antes de recotizar | empleado | [[CU-06 Emitir cotización]] A1 | ⚠️ **Implícita**, ver hueco 2 | Se genera otra versión de la [[Cotización]] |
| T7 | `en_gestión` · `cotizada` | *(se mantiene)* | **Insistencia vencida sin respuesta** | sistema / empleado | [[CU-05 Seguir oportunidad]] A1 | — | **No cambia el estado**: se reagenda o reprograma la [[Alerta]] de `insistencia`. Dibujar como auto-transición |
| T8 | `perdida` | `nueva` · `cotizada` | **Reactivación**: un cliente que había desistido retoma | empleado | [[CU-05 Seguir oportunidad]] A3 | Alternativa: registrar una [[Oportunidad]] nueva ([[CU-04 Registrar consulta]]) | — |

## Invariantes y reglas

- **`perdida` exige motivo**, de una **lista fija**: `precio · fechas/disponibilidad · desistió · compró en otra agencia · sin respuesta · otro` (este último con texto libre) — [[CU-05 Seguir oportunidad]] paso 6.
- **Una `Oportunidad` puede tener varias [[Cotización|Cotizaciones]]** (versiones); se conserva el historial ([[CU-06 Emitir cotización]]). El estado `cotizada` no dice cuántas hay.
- **Se puede ganar sin cotización formal**: [[CU-05 Seguir oportunidad]] A4 permite cerrar `ganada` sin [[Cotización]] escrita, y [[CU-07 Confirmar reserva]] A1 lo acepta. Por eso T4 sale también de `nueva` y `en_gestión`.
- **Al cerrarse (T4 o T5) se resuelven las [[Alerta|Alertas]] de `insistencia` pendientes** ([[CU-05 Seguir oportunidad]] paso 7).
- **Los 5 estados alimentan el embudo** del dashboard ([[CU-21 Ver dashboard y embudo]]); alinearlos fue la Q1 del 18/09.
- Visibilidad: la gestiona el `responsable`; es legible por toda la agencia ([[DEC-0005 Autenticación y modelo de roles]]).

## Huecos y ambigüedades detectadas

Señalados, **no resueltos** — decisión del equipo en la sync:

1. **¿Se puede ir de `nueva` a `cotizada` salteando `en_gestión`?** La precondición de [[CU-06 Emitir cotización]] solo pide que exista una [[Oportunidad]], sin exigir `en_gestión`. Pero [[CU-05 Seguir oportunidad]] presenta `en_gestión` como el paso previo natural. Si se permite el salto, hay que dibujar la flecha `nueva → cotizada`.
2. **T6 (`cotizada → en_gestión`) es una inferencia mía, no está escrita.** [[CU-06 Emitir cotización]] A1 dice que se genera otra versión de la cotización, pero **no aclara si la `Oportunidad` retrocede** a `en_gestión` o se queda en `cotizada`. Lo más probable es que se quede en `cotizada`; hay que confirmarlo antes de dibujar T6.
3. **T8 no precisa el destino.** [[CU-05 Seguir oportunidad]] A3 dice que se reabre "vuelve a `nueva`/`cotizada`" sin criterio para elegir entre los dos. Hace falta una regla (¿vuelve al estado que tenía antes de perderse?).
4. **`ganada` no tiene salida.** Si se confirma la reserva y después el [[Viaje]] se cancela ([[CU-27 Cancelar viaje]]), ningún CU dice qué pasa con la `Oportunidad`: ¿queda `ganada` para siempre, o vuelve a `perdida`? Afecta las métricas del embudo del [[CU-21 Ver dashboard y embudo|dashboard]].

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Oportunidad]] · enum `EstadoOportunidad` en [[DGM — Diagrama de clases]]
- CU: [[CU-04 Registrar consulta]] · [[CU-05 Seguir oportunidad]] · [[CU-06 Emitir cotización]] · [[CU-07 Confirmar reserva]] · [[CU-21 Ver dashboard y embudo]]
- Decisiones: [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0005 Autenticación y modelo de roles]]
