---
id: T-142
titulo: Adaptar la barra lateral de la web a pantallas angostas
modulo: M0 — Fundaciones
capa: web
estado: hecho
depende_de: [T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-11, RNF-14]
origen: hallazgo T-020
asignado: palomap2003
tomado_el: 21/10/26 20:57
rama: feature/T-142-adaptar-la-barra-lateral-de-la-web-a-pan
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
- Debajo de `md`, la barra se apila arriba con el logo y un botón «Menú». El botón lleva `md:hidden`, `aria-expanded` y `aria-controls`, que apunta al `id` de la `nav`. La `nav` usa `hidden md:flex` cuando está cerrada, y elegir una sección la cierra. Desde `md` se ve como en T-020 y T-141.
- **Corrección del rojo:** un test afirmaba que el empleado no ve Dashboard, pero eso contradice `navegacion.ts` y `App.shell.test.tsx` de T-020: solo Reportes y Configuración son de admin. Lo corrigió el `test-writer` en el commit del verde, con `--tocar-tests` autorizado por el orquestador.
- **Fuera de los criterios, con aprobación de Paloma:** foco visible (`focus-visible:ring-sidebar-ring`) en los enlaces y en el botón. Era un menor pendiente de T-141.
- Review (Opus): 0 bloqueantes, 0 importantes y 4 menores.
  - Arreglados: Escape cierra el menú y devuelve el foco al botón (con su test), y el header suma `flex-wrap` y `px-4 md:px-6` para los 320 px.
  - Pendientes:
    - Si se abre el menú, se agranda la ventana a `md` o más y se vuelve a achicar, el menú reaparece abierto.
    - Ningún test cubre el ancho y el borde desde `md` (`md:w-60`, `md:border-r`), porque jsdom no aplica media queries. Se verifica mirando el navegador.
- Modelos: tests con Sonnet, implementación, refactor y fix con Sonnet, review con Opus. No hubo escalado.
