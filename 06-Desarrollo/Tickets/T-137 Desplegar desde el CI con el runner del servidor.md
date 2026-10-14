---
id: T-137
titulo: Desplegar desde el CI con el runner del servidor
modulo: M10 — Despliegue on-premise
capa: infra
estado: libre
depende_de: [T-135, T-018]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [DEC-0011, RNF-15]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-137 Desplegar desde el CI con el runner del servidor

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Un tag de versión despliega Rumbo en el servidor a través de un runner propio, con las migraciones y una prueba de humo, y hay una forma documentada de volver atrás.

## Criterios de aceptación
- [ ] Runner self-hosted registrado en el servidor y workflow de despliegue por tag o manual.
- [ ] El despliegue corre las migraciones y una prueba de humo (`/api/salud` y login).
- [ ] Rollback a la versión anterior documentado y probado una vez.

## Tests esperados
No sigue TDD (`infra`). Se verifica desplegando dos versiones y volviendo a la primera.

## Contexto (leer solo esto)
- [[DEC-0011 Infraestructura de despliegue on-premise|DEC-0011]]
- [[DEC-0015 Decisiones de implementación|DEC-0015]] — §8

## Archivos probables
- `.github/workflows/deploy.yml`
- `src/infra/servidor.md`

## Fuera de alcance
- —

## Notas de implementación
