---
tipo: diagrama
estado: borrador
modulo: [redes]
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# EST-ContenidoRed — Especificación de estados

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> **Especificación** del flujo kanban de [[ContenidoRed]], lista para dibujar. Derivada de [[CU-19 Planificar contenido en redes]] y [[CU-20 Generar propuesta de contenido con IA]]. El enum vive en [[DGM — Diagrama de clases]] (`EstadoKanban`).
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
5. Son **5 estados** (incluido `descartado`, sumado el 21/09) y el kanban **se arrastra en las dos direcciones**: dibujar las flechas de avance y de retroceso entre `idea`, `en producción` y `listo`.
6. **Validar renderizando** con `mermaid-cli` antes de commitear.
7. Los huecos de la sección final **ya están resueltos** (21/09): respetar lo que dicen, son parte de la especificación.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `idea` | Pieza anotada, **sin producir**. Primera columna del tablero. | Estado inicial: la crea [[CU-19 Planificar contenido en redes]] paso 2 | No |
| `en producción` | Se está **armando** el contenido (texto, imágenes). | El empleado mueve la tarjeta ([[CU-19 Planificar contenido en redes]] paso 3) | No |
| `listo` | Contenido **terminado**, esperando su fecha de publicación. | El empleado mueve la tarjeta | No |
| `publicado` | Ya se **publicó manualmente** en la red. | El empleado mueve la tarjeta después de publicar ([[CU-19 Planificar contenido en redes]] A3) | **Sí** |
| `descartado` ⚠️ | **Baja lógica**: la pieza no va más. Se conserva el registro, no se borra. | El empleado la descarta desde cualquier columna previa a `publicado` | **Sí** |

**Estado inicial:** `idea`.
**Estados finales:** `publicado` y `descartado`.

> ⚠️ **`descartado` es nuevo (21/09, Nahuel).** `EstadoKanban` pasa de 4 a **5 valores**. Motivo: hoy la única forma de sacar una idea que no sirve sería borrarla físicamente, lo que rompe el criterio de **baja lógica** que el equipo aplicó a [[Hotel]], [[Reseña]], [[Destino]] y [[Operador]].

> Es un **flujo kanban**, no una máquina de estados de negocio: los estados son columnas de un tablero que mueve una persona. No hay transiciones automáticas ni disparadas por el sistema. Es la única de las seis máquinas donde **el sistema nunca cambia el estado por su cuenta**.

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `idea` | El empleado crea una pieza con **título/idea**, **canal** y **fecha de publicación** programada | empleado | [[CU-19 Planificar contenido en redes]] paso 2 | — | Aparece en la primera columna del tablero y en el calendario |
| T2 | `idea` | `en producción` | El empleado **arrastra la tarjeta** a la siguiente columna | empleado | [[CU-19 Planificar contenido en redes]] paso 3 | — | — |
| T3 | `en producción` | `listo` | El empleado arrastra la tarjeta | empleado | [[CU-19 Planificar contenido en redes]] paso 3 | El contenido está terminado | — |
| T4 | `listo` | `publicado` | El empleado **publicó manualmente** en la red y mueve la tarjeta | empleado | [[CU-19 Planificar contenido en redes]] A3 | **Rumbo no publica por sí mismo** ([[Alcance y fuera de alcance]]) | — |
| T5 | `en producción` · `listo` | *columna anterior* | El empleado **retrocede** la tarjeta | empleado | [[CU-19 Planificar contenido en redes]] paso 3 | Confirmado el 21/09: el kanban se arrastra en **las dos direcciones** | — |
| T6 | `idea` · `en producción` · `listo` | `descartado` | La pieza **no va más** | empleado | — *(sumado el 21/09)* | **Baja lógica**: no se borra físicamente. **No** sale desde `publicado` | — |
| T7 | `idea` · `en producción` | *(se mantiene)* | **Generar un borrador con IA** y guardarlo en la pieza | empleado + servicio de IA (Claude) | [[CU-20 Generar propuesta de contenido con IA]] / [[CU-19 Planificar contenido en redes]] A1 | Solo desde `idea` o `en producción` | **No cambia el estado.** Dibujar como auto-transición. La IA usa solo tema/canal/tono: **no accede a datos del negocio** |
| T8 | cualquiera | *(se mantiene)* | **Reprogramar** la fecha de publicación | empleado | [[CU-19 Planificar contenido en redes]] A2 | — | **No cambia el estado**; se actualiza el calendario |

## Invariantes y reglas

- **Sin publicación automática.** El sistema planifica y organiza; **la publicación en la red la hace una persona** ([[Alcance y fuera de alcance]]). Por eso T4 la ejecuta el empleado *después* de publicar, no antes.
- **La IA propone, la persona decide.** [[CU-20 Generar propuesta de contenido con IA]] genera **borradores** que el empleado revisa y edita; nada se guarda sin intervención humana (A2: si ninguna propuesta sirve, no se guarda nada).
- **La IA no accede a datos del negocio** (clientes, catálogo, ventas): solo usa el tema, canal y tono que indica el empleado ([[CU-20 Generar propuesta de contenido con IA]] paso 3).
- La pieza tiene un `canal` (`instagram · tiktok · whatsapp_ventas`) que **no** es parte de la máquina de estados.
- La gestión **no está restringida a un rol**: cualquier empleado con acceso al módulo puede mover tarjetas ([[DEC-0005 Autenticación y modelo de roles]]).

## Huecos y ambigüedades — resueltos el 21/09

Se detectaron al especificar y **Nahuel los resolvió el mismo día**. Quedan **a ratificar en la sync**; lo que dice acá ya es lo que hay que dibujar.

1. ✅ **Resuelto 21/09 (Nahuel): sí, se puede retroceder.** Es un tablero kanban y se arrastra en las dos direcciones (ej. una pieza `listo` que hay que rehacer vuelve a `en producción`). **Para dibujar:** flechas **bidireccionales** entre `idea`, `en producción` y `listo`. T5 queda confirmada.
2. ✅ **Resuelto 21/09 (Nahuel): se suma `descartado` al enum.** Es el único cambio de modelo de esta máquina. Motivo: hoy la única forma de sacar una idea que no sirve sería **borrarla físicamente**, lo que rompe el criterio de **baja lógica** que el equipo aplicó a [[Hotel]], [[Reseña]], [[Destino]] y [[Operador]]. `EstadoKanban` pasa a `idea · en producción · listo · publicado · descartado`. Ver la transición **T8**.
3. ✅ **Resuelto 21/09 (Nahuel): `publicado` es terminal.** No se modela despublicar: Rumbo **no publica** ([[Alcance y fuera de alcance]]), así que tampoco despublica. Si hiciera falta rehacer una pieza ya publicada, se crea una nueva.
4. ✅ **Resuelto 21/09 (Nahuel): no hace falta aviso por `fecha_publicacion`.** Se evaluó generar una [[Alerta]] del tipo "pieza programada para hoy sin publicar" y **se descartó**: no está en el relevamiento y no lo pidieron. La `fecha_publicacion` sigue siendo solo informativa para el calendario. Si más adelante la agencia lo pide, se reabre.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[ContenidoRed]] · enum `EstadoKanban` en [[DGM — Diagrama de clases]]
- CU: [[CU-19 Planificar contenido en redes]] · [[CU-20 Generar propuesta de contenido con IA]]
- Decisiones: [[DEC-0001 Stack tecnológico]] (la IA del producto es Claude) · [[DEC-0005 Autenticación y modelo de roles]]
- Alcance: [[Alcance y fuera de alcance]] (sin publicación automática)
