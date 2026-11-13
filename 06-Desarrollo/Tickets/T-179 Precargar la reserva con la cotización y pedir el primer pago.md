---
id: T-179
titulo: Precargar la reserva con la cotización y pedir el primer pago
modulo: M11 — Ajustes de la revisión del equipo
capa: web
estado: tomado
depende_de: [T-174]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-07, CU-11, RF-032, RF-033, RF-059]
origen: revisión del equipo (10/11/26)
asignado: FranLucianoo
tomado_el: 13/11/26 12:32
rama: feature/T-179-precargar-la-reserva-con-la-cotizacion-y
pr:
---
# T-179 Precargar la reserva con la cotización y pedir el primer pago

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al tocar «Confirmar reserva», el diálogo aparece completado con los datos de la cotización elegida y de la oportunidad, y todos los campos se pueden editar. La economía pide solo precio de venta y costo, sin tipo de pago. El primer pago va aparte, con su monto, tipo y vencimiento. El resto del plan se completa desde el viaje. Aplica la `DEC-` que destraba T-174.

## Criterios de aceptación
- [ ] El diálogo se precarga así: la moneda y el precio de venta (el total) salen de la cotización aceptada, y la salida y el regreso, de las fechas tentativas de la oportunidad. El destino se preelige si hay **un solo** destino del catálogo cuyo nombre coincide con `destino_consultado` (sin distinguir mayúsculas ni acentos). Si no, queda para elegir. Todo se puede editar.
- [ ] La sección «Economía» tiene solo precio de venta y costo, los dos obligatorios. La sección «Primer pago» tiene monto, tipo (seña, cuota, pago único o saldo) y vencimiento, todos obligatorios, y el monto no puede superar el precio de venta. Un texto aclara que el resto del plan de pagos se completa desde el viaje.
- [ ] Al confirmar, se manda el primer pago como único ítem de `plan_de_pagos` y se navega a la ficha del viaje. Ahí el plan muestra el aviso de que falta completarlo, con el editor de hoy.

## Tests esperados
`describe('RF-032 reserva precargada con la cotización')`: precio y moneda de la cotización, fechas de la oportunidad, el destino que coincide, el destino ambiguo y que se puede editar. `describe('RF-033 primer pago')`: los campos obligatorios, el monto mayor que el precio y el pedido que se manda. Ajustar `ConfirmarReserva.test.tsx`, que hoy espera una sola cuota por el precio de venta.

## Contexto (leer solo esto)
- La `DEC-` aprobada (ver T-174, «Decisión pendiente», punto 2)
- `src/apps/web/src/features/oportunidades/DialogoReserva.tsx`, `ConfirmarReserva.tsx` y `esquemas.ts` (`esquemaReserva`)
- `src/apps/web/src/features/viajes/plan/PlanDePagos.tsx` (el aviso del plan descalzado)

## Archivos probables
- `src/apps/web/src/features/oportunidades/DialogoReserva.tsx` y `esquemas.ts`

## Fuera de alcance
- El backend, que va en T-176.
- El itinerario precargado, que lo crea el backend en T-177. La pantalla del itinerario no cambia.

## Notas de implementación
- **Factibilidad (verificada el 10/11/26):** hoy el diálogo ya precarga el precio de venta con el total de la cotización aceptada. Pero manda un solo pago por el precio completo, y el selector «Tipo de pago» queda al lado de precio y costo. Por eso parece que el tipo es del precio. El destino de la oportunidad es texto libre (DEC-0006) y no un `destino_id`, así que solo se puede sugerir por nombre.
- La cotización no tiene costo: el costo se carga a mano. El equipo propuso calcular el precio de venta al cotizar, y eso ya es el total de la cotización.
