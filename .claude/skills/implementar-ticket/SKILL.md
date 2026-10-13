---
name: implementar-ticket
description: Orquesta la implementación de un ticket de Rumbo con TDD (rojo → verde → refactor → review → fix) usando subagentes con el modelo que asigna el ticket, y lo cierra con un PR. Usar cuando alguien pida implementar, seguir o retomar un ticket T-NNN que ya tiene tomado.
---

# Implementar un ticket

Sos el **orquestador**: dirigís, verificás y commiteás, pero **no escribís el código ni los tests**. Eso lo hacen los subagentes de `.claude/agents/`. Proceso y rúbrica de modelos: DEC-0014 y `06-Desarrollo/Flujo de implementación.md`.

**Antes de empezar:** la sesión principal debería estar en **Opus 5.5 con effort medio**. Si no es así, avisalo una vez y seguí.

**Cuidar los tokens:** vos leés el ticket, no las notas de contexto: esas las leen los subagentes. A cada subagente le pasás la ruta del ticket, la rama y el modo, nada más. Si el paso siguiente usa el mismo subagente con el mismo modelo, continualo con `SendMessage` en vez de lanzar uno nuevo.

## 0. Preparar
1. Leé el ticket. Tiene que estar `tomado` por la persona (`git config user.name`). Si no, `/tomar-ticket`.
2. Rama: `git checkout main && git pull --ff-only origin main`. Después, `git checkout <rama>` si ya existe (local o en `origin`), o `git checkout -b <rama>`.
3. **Retomar:** si la rama ya tiene commits, mirá `git log main..HEAD --oneline` y seguí desde la fase que falta (`test` → `feat` → `refactor` → `fix` → `tickets: … hecho`).

## 1. 🔴 Rojo
- Lanzá `test-writer` con `model: <modelo_tests>`.
- **Verificá vos:** corré los tests nuevos. Tienen que **fallar**, y por el motivo correcto: una aserción, `NotImplementedError` o «no implementado». Si fallan por un error de sintaxis, un import del propio test o un fixture roto, devolvéselo una vez.
- Commit `test(T-NNN): <qué fija> (RF-…)` y `git push -u origin <rama>`. El push registra actividad para el vencimiento de 48 h.

## 2. 🟢 Verde
- Lanzá `implementador` con `model: <modelo_impl>`, en modo **verde**.
- **Verificá vos:**
  - Los tests del ticket y la suite afectada están en verde.
  - **Los tests están intactos.** Sobre `git diff --name-only <commit rojo>` y `git status --porcelain`, ningún archivo de test puede haber cambiado. Se consideran de test los que matchean `(^|/)(tests?|__tests__|e2e)/|\.(test|spec)\.[jt]sx?$|(^|/)test_[^/]*\.py$`. Si cambió alguno, restauralo con `git checkout <commit rojo> -- <archivo>`, volvé a correr y devolvéselo.
- Commit `feat(T-NNN): …` y push.

## 3. 🔵 Refactor
- El mismo implementador, en modo **refactor** (con `SendMessage`).
- Las mismas verificaciones. Commit `refactor(T-NNN): …` solo si hubo cambios. Push.

## 4. 🔍 Review
- Lanzá `reviewer-ticket` con `model: <modelo_review>`. Siempre es un modelo distinto del implementador.
- Clasificá los hallazgos:
  - **bloqueante** e **importante** → se arreglan.
  - **menor** → se arreglan si son baratos; si no, quedan anotados en el ticket.
  - Si un hallazgo te parece falso, comprobalo leyendo el código antes de descartarlo.

## 5. 🔧 Fix
- Si los hallazgos son puntuales y el riesgo es normal, lanzá `implementador` con `model: haiku`, en modo **fix**. Si no, usá `<modelo_impl>`. Si un hallazgo dice que un test está mal y estás de acuerdo, autorizalo **explícitamente** a corregir ese test.
- Las mismas verificaciones. Commit `fix(T-NNN): hallazgos de la review` y push.
- Si hubo bloqueantes, una sola ronda más de review, solo sobre el diff del fix.

## 6. Checks
Corré lint, type-check y tests de las partes tocadas, con los comandos de la sección «Comandos» de `06-Desarrollo/Spec de implementación.md` (ruff y mypy, ESLint y `tsc --noEmit`, pytest, Vitest, Jest). Todo en verde antes de abrir el PR.

## 7. Cierre y PR
1. Completá «Notas de implementación» del ticket en pocas líneas: decisiones, desvíos, hallazgos que quedaron como menores y modelos que se usaron de verdad (incluido algún escalado).
2. `node 06-Desarrollo/herramientas/tickets.mjs hecho T-NNN`, commit `tickets: T-NNN hecho` y push.
3. `gh pr create --base main --title "T-NNN: <título>"`. El cuerpo lleva: objetivo, trazabilidad (CU, RF, RN, DEC), tests agregados, resumen de la review y modelos usados. Termina con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
4. **Merge:**
   - **riesgo normal:**
     - Si el repo tiene CI con checks requeridos, `gh pr merge --merge --auto --delete-branch`: se mergea solo cuando el CI pasa.
     - Si todavía no hay CI (antes de que lo cree el módulo de fundaciones), mergeá con `gh pr merge --merge --delete-branch` después de los checks locales del paso 6.
     - Siempre `--merge`, nunca squash: los commits rojo, verde y refactor quedan como evidencia para el PC3.
   - **riesgo alto:** no mergees. Pedile a la persona que otro integrante apruebe el PR en GitHub. Cuando esté aprobado (`gh pr view --json reviewDecision` da `APPROVED`), volvé a correr `/implementar-ticket T-NNN` y mergeá.
5. Después del merge: `git checkout main && git pull --ff-only origin main && node 06-Desarrollo/herramientas/tickets.mjs publicar-grafo` y borrá la rama local. Si el merge quedó en `--auto`, el grafo se actualiza solo con el próximo claim de cualquiera.

## Escalado y bloqueos
- Si un subagente falla **dos veces** en el mismo paso, relanzalo con el modelo siguiente (haiku → sonnet → opus). Anotalo en el ticket.
- Si Opus falla dos veces, o el ticket es ambiguo o contradice el vault, **pará y preguntale a la persona**. Si hace falta decidir algo de dominio, usá `interview-me` y registrá una `DEC-`. Nunca elijas en silencio.
- Si aparece trabajo fuera del ticket, no lo hagas: avisale a la persona. Si acepta, se crea un ticket nuevo (`origen: hallazgo T-NNN`) desde `_plantillas/PL-Ticket.md`, en `main`, con `tickets.mjs validar`.

## No hacer
- No commitear a `main` código de `src/`: el código entra solo por PR.
- No usar `--no-verify`, `push --force` ni `reset --hard` sobre trabajo ajeno.
- No marcar `hecho` con tests en rojo o checks fallando.
