---
id: T-038
titulo: Probar de punta a punta la configuración de la agencia
modulo: M1 — Usuarios y configuración
capa: e2e
estado: libre
depende_de: [T-028, T-029, T-030, T-032, T-033, T-035, T-036, T-037, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-25, CU-26, CU-15, CU-31, CU-13]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-038 Probar de punta a punta la configuración de la agencia

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Los flujos de configuración funcionan contra el sistema real y `datos-iniciales --demo` carga destinos, requisitos, operadores y usuarios de demo (ficticios) para los módulos siguientes.

## Criterios de aceptación
- [ ] La dueña da de alta a un empleado (en el emulador), el empleado inicia sesión y no ve Configuración.
- [ ] Alta de un destino con un requisito, baja y reactivación; operador duplicado rechazado.
- [ ] La semilla de demo de M1 queda registrada en la CLI.

## Tests esperados
`e2e/configuracion.spec.ts`: `RF-144 alta de empleado`, `RF-089 destino con requisito`, `RF-094 operador duplicado`, `RF-083 comisión por defecto`.

## Contexto (leer solo esto)
- [[CU-25 Gestionar usuarios y roles]]
- [[CU-26 Gestionar destinos]]
- [[CU-31 Gestionar operadores]]
- [[Spec de implementación]] §6

## Archivos probables
- `src/apps/web/e2e/configuracion.spec.ts`
- `src/backend/rumbo/datos/semillas/configuracion.py`

## Fuera de alcance
- Mobile (M1 no tiene pantallas mobile).

## Notas de implementación
