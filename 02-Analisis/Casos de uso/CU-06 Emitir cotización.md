---
tipo: caso-uso
estado: formalizado
modulo: [cotizaciones]
responsable: Francisco
pc: pc1
actualizado: 11/11/26
fecha_aprobacion: 29/09/26
---
# CU-06 Emitir cotización

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
El empleado genera una [[Cotización]] para una [[Oportunidad]] a partir de una **plantilla + formulario**, produciendo un documento para enviar al [[Cliente]]. Es un **cotizador asistido** (no automático por scraping — ver [[Alcance y fuera de alcance]]). Permite emitir **varias cotizaciones alternativas** para la misma oportunidad y reenviarlas ([[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: destinatario de la cotización; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existe una [[Oportunidad]] ([[CU-04 Registrar consulta]]).

## Flujo principal
1. Desde la [[Oportunidad]], el empleado elige **Nueva cotización** y una **plantilla**.
2. Completa el formulario: la **moneda** de la operación (ARS/USD), los **ítems/conceptos** (aéreo, alojamiento, traslados, excursiones…) con sus **precios** en esa moneda; el sistema calcula el **total**. La `moneda` de la cotización aceptada queda como moneda de referencia del [[Viaje]] ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
3. El sistema genera el **documento** de la [[Cotización]], calcula su `validez_hasta` (por default **1 mes** desde la emisión, parámetro configurable por `admin`) y la guarda en estado `borrador`.
4. El empleado **envía** la cotización al cliente (por WhatsApp/email, por fuera del sistema) y la marca `enviada`.
5. El sistema deja la [[Cotización]] asociada a la [[Oportunidad]], que pasa a estado `cotizada` ([[CU-05 Seguir oportunidad]]).

## Flujos alternativos
- **A1 — Otra alternativa / reenviar:** el cliente pide cambios u otra opción → el empleado emite **otra** [[Cotización]] y la envía. Emitir una nueva **no deja sin efecto** a las anteriores: siguen abiertas y el cliente puede elegir cualquiera ([[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]).
- **A2 — Aceptada:** el cliente acepta una de las cotizaciones → se puede aceptar **cualquier** [[Cotización]] `enviada` cuya `validez_hasta` no haya pasado, no solo la última. Hay **una sola aceptada** por [[Oportunidad]]. «Aceptar» desde la sección de cotizaciones la pasa a `aceptada` y la [[Oportunidad]] queda `cotizada`. Al **ganar** la [[Oportunidad]] eligiendo esa cotización ([[CU-05 Seguir oportunidad]] paso 6), se acepta y la [[Oportunidad]] queda `ganada` en la misma operación. La aceptada habilita **confirmar la reserva** ([[CU-07 Confirmar reserva]]).
- **A3 — Rechazada:** el cliente no acepta → `rechazada`; el seguimiento continúa o la [[Oportunidad]] se cierra `perdida`.
- **A5 — Vencida:** pasa la `validez_hasta` sin respuesta del cliente → un **proceso automático** deja la [[Cotización]] en `vencida`. Los precios ya no se sostienen: para retomar hay que emitir una **cotización nueva**. Solo vencen las `enviada` (un `borrador` no vence). La [[Oportunidad]] **no** cambia de estado.
- **A4 — Recomendación de hoteles:** al armar los ítems, el empleado consulta el catálogo para sugerir alojamiento ([[CU-18 Buscar y recomendar hoteles]]). Un ítem puede llevar el [[Hotel]] del catálogo (abierto) con su **check-in** y **check-out**, que son obligatorios si hay hotel. La web los completa al principio con las fechas tentativas de la [[Oportunidad]]. Con esos ítems se arma el itinerario al confirmar la reserva ([[CU-07 Confirmar reserva]], [[CU-09 Armar itinerario de hoteles]] A6).
- **A6 — Elegida en borrador:** al ganar, el empleado elige una [[Cotización]] que sigue en `borrador` porque se envió por WhatsApp y nadie la marcó → el sistema la registra como `enviada` y `aceptada` seguidas ([[EST-Cotización]] T2 y T3).
- **A7 — Las demás se rechazan:** al ganar con una [[Cotización]], las demás `enviada` de la [[Oportunidad]] pasan a `rechazada`, porque el cliente eligió otra. Los `borrador` quedan como están.

## Postcondiciones
- Existe una [[Cotización]] (con ítems, total y estado) asociada a la [[Oportunidad]]; si se acepta, queda lista para derivar en [[Viaje]] ([[CU-07 Confirmar reserva]]).

## Reglas de negocio aplicadas
- Cotizador **asistido**: precios cargados por el empleado; **sin scraping** ni integración con proveedores ([[Alcance y fuera de alcance]]).
- Una [[Oportunidad]] puede tener **varias** [[Cotización|Cotizaciones]] abiertas a la vez, que son **alternativas** y no versiones, y **una sola aceptada**. Se conserva el historial ([[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]).

## Entidades del dominio involucradas
- [[Cotización]] · [[Oportunidad]] · [[Cliente]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la cotización.

## Decisiones asociadas
- [[DEC-0002 Modelar la consulta como Oportunidad]] · [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]

## 🔎 Revisión

> [!note] Nahuel (21/09) — **las cotizaciones ahora vencen.** Se sumó el estado `vencida` al enum y el atributo `validez_hasta` a [[Cotización]] (default **1 mes** desde la emisión, configurable por `admin`), más el flujo alternativo **A5**. Motivo: en turismo los precios cambian y una cotización no puede quedar vigente para siempre. ⚠️ **El default de 1 mes es una propuesta sin validar con la agencia** — **validado con la agencia** (29/09). Detectado al especificar [[EST-Cotización]].
> [!question] Francisco (11/09): especificado como cotizador asistido. A validar en la sync: (1) ¿los precios se cargan **100% manual** o hay un **catálogo de precios de referencia** (p. ej. `precio_referencia` de [[Hotel]])?; (2) formato del documento (PDF) y si el **envío** queda siempre por fuera (manual) en PC1; (3) el **versionado** — ¿cada versión es una `Cotización` nueva ligada a la misma [[Oportunidad]]?
>
> [!success] Equipo (11/11/26) — **las cotizaciones son alternativas, no versiones** ([[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]] punto 1). Se reescribieron A1 y A2, se sumaron hoteles a los ítems (A4) y se agregaron A6 (elegir un borrador) y A7 (las demás `enviada` se rechazan al ganar).
