---
id: T-019
titulo: Sumar los análisis de seguridad al CI
modulo: M0 — Fundaciones
capa: infra
estado: libre
depende_de: [T-018]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: opus
trazabilidad: [DEC-0001, RNF-03]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-019 Sumar los análisis de seguridad al CI

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
El CI corre gitleaks, pip-audit, pnpm audit, bandit y Semgrep, y falla ante un secreto o una vulnerabilidad alta.

## Criterios de aceptación
- [ ] gitleaks revisa todo el repo (incluido el vault) en cada PR.
- [ ] pip-audit y bandit corren con el job de backend; pnpm audit con los de front; Semgrep con reglas para Python y TypeScript.
- [ ] Los hallazgos de severidad alta hacen fallar el job; los falsos positivos se silencian con un archivo de configuración comentado.

## Tests esperados
No sigue TDD (`infra`). Se verifica con una rama descartable que agrega un secreto falso y ve fallar a gitleaks.

## Contexto (leer solo esto)
- [[DEC-0001 Stack tecnológico|DEC-0001]] — herramientas de seguridad
- [[Spec de implementación]] §3

## Archivos probables
- `.github/workflows/ci.yml`
- `.gitleaks.toml`
- `src/backend/pyproject.toml`

## Fuera de alcance
- Escaneo de imágenes Docker.

## Notas de implementación
