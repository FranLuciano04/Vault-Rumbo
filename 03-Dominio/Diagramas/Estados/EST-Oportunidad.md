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
6. Los huecos de la sección final **ya están resueltos** (21/09): respetar lo que dicen, son parte de la especificación.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `nueva` | Consulta recibida, **sin atender** todavía. | Estado inicial: la crea [[CU-04 Registrar consulta]] | No |
| `en_gestión` | Se está **atendiendo/asesorando**, antes de cotizar. | El empleado empieza a trabajarla ([[CU-05 Seguir oportunidad]]) | No |
| `cotizada` | Se emitió y **envió** una [[Cotización]]. | [[CU-06 Emitir cotización]] | No |
| `ganada` | El cliente compró. Deriva en [[Viaje]]. | Cierre en [[CU-05 Seguir oportunidad]] | **Sí** (no vuelve atrás ni si el [[Viaje]] se cancela) |
| `perdida` | No se concretó, **con motivo** registrado. | Cierre en [[CU-05 Seguir oportunidad]] | **Sí** (reabrible a `en_gestión`, T8) |

**Estado inicial:** `nueva`.
**Estados finales:** `ganada` y `perdida`.

> `en_gestión` se sumó el 18/09 en la entrevista de consistencia (Q1): cubre el período de atención previo a la cotización, que antes no tenía estado. Ver [[DEC-0002 Modelar la consulta como Oportunidad]].

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `nueva` | Llega una consulta por Instagram, WhatsApp o presencial y se registra | empleado | [[CU-04 Registrar consulta]] | Hay que identificar o crear el [[Cliente]] ([[CU-02 Registrar cliente]]) | Se crea la [[Oportunidad]] asociada al `Cliente` y al empleado que la registra (`responsable`) |
| T2 | `nueva` | `en_gestión` | El empleado **empieza a atender** la consulta | empleado | [[CU-05 Seguir oportunidad]] paso 2 | — | Se registran interacciones; se puede agendar una [[Alerta]] de tipo `insistencia` |
| T3 | `nueva` · `en_gestión` | `cotizada` | Se **envía** la [[Cotización]] al cliente | empleado | [[CU-06 Emitir cotización]] paso 5 | Existe una [[Cotización]] que pasó a `enviada` | La [[Cotización]] queda asociada a la [[Oportunidad]] |
| T4 | `nueva` · `en_gestión` · `cotizada` | `ganada` | El cliente **confirma la compra** | empleado | [[CU-05 Seguir oportunidad]] paso 6 | — | **Resuelve las [[Alerta|Alertas]] de `insistencia` pendientes** (paso 7); habilita [[CU-07 Confirmar reserva]], que crea el [[Viaje]] |
| T5 | `nueva` · `en_gestión` · `cotizada` | `perdida` | El cliente desiste o no hay acuerdo | empleado | [[CU-05 Seguir oportunidad]] paso 6 / A2 | **Obligatorio registrar el motivo** (ver Invariantes) | Resuelve las [[Alerta|Alertas]] de `insistencia` pendientes; queda en el historial para el embudo y los reportes |
| T7 | `en_gestión` · `cotizada` | *(se mantiene)* | **Insistencia vencida sin respuesta** | sistema / empleado | [[CU-05 Seguir oportunidad]] A1 | — | **No cambia el estado**: se reagenda o reprograma la [[Alerta]] de `insistencia`. Dibujar como auto-transición |
| T8 | `perdida` | `en_gestión` | **Reactivación**: un cliente que había desistido retoma | empleado | [[CU-05 Seguir oportunidad]] A3 | Vuelve a `en_gestión` porque se la está volviendo a trabajar. Alternativa: registrar una [[Oportunidad]] nueva ([[CU-04 Registrar consulta]]) | — |

## Invariantes y reglas

- **`perdida` exige motivo**, de una **lista fija**: `precio · fechas/disponibilidad · desistió · compró en otra agencia · sin respuesta · otro` (este último con texto libre) — [[CU-05 Seguir oportunidad]] paso 6.
- **Una `Oportunidad` puede tener varias [[Cotización|Cotizaciones]]** (versiones); se conserva el historial ([[CU-06 Emitir cotización]]). El estado `cotizada` no dice cuántas hay.
- **Se puede ganar sin cotización formal**: [[CU-05 Seguir oportunidad]] A4 permite cerrar `ganada` sin [[Cotización]] escrita, y [[CU-07 Confirmar reserva]] A1 lo acepta. Por eso T4 sale también de `nueva` y `en_gestión`.
- **Al cerrarse (T4 o T5) se resuelven las [[Alerta|Alertas]] de `insistencia` pendientes** ([[CU-05 Seguir oportunidad]] paso 7).
- **Los 5 estados alimentan el embudo** del dashboard ([[CU-21 Ver dashboard y embudo]]); alinearlos fue la Q1 del 18/09.
- Visibilidad: la gestiona el `responsable`; es legible por toda la agencia ([[DEC-0005 Autenticación y modelo de roles]]).

## Huecos y ambigüedades — resueltos el 21/09

Se detectaron al especificar y **Nahuel los resolvió el mismo día**. Quedan **a ratificar en la sync**; lo que dice acá ya es lo que hay que dibujar.

1. ✅ **Resuelto 21/09 (Nahuel): sí, se permite `nueva → cotizada`.** Emitir una cotización ya implica haber trabajado la consulta; obligar a un paso intermedio no aporta nada. **Para dibujar:** va la flecha directa `nueva → cotizada`, además de la que pasa por `en_gestión`.
2. ✅ **Resuelto 21/09 (Nahuel): T6 no existe — la `Oportunidad` NO retrocede.** Al generar una versión nueva de la [[Cotización]] ([[CU-06 Emitir cotización]] A1), la `Oportunidad` **se queda en `cotizada`**. Versionar es crear otra [[Cotización]], no mover la oportunidad hacia atrás. **Para dibujar:** eliminar T6 de la tabla de arriba; no se dibuja.
3. ✅ **Resuelto 21/09 (Nahuel): T8 vuelve a `en_gestión`.** Si un cliente que se había perdido retoma, la oportunidad se está **volviendo a trabajar**, así que corresponde `en_gestión` — no `nueva` (ya no es una consulta sin atender) ni `cotizada` (la cotización vieja probablemente ya no sirve). **Para dibujar:** una sola flecha `perdida → en_gestión`.
4. ✅ **Resuelto 21/09 (Nahuel): `ganada` es terminal, no vuelve atrás.** Si después se cancela el [[Viaje]], la `Oportunidad` **queda `ganada`**. El embudo mide la **venta**, no la ejecución: la cancelación se mide en [[Viaje]] (estado `cancelado`), que es donde corresponde. Si la oportunidad volviera a `perdida`, el embudo histórico del [[CU-21 Ver dashboard y embudo|dashboard]] cambiaría retroactivamente y dejaría de ser comparable entre períodos.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Oportunidad]] · enum `EstadoOportunidad` en [[DGM — Diagrama de clases]]
- CU: [[CU-04 Registrar consulta]] · [[CU-05 Seguir oportunidad]] · [[CU-06 Emitir cotización]] · [[CU-07 Confirmar reserva]] · [[CU-21 Ver dashboard y embudo]]
- Decisiones: [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0005 Autenticación y modelo de roles]]
