---
id: T-074
titulo: Probar de punta a punta el embudo con cotización
modulo: M4 — Oportunidades y cotizaciones
capa: e2e
estado: hecho
depende_de: [T-062, T-065, T-067, T-068, T-069, T-073, T-049]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, CU-05, CU-06]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 28/10/26 15:10
rama: feature/T-074-probar-de-punta-a-punta-el-embudo-con-co
pr:
---
# T-074 Probar de punta a punta el embudo con cotización

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El camino comercial funciona contra el sistema real y la semilla de demo suma oportunidades y cotizaciones ficticias.

## Criterios de aceptación
- [ ] Consulta con cliente nuevo → en gestión → cotización → enviada → aceptada, con PDF descargable.
- [ ] Perder con motivo y reactivar.
- [ ] El `freelance` solo ve sus oportunidades.

## Tests esperados
`e2e/oportunidades.spec.ts`: `RF-010 consulta`, `RF-021 cotización`, `RF-025 aceptación`, `RF-017 perder`, `RF-020 reactivar`.

## Contexto (leer solo esto)
- [[CU-04 Registrar consulta]]
- [[CU-05 Seguir oportunidad]]
- [[CU-06 Emitir cotización]]

## Archivos probables
- `src/apps/web/e2e/oportunidades.spec.ts`
- `src/backend/rumbo/datos/semillas/oportunidades.py`

## Fuera de alcance
- Confirmar la reserva (M6).

## Notas de implementación
- **E2e:** `src/apps/web/e2e/oportunidades.spec.ts` con 6 tests (RF-010, RF-021 con PDF, RF-025, RF-017, RF-020 y RF-151 para el criterio del freelance). Cada test arma sus datos por API con sufijo único: no depende del orden ni de la semilla. Pasaron contra el Compose real sin bugs del sistema (no hubo rojo «limpio» porque el backend ya existía).
- **Aceptar ≠ ganar:** aceptar la cotización la deja «Aceptada» y la oportunidad sigue «Cotizada»; se gana en CU-07 (M6) al confirmar la reserva (CU-06 A2). El test fija ese comportamiento.
- **Semilla de demo:** `rumbo/datos/semillas/oportunidades.py`, registrada en `SEMILLAS` después de clientes y alertas. Crea 5 oportunidades ficticias en 5 estados (la `ganada` es venta directa CU-05 A4, sin cotización; la `perdida` con motivo) y una cotización enviada en la `cotizada`, con la vigencia de la configuración. Idempotente por cliente + destino (campo editable: mismo riesgo aceptado que la semilla de clientes). Test: `tests/negocio/test_semilla_oportunidades.py` (9).
- **Review (opus):** 1 importante (la `ganada` tenía cotización enviada sin aceptar) y 4 menores, todos arreglados en el fix (tests tocados con autorización: caso nuevo de la `ganada`, `test.slow()` + 10 s en la emisión, aserción positiva en «perder sin motivo»).
- **Modelos:** tests sonnet, impl/fix sonnet, review opus; sin escalados.
