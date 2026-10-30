---
id: T-103
titulo: Definir el plan de cuotas en la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-102]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-11, RF-059, RF-060, RF-061, RF-064, RF-065, RF-066]
origen: plan
asignado: palomap2003
tomado_el: 30/10/26 08:53
rama: feature/T-103-definir-el-plan-de-cuotas-en-la-web
pr:
---
# T-103 Definir el plan de cuotas en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En la ficha del viaje se define el plan de cuotas (con la suma controlada en vivo), se rebalancea y se reprograma, anula o divide un pago.

## Criterios de aceptación
- [ ] Editor del plan con seña, cuotas y saldo; la suma tiene que igualar el precio de venta antes de guardar.
- [ ] Acciones por pago: reprogramar, anular y dividir.
- [ ] Aviso de plan desbalanceado tras cambiar el precio (A5).

## Tests esperados
`describe('RF-061 suma del plan')`, `describe('RF-065 reprogramar')`, `describe('RF-066 anular')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 15 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-11 Definir plan de cuotas]]

## Archivos probables
- `src/apps/web/src/features/viajes/plan/`

## Fuera de alcance
- Cobros (ticket propio).

## Notas de implementación
- `plan/PlanDePagos.tsx` (lista, aviso A5 y acciones), `plan/EditorDelPlan.tsx` (editor con la suma en vivo), `plan/PanelDePago.tsx` (reprogramar, anular y dividir) y `plan/etiquetas.ts`. Se montan en la región «Plan de pagos» de `FichaViaje.tsx` con el mismo `editable` que la economía (sin acciones para el `freelance` ni en viajes finalizados o cancelados). Las sumas van en centésimas con `aCentesimas` y `deCentesimas` de `calculos.ts`, que pasaron a exportarse.
- Editor: los pagos cobrados cuentan en la suma pero no se editan; «Agregar seña», «Agregar cuota», «Agregar saldo» y «Quitar» en cualquier fila sin cobrar. «Pago único» (A2) deja un saldo por precio − cobrados y no se ofrece si no queda nada por planificar. «Guardar plan» exige al menos una fila, todos los montos mayores que cero, la suma exacta y los vencimientos completos. Con la suma justa se muestra la confirmación en verde de la pantalla 15.
- Aviso A5: sale cuando los pagos vigentes no suman el precio de venta; sin plan no avisa (igual que `calculos.plan_desbalanceado` del backend) y se oculta con el editor abierto.
- Tests tocados con autorización de Paloma: en el rojo se agregaron 5 casos a `FichaViaje.test.tsx`; en el fix se corrigió el lint de `PlanDePagos.test.tsx` (helper `importe`), se reforzó la aserción del test de dividir y se agregaron 4 casos (plan vacío, seña + cuota + saldo, monto en cero y sin saldo por planificar).
- Review (opus), dos rondas. Primera: 1 bloqueante (el aviso A5 salía en un viaje sin plan), 3 importantes (no se podían cargar seña ni saldo, se podía guardar con montos en cero o sin pagos, lint del test) y 4 menores; todo arreglado. Segunda: aprobado, con 3 menores arreglados (numeración de cuotas contando las cobradas, aviso de monto en cero, llaves sobrantes).
- Pendiente de la pantalla 15, sin ticket: la barra de «% pagado» con cobrado y saldo, y la fila vencida resaltada. El detalle del cobro y «Registrar cobro» son del ticket de cobros.
- Modelos: tests sonnet; implementación, refactor y fixes sonnet; review opus (2 rondas). Sin escalados.
