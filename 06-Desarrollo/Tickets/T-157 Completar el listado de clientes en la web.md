---
id: T-157
titulo: Completar el listado de clientes en la web
modulo: M2 — Clientes
capa: web
estado: libre
depende_de: [T-044, T-155, T-156]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-005, RF-009, RF-031]
origen: hallazgo T-044 (decidido el 23/10/26)
asignado:
tomado_el:
rama:
pr:
---
# T-157 Completar el listado de clientes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El listado de clientes de la web (T-044) queda completo y fiel al prototipo: columnas con datos reales, filtro de etiquetas múltiple y la vista del freelance como en la pantalla 39.

## Criterios de aceptación
- [ ] Las columnas Asesor, Último viaje y Oportunidades muestran los datos de T-155, con «—» solo cuando no hay dato.
- [ ] «Etiquetas» abre un menú con las etiquetas en uso (T-156) que permite elegir varias, con chips removibles. Un cliente aparece si tiene **todas** las etiquetas elegidas (combinables, RF-031). Reemplaza el campo de texto de T-044. La web manda `etiquetas` (parámetro repetido) y se retira el alias deprecado `etiqueta` del router, del hook `useClientes` y del mock (hallazgo T-041).
- [ ] El `freelance` ve «Mis clientes» como una etiqueta fija y no clickeable, junto al aviso de la pantalla 39 (decidido el 23/10/26).

## Tests esperados
`describe('RF-005 …')` con las columnas nuevas, `describe('RF-031 filtro de etiquetas')` con selección múltiple y quitar chips, y `describe('RF-009 vista personal')` con la etiqueta fija del freelance. Con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 8 y 39
- Notas de implementación de T-044

## Archivos probables
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- El alta y la ficha (T-045 y T-046).

## Notas de implementación