---
id: T-177
titulo: Armar el itinerario con los hoteles de la cotización
modulo: M11 — Ajustes de la revisión del equipo
capa: backend
estado: libre
depende_de: [T-174, T-176]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, CU-07, CU-09, RF-043, RF-106, DEC-0003]
origen: revisión del equipo (10/11/26)
asignado:
tomado_el:
rama:
pr:
---
# T-177 Armar el itinerario con los hoteles de la cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La cotización guarda qué hoteles del catálogo incluye y con qué fechas. Al confirmar la reserva, el viaje nace con su itinerario de hoteles armado a partir de la cotización aceptada. Después se edita desde el viaje, como hoy. Aplica la `DEC-` que destraba T-174.

## Criterios de aceptación
- [ ] `emitir_cotizacion` guarda `hotel_id`, `check_in` y `check_out` de los ítems que los traen. Valida que el hotel exista y esté abierto, y que el check-out no sea anterior al check-in. Si algo falla, responde 422 sobre el ítem.
- [ ] `confirmar_reserva` crea un tramo `ViajeHotel` por cada hotel de la cotización aceptada, en el orden de los ítems. Usa las mismas validaciones que `agregar_tramo`: fechas dentro del viaje y sin solaparse. En la misma transacción de la reserva.
- [ ] Si un tramo no entra en las fechas del viaje o el hotel ya está cerrado, se hace lo que diga la `DEC-`: se omite con una advertencia o se rechaza la reserva. La venta directa y una cotización sin hoteles crean el viaje sin itinerario, como hoy.

## Tests esperados
`test_rf106_cotizacion_guarda_hoteles_con_fechas`, `test_rf106_hotel_cerrado_o_fechas_invertidas_es_422`, `test_cu07_reserva_crea_el_itinerario_de_la_cotizacion`, `test_cu07_tramo_fuera_del_viaje` (según la `DEC-`) y `test_cu07_venta_directa_sin_itinerario`.

## Contexto (leer solo esto)
- La `DEC-` aprobada (ver T-174, «Decisión pendiente», punto 3)
- `src/backend/rumbo/negocio/estados/cotizacion.py` (`emitir`) y `servicios/itinerario.py` (`agregar_tramo`, `_exigir_tramo_valido`, `_exigir_hotel`)
- `src/backend/rumbo/negocio/servicios/viajes.py` (`confirmar_reserva`)

## Archivos probables
- `src/backend/rumbo/negocio/estados/cotizacion.py`
- `src/backend/rumbo/negocio/servicios/itinerario.py` (sacar las validaciones a algo que pueda usar la reserva) y `servicios/viajes.py`

## Fuera de alcance
- Cargar los hoteles en el formulario de la cotización, que va en T-180.
- El pago al proveedor de cada tramo: se carga después desde el itinerario.

## Notas de implementación
- **Factibilidad (verificada el 10/11/26):** hoy la cotización **no** guarda hoteles. Sus ítems solo tienen concepto y precio, y la web descarta el `hotel_id` antes de mandarlos. Por eso se agregan los tres campos al ítem (T-174). Sin check-in ni check-out no se puede crear un tramo, porque `ViajeHotel` los exige.
- Depende de T-176 porque los dos tocan `confirmar_reserva`.
