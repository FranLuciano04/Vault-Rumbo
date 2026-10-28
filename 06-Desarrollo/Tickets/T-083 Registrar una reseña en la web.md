---
id: T-083
titulo: Registrar una reseña en la web
modulo: M5 — Hoteles y reseñas
capa: web
estado: hecho
depende_de: [T-082]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-17, RF-101, RF-102, RF-103, RF-105]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 28/10/26 16:59
rama: feature/T-083-registrar-una-resena-en-la-web
pr:
---
# T-083 Registrar una reseña en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde el detalle del hotel (o desde un viaje) se registra la reseña de un cliente y se la edita.

## Criterios de aceptación
- [ ] Formulario con cliente, viaje opcional, puntaje y comentario.
- [ ] Validación y errores del servidor.
- [ ] Edición de una reseña existente.

## Tests esperados
`describe('RF-101 reseña')`, `describe('RF-105 edición')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 25 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-17 Registrar reseña de hotel]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- —

## Notas de implementación
- `FormularioResena`, un único formulario para el alta y la edición (react-hook-form y zod). El alta está en `DetalleHotel` («Nueva reseña») y la edición dentro del `<li>` de `ResenaPublicada` («Editar reseña», después de «Ocultar reseña»). Solo para empleado, admin y dueño; el freelance no ve ninguno de los dos.
- El cliente se elige con `BuscadorCliente`, que busca en el servidor. Se movió, junto con `AltaRapidaCliente`, de `oportunidades/` a `clientes/`. El viaje opcional (A1) se elige con `SelectorViaje` (`useViajes` filtrado por `cliente_id`) y `viaje_id` viaja solo si se eligió uno. El PATCH de edición manda puntaje, comentario y fecha (lo admite `ResenaEditar`).
- **Pendiente:** registrar la reseña entrando desde la pantalla de un viaje, que todavía no existe en la web (M6).
- Review (opus): 3 importantes (solo se podían elegir los primeros 100 clientes, el viaje A1 no se podía elegir, el mock de hoteles duplicaba el GET de clientes) y 2 menores (errores de carga invisibles, test del 422 débil), todos arreglados. En el fix se autorizó tocar el test (`--tocar-tests`) para el error de `tsc`, los mocks oficiales, los helpers del buscador, el 422 con errores por campo y los casos nuevos.
- El fix tardó mucho: vitest es lento en esta PC (unos 6 min para hoteles, oportunidades y clientes). Además, el subagente quedó esperando una corrida en segundo plano que ya no existía, y los checks finales los corrió el orquestador.
- `useTotalesAgenda.test.ts` (shared) falló una vez en la suite completa por tiempo y pasa cuando se corre solo. Es intermitente y ajeno al ticket.
- Modelos: tests sonnet, implementación/fix sonnet (el refactor no tuvo cambios), review opus. Sin escalados.
