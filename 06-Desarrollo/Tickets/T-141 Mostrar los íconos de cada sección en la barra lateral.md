---
id: T-141
titulo: Mostrar los íconos de cada sección en la barra lateral
modulo: M0 — Fundaciones
capa: web
estado: hecho
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
- El ícono de cada sección vive en `SECCIONES` (`navegacion.ts`), junto a la visibilidad por rol, y `Shell.tsx` solo lo renderiza con `aria-hidden`. Los íconos se tomaron de las pantallas 3 y 28 del prototipo:
  - Agenda: `Bell`.
  - Calendario: `CalendarDays`.
  - Clientes: `User`.
  - Oportunidades: `Funnel`.
  - Cotizaciones: `FileText`.
  - Viajes: `Send`.
  - Hoteles: `Hotel`.
  - Redes: `Share2`.
  - Dashboard: `ChartColumn`.
  - Reportes: `FileChartColumn`, para no repetir el de Cotizaciones.
  - Configuración: `Settings`.
- Señal no cromática del ítem activo: `font-semibold`, además del fondo de alto contraste y de `aria-current="page"`.
- Hallazgos de la review:
  - Con 0 bloqueantes, 0 importantes y 3 menores, la review aprobó la rama una vez alineados los íconos con el prototipo.
  - Se arregló el nombre accesible, que ahora se verifica con `toHaveAccessibleName`.
  - Quedan dos menores sin arreglar:
    - El test de `aria-hidden` pasaría aunque se borre el atributo de `Shell.tsx`, porque `lucide-react` 1.x ya lo pone por defecto.
    - Los enlaces de la barra no tienen un estilo de foco propio (`focus-visible:ring`). No lo agregó este ticket y conviene resolverlo junto con T-142.
- Modelos: tests con Sonnet, implementación y fix con Sonnet, review con Opus. No hubo escalado. El refactor no hizo cambios.
