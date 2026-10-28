---
id: T-081
titulo: Editar un hotel del catálogo en la web
modulo: M5 — Hoteles y reseñas
capa: web
estado: tomado
depende_de: [T-080]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-16, RF-097, RF-098, RF-099, RF-100]
origen: plan
asignado: FranLucianoo
tomado_el: 28/10/26 16:16
rama: feature/T-081-editar-un-hotel-del-catalogo-en-la-web
pr:
---
# T-081 Editar un hotel del catálogo en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Se da de alta un hotel, se lo edita o se lo da de baja desde la web, con el aviso de posible duplicado.

## Criterios de aceptación
- [ ] Formulario con validación de datos mínimos.
- [ ] Aviso de posible duplicado con confirmación.
- [ ] Baja con confirmación.

## Tests esperados
`describe('RF-097 alta de hotel')`, `describe('RF-099 duplicado')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 23 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-16 Gestionar hotel en catálogo]]

## Archivos probables
- `src/apps/web/src/features/hoteles/`

## Fuera de alcance
- —

## Notas de implementación
- **De la review de T-080 (28/10/26):** el contrato no tiene un catálogo de categorías ni de servicios. Por eso el catálogo web usa las constantes compartidas `CATEGORIAS_HOTEL` (de 1 a 5 estrellas) y `SERVICIOS_HOTEL` (los de la pantalla 21 del prototipo), que viven en `@rumbo/shared`. El alta y la edición tienen que ofrecer las mismas listas: si no, un hotel cargado con otro texto no aparece al filtrar. El contrato tampoco permite filtrar por un rango de categorías ni por varios servicios a la vez, así que la pantalla no puede ofrecer esas opciones.
