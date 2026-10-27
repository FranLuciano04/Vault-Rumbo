---
id: T-072
titulo: Emitir una cotización en la web
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: hecho
depende_de: [T-071]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-06, RF-021, RF-022, RF-024]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 27/10/26 18:38
rama: feature/T-072-emitir-una-cotizacion-en-la-web
pr:
---
# T-072 Emitir una cotización en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde la oportunidad se emite una cotización con el formulario del prototipo y se ven sus versiones.

## Criterios de aceptación
- [ ] Formulario con importes y moneda, vigencia calculada visible.
- [ ] Lista de versiones con su estado.
- [ ] Vista del `freelance` (pantalla 41).

## Tests esperados
`describe('RF-021 emitir cotización')`, `describe('RF-024 versiones')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 13, 41 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-06 Emitir cotización]]

## Archivos probables
- `src/apps/web/src/features/oportunidades/cotizaciones/`

## Fuera de alcance
- Recomendación de hoteles (M5).

## Notas de implementación
- Ruta `/oportunidades/:id/cotizaciones` (link «Cotizaciones» desde el detalle): `FormularioCotizacion` y `VersionesCotizacion`. El formulario solo aparece si la oportunidad está abierta y el usuario es admin, dueño o responsable (`oportunidades/permisos.ts`, también usado por `DetalleOportunidad`).
- Importes en formato es-AR: el punto separa los miles y la coma, los decimales (bloqueante de la review: «780.000» se leía como 780). La suma es exacta con BigInt.
- Vigencia antes de emitir: solo admin y dueño ven la fecha (leen `GET /configuracion`; se agregó `enabled` a `useConfiguracion`); el resto ve «Vigencia según la configuración de la agencia». Tras emitir y en cada versión, el `validez_hasta` del servidor.
- **Falla de T-066 arreglada acá (DEC-0019):** `GET /oportunidades/{id}/cotizaciones` respondía 501 y ningún ticket lo implementaba. Se implementó con visibilidad (freelance: solo las suyas, 404), orden `fecha` desc, `created_at` desc, y 13 tests; se sacó del set de stubs de `test_contrato_m4.py`.
- Tests del rojo modificados con autorización (`--tocar-tests`): importes con coma, «ganada» → sin formulario, freelance responsable, vigencia del admin con la configuración; y lint de dos `waitFor`.
- Fuera del ticket (sin hacer): plantilla, detalle por ítem, «Guardar borrador», vista previa y descarga del documento (pantallas 13 y 41). El botón dice «Generar documento» como el prototipo, aunque emite en borrador.
- Modelos: tests Sonnet, implementación/refactor/fix Sonnet (front y backend), review Opus en dos rondas (1 bloqueante y 4 importantes; luego 2 menores); sin escalados.
