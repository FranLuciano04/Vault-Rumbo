---
id: T-166
titulo: Mostrar el detalle de la alerta en un panel lateral de la agenda web
modulo: M3 — Alertas
capa: web
estado: hecho
depende_de: [T-055, T-032]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-075, RF-076, RF-077]
origen: hallazgo T-055
asignado: palomap2003
tomado_el: 25/10/26 23:33
rama: feature/T-166-mostrar-el-detalle-de-la-alerta-en-un-pa
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
- **Modelos:** tests, verde, refactor y fix con sonnet; review con opus. No hubo escalados. El refactor no cambió nada.
- **Decisión de Paloma (cambio de contrato):** `ViajeDeAlerta` (`contexto.viaje`) suma `destino_id`. Así el panel pide los requisitos sin pasar por `GET /api/viajes/{id}`, que sigue en 501 hasta M6. El campo respeta la visibilidad del freelance: si no ve el viaje, el contexto no lo trae. Se actualizó `test_rf075_contexto_del_origen` (T-052).
- **Test corregido en el verde:** el rojo llamaba a `servirRequisitos()` después del handler propio del test, y MSW lo pisaba. También tenía un `any` del lint. Lo corrigió el test-writer, sin cambiar lo que fija ningún test.
- **Panel:**
  - Es un diálogo modal hecho a mano (el web no tiene Radix): `aria-modal`, trampa de foco y Escape. Con el formulario de posponer abierto, Escape cierra solo el formulario.
  - Al resolver, el foco va a «Deshacer»; al marcar como vista, a «Cerrar».
  - Cliente, oportunidad e importe salen de `datosDeContexto`. El viaje (destino, fechas y estado) se arma en el panel.
  - Se suman `FormularioPosponer.tsx`, `ETIQUETA_ESTADO_ALERTA` en shared y `olvidar()` en `useVolverFoco`.
- **Review:** 0 bloqueantes, 2 importantes (el foco al resolver y una premisa falsa sobre el vencimiento del pago) y 4 menores, todos arreglados. Se autorizó sumar 3 tests de foco y Escape, y acotar una aserción de fecha.
