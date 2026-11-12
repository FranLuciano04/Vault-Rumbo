---
id: T-174
titulo: Ajustar el contrato de cotizaciones y reserva
modulo: M11 — Ajustes de la revisión del equipo
capa: contrato
estado: hecho
depende_de: []
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, CU-06, CU-07, CU-09, CU-11]
origen: revisión del equipo (10/11/26)
asignado: Nahuel Viniegra
tomado_el: 11/11/26 20:33
rama: feature/T-174-ajustar-el-contrato-de-cotizaciones-y-re
pr:
---
# T-174 Ajustar el contrato de cotizaciones y reserva

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

> ✅ **Desbloqueado el 11/11/26:** el equipo aprobó [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]] sin cambios y ya se actualizaron CU-05, CU-06, CU-07, CU-09, CU-11, [[Cotización]] y [[Oportunidad]]. Este ticket destraba T-175 a T-181.

## Objetivo
Dejar en el contrato OpenAPI, en los tipos y en los mocks MSW lo que necesitan los cambios de la revisión del 10/11/26:
- Varias cotizaciones por oportunidad, y al ganar se elige cuál aceptó el cliente.
- La reserva se precarga con la cotización elegida y pide solo el primer pago.
- El itinerario de hoteles sale de la cotización.

## Criterios de aceptación
- [ ] `ItemCotizacion` suma `hotel_id`, `check_in` y `check_out`, los tres opcionales. Los ítems son JSONB, así que no hace falta una migración.
- [ ] `POST /oportunidades/{id}/ganar` acepta un cuerpo opcional `{ cotizacion_id }`. Sin cuerpo, sigue siendo la venta directa (CU-05 A4).
- [ ] La respuesta de confirmar la reserva suma las **advertencias del itinerario**: los hoteles de la cotización cuyo tramo no se creó y el motivo (fuera de las fechas del viaje, superpuesto con otro tramo u hotel cerrado). DEC-0028 punto 4.3.
- [ ] La descripción de `plan_de_pagos` en el pedido de confirmar la reserva dice que alcanza con el primer pago (al menos uno). Puede sumar menos que el precio de venta, pero no más. Se regeneran `openapi.json`, los tipos de `@rumbo/shared` y los mocks.

## Tests esperados
Ajuste de los tests de contrato de M4 y M6: el ítem con hotel y sin hotel, `ganar` con `cotizacion_id` y sin cuerpo, y la descripción del plan de pagos de la reserva.

## Contexto (leer solo esto)
- [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]
- `src/backend/rumbo/presentacion/esquemas/oportunidades.py` (`ItemCotizacion`, `CotizacionCrear`), `economia.py` (`PlanDePagos`) y `viajes.py` (el pedido de la reserva)
- `src/backend/rumbo/presentacion/routers/oportunidades.py` (`/ganar`)

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/` y `routers/oportunidades.py`
- `05-Diseño/API/openapi.json`, `src/packages/shared/` (tipos y mocks MSW)

## Fuera de alcance
- La lógica, que va en T-175, T-176 y T-177.
- Las pantallas, que van en T-178, T-179 y T-180.

## Decisión (resuelta)
✅ Resuelta por [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]], aprobada el 11/11/26: (1) se acepta cualquier cotización `enviada` vigente, se puede elegir un `borrador` y al ganar las demás `enviada` pasan a `rechazada`; (2) la reserva lleva solo el primer pago, de cualquier tipo, que no supera el precio de venta y no hace falta cobrar; (3) cada hotel guarda check-in y check-out, y el tramo que no entra se omite con una advertencia. Se conservan abajo las preguntas originales:
1. **Cotizaciones alternativas.** Hoy son **versiones**: solo se acepta la última (`exigir_vigente_sin_aceptada`, CU-06 A1). El pedido las trata como **alternativas** entre las que el cliente elige. Hay que decidir tres cosas. ¿Se puede aceptar cualquier versión enviada y vigente? ¿Qué pasa con las otras al ganar: quedan como están o pasan a `rechazada`? ¿Se puede elegir una que sigue en `borrador`?
2. **Reserva con el primer pago.** CU-11 A1 exige que el plan sume el precio de venta, y hoy la reserva lo valida (`exigir_plan_valido`). El pedido es cargar solo el primer pago al reservar y completar el resto desde el viaje. El estado ya lo tolera: con el plan descalzado, el viaje no pasa a `confirmado` ni a `en_curso` (DEC-0026). Hay que confirmar que el primer pago puede ser de cualquier tipo, que no supera el precio de venta y que **no** hace falta cobrarlo para confirmar la reserva.
   - Nota: la revisión dice «plan de pagos vacío» en un punto y «primer pago» en otro. Este ticket toma la segunda lectura: la reserva lleva el primer pago y el resto del plan queda vacío. La API ya pide al menos un pago (DEC-0026).
3. **Hoteles en la cotización.** ¿Cada hotel de la cotización guarda check-in y check-out? Al confirmar la reserva puede pasar que un tramo no entre en las fechas del viaje (si se editaron) o que el hotel ya esté cerrado. Hay que decidir si en esos casos se omite el tramo con una advertencia o se rechaza la reserva.

Con la `DEC-` aprobada, actualizar [[CU-05 Seguir oportunidad]], [[CU-06 Emitir cotización]], [[CU-07 Confirmar reserva]], [[CU-11 Definir plan de cuotas]] y [[Cotización]], y recién después pasar este ticket a `libre`.

## Notas de implementación
- **Factibilidad (verificada el 10/11/26):** los tres cambios se pueden hacer con el modelo de hoy, sin migraciones. La oportunidad ya admite varias `Cotizacion`. Los ítems son JSONB. La web ya guarda `hotel_id` en el formulario de la cotización, pero no lo manda a la API (`cotizaciones/esquemas.ts`). La máquina de estados del viaje ya maneja un plan que no suma el precio (`al_registrar_cobro`, `al_cambiar_el_plan`).

### Implementación (11/11/26, Nahuel)
- **Contrato:** `ItemCotizacion` suma `hotel_id`, `check_in` y `check_out`; con hotel, las dos fechas son obligatorias y `check_out` no puede ser anterior a `check_in` (422, hallazgo importante de la review). `POST /ganar` acepta `OportunidadGanar { cotizacion_id }` opcional: sin cuerpo sigue siendo la venta directa. El `operation_id` pasó de `ganar_oportunidad_sin_cotizacion` a `ganar_oportunidad`. La reserva responde `ReservaConfirmada` (extiende `Viaje` con `advertencias_itinerario: [{hotel_id, motivo}]`, motivos `fuera_de_fechas`, `superpuesto` y `hotel_cerrado`), y la descripción de `plan_de_pagos` dice que alcanza con el primer pago.
- **Stubs:** `ganar` lee `cotizacion_id` pero no lo usa (T-175), y la reserva devuelve `advertencias_itinerario: []` (T-176 y T-177). El backend sigue exigiendo que el plan sume el precio hasta T-176: no mergear T-178 ni T-179 antes de T-175 y T-176.
- **Tests:** los nuevos están en `tests/api/test_contrato_m11.py`. Se ajustó una línea de `test_contrato_m6.py` (`Viaje` → `ReservaConfirmada`) y las expectativas de `PaginaHoteles.test.tsx`, porque el mock suma «Hotel Gran Vía Madrid» para que la cotización de Europa tenga un hotel coherente (DEC-0019).
- **Mocks:** `ganar` responde 404 si la cotización no es de la oportunidad y 409 si no está en `borrador` ni `enviada`; la vigencia la valida el backend (T-175). `confirmar-reserva` responde 422 si el plan supera el precio.
- **Menor sin resolver:** `05-Diseño/API/openapi.json` (contrato de diseño de PC1) no se actualizó; la referencia es `src/packages/shared/openapi.json`.
- **Modelos:** tests, implementación y refactor con Sonnet (el refactor no cambió nada); review con Opus.
