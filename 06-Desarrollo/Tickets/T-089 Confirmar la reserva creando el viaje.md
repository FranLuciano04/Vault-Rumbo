---
id: T-089
titulo: Confirmar la reserva creando el viaje
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-086, T-087, T-064, T-032, T-051, T-029]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-07, RF-032, RF-033, RF-034, RF-035, RF-036, RNF-05]
origen: plan
asignado: palomap2003
tomado_el: 30/10/26 09:35
rama: feature/T-089-confirmar-la-reserva-creando-el-viaje
pr:
---
# T-089 Confirmar la reserva creando el viaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al confirmar la reserva de una oportunidad aceptada (o de una venta directa) se crea el viaje `reservado` con sus alertas de requisitos del destino y de próxima salida, en una sola transacción.

## Criterios de aceptación
- [ ] `POST /oportunidades/{id}/confirmar-reserva` exige destino y fechas (422, A3) y una oportunidad en un estado que lo admite (409); crea el viaje y gana la oportunidad (A1 venta directa).
- [ ] Genera una alerta por cada requisito activo del destino con su anticipación (RF-034; sin requisitos, ninguna, A2) y la alerta de salida según `anticipacion_salida_dias` (RF-035).
- [ ] Todo en una transacción: si algo falla, no queda viaje ni alertas (RNF-05).

## Tests esperados
`tests/api/test_confirmar_reserva.py`: `test_rf032_crea_viaje_reservado`, `test_rf033_sin_destino_422`, `test_rf034_alertas_de_requisitos`, `test_rf035_alerta_de_salida`, `test_venta_directa`, `test_transaccion_atomica`.

## Contexto (leer solo esto)
- [[CU-07 Confirmar reserva]]
- [[EST-Viaje]]
- [[EST-Oportunidad]]
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`
- `src/backend/rumbo/presentacion/routers/viajes.py`

## Fuera de alcance
- La economía y el plan (tickets propios; la UI los encadena, RF-036).

## Notas de implementación
- **Cambio de alcance (decidido por Paloma el 30/10/26):** el ticket dejaba la economía y el plan fuera, pero el contrato `ConfirmarReserva` los exige y promete crearlos en la misma transacción. Se cumple el contrato: `confirmar_reserva` crea el viaje `reservado`, la economía (RN-01), el plan de pagos con sus alertas de vencimiento y las alertas de requisitos y de salida, y gana la oportunidad, todo en una transacción (RNF-05). Para eso se extrajeron de `negocio/servicios/economia.py` `aplicar_economia`, `exigir_plan_valido` y `agendar_pagos`, que también usan `registrar_economia` y `definir_plan_de_pagos` (sin cambio de comportamiento, verificado en la review).
- Estados: `estado_oportunidad.confirmar_reserva` (de `cotizada` con cotización aceptada a `ganada`; `ganada` queda igual en la venta directa, A1; el resto da 409) y `estado_viaje.reservar` (T1). Al ganar se resuelven las alertas de la oportunidad (RN-08), salvo si ya estaba ganada.
- Validaciones: 404/403 primero, después 409 (ya tiene viaje), después los 422 (destino inexistente o de baja, fechas invertidas, responsable enviado inexistente o de baja, venta directa sin moneda, operador de baja, plan que no suma). La moneda sale de la cotización aceptada; en la venta directa, del cuerpo.
- `RepositorioViajes.existe_de_oportunidad` consulta sin filtro de visibilidad, a propósito: se llama después de validar el acceso a la oportunidad, devuelve un booleano y así un freelance que ya no ve el viaje recibe 409 y no un 500 por la unicidad.
- **Decisión que queda abierta:** el responsable heredado de la oportunidad no se valida activo. Si la oportunidad es de alguien dado de baja, el viaje y sus alertas quedan en su agenda (igual que el vendedor actual en economía). Si el equipo prefiere un 422, es un cambio chico.
- Tests tocados con autorización de Paloma: en el verde, 4 tests leían ids después de `expire_all()` (`MissingGreenlet`) y el archivo no pasaba ruff; se corrigió sin cambiar aserciones. En el fix se agregaron 7 casos sin modificar los existentes.
- Review (`reviewer-seguridad`, sonnet): 0 bloqueantes, 1 importante (tests de las decisiones del verde, agregados) y 3 menores: el responsable heredado inactivo (arriba), la duplicación de forma entre `_responsable_de_la_reserva` y `economia._vendedor` (extraer un helper cuando haya un tercer uso) y `existe_de_oportunidad` sin visibilidad (correcto, documentado).
- Pendiente: las transiciones nuevas solo están cubiertas por tests de API, no unitarios; una alerta cuya fecha ya pasó (salida muy próxima) se crea igual y aparece vencida.
- Modelos: tests sonnet; implementación, refactor (sin cambios) y fix opus; review sonnet. Sin escalados.
