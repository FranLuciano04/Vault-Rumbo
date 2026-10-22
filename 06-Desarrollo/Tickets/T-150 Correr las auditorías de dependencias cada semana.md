---
id: T-150
titulo: Correr las auditorías de dependencias cada semana
modulo: M0 — Fundaciones
capa: infra
estado: tomado
depende_de: [T-019]
tamaño: XS
riesgo: normal
modelo_tests: sonnet
modelo_impl: haiku
modelo_review: sonnet
trazabilidad: [DEC-0001, RNF-03]
origen: hallazgo T-019
asignado: Nahuel Viniegra
tomado_el: 22/10/26 18:04
rama: feature/T-150-correr-las-auditorias-de-dependencias-ca
pr:
---
# T-150 Correr las auditorías de dependencias cada semana

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Hoy `pip-audit` y `pnpm audit` corren solo cuando un PR toca `src/backend/` o `src/apps/web/`. Si se publica una vulnerabilidad alta contra una dependencia ya fijada en los lockfiles, nadie se entera hasta que alguien toque esas carpetas. Al terminar, el CI corre ambas auditorías una vez por semana, sin importar qué haya cambiado, y deja el aviso en GitHub cuando encuentran algo.

## Criterios de aceptación
- [ ] Un disparador `schedule` semanal, y `workflow_dispatch` para correrlo a mano, ejecuta `pip-audit` sobre `src/backend/uv.lock` y `pnpm audit --audit-level=high` sobre `src/`, con las mismas excepciones comentadas que el CI de los PR (`audit.ignore` de `src/pnpm-workspace.yaml`).
- [ ] La corrida programada no ejecuta lint, tests ni e2e: solo las auditorías.
- [ ] Si alguna auditoría encuentra una vulnerabilidad, la corrida queda en rojo en la pestaña Actions y GitHub notifica a quien hizo el último cambio del workflow. Se documenta en el vault quién mira ese aviso.

## Tests esperados
No sigue TDD (`infra`). Se verifica con `actionlint` y con una corrida manual (`workflow_dispatch`) en la rama del ticket o después del merge.

## Contexto (leer solo esto)
- [[T-019 Sumar los análisis de seguridad al CI]]: notas de implementación (excepciones aceptadas y comandos de cada auditoría)
- `.github/workflows/ci.yml` (pasos de pip-audit y pnpm audit) y `.github/workflows/secretos.yml` (patrón de workflow reutilizable)

## Archivos probables
- `.github/workflows/auditoria-semanal.yml` (o reutilizar los pasos con `workflow_call`)

## Fuera de alcance
- Escaneo de imágenes Docker.
- Fijar Semgrep y las acciones por digest o SHA: es el otro menor de la review de T-019, que sigue pendiente.
- Abrir issues o PR automáticos (Dependabot o Renovate).

## Notas de implementación
- **Qué se agregó:** `.github/workflows/auditoria-semanal.yml`, con `schedule` semanal (lunes 09:00 UTC, 06:00 en Buenos Aires) y `workflow_dispatch`. Dos jobs independientes: `pip-audit` (`uv sync --locked` y `uv run pip-audit`, en `src/backend`) y `pnpm-audit` (`pnpm audit --audit-level=high`, en `src`). No corren lint, tests ni e2e. No se toca `ci.yml`: los comandos son los mismos, pero no se reutilizaron con `workflow_call` para no cambiar el CI de los PR dentro de este ticket.
- **Verificación local:** actionlint 1.7.12 (imagen Docker `rhysd/actionlint`) sin hallazgos en los tres workflows; yamllint sin errores; `uv sync --locked` correcto; `pnpm audit --audit-level=high` sale en 0 (2 altas ignoradas por `audit.ignore`, 2 moderadas no cuentan).
- **Pendiente de verificación:** `pip-audit` no pudo correr en esta PC. El Python que maneja uv falla al cargar `ssl` y el de sistema da error de certificado contra pypi.org (problema del entorno local, no del workflow). Lo verifica la primera corrida manual en GitHub.
- **Pendiente en GitHub:** `workflow_dispatch` solo aparece en la pestaña Actions cuando el archivo está en `main`, así que la corrida manual se hace después del merge.
- **Quién mira el aviso:** Nahuel Viniegra, responsable fijo. Qué hacer ante una corrida en rojo y cómo se cambia el responsable: ver [[Flujo de implementación#Auditoría semanal de dependencias (T-150)]].
- **Notificación:** GitHub avisa de una corrida programada fallida a quien modificó por última vez la sintaxis `cron` ([documentación de GitHub Actions, evento `schedule`](https://docs.github.com/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)). Coincide con Nahuel, que es quien edita el `cron`.
