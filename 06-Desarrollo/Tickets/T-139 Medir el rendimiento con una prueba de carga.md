---
id: T-139
titulo: Medir el rendimiento con una prueba de carga
modulo: M10 — Despliegue on-premise
capa: infra
estado: libre
depende_de: [T-137, T-128]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-09, RNF-10]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-139 Medir el rendimiento con una prueba de carga

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Una prueba de carga con un volumen de datos de varios años mide los tiempos de las operaciones diarias contra los umbrales de RNF-09 y RNF-10, y el resultado queda registrado.

## Criterios de aceptación
- [ ] Generador de datos de volumen (ficticios) y escenario de uso diario.
- [ ] Medición de los tiempos de respuesta contra los umbrales de los RNF.
- [ ] Resultado y ajustes en la Bitácora técnica.

## Tests esperados
No sigue TDD (`infra`). Se verifica corriendo la prueba y comparando con los umbrales.

## Contexto (leer solo esto)
- [[Requisitos funcionales]] — RNF-09 y RNF-10
- [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]

## Archivos probables
- `src/infra/carga/`

## Fuera de alcance
- —

## Notas de implementación
- **Del plan:** La herramienta de carga no está en la spec §3: preguntar antes de agregarla.
