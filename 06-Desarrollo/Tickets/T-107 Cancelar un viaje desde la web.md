---
id: T-107
titulo: Cancelar un viaje desde la web
modulo: M6 — Viajes y economía
capa: web
estado: hecho
depende_de: [T-102]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-27, RF-048, RF-052, RF-053]
origen: plan
asignado: FranLucianoo
tomado_el: 30/10/26 13:53
rama: feature/T-107-cancelar-un-viaje-desde-la-web
pr:
---
# T-107 Cancelar un viaje desde la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se cancela un viaje con el diálogo del prototipo, que informa los cobros ya registrados, y se revierte una cancelación.

## Criterios de aceptación
- [x] Diálogo de cancelación con los cobros registrados (A2).
- [x] Viaje finalizado sin la acción (A1).
- [x] Revertir cancelación.

## Tests esperados
`describe('RF-048 cancelar')`, `describe('RF-053 revertir')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 19 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-27 Cancelar viaje]]

## Archivos probables
- `src/apps/web/src/features/viajes/`

## Fuera de alcance
- —

## Notas de implementación
- `CancelarViaje.tsx` (nuevo) y dos botones en `AccionesDelViaje.tsx` (T-105): «Cancelar viaje» en reservado, vendido, confirmado y en curso, y «Revertir cancelación» en cancelado. El permiso es el mismo de T-105 (admin, dueño o responsable), igual que `_escribe_operacion`.
- El diálogo pide motivo (obligatorio en el cliente) y fecha (hoy por defecto). Muestra el bloque «Al cancelar» de la pantalla 19 y el aviso de cobros (A2), sumado por `moneda_pago` en centésimas. Si los pagos no cargan, lo avisa.
- Fuera del pedido: en `PlanDePagos.tsx` el aviso de rebalanceo sale solo si el plan es `editable` (en un viaje cancelado el desbalance es esperable, CU-27 A4). Tiene su test por RF-059.
- Review (Opus): 0 bloqueantes, 1 importante (faltaba el bloque «Al cancelar») y 3 menores, todos arreglados en el fix. Se autorizó **agregar** tests (`--tocar-tests`), sin modificar los del rojo.
- Pendiente menor: el bloque no dice cuántas alertas se cierran ni el importe de la comisión que no se realiza, como el prototipo (haría falta un hook de alertas por viaje).
- El backend de cancelar y revertir (T-099) todavía responde 501; la pantalla funciona contra los mocks.
- Modelos: tests sonnet, implementación y refactor sonnet, review opus, sin escalado.
