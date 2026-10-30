---
id: T-101
titulo: Confirmar la reserva desde la oportunidad en la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-086, T-071]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-07, RF-032, RF-033, RF-036]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 30/10/26 13:30
rama: feature/T-101-confirmar-la-reserva-desde-la-oportunida
pr:
---
# T-101 Confirmar la reserva desde la oportunidad en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde una oportunidad aceptada (o ganada sin cotización) se confirma la reserva y la persona sigue directo a la ficha del viaje para cargar la economía y el plan.

## Criterios de aceptación
- [ ] Diálogo de confirmación que exige destino y fechas (A3).
- [ ] Venta directa desde una oportunidad ganada sin cotización (A1).
- [ ] Tras confirmar, navega a la ficha del viaje (RF-036).

## Tests esperados
`describe('RF-032 confirmar reserva')`, `describe('RF-033 datos faltantes')` con MSW.

## Contexto (leer solo esto)
- [[CU-07 Confirmar reserva]]
- [[Prototipo UI]] — pantallas 15 (PNG en `07-Entregables/Prototipo/img/`)

## Archivos probables
- `src/apps/web/src/features/viajes/`
- `src/apps/web/src/features/oportunidades/`

## Fuera de alcance
- —

## Notas de implementación
- **Contradicción ticket/contrato (decidió Nahuel, 30/10/26):** `ConfirmarReserva` (T-086) exige `economia` y `plan_de_pagos`, aunque el ticket decía cargarlos después en la ficha. El diálogo pide precio de venta (precargado de la cotización aceptada, > 0), costo (en la moneda del viaje) y una cuota única `saldo` por el precio con vencimiento obligatorio y no pasado. Se ajusta luego en la ficha (T-093). No se tocó el backend.
- **Cuándo se ofrece:** con cotización `aceptada`, o en venta directa (A1) si la oportunidad está `ganada` sin aceptada (pide moneda). Si ya existe un viaje con `oportunidad_id` de la oportunidad (vía `useViajes` por cliente), muestra «Ver viaje». `Oportunidad` no expone su viaje; un `viaje_id` en el contrato lo simplificaría.
- **Tests tocados después del rojo (autorizado por Nahuel, `--tocar-tests`):** el rojo usaba Roma, inactiva en el mock → Cancún; tras la review se agregaron casos de economía enviada, validaciones, «Ver viaje» y ganada sin aceptada.
- **Mock compartido:** `mocks/viajes.ts` suma nombres de Bariloche, Cancún y Roma (quitaba ruido en stderr). Suites completas en verde: web 939, mobile 183.
- **Diálogo inline** con `role="dialog"` (la web no tiene Dialog de shadcn), como `AccionesDelViaje`.
- **Modelos:** tests sonnet, impl/refactor/fix sonnet, review opus. Sin escalados.
