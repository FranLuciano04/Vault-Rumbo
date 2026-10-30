---
id: T-098
titulo: Registrar el pago al proveedor de cada tramo
modulo: M6 — Viajes y economía
capa: backend
estado: hecho
depende_de: [T-097, T-051]
tamaño: S
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-09, RF-045, RF-047, DEC-0013]
origen: plan
asignado: palomap2003
tomado_el: 30/10/26 15:19
rama: feature/T-098-registrar-el-pago-al-proveedor-de-cada-t
pr:
---
# T-098 Registrar el pago al proveedor de cada tramo

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada tramo con vencimiento de pago al proveedor genera su alerta; al marcarlo pagado, la alerta se resuelve.

## Criterios de aceptación
- [ ] Cargar o cambiar el vencimiento de pago de un tramo crea o mueve su alerta (RF-045).
- [ ] Marcar el tramo como pagado al proveedor resuelve la alerta (A4, RF-047).
- [ ] Quitar el tramo cierra su alerta.

## Tests esperados
`tests/api/test_itinerario.py`: `test_rf045_alerta_de_proveedor`, `test_rf047_pagado_resuelve_alerta`, `test_quitar_tramo_cierra_alerta`.

## Contexto (leer solo esto)
- [[CU-09 Armar itinerario de hoteles]] — A4
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]] — origen de alerta del tramo
- Contrato: `src/packages/shared/openapi.json` (módulo `viajes`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/viajes.py`

## Fuera de alcance
- Contabilidad de proveedores (fuera de alcance).

## Notas de implementación
- **Alcance real:** T-097 ya creaba, reagendaba y resolvía la alerta del tramo. De los 12 tests del rojo, 10 pasaban de entrada y fijan ese comportamiento. Los otros 2 destaparon dos huecos, que se arreglaron:
  - una alerta `vista` no se movía al cambiar el vencimiento, y se creaba una segunda; ahora se usa `alertas.reagendar_de_origen`;
  - un tramo que nacía pagado creaba una alerta abierta.
- **Contrato:** `TramoCrear` acepta `pago_proveedor_realizado` (default `false`); antes el esquema lo descartaba. Se regeneraron `openapi.json` y `tipos.gen.ts`, y en `modelos.ts` el campo queda opcional. El mock de `POST /itinerario` respeta el valor enviado.
- **Decisiones:** una alerta `vista` movida conserva el estado `vista`, igual que en T-093. Despagar un tramo con vencimiento crea una alerta nueva.
- **Pendiente de front, fuera del ticket:** el formulario web del itinerario todavía no permite marcar un tramo como pagado en el alta.
- **Review:** `reviewer-seguridad`, con 0 bloqueantes, 0 importantes y 3 menores, todos arreglados en el fix (2 tests y el mock).
- **Modelos:** tests sonnet, implementación y fix opus, refactor opus (sin cambios), review sonnet.
