---
id: T-173
titulo: Mostrar la comisión en porcentaje con su importe
modulo: M11 — Ajustes de la revisión del equipo
capa: web
estado: libre
depende_de: []
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-10, RN-01, DEC-0007]
origen: revisión del equipo (10/11/26)
asignado:
tomado_el:
rama:
pr:
---
# T-173 Mostrar la comisión en porcentaje con su importe

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En la economía del viaje en la web, cuando se elige comisión por porcentaje, el campo muestra el signo «%» y solo acepta valores de 0 a 100. Al lado se ve cuánto dinero representa ese porcentaje y se actualiza mientras se escribe. Con importe fijo queda como está. Lo pidió el equipo en la revisión del 10/11/26.

## Criterios de aceptación
- [ ] Con «Porcentaje», el campo «Comisión del vendedor» lleva el sufijo «%» y valida de 0 a 100, con un mensaje en castellano si el valor está fuera de rango.
- [ ] Debajo del campo se muestra el importe de la comisión en la moneda del viaje. Sale del precio de venta, el costo y el porcentaje que hay en ese momento en el formulario, y se recalcula con cada cambio. Si no hay ganancia, el importe es cero.
- [ ] Con «Importe», el campo y la vista quedan igual que hoy.

## Tests esperados
`describe('RN-01 comisión en porcentaje')`: el sufijo «%», el rango de 0 a 100, el importe que se recalcula al cambiar el precio, el costo o el porcentaje, el caso sin ganancia y que con importe fijo nada cambia.

## Contexto (leer solo esto)
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]], punto 3
- `src/apps/web/src/features/viajes/SeccionEconomia.tsx` (el formulario de la comisión) y `calculos.ts` (`porcentajeDeGanancia`)

## Archivos probables
- `src/apps/web/src/features/viajes/SeccionEconomia.tsx`
- `src/apps/web/src/features/viajes/esquemas.ts` (el rango de 0 a 100)

## Fuera de alcance
- El backend: ya rechaza un porcentaje mayor que 100 (`economia._comision`).

## Notas de implementación
- **Factibilidad (verificada el 10/11/26):** se puede hacer solo en el front. La vista de lectura ya muestra «N % · importe» con `porcentajeDeGanancia`. Falta hacer lo mismo dentro del formulario, en vivo.
- ⚠️ **Base del porcentaje, a confirmar antes de tomarlo:** el equipo pidió el importe «correspondiente al costo». Pero [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]] (ratificada el 17/09/26) calcula el porcentaje sobre la **ganancia**, y el backend también (`calculos.comision_del_vendedor`, liquidación y reportes). El ticket sigue DEC-0007. Si el equipo confirma que la base es el costo, primero hace falta una `DEC-` que reemplace el punto 3 de DEC-0007 y un ticket de backend. No se cambia en silencio.
