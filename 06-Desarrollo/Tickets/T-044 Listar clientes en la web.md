---
id: T-044
titulo: Listar clientes en la web
modulo: M2 — Clientes
capa: web
estado: hecho
depende_de: [T-039, T-020]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-005, RF-009, RF-031]
origen: plan
asignado: FranLucianoo
tomado_el: 23/10/26 10:46
rama: feature/T-044-listar-clientes-en-la-web
pr:
---
# T-044 Listar clientes en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada rol busca y lista clientes en la web, con filtro de texto, etiquetas y «lo mío», y entra a la ficha.

## Criterios de aceptación
- [ ] Tabla paginada con búsqueda y filtros del prototipo.
- [ ] El `freelance` ve su vista (pantalla 39) sin el filtro «lo mío».
- [ ] Estado vacío y de carga.

## Tests esperados
`describe('RF-005 búsqueda de clientes')`, `describe('RF-009 vista personal')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 8, 39 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-03 Gestionar ficha del cliente]] — paso 1

## Archivos probables
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- Alta y ficha (tickets propios).

## Notas de implementación
- **Implementación (23/10/26, Francisco):**
  - `features/clientes/PaginaClientes.tsx` y `TablaClientes.tsx` siguen el layout de las pantallas 8 y 39: sobrelínea, buscador en el encabezado, control segmentado «Mis clientes / Toda la agencia», chips de segmento, «Etiquetas» con ícono, y una card con la tabla, avatares, chevron y pie.
  - Los datos vienen de `useClientes` de `@rumbo/shared`, que ahora tiene `placeholderData: keepPreviousData`: la tabla no parpadea al paginar ni al filtrar, y la navegación usa la página pedida.
  - La búsqueda tiene un debounce de 300 ms (`lib/useDebouncedValue`). La etiqueta se aplica con Enter o al perder el foco.
  - El freelance no ve el selector, no manda `mios` y ve el aviso con el texto exacto de la pantalla 39.
  - Rutas `/clientes` y `/clientes/:id`; la segunda es un placeholder hasta T-046.
- **Supuestos y desvíos:**
  - **Filtro de etiquetas:** el prototipo solo muestra el botón «Etiquetas», así que se resolvió como campo de texto con una sola etiqueta.
  - **Columnas sin datos en el contrato:** Asesor (salvo el propio), Último viaje y Oportunidades muestran «—». Llenarlas requiere ampliar el contrato de clientes.
  - **Selector del freelance:** el ticket pide que no lo vea, pero la pantalla 39 muestra «Mis clientes» fijo. Queda a decidir con el equipo.
  - **Refactor:** se salteó por ser un diff chico.
- **Review (Opus), dos rondas:**
  - **Primera:** pidió cambios, con 5 importantes y 4 menores, todos arreglados. Lo principal: parpadeo, debounce, texto del aviso inventado, filtro de etiqueta oculto, test de error y layout.
  - **Segunda:** 2 menores, también arreglados: la navegación durante el placeholder y el vacío atenuado.
  - Con autorización se ajustaron dos tests existentes, sin aflojar aserciones: el aviso ahora valida el texto completo y la etiqueta se aplica con Enter.
- **Verificación:** web con 146 tests y 90,45 % de cobertura; shared con 107 tests. Lint y typecheck limpios.
- **Modelos:** tests, verde y fix con Sonnet; review con Opus. No hubo escalados.
