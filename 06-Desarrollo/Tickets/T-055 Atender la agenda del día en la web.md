---
id: T-055
titulo: Atender la agenda del día en la web
modulo: M3 — Alertas
capa: web
estado: hecho
depende_de: [T-050, T-020]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-14, RF-074, RF-076, RF-077, RF-078, RF-154, RF-155]
origen: plan
asignado: FranLucianoo
tomado_el: 25/10/26 18:47
rama: feature/T-055-atender-la-agenda-del-dia-en-la-web
pr:
---
# T-055 Atender la agenda del día en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La agenda del día es la pantalla de inicio: muestra las alertas con su tipo y contexto, el progreso del día, y permite resolver (con «Deshacer»), posponer y ver las próximas. Admin y dueña ven la de toda la agencia.

## Criterios de aceptación
- [x] Lista por tipo con contexto y progreso del día; estado vacío (A3).
- [x] Resolver con aviso de «Deshacer» (el envío se demora unos segundos) y posponer con fecha.
- [x] Vista de toda la agencia con responsable para `admin`/`dueno`; pestaña de próximas.

## Tests esperados
`describe('RF-074 agenda')`, `describe('RF-076 resolver con deshacer')`, `describe('RF-077 posponer')`, `describe('RF-078 agenda de la agencia')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 3, 4, 5, 37, 49, 50 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-14 Ver y atender alertas del día]]

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- Sugerencia de recontacto (M7).

## Notas de implementación
- **Implementación (25/10/26):** `/agenda` es la página de inicio. El código vive en `features/alertas/` (`PaginaAgenda`, `FilaAlerta`, `FiltroResponsable`, `useResolverConDeshacer` y `fechas.ts`) y reemplaza al placeholder. `ETIQUETA_TIPO_ALERTA` está en `@rumbo/shared`, para que mobile la reutilice.
  - **Progreso:** muestra «Llevás X de Y» o, para la dirección, «La agencia lleva X de Y».
  - **Pestañas:** «Pendientes» (con las secciones «Atrasadas» y «Hoy») y «Próximas».
  - **Filtros:** el switch «Mostrar vistas», el filtro por tipo y, solo para admin y dueña, el filtro por responsable (`useAsesores` → `propietario_id`).
  - **Paginación:** pide 100 alertas por página y muestra Anterior y Siguiente.
  - **Resolver:** la alerta sale de la lista al instante. El POST espera 5 s para poder deshacerlo, se envía igual si se sale de la pantalla y, si el servidor lo rechaza, la alerta vuelve a la lista.
  - **Posponer:** solo se ofrece en las pendientes. La fecha mínima es el día siguiente a la más tardía entre la fecha de la alerta y hoy.
  - **Alertas de pago:** no tienen «Resolver» y muestran el motivo.
  - **Contexto:** siempre se muestra el viaje, la oportunidad y el cliente, y el pago con su moneda.
- **Desvíos del prototipo:**
  - Hay dos pestañas en vez de cuatro.
  - No hay panel de detalle lateral, tarjetas ni contadores en las pestañas.
  - «Crear recordatorio» está deshabilitado porque lo trae T-056.
  - Los controles del switch, las pestañas y el select son propios, porque `components/ui` no los tiene.
- **Review (opus), dos rondas:**
  - **Primera ronda:** 1 bloqueante y 4 importantes, todos arreglados.
    - El bloqueante: la agenda cortaba en 20 alertas y no avisaba.
    - Los importantes:
      - «Posponer» aparecía en alertas vistas;
      - dos tests pasaban por casualidad y el código se había adaptado a ellos, ocultando contexto;
      - el estado vacío se mostraba aunque quedaran alertas vistas.
  - **Segunda ronda:** 2 importantes, arreglados: la pantalla quedaba en blanco si fallaban las vistas, y la página quedaba fuera de rango. También 2 menores, arreglados: un test inestable y el caso del pago en USD.
- **Modelos:** sonnet en tests, implementación y refactor (sin cambios); opus en la review. No hubo escalados.
