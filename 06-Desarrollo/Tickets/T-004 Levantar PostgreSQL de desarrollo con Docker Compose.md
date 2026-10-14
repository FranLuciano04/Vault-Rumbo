---
id: T-004
titulo: Levantar PostgreSQL de desarrollo con Docker Compose
modulo: M0 — Fundaciones
capa: infra
estado: libre
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: opus
trazabilidad: [DEC-0015]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-004 Levantar PostgreSQL de desarrollo con Docker Compose

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada integrante levanta con un comando la base de desarrollo (5432) y la de tests (5433) en PostgreSQL 18.

## Criterios de aceptación
- [ ] `docker compose -f src/docker-compose.dev.yml up -d` deja las dos bases `healthy`; la de tests usa `tmpfs`.
- [ ] `src/backend/.env.example` documenta `DATABASE_URL` y `TEST_DATABASE_URL` sin secretos reales.
- [ ] `.env` sigue ignorado por Git.

## Tests esperados
No sigue TDD (`infra`). Se verifica levantando el Compose y conectándose a las dos bases.

## Contexto (leer solo esto)
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — §1 (Docker en los tres equipos)
- [[Spec de implementación]] §4

## Archivos probables
- `src/docker-compose.dev.yml`
- `src/backend/.env.example`

## Fuera de alcance
- El Compose de producción (ticket propio).

## Notas de implementación
