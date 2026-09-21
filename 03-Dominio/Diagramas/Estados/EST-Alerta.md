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
> 🚨 **Leer primero el hueco 1:** hay una **contradicción abierta** entre el enum y [[CU-14 Ver y atender alertas del día]]. Puede cambiar la cantidad de estados del diagrama.

## Para la sesión que dibuje este diagrama

1. **Con esta nota alcanza.** No hace falta abrir los CU ni las entidades.
2. **Antes de dibujar, mirar el hueco 1.** Si el equipo todavía no lo resolvió, dibujar con los **3 estados del enum** (`pendiente · vista · resuelta`) y dejar anotado que falta resolverlo.
3. Dibujar un `stateDiagram-v2` de Mermaid y **pegarlo en la sección `## Diagrama`** de esta misma nota.
4. Usar el encabezado común del vault (motor ELK, líneas rectas):
   ```
   %%{init: {'layout':'elk','theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'14px','primaryColor':'#f8fafc','primaryBorderColor':'#64748b','primaryTextColor':'#0f172a','lineColor':'#94a3b8'}}}%%
   ```
5. **Etiquetar cada transición** con el evento disparador, no con el número.
6. **No dibujar los 7 `tipo` como estados.** El `tipo` de la [[Alerta]] (`pago`, `formulario`, `salida`…) es un atributo fijo que se define al crearla; **no** es parte de la máquina de estados. Solo determina *quién* la crea (T1) y *qué acción* se hace al atenderla.
7. **Validar renderizando** con `mermaid-cli` antes de commitear.
8. **No resolver los huecos** de la sección final.

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
| T4 | `vista` | `resuelta` | El empleado **termina** de atenderla | empleado | [[CU-14 Ver y atender alertas del día]] paso 5 | ⚠️ **Implícita**, ver hueco 2 | — |
| T5 | `pendiente` · `vista` | `resuelta` | **Cierre automático**: el evento que la motivaba se cumplió o dejó de aplicar | **sistema** | ver tabla de cierres automáticos | — | Ninguno |
| T6 | `resuelta` | `pendiente` | **Reapertura**: se revirtió el cobro que la había cerrado | sistema | [[CU-12 Registrar cobro de un pago]] A3 | Solo aplica a alertas de `tipo = pago` | El [[Pago]] vuelve a `pendiente`/`vencido` |
| T7 | `pendiente` | *(se mantiene)* | **Posponer**: el empleado reprograma la `fecha` a un día posterior | empleado | [[CU-14 Ver y atender alertas del día]] A4 | — | **No cambia el estado.** Dibujar como auto-transición |
| T8 | `pendiente` | *(se mantiene)* | **Reprogramar/editar** una alerta `manual` (fecha o descripción) | empleado | [[CU-28 Crear recordatorio manual]] A2 | Solo mientras esté `pendiente` | **No cambia el estado.** Auto-transición |

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

## Huecos y ambigüedades detectadas

Señalados, **no resueltos** — decisión del equipo en la sync:

1. 🚨 **Contradicción: [[CU-14 Ver y atender alertas del día]] usa un estado `vencida` que no existe en el enum.** El paso 2 dice que el sistema lista las alertas *"vigentes (`pendiente` y `vencida`)"*, pero `EstadoAlerta` es `pendiente · vista · resuelta` — **no hay `vencida`**. Hay dos salidas: (a) sumar `vencida` al enum, como se hizo con [[Pago]], y entonces el diagrama tiene 4 estados y una transición automática por fecha; o (b) aceptar que "vencida" en el CU es solo un **filtro de la vista** (`pendiente` con `fecha` pasada), no un estado, y corregir la redacción del CU. **Esto cambia el diagrama**, hay que decidirlo antes o dibujar con 3 estados y anotarlo.
2. **T4 (`vista → resuelta`) no está escrita.** [[CU-14 Ver y atender alertas del día]] paso 5 dice "marca la alerta como `vista` **o** `resuelta`", como si fueran alternativas excluyentes del mismo paso. Falta confirmar que desde `vista` se puede cerrar después (que es lo lógico, si no `vista` sería un callejón sin salida).
3. **¿`vista` se puede desmarcar?** No hay transición `vista → pendiente`. Si un empleado marca por error, no puede volver atrás.
4. **T6 solo está definida para el `tipo = pago`.** [[CU-12 Registrar cobro de un pago]] A3 es el único CU que reabre una alerta. ¿Qué pasa si se revierte la cancelación de un [[Viaje]] ([[CU-27 Cancelar viaje]] A3, que dice "se reponen sus [[Alerta|Alertas]]")? No está claro si las alertas `resueltas` por la cancelación vuelven a `pendiente`.
5. **`resuelta` no distingue "la atendí" de "ya no aplica".** Una alerta cerrada por T3/T4 (el empleado hizo algo) y una cerrada por T5 (el evento dejó de aplicar) quedan iguales. Para los reportes de cumplimiento podría convenir diferenciarlas; hoy no se puede.

## Diagrama

> ⏳ **Pendiente de dibujar.** Ver las instrucciones al principio de esta nota, **y el hueco 1**.

## Fuentes

- Entidad: [[Alerta]] · enum `EstadoAlerta` en [[DGM — Diagrama de clases]]
- CU generadores: [[CU-05 Seguir oportunidad]] · [[CU-07 Confirmar reserva]] · [[CU-08 Gestionar estado del viaje]] · [[CU-09 Armar itinerario de hoteles]] · [[CU-11 Definir plan de cuotas]] · [[CU-28 Crear recordatorio manual]] · [[CU-30 Sugerir recontacto de clientes]]
- CU que la atienden o cierran: [[CU-14 Ver y atender alertas del día]] · [[CU-12 Registrar cobro de un pago]] · [[CU-27 Cancelar viaje]]
- Decisiones: [[DEC-0005 Autenticación y modelo de roles]]
