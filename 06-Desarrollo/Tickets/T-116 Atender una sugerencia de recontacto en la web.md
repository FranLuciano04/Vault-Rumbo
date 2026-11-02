---
id: T-116
titulo: Atender una sugerencia de recontacto en la web
modulo: M7 — Proceso diario y CRM proactivo
capa: web
estado: hecho
depende_de: [T-055, T-069]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-028, RF-029, RF-030]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 02/11/26 17:24
rama: feature/T-116-atender-una-sugerencia-de-recontacto-en
pr:
---
# T-116 Atender una sugerencia de recontacto en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La sugerencia de recontacto aparece en la agenda con el contexto del cliente y las tres decisiones: crear una consulta, no recontactar o posponer.

## Criterios de aceptación
- [ ] Tarjeta del prototipo con el historial resumido del cliente.
- [ ] Crear consulta abre el formulario precargado.
- [ ] No recontactar y posponer con confirmación.

## Tests esperados
`describe('RF-029 decisión de recontacto')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 7 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-30 Sugerir recontacto de clientes]]

## Archivos probables
- `src/apps/web/src/features/alertas/`

## Fuera de alcance
- —

## Notas de implementación
- La tarjeta `TarjetaRecontacto` vive en el panel de detalle de la agenda (T-166), solo para alertas `recontacto`. Historial de `GET /clientes/{id}/historial` y preferencias de `GET /clientes/{id}`. El historial no trae destino de los viajes: se muestran fechas y estado.
- «Crear consulta» abre `/oportunidades/nueva?cliente_id=…&alerta_id=…`. `NuevaConsulta` precarga el cliente y, al registrar, resuelve la alerta (CU-30 paso 5; decidido por Nahuel en la review). Si ese resolver falla, se navega igual para no duplicar la consulta.
- «No recontactar» confirma, hace el PATCH `no_recontactar` y resuelve con el mismo `alResolver` del panel (cierra y ofrece deshacer). «Posponer» solo con la alerta `pendiente`; en recontacto se oculta el «Posponer» general.
- Review (Opus): 3 importantes y 2 menores, todos arreglados en el fix. Se autorizó tocar los tests del rojo para corregir un tipo (`tsc`) y agregar 4 casos (`--tocar-tests`).
- Modelos: tests sonnet, impl/refactor/fix sonnet, review opus. Sin escalados. El refactor no encontró cambios.
