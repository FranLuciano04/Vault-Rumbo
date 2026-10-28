---
id: T-073
titulo: Registrar la respuesta a una cotización en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: hecho
depende_de: [T-072]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, RF-023, RF-025]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 27/10/26 22:54
rama: feature/T-073-registrar-la-respuesta-a-una-cotizacion
pr:
---
# T-073 Registrar la respuesta a una cotización en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se marca una cotización como enviada, se registra la aceptación o el rechazo y se descarga su PDF.

## Criterios de aceptación
- [x] Botones según el estado de la cotización.
- [x] ~~Rechazo con motivo.~~ Rechazo con confirmación, sin motivo (ver notas).
- [x] Descarga del PDF.

## Tests esperados
`describe('RF-023 enviar')`, `describe('RF-025 aceptar o rechazar')` con MSW.

## Contexto (leer solo esto)
- [[CU-06 Emitir cotización]] — A2 y A3
- [[EST-Cotización]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/cotizaciones/`

## Fuera de alcance
- —

## Notas de implementación
- **Rechazo sin motivo (decisión de Nahuel, 27/10/26):** ni [[Cotización]] ni [[EST-Cotización]] ni el contrato (`POST /cotizaciones/{id}/rechazar`, sin cuerpo) tienen motivo; el motivo existe solo al cerrar la Oportunidad como `perdida`. «Rechazar» abre una confirmación en la fila. ⚠️ T-067 pide «Rechazar registra el motivo según CU-06 A3»: quien lo tenga debe alinearlo (CU-06 no menciona motivo).
- Las acciones de respuesta exigen oportunidad abierta y permiso de escritura (`puedeEmitir`); «Descargar PDF» queda siempre visible.
- Fix fuera de la UI: `@rumbo/shared/cliente.ts` ahora lee el problem+json cuando el error llega como `Blob` (`responseType: "blob"`), para mostrar el `detail` del servidor al fallar la descarga.
- **Menor sin resolver (para T-067):** se ofrece «Aceptar» también en versiones viejas que siguen `enviada`; aceptar dos versiones dejaría dos `aceptada`. Conviene que el backend responda 409 o que se limite a la versión vigente.
- Modelos: tests sonnet, implementación/refactor/fix sonnet, review opus. Sin escalados.

