---
name: implementar-ticket
description: Orquesta la implementación de un ticket de Rumbo con TDD (rojo → verde → refactor → review → fix) usando subagentes según la capa del ticket y el modelo que asigna, y lo cierra con un PR. Usar cuando alguien pida implementar, seguir o retomar un ticket T-NNN que ya tiene tomado.
---

# Implementar un ticket

Sos el **orquestador**: dirigís, verificás y commiteás, pero **no escribís el código ni los tests**. Eso lo hacen los subagentes de `.claude/agents/`, cada uno con sus skills **precargadas** (campo `skills:` de su definición). Proceso y rúbrica de modelos: DEC-0014 y `06-Desarrollo/Flujo de implementación.md`. Stack, comandos y límites: `06-Desarrollo/Spec de implementación.md`.

**Antes de empezar:** la sesión principal debería estar en **Opus 5.5 con effort medio**. Si no es así, avisalo una vez y seguí.

**Cuidar los tokens:** vos leés el ticket, no las notas de contexto: esas las leen los subagentes. A cada subagente le pasás la ruta del ticket, la rama y el modo, nada más. Si un paso siguiente usa el mismo subagente con el mismo modelo, continualo con `SendMessage` en vez de lanzar uno nuevo.

## Quién hace cada paso, según la `capa` del ticket
| Capa | 🔴 Tests | 🟢 Implementa / 🔧 arregla | 🔵 Refactor | 🔍 Review |
|---|---|---|---|---|
| `backend`, `shared` | `test-writer` (modo rojo) | `implementador` | `simplificador` | `reviewer-ticket` |
| `contrato` | `test-writer` (modo rojo: rutas, esquemas, roles y `501`) | `implementador-contrato` | `simplificador` | `reviewer-ticket` |
| `web`, `mobile` | `test-writer` (modo rojo) | `implementador-front` | `simplificador` | `reviewer-ticket` |
| `e2e` | `test-writer` (modo e2e: no se exige rojo) | `implementador` o `implementador-front`, solo si los e2e destapan un bug | — | `reviewer-ticket` |
| `infra` | — (sin TDD: se verifica ejecutando) | `implementador-infra` | — | `reviewer-ticket` |

- Si el ticket es de **`riesgo: alto`**, la review la hace `reviewer-seguridad` en vez de `reviewer-ticket`.
- **Modelos:** tests con `modelo_tests`; implementación, refactor y fix con `modelo_impl`; review con `modelo_review`, que siempre es distinto del implementador. Se pasan en el parámetro `model` del Agent, que manda sobre el frontmatter.

Skills precargadas en cada subagente:

| Subagente | Skills |
|---|---|
| `test-writer` | `test-driven-development` |
| `implementador` | `incremental-implementation`, `source-driven-development`, `debugging-and-error-recovery` |
| `implementador-front` | `incremental-implementation`, `frontend-ui-engineering`, `debugging-and-error-recovery` |
| `implementador-contrato` | `api-and-interface-design`, `incremental-implementation` |
| `implementador-infra` | `ci-cd-and-automation`, `shipping-and-launch`, `debugging-and-error-recovery` |
| `simplificador` | `code-simplification` |
| `reviewer-ticket` | `code-review-and-quality`, `review-de-ticket` |
| `reviewer-seguridad` | `code-review-and-quality`, `security-and-hardening`, `review-de-ticket` |

## 0. Preparar
1. Leé el ticket. Tiene que estar `tomado` por la persona (`git config user.name`). Si no, `/tomar-ticket`.
2. Rama: `git checkout main && git pull --ff-only origin main`. Después, `git checkout <rama>` si ya existe (local o en `origin`), o `git checkout -b <rama>`.
3. **Retomar:** si la rama ya tiene commits, mirá `git log main..HEAD --oneline` y seguí desde la fase que falta (`test` → `feat` → `refactor` → `fix` → `tickets: … hecho`).

## 1. 🔴 Rojo (todas las capas menos `infra`)
- Lanzá `test-writer` con `model: <modelo_tests>`, en el modo de la tabla.
- **Verificá vos:** corré los tests nuevos. En modo rojo tienen que **fallar**, y por el motivo correcto: una aserción, `NotImplementedError` o «no implementado». Si fallan por un error de sintaxis, un import del propio test o un fixture roto, devolvéselo una vez.
- En **e2e**, si los tests pasan contra el sistema real, el ticket queda casi cerrado: pasá a la review. Si fallan, decidí con el reporte si es un bug del sistema (paso 2, en modo fix) o del test (devolvéselo).
- Commit `test(T-NNN): <qué fija> (RF-…)` y `git push -u origin <rama>`. El push registra actividad para el vencimiento de 48 h.

## 2. 🟢 Verde
- Lanzá el implementador de la tabla con `model: <modelo_impl>`, en modo **verde** (en `infra`, el único modo).
- **Verificá vos:**
  - Los tests del ticket y la suite afectada están en verde. En `infra`: lo que reportó como verificado, lo volvés a ejecutar.
  - **Los tests están intactos.** Sobre `git diff --name-only <commit rojo>` y `git status --porcelain`, ningún archivo de test puede haber cambiado. Se consideran de test los que matchean `(^|/)(tests?|__tests__|e2e)/|\.(test|spec)\.[jt]sx?$|(^|/)test_[^/]*\.py$`. Si cambió alguno, restauralo con `git checkout <commit rojo> -- <archivo>`, volvé a correr y devolvéselo.
- Commit `feat(T-NNN): …` (`chore(T-NNN): …` en `infra`) y push.

## 3. 🔵 Refactor (todas menos `e2e` e `infra`)
- Lanzá `simplificador` con `model: <modelo_impl>`.
- Las mismas verificaciones. Commit `refactor(T-NNN): …` solo si hubo cambios. Push.

## 4. 🔍 Review
- Lanzá `reviewer-ticket` (o `reviewer-seguridad` si el riesgo es alto) con `model: <modelo_review>`.
- Clasificá los hallazgos:
  - **bloqueante** e **importante** → se arreglan.
  - **menor** → se arreglan si son baratos; si no, quedan anotados en el ticket.
  - Si un hallazgo te parece falso, comprobalo leyendo el código antes de descartarlo.

## 5. 🔧 Fix
- Si los hallazgos son puntuales y el riesgo es normal, lanzá el implementador de la tabla con `model: haiku`, en modo **fix**. Si no, usá `<modelo_impl>`. Si un hallazgo dice que un test está mal y estás de acuerdo, autorizalo **explícitamente** a corregir ese test.
- Las mismas verificaciones. Commit `fix(T-NNN): hallazgos de la review` y push.
- Si hubo bloqueantes, una sola ronda más de review, solo sobre el diff del fix.

## 6. Checks
Corré lint, type-check y tests de las partes tocadas, con la cobertura, usando los comandos de la §4 de la spec. Todo en verde antes de abrir el PR. Guardá la salida resumida: la usa el PR.

## 7. Cierre y PR
1. Completá «Notas de implementación» del ticket en pocas líneas: decisiones, desvíos, hallazgos que quedaron como menores y modelos que se usaron de verdad (incluido algún escalado).
2. `node 06-Desarrollo/herramientas/tickets.mjs hecho T-NNN`, commit `tickets: T-NNN hecho` y push.
3. **Abrí el PR con la skill `pr`**, que arma la descripción con el formato del proyecto a partir del ticket, los commits, los tests y la review.
4. **Merge:**
   - **riesgo normal:**
     - Si el repo tiene CI con checks requeridos, `gh pr merge --merge --auto --delete-branch`: se mergea solo cuando el CI pasa.
     - Si todavía no hay CI (antes de que lo cree el módulo de fundaciones), mergeá con `gh pr merge --merge --delete-branch` después de los checks locales del paso 6.
     - Siempre `--merge`, nunca squash: los commits rojo, verde y refactor quedan como evidencia para el PC3.
   - **riesgo alto:** no mergees. Pedile a la persona que otro integrante apruebe el PR en GitHub. Cuando esté aprobado (`gh pr view --json reviewDecision` da `APPROVED`), volvé a correr `/implementar-ticket T-NNN` y mergeá.
5. Después del merge: `git checkout main && git pull --ff-only origin main && node 06-Desarrollo/herramientas/tickets.mjs publicar-grafo` y borrá la rama local. Si el merge quedó en `--auto`, el grafo se actualiza solo con el próximo claim de cualquiera.

## Cuando algo falla
1. **Primero, depurar con método.** Los implementadores tienen precargada `debugging-and-error-recovery`: si devuelven un verde fallido, pediles (con `SendMessage`) que apliquen el ciclo reproducir → localizar → reducir → arreglar → proteger antes de reintentar.
2. **Después, escalar.** Si el mismo paso falla **dos veces** con método, relanzalo con el modelo siguiente (haiku → sonnet → opus). Anotalo en el ticket.
3. **Si Opus falla dos veces**, o el ticket es ambiguo o contradice el vault, **pará y preguntale a la persona** con la skill `interview-me`. Si sale una decisión, registrala con la skill `documentation-and-adrs` como una `DEC-` en `05-Diseño/Decisiones/` (formalizada solo con la aprobación del equipo). Nunca elijas en silencio.
4. Si aparece trabajo fuera del ticket, no lo hagas: avisale a la persona. Si acepta, se crea un ticket nuevo (`origen: hallazgo T-NNN`) desde `_plantillas/PL-Ticket.md`, en `main`, con `tickets.mjs validar`.

## No hacer
- No commitear a `main` código de `src/`: el código entra solo por PR.
- No usar `--no-verify`, `push --force` ni `reset --hard` sobre trabajo ajeno.
- No marcar `hecho` con tests en rojo o checks fallando.
