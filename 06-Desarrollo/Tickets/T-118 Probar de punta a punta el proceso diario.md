---
id: T-118
titulo: Probar de punta a punta el proceso diario
modulo: M7 — Proceso diario y CRM proactivo
capa: e2e
estado: hecho
depende_de: [T-111, T-112, T-114, T-115, T-116, T-109]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-30, RF-026, RF-027, RF-039]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 04/11/26 17:02
rama: feature/T-118-probar-de-punta-a-punta-el-proceso-diari
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
- **Resultado:** los e2e pasaron contra el sistema real desde la primera corrida: no destaparon bugs, así que no hubo verde ni refactor.
- **Desvío:** el criterio dice «con datos de demo», pero el spec arma sus propios datos por API, como los demás e2e. No hay semilla de recontacto, así que con la demo sola el criterio no se puede cumplir.
- **Fecha del proceso:** es el día siguiente a `validez_hasta` de la cotización (unos 32 días en el futuro), porque la vigencia mínima configurable es de 1 mes. Por eso la sugerencia aparece en Próximas y no en la agenda del día.
- **Review:** sin bloqueantes. Se arreglaron los 2 importantes y 2 menores: el avance de viaje suma cobertura de RF-039 y los helpers pasan a `e2e/apoyo.ts`, que usan este spec y `viajes-excepciones.spec.ts`. El menor de «datos de demo» queda anotado acá.
- **Pendiente menor:** las otras copias de `tokenDe` en `e2e/` no se migraron a `apoyo.ts`.
- **Riesgo futuro:** el proceso es global, así que afectaría a un spec ordenado después que dependa de datos creados antes de la corrida (semillas). Hoy no hay ninguno.
- **Modelos:** tests y fix con Sonnet, review con Opus. Sin escalados.
