---
id: T-166
titulo: Mostrar el detalle de la alerta en un panel lateral de la agenda web
modulo: M3 — Alertas
capa: web
estado: libre
depende_de: [T-055, T-032]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-075, RF-076, RF-077]
origen: hallazgo T-055
asignado:
tomado_el:
rama:
pr:
---
# T-166 Mostrar el detalle de la alerta en un panel lateral de la agenda web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al elegir una alerta de la agenda web se abre un panel lateral con su detalle, como en la pantalla 49 del prototipo. El panel muestra el tipo, la fecha y el estado de la alerta, su descripción y el contexto del origen: el viaje (destino, fechas y estado), el cliente y el pago con su moneda. Si la alerta es de un viaje, también lista los **requisitos del destino**. Desde el panel se puede resolver (con «Deshacer»), posponer y marcar como vista. Es un desvío del prototipo que aceptó la review de T-055 y que Francisco pidió completar el 25/10/26.

## Criterios de aceptación
- [ ] Al elegir una alerta se abre el panel con su detalle (`GET /api/alertas/{id}`). Se puede cerrar y el foco vuelve a la fila.
- [ ] Si la alerta tiene un viaje, el panel lista los requisitos de su destino (`GET /api/destinos/{destino_id}/requisitos`).
- [ ] Desde el panel se puede resolver (con «Deshacer»), posponer y marcar como vista, con las mismas reglas que la fila: la alerta de pago no se resuelve a mano y solo se pospone una pendiente.

## Tests esperados
`describe('RF-075 detalle de la alerta')` y `describe('RF-076 acciones desde el detalle')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]]: pantalla 49 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]]: paso 3
- `src/apps/web/src/features/alertas/` (T-055 y T-056) y los hooks de requisitos de destino en `@rumbo/shared`

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- La cantidad de pasajeros y «pagos N de M cobrados» del prototipo: dependen de M6 (viajes y pagos) y se suman cuando esté.
- El cumplimiento de requisitos **por pasajero** («faltan confirmar 2 pasajeros»): el modelo no tiene pasajeros individuales. Sumarlo sería un cambio de dominio que necesita una `DEC-` y la aprobación del equipo.

## Notas de implementación
