---
id: T-171
titulo: Arrastrar las tarjetas del embudo para cambiar el estado
modulo: M11 — Ajustes de la revisión del equipo
capa: web
estado: hecho
depende_de: []
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, RF-016, RF-017, RF-020]
origen: revisión del equipo (10/11/26)
asignado: palomap2003
tomado_el: 11/11/26 15:51
rama: feature/T-171-arrastrar-las-tarjetas-del-embudo-para-c
pr:
---
# T-171 Arrastrar las tarjetas del embudo para cambiar el estado

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
En el embudo de oportunidades de la web, una tarjeta se arrastra a otra columna para cambiar su estado. Solo se aceptan las transiciones de EST-Oportunidad que hoy ofrecen los botones del detalle. Ganar y perder abren la misma confirmación que esos botones, y perder sigue pidiendo el motivo. Lo pidió el equipo en la revisión del 10/11/26.

## Criterios de aceptación
- [ ] Se aceptan estos movimientos: `nueva` a `en_gestion` (tomar); `nueva`, `en_gestion` o `cotizada` a `ganada` (abre la confirmación de ganar); las mismas tres a `perdida` (abre el formulario del motivo); y `perdida` a `en_gestion` (reactivar). Mientras se arrastra, las columnas que no aceptan la tarjeta se ven deshabilitadas. Soltarla en una de esas columnas no hace nada. `cotizada` nunca recibe una tarjeta: se llega ahí al enviar una cotización (EST-Oportunidad T3).
- [ ] Si se cancela la confirmación o la API responde un error (409, 403), la tarjeta vuelve a su columna y se muestra el `detail`. Si sale bien, la tarjeta pasa a la columna nueva y los totales se actualizan.
- [ ] Solo arrastra quien puede escribir la oportunidad (`permisos.ts`). Hay una forma de mover la tarjeta con teclado. Los botones del detalle siguen como están.

## Tests esperados
`describe('RF-016 arrastrar al ganar')`, `describe('RF-017 arrastrar al perder pide el motivo')`, `describe('RF-020 arrastrar una perdida a en gestión la reactiva')`, el rechazo de las columnas inválidas, la vuelta atrás ante un 409 y la falta de arrastre sin permiso de escritura.

## Contexto (leer solo esto)
- [[CU-05 Seguir oportunidad]] y EST-Oportunidad (`src/backend/rumbo/negocio/estados/oportunidad.py`)
- `src/apps/web/src/features/oportunidades/PaginaOportunidades.tsx`, `TarjetaOportunidad.tsx` y `AccionesOportunidad.tsx` (la tabla `ADMITE` ya tiene las transiciones)

## Archivos probables
- `src/apps/web/src/features/oportunidades/PaginaOportunidades.tsx` y `TarjetaOportunidad.tsx`
- Un componente nuevo con las confirmaciones de ganar y perder, sacadas de `AccionesOportunidad.tsx` para usarlas en los dos lugares
- `src/apps/web/package.json`, si se suma la librería de arrastre

## Fuera de alcance
- Elegir la cotización al ganar, que va en T-178. Este ticket deja la confirmación de ganar en un componente propio para que T-178 la cambie en un solo lugar.
- Mobile, que no tiene embudo.

## Notas de implementación
- **Factibilidad (verificada el 10/11/26):** se puede hacer sin tocar el backend. Cada movimiento usa los endpoints de hoy (`/en-gestion`, `/ganar`, `/perder` y `/reactivar`) y sus hooks de `@rumbo/shared/hooks`.
- **Librería:** la web no tiene ninguna de arrastre. Se recomienda `@dnd-kit/core`, que trae arrastre con teclado y con pantalla táctil. Con la API nativa de HTML5 no se puede arrastrar con teclado ni en pantallas táctiles. Hay que anotar la dependencia nueva en el PR.
- **Embudo:** cada columna es una consulta paginada (`useOportunidadesPorPaginas`). Al mover una tarjeta, invalidar las dos columnas involucradas.
- **Implementado (11/11/26, Paloma):**
  - Arrastre con `@dnd-kit/core` 6.3.1 (dependencia nueva): `MouseSensor` (8 px) y `TouchSensor` (250 ms), `DragOverlay` y columnas inválidas atenuadas con `aria-disabled` (la de origen no se atenúa). Para el teclado, cada tarjeta tiene un botón «Mover» con un menú de destinos válidos (flechas, Home/End, Escape devuelve el foco). No se usa el `KeyboardSensor`.
  - Soltar y menú pasan por una sola función `mover`, que valida contra `transiciones.ts`. La confirmación de ganar y el formulario de perder quedaron en `ConfirmacionesCierre.tsx` (los usan el detalle y el embudo; T-178 cambia la de ganar ahí) y las acciones en `useTransicionesOportunidad.ts`.
  - `CampoFormulario` suma la prop opcional `anunciarError` (por defecto no cambia nada): por eso se corrió la suite web completa, 1246/1246.
  - Review de Opus: 4 importantes y 3 menores, todos arreglados. Sin test propio: la anulación del click tras un arrastre (jsdom no navega), la `key` de las confirmaciones y el bloqueo mientras hay una transición pendiente. Falta probar el arrastre a mano en un navegador.
  - Modelos: tests, implementación, refactor y fix con Sonnet; review con Opus. Sin escalados.
