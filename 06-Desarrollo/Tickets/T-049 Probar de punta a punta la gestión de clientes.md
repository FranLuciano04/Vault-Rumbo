---
id: T-049
titulo: Probar de punta a punta la gestión de clientes
modulo: M2 — Clientes
capa: e2e
estado: tomado
depende_de: [T-040, T-041, T-042, T-043, T-045, T-046, T-025]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, CU-03, RF-003, RF-151]
origen: plan
asignado: FranLucianoo
tomado_el: 24/10/26 15:42
rama: feature/T-049-probar-de-punta-a-punta-la-gestion-de-cl
pr:
---
# T-049 Probar de punta a punta la gestión de clientes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Los flujos de clientes funcionan contra el sistema real y la semilla de demo suma clientes ficticios.

## Criterios de aceptación
- [ ] Alta con aviso de duplicado y confirmación.
- [ ] Un `freelance` no ve el cliente de otro (404) y sí los suyos.
- [ ] Edición inválida rechazada; semilla de demo de clientes registrada.

## Tests esperados
`e2e/clientes.spec.ts`: `RF-003 posible duplicado`, `RF-151 visibilidad del freelance`, `RF-007 edición`.

## Contexto (leer solo esto)
- [[CU-02 Registrar cliente]]
- [[CU-03 Gestionar ficha del cliente]]
- [[Spec de implementación]] §6

## Archivos probables
- `src/apps/web/e2e/clientes.spec.ts`
- `src/backend/rumbo/datos/semillas/clientes.py`

## Fuera de alcance
- Mobile: prueba manual guiada en la barrera.

## Notas de implementación
