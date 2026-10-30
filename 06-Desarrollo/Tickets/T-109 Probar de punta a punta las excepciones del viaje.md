---
id: T-109
titulo: Probar de punta a punta las excepciones del viaje
modulo: M6 — Viajes y economía
capa: e2e
estado: hecho
depende_de: [T-093, T-095, T-098, T-099, T-103, T-107, T-108]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-11, CU-12, CU-27, CU-09]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 30/10/26 18:19
rama: feature/T-109-probar-de-punta-a-punta-las-excepciones
pr:
---
# T-109 Probar de punta a punta las excepciones del viaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Los flujos alternativos del viaje funcionan contra el sistema real.

## Criterios de aceptación
- [ ] Reprogramar, anular y dividir pagos manteniendo el plan cuadrado.
- [ ] Revertir un cobro hace retroceder el viaje.
- [ ] Cancelar un viaje con cobros (se informan), revertir la cancelación, y un viaje finalizado no se cancela.

## Tests esperados
`e2e/viajes-excepciones.spec.ts`: `RF-065`, `RF-066`, `RF-070`, `RF-048`, `RF-049`, `RF-053`.

## Contexto (leer solo esto)
- [[CU-11 Definir plan de cuotas]]
- [[CU-12 Registrar cobro de un pago]]
- [[CU-27 Cancelar viaje]]

## Archivos probables
- `src/apps/web/e2e/viajes-excepciones.spec.ts`

## Fuera de alcance
- —

## Notas de implementación
- **Implementación (30/10/26):** `e2e/viajes-excepciones.spec.ts`, un test por CU (CU-11, CU-12, CU-27) con un `test.step` por RF. Cada test arma su viaje por API (cobros incluidos; el cobro por la web ya lo recorre `cu01.spec.ts`), hace la excepción en la web y verifica por API con los ids de su viaje y sus pagos. Se suman RF-072 (dividir) y RF-052 (informar lo cobrado), que piden los criterios aunque faltaban en «Tests esperados». No destapó bugs del sistema.
- **Review (Opus):** sin bloqueantes; 2 importantes (rebalancear el plan tras anular hasta cuadrar; afirmar el importe cobrado y el saldo 0 al cancelar) y 2 menores (409 exacto al cancelar un finalizado; títulos que prometían «baja lógica»), todos arreglados en el spec.
- **Fuera de alcance, anotado:** RF-050, RF-051 y la reapertura de alertas al revertir la cancelación los cubren los tests de API (`test_cancelacion.py`, `test_cobros.py`). El aviso «El precio de venta cambió y los pagos ya no lo suman» (`PlanDePagos.tsx:17`, `SeccionEconomia.tsx:27`) también aparece al anular un pago sin cambio de precio: conviene corregir el texto.
- **Modelos:** tests y fix Sonnet, review Opus; sin escalados.
