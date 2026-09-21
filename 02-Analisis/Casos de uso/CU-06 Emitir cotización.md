---
tipo: caso-uso
estado: en-revision
modulo: [cotizaciones]
responsable: Francisco
pc: pc1
actualizado: 11/09/26
---
# CU-06 Emitir cotización

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado genera una [[Cotización]] para una [[Oportunidad]] a partir de una **plantilla + formulario**, produciendo un documento para enviar al [[Cliente]]. Es un **cotizador asistido** (no automático por scraping — ver [[Alcance y fuera de alcance]]). Permite versionar y reenviar.

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
- **A1 — Nueva versión / reenviar:** el cliente pide cambios → el empleado genera **otra versión** de la [[Cotización]] (la anterior queda en el historial) y la reenvía.
- **A2 — Aceptada:** el cliente acepta → la [[Cotización]] pasa a `aceptada` y habilita **confirmar la reserva** ([[CU-07 Confirmar reserva]]); la [[Oportunidad]] se cerrará `ganada` ([[CU-05 Seguir oportunidad]]).
- **A3 — Rechazada:** el cliente no acepta → `rechazada`; el seguimiento continúa o la [[Oportunidad]] se cierra `perdida`.
- **A5 — Vencida (21/09, a ratificar):** pasa la `validez_hasta` sin respuesta del cliente → un **proceso automático** deja la [[Cotización]] en `vencida`. Los precios ya no se sostienen: para retomar hay que emitir una **cotización nueva**. Solo vencen las `enviada` (un `borrador` no vence). La [[Oportunidad]] **no** cambia de estado.
- **A4 — Recomendación de hoteles:** al armar los ítems, el empleado consulta el catálogo para sugerir alojamiento ([[CU-18 Buscar y recomendar hoteles]]).

## Postcondiciones
- Existe una [[Cotización]] (con ítems, total y estado) asociada a la [[Oportunidad]]; si se acepta, queda lista para derivar en [[Viaje]] ([[CU-07 Confirmar reserva]]).

## Reglas de negocio aplicadas
- Cotizador **asistido**: precios cargados por el empleado; **sin scraping** ni integración con proveedores ([[Alcance y fuera de alcance]]).
- Una [[Oportunidad]] puede tener **varias** [[Cotización|Cotizaciones]] (versiones); se conserva el historial.

## Entidades del dominio involucradas
- [[Cotización]] · [[Oportunidad]] · [[Cliente]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la cotización.

## Decisiones asociadas
- [[DEC-0002 Modelar la consulta como Oportunidad]]

## 🔎 Revisión

> [!note] Nahuel (21/09) — **las cotizaciones ahora vencen.** Se sumó el estado `vencida` al enum y el atributo `validez_hasta` a [[Cotización]] (default **1 mes** desde la emisión, configurable por `admin`), más el flujo alternativo **A5**. Motivo: en turismo los precios cambian y una cotización no puede quedar vigente para siempre. ⚠️ **El default de 1 mes es una propuesta sin validar con la agencia** — confirmar en la próxima ronda, igual que `forma_pago` y los 7 días de la [[Alerta]] `salida`. Detectado al especificar [[EST-Cotización]]. #accion/decidir
> [!question] Francisco (11/09): especificado como cotizador asistido. A validar en la sync: (1) ¿los precios se cargan **100% manual** o hay un **catálogo de precios de referencia** (p. ej. `precio_referencia` de [[Hotel]])?; (2) formato del documento (PDF) y si el **envío** queda siempre por fuera (manual) en PC1; (3) el **versionado** — ¿cada versión es una `Cotización` nueva ligada a la misma [[Oportunidad]]?
