---
id: T-102
titulo: Registrar la economía desde la ficha del viaje en la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-100]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-10, CU-08, RF-037, RF-054, RF-055, RF-056, RF-058]
origen: plan
asignado: palomap2003
tomado_el: 29/10/26 19:37
rama: feature/T-102-registrar-la-economia-desde-la-ficha-del
pr:
---
# T-102 Registrar la economía desde la ficha del viaje en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La ficha del viaje muestra su situación (estado, saldo, alertas) y la economía editable, con ganancia, margen y comisión calculadas; el `freelance` ve su comisión.

## Criterios de aceptación
- [ ] Encabezado con estado, fechas, cliente y saldo; secciones para economía, plan, itinerario y acciones.
- [ ] Formulario de economía con comisión precargada y override; advertencia de valores negativos.
- [ ] Vista del `freelance` (pantalla 43).

## Tests esperados
`describe('RF-054 economía')`, `describe('RF-058 advertencia')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 15, 43 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-10 Registrar economía del viaje]]
- [[RN-01 Comisión automática]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- Plan, cobros, itinerario y estados (tickets propios).

## Notas de implementación
- `FichaViaje.tsx` (encabezado y regiones; plan, itinerario y acciones quedan como regiones vacías para sus tickets) y `SeccionEconomia.tsx` (formulario con operador, vendedor, precio, costo y comisión; ganancia y margen en vivo como vista previa). Ruta `/viajes/:id` vía `SeccionFichaViaje`. Solo lectura para el `freelance` (pantalla 43) y para viajes finalizados o cancelados.
- Comisión (RN-01): con el mismo vendedor se manda la del viaje; al cambiar de vendedor se precarga su default (admin y dueño) y, si no se toca, se omite del PUT para que el backend aplique RN-01. El empleado no puede listar usuarios: ve «Se aplicará la comisión por defecto de <nombre>». Volver al vendedor original restaura la comisión pactada.
- Nuevos en `@rumbo/shared`: `formatearPorcentaje` (sin float, hacia abajo; también lo usa `TablaViajes`) y la opción `enabled` en `useUsuarios` y `useAsesores`. El mock del PUT de economía devuelve `operador_id` y `vendedor_id` como el backend (antes los conservaba y escondía el bloqueante).
- **Falla arreglada acá (DEC-0019):** el backend rechazaba con 422 cualquier PUT de economía si el vendedor o el operador del viaje estaba de baja, aunque no cambiara. Ahora el que el viaje ya tiene se acepta; uno nuevo se sigue validando (existir, visible, activo, DEC-0009). El vendedor actual se carga sin filtro de visibilidad porque el actor ya pasó `exigir_escritura` sobre el viaje. Decidido con Paloma el 29/10/26.
- Review (opus), dos rondas. Primera: 1 bloqueante (el PUT no mandaba operador ni vendedor y el backend los borraba), 3 importantes y 5 menores, todos arreglados. Segunda: 2 importantes (A→B→A pisaba la comisión pactada; un test del cambio de vendedor corría como empleado) y 5 menores; arreglados salvo dos que quedan anotados: el `freelance` ve «Vendedor: —» si el vendedor es otro (haría falta `vendedor_nombre` en `Viaje`, igual que el `cliente_nombre` que se sumó a T-091) y, para que el empleado vea el default, haría falta exponerlo en `AsesorDelCliente` (contrato).
- Modelos: tests sonnet; implementación, refactor y fixes sonnet (el fix del backend, con `implementador` sonnet); review opus. Sin escalados.
