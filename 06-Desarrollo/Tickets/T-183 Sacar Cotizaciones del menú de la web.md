---
id: T-183
titulo: Sacar Cotizaciones del menú de la web
modulo: M12 — Mejoras para las demos
capa: web
estado: hecho
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0028, CU-06]
origen: pedido de Francisco (15/11/26)
asignado: FranLucianoo
tomado_el: 15/11/26 18:32
rama: feature/T-183-sacar-cotizaciones-del-menu-de-la-web
pr:
---
# T-183 Sacar Cotizaciones del menú de la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El menú lateral de la web deja de mostrar «Cotizaciones». Hoy ese ítem lleva a `/cotizaciones`, que no tiene pantalla y cae en el placeholder `SeccionPendiente`. Desde [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]], las cotizaciones se ven y se cargan dentro de cada oportunidad (`/oportunidades/:id/cotizaciones`). Ese acceso no cambia.

## Criterios de aceptación
- [ ] El menú no muestra «Cotizaciones» para ningún rol; el resto de las secciones mantiene su orden y su visibilidad.
- [ ] El link «Cotizaciones» del detalle de una oportunidad y la ruta `/oportunidades/:id/cotizaciones` siguen funcionando.

## Tests esperados
`src/apps/web/src/app/navegacion.test.ts`, `App.shell.test.tsx` y `App.iconos.test.tsx`: la lista de secciones esperada, por rol, ya no incluye `cotizaciones`. Los e2e no cambian: usan el link «Cotizaciones» del detalle de la oportunidad, no el del menú.

## Contexto (leer solo esto)
- `src/apps/web/src/app/navegacion.ts` (lista `SECCIONES`)
- [[DEC-0028 Cotizaciones alternativas y reserva con el primer pago|DEC-0028]]

## Archivos probables
- `src/apps/web/src/app/navegacion.ts`
- `src/apps/web/src/app/navegacion.test.ts`
- `src/apps/web/src/app/App.shell.test.tsx`
- `src/apps/web/src/app/App.iconos.test.tsx`

## Fuera de alcance
- Las pantallas de cotizaciones dentro de la oportunidad.
- Mobile.

## Notas de implementación
- Se aparta de la tabla «Vistas por rol» del prototipo, que lista «Cotizaciones» en el menú. Lo pidió Francisco el 15/11/26 para la demo de la facultad, porque la sección estaba vacía. El comentario de `SECCIONES` en `navegacion.ts` lo explica.
- `/cotizaciones` suelta (por ejemplo, un favorito viejo) cae en `SeccionPendiente`, que redirige a `/agenda`. El link «Cotizaciones» del detalle de la oportunidad y `/oportunidades/:id/cotizaciones` no cambian, y los e2e usan ese link, no el del menú.
- Refactor salteado: el verde solo borró 2 líneas.
- Review (opus): 1 bloqueante. `App.barra-angosta.test.tsx` seguía esperando 11 secciones y el verde no lo había corrido porque solo cubría los 3 archivos del ticket. Se arregló en el fix con autorización (`--tocar-tests`), junto con el formato de `navegacion.test.ts` y el comentario del desvío. Hubo una segunda ronda de review sobre el fix.
- Checks: `vitest run src/app` 59/59; `tsc`, `eslint` y `prettier` limpios.
- Modelos: tests sonnet, implementación y fix sonnet, review opus. No hubo escalados.
