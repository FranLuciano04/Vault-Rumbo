---
id: T-142
titulo: Adaptar la barra lateral de la web a pantallas angostas
modulo: M0 — Fundaciones
capa: web
estado: libre
depende_de: [T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-11, RNF-14]
origen: hallazgo T-020
asignado:
tomado_el:
rama:
pr:
---
# T-142 Adaptar la barra lateral de la web a pantallas angostas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El shell web se puede usar en una ventana angosta o en una tablet. La barra lateral, que en T-020 tiene ancho fijo, se colapsa y se abre con un botón accesible, sin scroll horizontal.

## Criterios de aceptación
- [ ] Por debajo del breakpoint `md` de Tailwind la barra lateral queda oculta y se abre con un botón que tiene nombre accesible y `aria-expanded`. Al elegir una sección, se cierra.
- [ ] Desde `md` en adelante se ve como en T-020, y la navegación por rol no cambia.

## Tests esperados
`describe('RNF-14 barra lateral en pantallas angostas')`: el botón abre y cierra la navegación (`aria-expanded`), elegir una sección la cierra y la navegación por rol de T-020 sigue pasando.

## Contexto (leer solo esto)
- [[Prototipo UI]] — «Sistema de diseño» (Barra lateral) y «Mobile completo» (alcance mobile, que es de la app y no de la web)
- `src/apps/web/src/app/Shell.tsx` (T-020)

## Archivos probables
- `src/apps/web/src/app/Shell.tsx`

## Fuera de alcance
- La app mobile (React Native), que cubre el uso desde el teléfono según RNF-14.
- Los íconos de la navegación (T-141).

## Notas de implementación
