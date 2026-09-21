---
tipo: diagrama
estado: borrador
modulo: [cotizaciones]
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# EST-Cotización — Especificación de estados

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> **Especificación** del ciclo de vida de [[Cotización]], lista para dibujar. Derivada de [[CU-06 Emitir cotización]] y [[CU-07 Confirmar reserva]]. El enum vive en [[DGM — Diagrama de clases]] (`EstadoCotizacion`).
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
5. Son **5 estados** (incluido `vencida`, sumado el 21/09). Estructura simple: lineal con una bifurcación triple al final. **Marcar T5** como la única transición sin actor humano.
6. **Validar renderizando** con `mermaid-cli` antes de commitear.
7. Los huecos de la sección final **ya están resueltos** (21/09): respetar lo que dicen, son parte de la especificación.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `borrador` | El documento está generado pero **todavía no se envió** al cliente. | Estado inicial: lo crea [[CU-06 Emitir cotización]] paso 3 | No |
| `enviada` | Se le pasó al cliente (por WhatsApp o email, **fuera del sistema**) y el empleado la marcó como enviada. | [[CU-06 Emitir cotización]] paso 4 | No |
| `aceptada` | El cliente aceptó. **Habilita confirmar la reserva.** | [[CU-06 Emitir cotización]] A2 | **Sí** |
| `rechazada` | El cliente no aceptó. | [[CU-06 Emitir cotización]] A3 | **Sí** |
| `vencida` ⚠️ | Pasó su `validez_hasta` sin que el cliente se decidiera. Los precios ya no se sostienen. | **Proceso automático del sistema** | **Sí** |

**Estado inicial:** `borrador`.
**Estados finales:** `aceptada`, `rechazada` y `vencida`.

> ⚠️ **`vencida` es nuevo (21/09, Nahuel).** El enum pasa de 4 a **5 valores** y [[Cotización]] gana el atributo **`validez_hasta`**. Motivo: en turismo los precios cambian, así que una cotización no puede quedar vigente para siempre. **Default: 1 mes** desde la `fecha` de emisión, como parámetro global configurable por `admin` (mismo patrón que la anticipación de la [[Alerta]] `salida`). ⚠️ **El valor de 1 mes es una propuesta de Nahuel, sin validar con la agencia** — igual que se hizo con `forma_pago` y los 7 días de `salida`. #accion/decidir

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `borrador` | El empleado genera la cotización desde una **plantilla + formulario** | empleado | [[CU-06 Emitir cotización]] pasos 1-3 | Existe una [[Oportunidad]]; se cargan `moneda`, ítems y el sistema calcula el `total` | Se genera el **documento** y queda asociada a la [[Oportunidad]] |
| T2 | `borrador` | `enviada` | El empleado **envía** la cotización al cliente y la marca como enviada | empleado | [[CU-06 Emitir cotización]] paso 4 | El envío ocurre **por fuera del sistema** (WhatsApp/email); el sistema solo registra el hecho | La [[Oportunidad]] pasa a `cotizada` ([[EST-Oportunidad]] T3) |
| T3 | `enviada` | `aceptada` | El cliente **acepta** | empleado (lo registra) | [[CU-06 Emitir cotización]] A2 | — | Habilita [[CU-07 Confirmar reserva]]; la `moneda` de esta cotización queda como **moneda de referencia del [[Viaje]]**; la [[Oportunidad]] se cierra `ganada` |
| T4 | `enviada` | `rechazada` | El cliente **no acepta** | empleado (lo registra) | [[CU-06 Emitir cotización]] A3 | — | El seguimiento continúa o la [[Oportunidad]] se cierra `perdida` ([[CU-05 Seguir oportunidad]]) |
| T5 | `enviada` | `vencida` | **Pasó la `validez_hasta`** sin respuesta del cliente | **sistema** (proceso automático) | *ninguno* — no es un CU con actor | Solo desde `enviada`: un `borrador` nunca vence porque el cliente no lo vio | La [[Oportunidad]] **no cambia de estado** (sigue `cotizada`). Para retomar hay que emitir una cotización nueva |

## Invariantes y reglas

- **Cotizador asistido, no automático.** Los precios los carga el empleado; **no hay scraping** ni integración con proveedores ([[Alcance y fuera de alcance]]).
- **Una [[Oportunidad]] puede tener varias [[Cotización|Cotizaciones]]**: cada revisión es una **nueva** `Cotización` (nueva instancia, nueva máquina de estados), y la anterior **queda en el historial** ([[CU-06 Emitir cotización]] A1). Esto es importante para dibujar: *versionar no es una transición*, es crear otro objeto.
- **La moneda de la cotización aceptada define la moneda de referencia del [[Viaje]]** ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- **Se puede vender sin cotización.** [[CU-05 Seguir oportunidad]] A4 y [[CU-07 Confirmar reserva]] A1 permiten cerrar `ganada` sin cotización escrita: esta máquina de estados **no siempre se ejecuta**.
- El `total` lo calcula el sistema a partir de los ítems ([[CU-06 Emitir cotización]] paso 2).
- **Vigencia (21/09):** la cotización vale hasta su `validez_hasta`, por default **1 mes** desde la `fecha` de emisión. Pasada esa fecha pasa a `vencida` sola (T5) y hay que emitir una nueva. Solo vencen las `enviada`: un `borrador` no vence. ⚠️ El default de 1 mes está **sin validar con la agencia**.

## Huecos y ambigüedades — resueltos el 21/09

Se detectaron al especificar y **Nahuel los resolvió el mismo día**. Quedan **a ratificar en la sync**; lo que dice acá ya es lo que hay que dibujar.

1. ✅ **Resuelto 21/09 (Nahuel): la cotización vieja se queda `enviada`.** No se inventa un estado `reemplazada`. La **vigente es la de `fecha` más reciente**; las anteriores quedan `enviada` en el historial, que además es cierto (se enviaron). Sí, una [[Oportunidad]] puede tener varias `enviada` a la vez: es su historial de versiones, no una inconsistencia. *(Con `vencida` esto se resuelve solo en la práctica: las versiones viejas terminan venciendo por T5.)*
2. ✅ **Resuelto 21/09 (Nahuel): no se puede aceptar ni rechazar un `borrador`.** Si el cliente la aceptó es porque alguien se la mostró, así que corresponde marcarla `enviada` y después `aceptada`. Mantiene el dato de que se envió y evita saltear el registro. **Para dibujar:** de `borrador` solo sale la flecha a `enviada`.
3. ✅ **Resuelto 21/09 (Nahuel): `rechazada` es terminal a propósito.** Si el cliente se arrepiente, se emite una cotización **nueva**; no se reactiva la vieja. Coherente con el criterio de versionado de A1.
4. ✅ **Resuelto 21/09 (Nahuel): las cotizaciones SÍ vencen.** Se suma el estado **`vencida`** al enum y el atributo **`validez_hasta`** a [[Cotización]], con **default 1 mes** desde la emisión (parámetro global configurable por `admin`). Ver la nota bajo la tabla de estados y la transición **T5**. ⚠️ **El valor de 1 mes está sin validar con la agencia** — queda `#accion/decidir` para la sync, igual que `forma_pago` y los 7 días de la [[Alerta]] `salida`.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Cotización]] · enum `EstadoCotizacion` en [[DGM — Diagrama de clases]]
- CU: [[CU-06 Emitir cotización]] · [[CU-05 Seguir oportunidad]] · [[CU-07 Confirmar reserva]] · [[CU-18 Buscar y recomendar hoteles]]
- Decisiones: [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]
- Relacionado: [[EST-Oportunidad]] (T2 de acá dispara T3 de allá)
