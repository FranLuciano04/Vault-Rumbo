---
id: T-046
titulo: Mostrar la ficha editable del cliente en la web
modulo: M2 — Clientes
capa: web
estado: tomado
depende_de: [T-044, T-149]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-03, RF-006, RF-007]
origen: plan
asignado: FranLucianoo
tomado_el: 24/10/26 12:05
rama: feature/T-046-mostrar-la-ficha-editable-del-cliente-en
pr:
---
# T-046 Mostrar la ficha editable del cliente en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La ficha del cliente muestra sus datos y su historial, y permite editarla a quien corresponde.

## Criterios de aceptación
- [ ] Datos del cliente y su historial (oportunidades, viajes y reseñas) con enlaces a cada uno.
- [ ] Edición en línea con validación y errores 422 del servidor.
- [ ] Cliente no encontrado (404) con un estado claro.

## Tests esperados
`describe('RF-006 historial')`, `describe('RF-007 edición')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 10, 40 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-03 Gestionar ficha del cliente]]

## Archivos probables
- `src/apps/web/src/features/clientes/`

## Fuera de alcance
- Crear una consulta desde la ficha (M4).

## Notas de implementación
- **Sumado el 24/10/26 (Francisco, de T-042):** al `freelance` no se le muestra el selector de asesor: sus clientes siempre quedan a su nombre (RF-150). Si lo manda igual, el backend lo ignora.
- **Sumado el 22/10/26 (DEC-0017):** incluir el usuario de Instagram del cliente como campo **opcional**. No cuenta como contacto mínimo. El contrato lo expone desde T-149.
