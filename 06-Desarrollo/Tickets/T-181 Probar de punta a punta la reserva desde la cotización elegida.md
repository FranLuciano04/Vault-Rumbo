---
id: T-181
titulo: Probar de punta a punta la reserva desde la cotización elegida
modulo: M11 — Ajustes de la revisión del equipo
capa: e2e
estado: libre
depende_de: [T-175, T-176, T-177, T-178, T-179, T-180]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-01, CU-05, CU-06, CU-07, CU-09, CU-11]
origen: revisión del equipo (10/11/26)
asignado:
tomado_el:
rama:
pr:
---
# T-181 Probar de punta a punta la reserva desde la cotización elegida

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Un e2e cubre el circuito nuevo contra el backend real:
1. Emitir dos cotizaciones con hoteles.
2. Ganar la oportunidad eligiendo la que no es la última.
3. Confirmar la reserva precargada, solo con el primer pago.
4. Ver el viaje con su itinerario y el plan para completar.

## Criterios de aceptación
- [ ] Recorre los pasos del objetivo y verifica que el viaje tenga la moneda y el precio de la cotización elegida, sus tramos de hotel y un solo pago con el aviso de plan descalzado.
- [ ] Al completar el plan desde el viaje y cobrar todo, el viaje llega a `confirmado`.
- [ ] La venta directa (ganar sin cotización) sigue funcionando sin itinerario.

## Tests esperados
Un e2e en la carpeta de los de CU-01 (T-108), sin rojo obligatorio.

## Contexto (leer solo esto)
- El e2e de T-108 (circuito de CU-01) como base
- La `DEC-` aprobada (ver T-174)

## Archivos probables
- `src/apps/web/e2e/` (junto a `cu01.spec.ts`) y, si hace falta, `src/backend/rumbo/datos/semillas/`

## Fuera de alcance
- El arrastre del embudo (T-171), que tiene sus tests de componente.
