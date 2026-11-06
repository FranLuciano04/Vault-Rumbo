---
id: T-128
titulo: Probar de punta a punta el tablero de gestión
modulo: M8 — Calendario, dashboard y reportes
capa: e2e
estado: hecho
depende_de: [T-120, T-122, T-124, T-125, T-127, T-109]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-21, CU-22, CU-23]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 05/11/26 19:21
rama: feature/T-128-probar-de-punta-a-punta-el-tablero-de-ge
pr:
---
# T-128 Probar de punta a punta el tablero de gestión

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Calendario, dashboard y reportes funcionan contra el sistema real con los datos de demo.

## Criterios de aceptación
- [ ] El calendario muestra los viajes y vencimientos de la semilla.
- [ ] El dashboard de la dueña y el de un empleado muestran cifras distintas (acotado por rol).
- [ ] Un reporte se exporta a Excel y PDF.

## Tests esperados
`e2e/gestion.spec.ts`: `RF-136 calendario`, `RF-129 dashboard por rol`, `RF-133 exportar`.

## Contexto (leer solo esto)
- [[CU-21 Ver dashboard y embudo]]
- [[CU-22 Generar reportes y estadísticas]]
- [[CU-23 Ver calendario de viajes y vencimientos]]

## Archivos probables
- `src/apps/web/e2e/gestion.spec.ts`

## Fuera de alcance
- —

## Notas de implementación
- **Corrida:** los e2e se corrieron solo en el CI, por decisión de Nahuel: en la PC el puerto 9099 lo ocupaba el stack de demo, y bajarlo borra las cuentas del emulador. Por eso el PR se abrió como borrador antes de la review.
- **Sin bugs del sistema:** las fallas fueron del spec. El dashboard acota al empleado por `Viaje.responsable_id`, no por el asesor del cliente, y por eso `armarViaje` ganó el parámetro opcional `responsableId`.
- **Review (Opus, dos rondas):** un bloqueante, RF-136 fallaba desde el día 8 de cada mes por la alerta de salida del viaje; tres importantes de aserciones débiles; todos arreglados, igual que los menores salvo el siguiente.
- **Menor sin arreglar:** RF-133 valida el formato del archivo exportado (`PK`, `%PDF`), no su contenido.
- **Fuera del ticket:** `e2e/cu01.spec.ts` no pasa `prettier --check`, y el CI no corre Prettier sobre la web. No se tocó.
- **Modelos:** tests con sonnet, review con opus, sin escalados. No hubo implementador: no apareció ningún bug del sistema.
