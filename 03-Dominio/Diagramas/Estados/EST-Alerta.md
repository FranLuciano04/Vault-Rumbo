---
tipo: diagrama
estado: borrador
modulo: [alertas]
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# EST-Alerta — Especificación de estados

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> **Especificación** del ciclo de vida de [[Alerta]], lista para dibujar. Derivada de [[CU-14 Ver y atender alertas del día]], [[CU-28 Crear recordatorio manual]], [[CU-12 Registrar cobro de un pago]], [[CU-11 Definir plan de cuotas]], [[CU-05 Seguir oportunidad]] y [[CU-27 Cancelar viaje]]. El enum vive en [[DGM — Diagrama de clases]] (`EstadoAlerta`).
>
> ⚠️ **El diagrama todavía no está dibujado.** Esta nota existe para que se pueda dibujar sin volver a leer los CU.
>
> ✅ **El diagrama va con 3 estados.** La contradicción con [[CU-14 Ver y atender alertas del día]] (el estado `vencida`) se resolvió el 21/09: era un filtro de la vista, no un estado. Ver hueco 1.

## Para la sesión que dibuje este diagrama

1. **Con esta nota alcanza.** No hace falta abrir los CU ni las entidades.
2. Dibujar con los **3 estados del enum** (`pendiente · vista · resuelta`). Ya está resuelto: no se agrega `vencida` (ver hueco 1).
3. Dibujar un `stateDiagram-v2` de Mermaid y **pegarlo en la sección `## Diagrama`** de esta misma nota.
4. Usar el encabezado común del vault (motor ELK, líneas rectas):
   ```
   %%{init: {'layout':'elk','theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'14px','primaryColor':'#f8fafc','primaryBorderColor':'#64748b','primaryTextColor':'#0f172a','lineColor':'#94a3b8'}}}%%
   ```
5. **Etiquetar cada transición** con el evento disparador, no con el número.
6. **No dibujar los 7 `tipo` como estados.** El `tipo` de la [[Alerta]] (`pago`, `formulario`, `salida`…) es un atributo fijo que se define al crearla; **no** es parte de la máquina de estados. Solo determina *quién* la crea (T1) y *qué acción* se hace al atenderla.
7. **Validar renderizando** con `mermaid-cli` antes de commitear.
8. Los huecos de la sección final **ya están resueltos** (21/09): respetar lo que dicen, son parte de la especificación.

## Estados

| Estado | Significado | Cómo se entra | ¿Terminal? |
|---|---|---|---|
| `pendiente` | Agendada y **sin atender**. Aparece en la agenda del día. | Estado inicial: la crea cualquiera de los generadores de T1 | No |
| `vista` | El empleado **la miró** pero todavía no la dio por cerrada. | [[CU-14 Ver y atender alertas del día]] paso 5 | No |
| `resuelta` | **Cerrada**: se hizo lo que había que hacer, o el evento que la motivaba dejó de aplicar. | [[CU-14 Ver y atender alertas del día]] paso 5, o automáticamente por otro CU | **Sí** (reversible, T6) |

**Estado inicial:** `pendiente`.
**Estado final:** `resuelta`.

## Transiciones

| # | Origen | Destino | Evento / disparador | Actor | CU | Guarda / condición | Efectos colaterales |
|---|---|---|---|---|---|---|---|
| T1 | *(inicial)* | `pendiente` | Se genera la alerta. **Siete orígenes** según el `tipo` (ver tabla de abajo) | sistema o empleado | varios | — | Queda en la agenda del propietario ([[CU-14 Ver y atender alertas del día]]) |
| T2 | `pendiente` | `vista` | El empleado **abre** la alerta y la marca como vista | empleado | [[CU-14 Ver y atender alertas del día]] paso 5 | — | — |
| T3 | `pendiente` | `resuelta` | El empleado la atiende y **la cierra directamente** | empleado | [[CU-14 Ver y atender alertas del día]] paso 5 | — | — |
| T4 | `vista` | `resuelta` | El empleado **termina** de atenderla | empleado | [[CU-14 Ver y atender alertas del día]] paso 5 | Confirmada el 21/09 | — |
| T5 | `pendiente` · `vista` | `resuelta` | **Cierre automático**: el evento que la motivaba se cumplió o dejó de aplicar | **sistema** | ver tabla de cierres automáticos | — | Ninguno |
| T6 | `resuelta` | `pendiente` | **Reapertura**: se revirtió el hecho que la había cerrado | sistema | [[CU-12 Registrar cobro de un pago]] A3 · [[CU-27 Cancelar viaje]] A3 | Aplica a **cualquier `tipo`** (generalizada el 21/09): si se deshace el cobro o la cancelación, la alerta vuelve | El [[Pago]] vuelve a `pendiente`/`vencido`, o el [[Viaje]] a su estado previo |
| T7 | `vista` | `pendiente` | **Corrección**: el empleado la había marcado por error | empleado | — *(sumado el 21/09)* | — | Línea punteada en el diagrama (es corrección, no flujo) |
| T8 | `pendiente` | *(se mantiene)* | **Posponer**: el empleado reprograma la `fecha` a un día posterior | empleado | [[CU-14 Ver y atender alertas del día]] A4 | — | **No cambia el estado.** Dibujar como auto-transición |
| T9 | `pendiente` | *(se mantiene)* | **Reprogramar/editar** una alerta `manual` (fecha o descripción) | empleado | [[CU-28 Crear recordatorio manual]] A2 | Solo mientras esté `pendiente` | **No cambia el estado.** Auto-transición |

### Los siete orígenes de T1

| `tipo` | Quién la genera | CU |
|---|---|---|
| `pago` | Al definir el plan de cuotas: **una por cada [[Pago]]**, con aviso un mes antes. También el vencimiento de pago a proveedor por hotel. | [[CU-11 Definir plan de cuotas]] paso 6 · [[CU-09 Armar itinerario de hoteles]] |
| `formulario` | Al confirmar la reserva, según los [[RequisitoDestino|requisitos del destino]] | [[CU-07 Confirmar reserva]] paso 4 · [[CU-15 Configurar recordatorios por destino]] |
| `salida` | Al confirmar la reserva, con anticipación configurable (**default 7 días** ⚠️ sin validar) | [[CU-07 Confirmar reserva]] paso 4 |
| `insistencia` | Al agendar un recontacto sobre una [[Oportunidad]] | [[CU-05 Seguir oportunidad]] paso 4 |
| `reseña` | Al pasar el [[Viaje]] a `finalizado` | [[CU-08 Gestionar estado del viaje]] paso 5 |
| `manual` | La crea el empleado a mano | [[CU-28 Crear recordatorio manual]] paso 4 |
| `recontacto` | Cliente fiel inactivo (≈ 6 meses, configurable) | [[CU-30 Sugerir recontacto de clientes]] |

### Los cierres automáticos de T5

| Qué pasa | Qué alertas cierra | CU |
|---|---|---|
| Se **cobra** un [[Pago]] | La de vencimiento de ese pago | [[CU-12 Registrar cobro de un pago]] paso 4 |
| Se **anula** un [[Pago]] del plan | La de ese pago | [[CU-11 Definir plan de cuotas]] A4 |
| Se **cierra** una [[Oportunidad]] (`ganada` o `perdida`) | Las de `insistencia` pendientes | [[CU-05 Seguir oportunidad]] paso 7 |
| Se **cancela** un [[Viaje]] | Todas las vigentes de ese viaje | [[CU-27 Cancelar viaje]] paso 4 |

## Invariantes y reglas

- **Fase 1: aviso interno, envío manual.** La alerta se genera **dentro del sistema**; el mensaje al pasajero (WhatsApp) lo manda **una persona** cuando decide. La automatización de WhatsApp está **fuera de PC1** ([[Alcance y fuera de alcance]]).
- **El `tipo` es inmutable**: se fija al crearla y no cambia. No es un estado.
- **Visibilidad por propietario:** cada empleado ve **sus** alertas (agenda del día); `admin` y `dueño` ven las de toda la empresa ([[CU-14 Ver y atender alertas del día]] A1, [[DEC-0005 Autenticación y modelo de roles]]).
- Una alerta `manual` puede quedar **suelta**, sin asociación a ninguna entidad ([[CU-28 Crear recordatorio manual]] A1).
- El listado de la agenda se ordena por `fecha` ([[CU-14 Ver y atender alertas del día]] paso 2).

## Huecos y ambigüedades — resueltos el 21/09

Se detectaron al especificar y **Nahuel los resolvió el mismo día**. Quedan **a ratificar en la sync**; lo que dice acá ya es lo que hay que dibujar.

1. ✅ **Resuelto 21/09 (Nahuel): el enum se queda con 3 estados, no se agrega `vencida`.** [[CU-14 Ver y atender alertas del día]] paso 2 decía que el sistema lista las alertas *"vigentes (`pendiente` y `vencida`)"*, pero `EstadoAlerta` es `pendiente · vista · resuelta`. Se resolvió que **"vencida" era un filtro de la vista, no un estado**: una [[Alerta]] que pasó su `fecha` sin atenderse **sigue `pendiente`** (por eso aparece en la agenda del día, más arriba en el orden), y el ciclo cierra igual en `resuelta`. **A diferencia de [[Pago]], la [[Alerta]] no necesita un estado de atraso**: el `Pago` lo necesita porque el atraso tiene consecuencias de negocio (exigibilidad), mientras que en la alerta el atraso es solo un criterio de orden. Se corrigió la redacción de [[CU-14 Ver y atender alertas del día]]. **El diagrama se dibuja con 3 estados.**
2. ✅ **Resuelto 21/09 (Nahuel): T4 (`vista → resuelta`) existe.** Es lo lógico: si no, `vista` sería un callejón sin salida. El "`vista` **o** `resuelta`" del paso 5 de [[CU-14 Ver y atender alertas del día]] son dos formas de cerrar el paso, no alternativas excluyentes del ciclo.
3. ✅ **Resuelto 21/09 (Nahuel): sí, `vista` se puede desmarcar.** Se agrega `vista → pendiente` como **corrección** (T9), para el caso de que el empleado la marque por error.
4. ✅ **Resuelto 21/09 (Nahuel): la reapertura aplica a cualquier `tipo`, no solo a `pago`.** Sigue la misma regla que el resto: **si se revierte el hecho que cerró la alerta, la alerta se reabre**. Vale para el cobro revertido ([[CU-12 Registrar cobro de un pago]] A3) y también para la cancelación revertida de un [[Viaje]] ([[CU-27 Cancelar viaje]] A3, "se reponen sus [[Alerta|Alertas]]"). T6 queda generalizada en la tabla de arriba.
5. ✅ **Resuelto 21/09 (Nahuel): `resuelta` no se desdobla.** No se diferencia "la atendí" de "ya no aplicaba": no hay ningún reporte que lo pida y agregar un estado más solo complica el modelo. Si en algún momento quieren un **reporte de cumplimiento** (cuántas alertas se atendieron de verdad), se reabre — queda anotado como **posible fase 2**.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota.

## Fuentes

- Entidad: [[Alerta]] · enum `EstadoAlerta` en [[DGM — Diagrama de clases]]
- CU generadores: [[CU-05 Seguir oportunidad]] · [[CU-07 Confirmar reserva]] · [[CU-08 Gestionar estado del viaje]] · [[CU-09 Armar itinerario de hoteles]] · [[CU-11 Definir plan de cuotas]] · [[CU-28 Crear recordatorio manual]] · [[CU-30 Sugerir recontacto de clientes]]
- CU que la atienden o cierran: [[CU-14 Ver y atender alertas del día]] · [[CU-12 Registrar cobro de un pago]] · [[CU-27 Cancelar viaje]]
- Decisiones: [[DEC-0005 Autenticación y modelo de roles]]
