---
id: T-133
titulo: Pedir una propuesta de contenido con IA en la web
modulo: M9 — Redes e IA
capa: web
estado: libre
depende_de: [T-132]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-20, RF-119, RF-121, RF-122]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-133 Pedir una propuesta de contenido con IA en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Desde Redes se pide una propuesta a la IA, se revisan los borradores, se regeneran o descartan, y se guarda el elegido como pieza.

## Criterios de aceptación
- [ ] Formulario del pedido y vista de borradores.
- [ ] Regenerar, descartar y guardar como pieza (RF-121).
- [ ] Error de la IA mostrado con opción de reintentar.

## Tests esperados
`describe('RF-119 propuesta')`, `describe('RF-121 guardar borrador')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 27 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-20 Generar propuesta de contenido con IA]]

## Archivos probables
- `src/apps/web/src/features/redes/`

## Fuera de alcance
- —

## Notas de implementación
