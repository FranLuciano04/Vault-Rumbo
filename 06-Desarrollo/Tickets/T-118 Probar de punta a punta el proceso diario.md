---
id: T-118
titulo: Probar de punta a punta el proceso diario
modulo: M7 — Proceso diario y CRM proactivo
capa: e2e
estado: libre
depende_de: [T-111, T-112, T-114, T-115, T-116, T-109]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-026, RF-027, RF-039]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-118 Probar de punta a punta el proceso diario

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El proceso diario corre contra el sistema real con una fecha fija y sus efectos aparecen en la agenda web.

## Criterios de aceptación
- [ ] Con datos de demo, correr el proceso con `--fecha` vence un pago y una cotización y sugiere un recontacto.
- [ ] Correrlo dos veces no duplica alertas.
- [ ] La sugerencia se atiende desde la web.

## Tests esperados
`e2e/proceso-diario.spec.ts`: `RF-026 vencimiento`, `RF-027 recontacto`, `idempotencia`.

## Contexto (leer solo esto)
- [[CU-30 Sugerir recontacto de clientes]]
- [[ARQ — Vista general]] — `jobs.diario`

## Archivos probables
- `src/apps/web/e2e/proceso-diario.spec.ts`

## Fuera de alcance
- —

## Notas de implementación
