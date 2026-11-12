---
id: T-176
titulo: Confirmar la reserva con el primer pago
modulo: M11 — Ajustes de la revisión del equipo
capa: backend
estado: tomado
depende_de: [T-174]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-07, CU-11, RF-032, RF-059, DEC-0026]
origen: revisión del equipo (10/11/26)
asignado: Nahuel Viniegra
tomado_el: 12/11/26 15:17
rama: feature/T-176-confirmar-la-reserva-con-el-primer-pago
pr:
---
# T-176 Confirmar la reserva con el primer pago

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Para confirmar la reserva alcanza con el precio de venta, el costo y el primer pago (monto, tipo y vencimiento). El resto del plan se completa después desde el viaje, como hoy. El plan de la reserva puede sumar menos que el precio de venta. Aplica la `DEC-` que destraba T-174.

## Criterios de aceptación
- [ ] `confirmar_reserva` acepta un plan con al menos un pago, cada uno mayor que cero, que sume **hasta** el precio de venta. Si lo supera, responde 422 sobre `pagos` y muestra la diferencia. Sin pagos, sigue respondiendo 422.
- [ ] El viaje nace `reservado` con ese pago y su alerta. Si el plan no suma el precio, la ficha devuelve la advertencia `plan_desbalanceado`.
- [ ] Cobrar ese primer pago pasa el viaje a `vendido`. El viaje no pasa a `confirmado` hasta que el plan sume el precio y no quede saldo (`al_registrar_cobro`, DEC-0026). Definir el resto del plan desde el viaje (`PUT` del plan) sigue exigiendo que sume el precio.

## Tests esperados
`test_cu07_reserva_con_solo_el_primer_pago`, `test_cu07_reserva_con_plan_que_supera_el_precio_es_422`, `test_cu07_reserva_sin_pagos_es_422`, `test_cu07_reserva_parcial_advierte_plan_desbalanceado` y `test_cu12_cobrar_el_primer_pago_de_un_plan_parcial_no_confirma`.

## Contexto (leer solo esto)
- La `DEC-` aprobada (ver T-174, «Decisión pendiente», punto 2)
- `src/backend/rumbo/negocio/servicios/viajes.py` (`confirmar_reserva`) y `servicios/economia.py` (`exigir_plan_valido`, `_exigir_que_sume_el_precio`)
- `src/backend/rumbo/negocio/estados/viaje.py` (`al_registrar_cobro`)

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py` y `servicios/economia.py`

## Fuera de alcance
- El formulario, que va en T-179.
- Cambiar la regla de `definir_plan_de_pagos`: desde el viaje, el plan completo sigue sumando el precio (CU-11 A1).

## Notas de implementación
- **Riesgo alto (dinero).** Para mergear, hace falta la aprobación de otro integrante.
- **Factibilidad (verificada el 10/11/26):** el cambio es chico. La reserva usa la misma validación que el plan completo (`exigir_plan_valido`). Hay que separar «montos mayores que cero y hasta el precio» para la reserva. La máquina de estados del viaje ya contempla el plan descalzado.
