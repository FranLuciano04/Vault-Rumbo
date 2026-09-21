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
5. Es la máquina **más simple** de las seis: 4 estados, lineal con una bifurcación. No hace falta agrupar ni anidar.
6. **Validar renderizando** con `mermaid-cli` antes de commitear.
7. **No resolver los huecos** de la sección final.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `borrador` | El documento está generado pero **todavía no se envió** al cliente. | Estado inicial: lo crea [[CU-06 Emitir cotización]] paso 3 | No |
| `enviada` | Se le pasó al cliente (por WhatsApp o email, **fuera del sistema**) y el empleado la marcó como enviada. | [[CU-06 Emitir cotización]] paso 4 | No |
| `aceptada` | El cliente aceptó. **Habilita confirmar la reserva.** | [[CU-06 Emitir cotización]] A2 | **Sí** |
| `rechazada` | El cliente no aceptó. | [[CU-06 Emitir cotización]] A3 | **Sí** |

**Estado inicial:** `borrador`.
**Estados finales:** `aceptada` y `rechazada`.

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `borrador` | El empleado genera la cotización desde una **plantilla + formulario** | empleado | [[CU-06 Emitir cotización]] pasos 1-3 | Existe una [[Oportunidad]]; se cargan `moneda`, ítems y el sistema calcula el `total` | Se genera el **documento** y queda asociada a la [[Oportunidad]] |
| T2 | `borrador` | `enviada` | El empleado **envía** la cotización al cliente y la marca como enviada | empleado | [[CU-06 Emitir cotización]] paso 4 | El envío ocurre **por fuera del sistema** (WhatsApp/email); el sistema solo registra el hecho | La [[Oportunidad]] pasa a `cotizada` ([[EST-Oportunidad]] T3) |
| T3 | `enviada` | `aceptada` | El cliente **acepta** | empleado (lo registra) | [[CU-06 Emitir cotización]] A2 | — | Habilita [[CU-07 Confirmar reserva]]; la `moneda` de esta cotización queda como **moneda de referencia del [[Viaje]]**; la [[Oportunidad]] se cierra `ganada` |
| T4 | `enviada` | `rechazada` | El cliente **no acepta** | empleado (lo registra) | [[CU-06 Emitir cotización]] A3 | — | El seguimiento continúa o la [[Oportunidad]] se cierra `perdida` ([[CU-05 Seguir oportunidad]]) |

## Invariantes y reglas

- **Cotizador asistido, no automático.** Los precios los carga el empleado; **no hay scraping** ni integración con proveedores ([[Alcance y fuera de alcance]]).
- **Una [[Oportunidad]] puede tener varias [[Cotización|Cotizaciones]]**: cada revisión es una **nueva** `Cotización` (nueva instancia, nueva máquina de estados), y la anterior **queda en el historial** ([[CU-06 Emitir cotización]] A1). Esto es importante para dibujar: *versionar no es una transición*, es crear otro objeto.
- **La moneda de la cotización aceptada define la moneda de referencia del [[Viaje]]** ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
- **Se puede vender sin cotización.** [[CU-05 Seguir oportunidad]] A4 y [[CU-07 Confirmar reserva]] A1 permiten cerrar `ganada` sin cotización escrita: esta máquina de estados **no siempre se ejecuta**.
- El `total` lo calcula el sistema a partir de los ítems ([[CU-06 Emitir cotización]] paso 2).

## Huecos y ambigüedades detectadas

Señalados, **no resueltos** — decisión del equipo en la sync:

1. **¿En qué estado queda la cotización vieja al generar una versión nueva?** [[CU-06 Emitir cotización]] A1 dice que "la anterior queda en el historial", pero no dice **en qué estado**. Se queda `enviada` para siempre (y entonces una [[Oportunidad]] puede tener varias `enviada` a la vez), o pasa a `rechazada`, o hace falta un estado `reemplazada`/`obsoleta` que hoy **no existe en el enum**.
2. **¿Se puede aceptar o rechazar una cotización en `borrador`?** Formalmente no, porque el cliente no la vio. Pero si el empleado se la mostró en persona y el cliente aceptó ahí mismo, tendría que marcarla `enviada` primero solo para poder aceptarla. Ningún CU lo aclara.
3. **`rechazada` no tiene salida.** Si el cliente rechaza y después se arrepiente, hay que generar una cotización nueva (no se puede reactivar). Es coherente con A1, pero conviene dejarlo escrito para que quede claro que es terminal a propósito.
4. **No hay estado de vencimiento.** Una cotización de turismo normalmente tiene validez (los precios cambian), pero ni el enum ni los CU contemplan `vencida` ni un campo `validez_hasta`. ⚠️ Esto **no está en el relevamiento**: habría que preguntarle a la agencia si manejan vigencia de cotizaciones.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Cotización]] · enum `EstadoCotizacion` en [[DGM — Diagrama de clases]]
- CU: [[CU-06 Emitir cotización]] · [[CU-05 Seguir oportunidad]] · [[CU-07 Confirmar reserva]] · [[CU-18 Buscar y recomendar hoteles]]
- Decisiones: [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]
- Relacionado: [[EST-Oportunidad]] (T2 de acá dispara T3 de allá)
