---
id: T-138
titulo: Respaldar la base a diario con copia externa
modulo: M10 — Despliegue on-premise
capa: infra
estado: libre
depende_de: [T-135, T-115]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [RNF-08, DEC-0011]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-138 Respaldar la base a diario con copia externa

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La base se respalda todos los días con retención y una copia fuera del servidor, y la restauración está probada.

## Criterios de aceptación
- [ ] `pg_dump` diario programado con retención definida.
- [ ] Copia externa según DEC-0011, con las credenciales en el `.env`.
- [ ] Restauración probada en una base vacía y documentada.

## Tests esperados
No sigue TDD (`infra`). Se verifica restaurando un respaldo y comparando conteos.

## Contexto (leer solo esto)
- [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]
- [[Requisitos funcionales]] — RNF-08

## Archivos probables
- `src/infra/respaldo.sh`
- `src/infra/crontab`
- `src/infra/servidor.md`

## Fuera de alcance
- —

## Notas de implementación
