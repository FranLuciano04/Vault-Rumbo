---
id: T-004
titulo: Levantar PostgreSQL de desarrollo con Docker Compose
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: []
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: opus
trazabilidad: [DEC-0015]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 14/10/26 18:39
rama: feature/T-004-levantar-postgresql-de-desarrollo-con-do
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
- Un solo `src/docker-compose.dev.yml` con dos servicios `postgres:18` (dev con volumen, test con `tmpfs`), según el comando único de la Spec §4. Si el equipo entendía «dos archivos» en DEC-0015 §1, se aclara en la DEC.
- Credenciales obligatorias desde `src/.env` (plantilla `src/.env.example`, agregada fuera de «archivos probables»). Puertos solo en 127.0.0.1.
- Desvío: puertos del host sobrescribibles con `RUMBO_DEV_PORT` y `RUMBO_TEST_PORT` (por defecto 5432 y 5433). En la PC de Nahuel, 5432 y 5433 estaban ocupados, así que se verificó en 15432 y 15433: las dos bases quedaron healthy y psql conectó a `rumbo` y `rumbo_test` (PG 18.6).
- Review (opus): 3 menores, todos arreglados (healthcheck por TCP, nota de puertos y nota de codificación de la clave en `src/backend/.env.example`).
- Modelos: implementación y fix con haiku, review con opus. Sin escalados.
