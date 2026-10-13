---
id: T-000
titulo: Verbo + objeto, sin «y»
modulo: M0 — Nombre del módulo
capa: backend  # backend · web · mobile · shared · e2e · infra
estado: libre  # libre · tomado · hecho · bloqueado
depende_de: []
tamaño: S  # XS · S · M (si da L, partir el ticket)
riesgo: normal  # normal · alto (auth, permisos, dinero, estados, proceso diario)
modelo_tests: sonnet  # haiku · sonnet · opus — rúbrica en DEC-0014
modelo_impl: sonnet
modelo_review: opus  # distinto de modelo_impl; nunca haiku
trazabilidad: []  # CU-xx, RF-xxx, RN-xx, DEC-xxxx
origen: plan  # plan · review-codex MN · hallazgo T-NNN
asignado:
tomado_el:
rama:
pr:
---
# T-000 Título

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
<Un párrafo: qué comportamiento existe al terminar y para quién.>

## Criterios de aceptación
<Como máximo tres. Cada uno se puede verificar con un test.>
- [ ] …

## Tests esperados
<Qué casos cubre el test-writer, nombrados por RF: `test_rf070_…` / `describe('RF-070 …')`. Incluir los casos borde y los errores de los flujos alternativos del CU.>

## Contexto (leer solo esto)
<Los enlaces exactos que necesita el subagente. Nada más.>
- [[CU-xx …]] — paso o flujo alternativo puntual
- Endpoint del contrato: `MÉTODO /ruta` en `05-Diseño/API/openapi.json`

## Archivos probables
- `src/…`

## Fuera de alcance
- …

## Notas de implementación
<Las completa el orquestador al cerrar: decisiones tomadas, desvíos, hallazgos de la review y modelos que se usaron de verdad (incluido algún escalado).>
