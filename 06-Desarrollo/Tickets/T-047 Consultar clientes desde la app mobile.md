---
id: T-047
titulo: Consultar clientes desde la app mobile
modulo: M2 — Clientes
capa: mobile
estado: hecho
depende_de: [T-039, T-022]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-005, RF-006, RF-009]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 24/10/26 16:13
rama: feature/T-047-consultar-clientes-desde-la-app-mobile
pr:
---
# T-047 Consultar clientes desde la app mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la pestaña Clientes se busca un cliente y se abre su ficha con el historial, pensado para usar en el teléfono.

## Criterios de aceptación
- [ ] Lista con búsqueda y scroll paginado.
- [ ] Ficha con datos, historial y acciones de contacto.
- [ ] El `freelance` ve solo sus clientes (lo resuelve el backend).

## Tests esperados
`describe('RF-005 búsqueda mobile')`, `describe('RF-006 ficha mobile')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 57, 36 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-03 Gestionar ficha del cliente]]

## Archivos probables
- `src/apps/mobile/app/(pestanas)/clientes/`
- `src/apps/mobile/src/features/clientes/`

## Fuera de alcance
- Editar la ficha desde mobile (no está en el prototipo).

## Notas de implementación
- **Rutas:** `app/(pestanas)/clientes.tsx` pasó a ser la carpeta `clientes/`, con `_layout` (Stack sin header), `index` y `[id]`, que delegan en `ListaClientes` y `FichaClienteMobile`.
- **Tests:** MSW no corre bajo jest-expo, así que se usa el cliente real de `@rumbo/shared` con un adaptador HTTP falso, como en `login.test.tsx`.
- **Review 1:**
  - [bloqueante] `no_recontactar` ocultaba las acciones de contacto. Según el Glosario y CU-30, solo saca al cliente de las sugerencias de recontacto, así que ahora la ficha muestra la etiqueta «No incluir en recontactos» y las acciones siguen disponibles. Se corrigió el test que fijaba el supuesto.
  - Se agregó `normalizarTelefonoAR`, que se usa solo para WhatsApp. Para «Llamar», `enlaceLlamada` acepta cualquier teléfono válido según `TELEFONO`.
  - `formatearFecha`, `formatearImporte` y las etiquetas de segmento y estado se movieron de la web a `@rumbo/shared`; las consumen web y mobile.
  - Se corrigieron `tsc` y el lint del test, y se agregaron tests de búsqueda después de paginar y del botón «Reintentar».
  - «Volver» aparece en los estados de carga, error y 404; si no hay historial, va a `/clientes`.
- **Review 2:** solo hallazgos menores, todos aplicados.
- **Fuera de alcance:** el filtro «Mis clientes / Toda la agencia» de la pantalla 57, porque los criterios no lo piden. No se cubrió RF-009 con un test propio: el alcance del `freelance` lo resuelve el backend.
- **Pendiente:** no se contrastaron los textos ni el estilo con las pantallas 57 y 36 del prototipo.
- **Modelos:**
  - tests: Sonnet
  - implementación, refactor y fix: Sonnet
  - review (dos rondas): Opus
  - sin escalados
- **Sumado el 24/10/26 (Francisco, de T-049):** mobile (`src/apps/mobile/app/_layout.tsx`) usa `new QueryClient()`, que reintenta los 4xx, así que una ficha 404 tarda unos 7 s en mostrarse. La web ya lo resolvió con `crearQueryClient()` (`apps/web/src/lib/queryClient.ts`). Conviene mover esa función a `@rumbo/shared`, usarla en las dos apps y alinear el `retry` propio de `consultaYo`.
