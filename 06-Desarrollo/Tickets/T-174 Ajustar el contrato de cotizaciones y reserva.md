---
id: T-174
titulo: Ajustar el contrato de cotizaciones y reserva
modulo: M11 — Ajustes de la revisión del equipo
capa: contrato
estado: bloqueado
depende_de: []
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, CU-06, CU-07, CU-09, CU-11]
origen: revisión del equipo (10/11/26)
asignado:
tomado_el:
rama:
pr:
---
# T-174 Ajustar el contrato de cotizaciones y reserva

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

> 🟥 **Bloqueado hasta que el equipo apruebe la `DEC-` de la sección [[#Decisión pendiente]].** El pedido cambia reglas de CU-06, CU-07 y CU-11, y una contradicción con el vault se resuelve con una `DEC-`. Cuando se apruebe, este ticket pasa a `libre` y destraba T-175 a T-181.

## Objetivo
Dejar en el contrato OpenAPI, en los tipos y en los mocks MSW lo que necesitan los cambios de la revisión del 10/11/26:
- Varias cotizaciones por oportunidad, y al ganar se elige cuál aceptó el cliente.
- La reserva se precarga con la cotización elegida y pide solo el primer pago.
- El itinerario de hoteles sale de la cotización.

## Criterios de aceptación
- [ ] `ItemCotizacion` suma `hotel_id`, `check_in` y `check_out`, los tres opcionales. Los ítems son JSONB, así que no hace falta una migración.
- [ ] `POST /oportunidades/{id}/ganar` acepta un cuerpo opcional `{ cotizacion_id }`. Sin cuerpo, sigue siendo la venta directa (CU-05 A4).
- [ ] La descripción de `plan_de_pagos` en el pedido de confirmar la reserva dice que alcanza con el primer pago (al menos uno). Puede sumar menos que el precio de venta, pero no más. Se regeneran `openapi.json`, los tipos de `@rumbo/shared` y los mocks.

## Tests esperados
Ajuste de los tests de contrato de M4 y M6: el ítem con hotel y sin hotel, `ganar` con `cotizacion_id` y sin cuerpo, y la descripción del plan de pagos de la reserva.

## Contexto (leer solo esto)
- La `DEC-` que se apruebe (ver abajo)
- `src/backend/rumbo/presentacion/esquemas/oportunidades.py` (`ItemCotizacion`, `CotizacionCrear`), `economia.py` (`PlanDePagos`) y `viajes.py` (el pedido de la reserva)
- `src/backend/rumbo/presentacion/routers/oportunidades.py` (`/ganar`)

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/` y `routers/oportunidades.py`
- `05-Diseño/API/openapi.json`, `src/packages/shared/` (tipos y mocks MSW)

## Fuera de alcance
- La lógica, que va en T-175, T-176 y T-177.
- Las pantallas, que van en T-178, T-179 y T-180.

## Decisión pendiente
Hay que escribir y aprobar una `DEC-` (la próxima libre es DEC-0028) que responda:
1. **Cotizaciones alternativas.** Hoy son **versiones**: solo se acepta la última (`exigir_vigente_sin_aceptada`, CU-06 A1). El pedido las trata como **alternativas** entre las que el cliente elige. Hay que decidir tres cosas. ¿Se puede aceptar cualquier versión enviada y vigente? ¿Qué pasa con las otras al ganar: quedan como están o pasan a `rechazada`? ¿Se puede elegir una que sigue en `borrador`?
2. **Reserva con el primer pago.** CU-11 A1 exige que el plan sume el precio de venta, y hoy la reserva lo valida (`exigir_plan_valido`). El pedido es cargar solo el primer pago al reservar y completar el resto desde el viaje. El estado ya lo tolera: con el plan descalzado, el viaje no pasa a `confirmado` ni a `en_curso` (DEC-0026). Hay que confirmar que el primer pago puede ser de cualquier tipo, que no supera el precio de venta y que **no** hace falta cobrarlo para confirmar la reserva.
   - Nota: la revisión dice «plan de pagos vacío» en un punto y «primer pago» en otro. Este ticket toma la segunda lectura: la reserva lleva el primer pago y el resto del plan queda vacío. La API ya pide al menos un pago (DEC-0026).
3. **Hoteles en la cotización.** ¿Cada hotel de la cotización guarda check-in y check-out? Al confirmar la reserva puede pasar que un tramo no entre en las fechas del viaje (si se editaron) o que el hotel ya esté cerrado. Hay que decidir si en esos casos se omite el tramo con una advertencia o se rechaza la reserva.

Con la `DEC-` aprobada, actualizar [[CU-05 Seguir oportunidad]], [[CU-06 Emitir cotización]], [[CU-07 Confirmar reserva]], [[CU-11 Definir plan de cuotas]] y [[Cotización]], y recién después pasar este ticket a `libre`.

## Notas de implementación
- **Factibilidad (verificada el 10/11/26):** los tres cambios se pueden hacer con el modelo de hoy, sin migraciones. La oportunidad ya admite varias `Cotizacion`. Los ítems son JSONB. La web ya guarda `hotel_id` en el formulario de la cotización, pero no lo manda a la API (`cotizaciones/esquemas.ts`). La máquina de estados del viaje ya maneja un plan que no suma el precio (`al_registrar_cobro`, `al_cambiar_el_plan`).
