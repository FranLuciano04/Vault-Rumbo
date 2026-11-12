---
id: T-178
titulo: Elegir la cotización al ganar la oportunidad en la web
modulo: M11 — Ajustes de la revisión del equipo
capa: web
estado: hecho
depende_de: [T-174, T-171]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-05, CU-06, RF-016, RF-024, RF-025]
origen: revisión del equipo (10/11/26)
asignado: Nahuel Viniegra
tomado_el: 12/11/26 17:32
rama: feature/T-178-elegir-la-cotizacion-al-ganar-la-oportun
pr:
---
# T-178 Elegir la cotización al ganar la oportunidad en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una oportunidad muestra sus cotizaciones como alternativas. Al tocar «Ganar», en el detalle o arrastrando la tarjeta, el usuario elige cuál aceptó el cliente o marca que fue una venta directa. Aplica la `DEC-` que destraba T-174.

## Criterios de aceptación
- [ ] La confirmación de ganar (el componente que dejó T-171) lista las cotizaciones que se pueden elegir, con fecha, total, moneda y conceptos, como opciones de radio. También ofrece «Sin cotización (venta directa)». Manda `cotizacion_id` o nada.
- [ ] Si la oportunidad tiene cotizaciones elegibles, hay que elegir una opción antes de confirmar. Si no tiene ninguna, solo aparece la venta directa. Un 409 o un 422 muestra el `detail` de la API.
- [ ] La sección de cotizaciones del detalle deja de hablar de «versiones» y las muestra como alternativas («Cotización 1», «Cotización 2»…). «Aceptar» se ofrece en cualquiera que lo admita, según la `DEC-`.

## Tests esperados
`describe('RF-016 ganar eligiendo la cotización')`: elegir una cotización, la venta directa, la oportunidad sin cotizaciones, el error de la API y el arrastre a `ganada`, que abre el mismo selector. `describe('RF-025 aceptar una alternativa')`.

## Contexto (leer solo esto)
- La `DEC-` aprobada (ver T-174, «Decisión pendiente», punto 1)
- `src/apps/web/src/features/oportunidades/AccionesOportunidad.tsx` y el componente de confirmación de T-171
- `src/apps/web/src/features/oportunidades/cotizaciones/VersionesCotizacion.tsx` y `AccionesCotizacion.tsx`

## Archivos probables
- `src/apps/web/src/features/oportunidades/` y `cotizaciones/`
- `src/packages/shared/src/hooks/` (`useGanarOportunidad` con `cotizacion_id`)

## Fuera de alcance
- El backend, que va en T-175.

## Notas de implementación
- `ConfirmarGanar` (`ConfirmacionesCierre.tsx`) lista como radios las `borrador` y las `enviada` vigentes, más «Sin cotización (venta directa)». Si ya hay una `aceptada` (CU-06 A2), solo ofrece esa y manda `ganar` sin cuerpo. Si falla la carga, deja la venta directa y un «Reintentar».
- `VersionesCotizacion.tsx` pasó a `AlternativasCotizacion.tsx`: «Cotización N», donde la 1 es la más antigua. `useGanarOportunidad` acepta `cotizacion_id` opcional e invalida las cotizaciones.
- Con autorización de la persona (`--tocar-tests`) se cambió un test viejo de `ArrastreEmbudo.test.tsx` que ganaba sin elegir. Se adaptaron los tests de `CotizacionesOportunidad`, `RespuestaCotizacion` y `RecomendarHoteles` al renombre y se formatearon con Prettier.
- La review (Opus) encontró 1 importante (la cotización ya aceptada) y 3 menores (reintento, vigencia y un comentario). Todos quedaron arreglados.
- Modelos: tests, implementación y refactor con Sonnet (el refactor no tuvo cambios); review con Opus. No hubo escalados.
