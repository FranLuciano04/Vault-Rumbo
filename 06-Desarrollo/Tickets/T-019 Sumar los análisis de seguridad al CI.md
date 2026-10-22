---
id: T-019
titulo: Sumar los análisis de seguridad al CI
modulo: M0 — Fundaciones
capa: infra
estado: hecho
depende_de: [T-018]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: opus
trazabilidad: [DEC-0001, RNF-03]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 21/10/26 22:06
rama: feature/T-019-sumar-los-analisis-de-seguridad-al-ci
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
- **Qué se agregó:**
  - `secretos` (gitleaks 8.30.1, fijado por sha256) vive en `.github/workflows/secretos.yml`. Lo llama `ci.yml` en cada PR, que `ci-ok` exige, y además corre en cada push a `main` sin filtro de carpetas, para cubrir el vault.
  - Recorre `--log-opts=HEAD`, es decir `main` más la rama del PR. No usa `--all`, para que un secreto en una rama ajena no rompa todos los PR (hallazgo importante de la review).
  - `sast` usa Semgrep 1.182.0 con `p/python`, `p/typescript` y `p/owasp-top-ten`, y falla con severidad ERROR.
  - En el job backend corren `pip-audit` y `bandit --severity-level high`, ambos como dependencias dev. En el job web corre `pnpm audit --audit-level=high`.
- **Hallazgos reales resueltos:**
  - `certifi` (PYSEC-2026-4320): se subió la versión en `uv.lock`.
  - `@grpc/grpc-js`: override `^1.13.6`.
  - El Dockerfile del emulador ahora corre como `node` en vez de root (Semgrep ERROR).
  - Un falso positivo de HTTP a 127.0.0.1 en `e2e/compose.ts` quedó silenciado con `nosemgrep` y su motivo.
- **Riesgo aceptado por Nahuel (21/10/26):** GHSA-86w9-cpqp-85rv (node-forge, por el CLI de Expo) y GHSA-vfj7-8cjw-p6xm (braces, por Metro y Tailwind). Son altas, no tienen parche y vienen de herramientas de build. Están en `audit.ignore` de `src/pnpm-workspace.yaml`, con el motivo; revisarlas cuando salga parche.
- **Verificación:**
  - La prueba de la rama descartable se hizo en local, sobre un repo temporal. Con un secreto falso, gitleaks sale con 1, y un secreto que está solo en otra rama ya no hace fallar a la rama limpia.
  - Sobre el repo real, gitleaks no encontró secretos. bandit, `pnpm audit` y actionlint pasan.
  - Falta comprobar en GitHub la primera corrida real del PR y del push a `main`.
- **Menores pendientes:**
  - La imagen de Semgrep y las acciones están fijadas por tag, no por digest ni SHA.
  - pip-audit y pnpm audit solo corren cuando cambia su carpeta. Conviene un `schedule` semanal, que queda como posible ticket nuevo.
  - pip-audit no filtra por severidad: cualquier vulnerabilidad conocida hace fallar el job.
  - Las reglas `p/*` de Semgrep cambian con el registro.
- **Hallazgo de entorno:** los 5 `PermissionError` de los tests que lanzan subprocesos en la PC de Nahuel se resuelven con `--basetemp=.pytest_tmp`.
- **Modelos:** implementación y fix con haiku, review con opus. No hubo escalados.
