---
id: T-109
titulo: Probar de punta a punta las excepciones del viaje
modulo: M6 — Viajes y economía
capa: e2e
estado: libre
depende_de: [T-093, T-095, T-098, T-099, T-103, T-107, T-108]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-11, CU-12, CU-27, CU-09]
origen: plan
asignado:
tomado_el:
rama:
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
