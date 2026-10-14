---
id: T-087
titulo: Implementar la máquina de estados del viaje
modulo: M6 — Viajes y economía
capa: backend
estado: libre
depende_de: [T-007, T-009]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-08, CU-12, CU-27, RF-038, RF-040, RF-042]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-087 Implementar la máquina de estados del viaje

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
`negocio/estados/viaje.py` aplica todas las transiciones de EST-Viaje, y es lo único que cambia el estado de un viaje: lo usan viajes y economía sin depender entre sí.

## Criterios de aceptación
- [ ] Cada transición de EST-Viaje está implementada (reservado → vendido por primer cobro, vendido → confirmado por saldo cero, en curso, finalizado, corrección al estado anterior, cancelación y su reversión) y las inválidas lanzan `TransicionInvalida`.
- [ ] Ofrece los ganchos `al_registrar_cobro` y `al_revertir_cobro` que usa economía (CU-12 A0, A2, A3).
- [ ] Guarda el estado anterior necesario para corregir o revertir.

## Tests esperados
`tests/negocio/test_estados_viaje.py`: una prueba por transición válida e inválida de EST-Viaje, nombradas por RF (`test_rf038_primer_cobro_pasa_a_vendido`, `test_rf042_corregir_estado`, …).

## Contexto (leer solo esto)
- [[EST-Viaje]]
- [[CU-08 Gestionar estado del viaje]]
- [[CU-12 Registrar cobro de un pago]] — A0, A2 y A3
- [[CU-27 Cancelar viaje]]
- [[ARQ — Vista general]] — «Módulos» (viajes ↔ economía)

## Archivos probables
- `src/backend/rumbo/negocio/estados/viaje.py`
- `src/backend/tests/negocio/test_estados_viaje.py`

## Fuera de alcance
- Endpoints (los tickets de cada CU).

## Notas de implementación
