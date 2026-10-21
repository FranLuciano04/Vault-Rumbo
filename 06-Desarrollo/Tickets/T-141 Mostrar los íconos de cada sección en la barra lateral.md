---
id: T-141
titulo: Mostrar los íconos de cada sección en la barra lateral
modulo: M0 — Fundaciones
capa: web
estado: tomado
depende_de: [T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-11, CU-24]
origen: hallazgo T-020
asignado: palomap2003
tomado_el: 21/10/26 20:32
rama: feature/T-141-mostrar-los-iconos-de-cada-seccion-en-la
pr:
---
# T-141 Mostrar los íconos de cada sección en la barra lateral

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada ítem de la barra lateral de la web muestra el ícono de su sección, como en el prototipo. T-020 dejó la navegación solo con texto.

## Criterios de aceptación
- [ ] Cada una de las 11 secciones de `app/navegacion.ts` tiene un ícono de `lucide-react` equivalente al del prototipo, y el ícono es decorativo (`aria-hidden`), así que el nombre accesible del enlace sigue siendo la etiqueta.
- [ ] El ítem activo se distingue con algo más que el color (WCAG AA: el color nunca es la única señal).

## Tests esperados
`describe('RNF-11 íconos de la navegación')`: cada enlace de la navegación principal tiene un ícono con `aria-hidden` y conserva el nombre accesible. Los tests de T-020 sobre `seccionesVisibles` y la navegación por rol siguen pasando.

## Contexto (leer solo esto)
- [[Prototipo UI]] — «Sistema de diseño» (28 íconos, componente Ítem de menú y Barra lateral) y PNG de las pantallas 3 y 28 en `07-Entregables/Prototipo/img/`
- `src/apps/web/src/app/Shell.tsx` y `src/apps/web/src/app/navegacion.ts` (T-020)

## Archivos probables
- `src/apps/web/src/app/Shell.tsx`
- `src/apps/web/src/app/navegacion.ts`

## Fuera de alcance
- La barra lateral responsive (T-142) y el contenido de cada sección.

## Notas de implementación
