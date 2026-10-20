---
id: T-018
titulo: Armar el CI con jobs filtrados por carpeta
modulo: M0 — Fundaciones
capa: infra
estado: tomado
depende_de: [T-001, T-002, T-003, T-008]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0015, RNF-15]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 19/10/26 23:01
rama: feature/T-018-armar-el-ci-con-jobs-filtrados-por-carpe
pr:
---
# T-018 Armar el CI con jobs filtrados por carpeta

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Cada PR corre en GitHub Actions solo los jobs de las carpetas que toca (backend, web, mobile), con caché y los umbrales de cobertura de la spec, de modo que un PR en rojo no se pueda mergear.

## Criterios de aceptación
- [ ] Job backend: uv con caché, PostgreSQL 18 como servicio, ruff, mypy, `alembic upgrade head`, pytest con cobertura total ≥ 70 % y `negocio/` ≥ 80 %.
- [ ] Jobs web y mobile: pnpm con caché, lint, typecheck y tests con cobertura ≥ 70 %.
- [ ] Los jobs se filtran por ruta (un PR que solo toca `06-Desarrollo/` no corre nada) y los push directos de claims a `main` no disparan builds.

## Tests esperados
No sigue TDD (`infra`). Se verifica con un PR de prueba que toca solo backend y otro solo web.

## Contexto (leer solo esto)
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — §8 y §9
- [[Spec de implementación]] §4 y §6

## Archivos probables
- `.github/workflows/ci.yml`

## Fuera de alcance
- Análisis de seguridad (ticket siguiente) y e2e (ticket e2e de M0).

## Notas de implementación
- **Del plan:** Al cerrar: avisar al dueño del repo que configure la protección de `main` exigiendo los checks solo en PR, sin bloquear los push de los claims (spec §10).
