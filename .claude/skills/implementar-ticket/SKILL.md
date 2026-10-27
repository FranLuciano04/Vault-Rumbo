---
name: implementar-ticket
description: Orquesta la implementación de un ticket de Rumbo con TDD (rojo → verde → refactor → review → fix) usando subagentes según la capa del ticket y el modelo que asigna, y lo cierra con un PR. Usar cuando alguien pida implementar, seguir o retomar un ticket T-NNN que ya tiene tomado.
---

# Implementar un ticket

Sos el **orquestador**: dirigís, verificás y commiteás, pero **no escribís el código ni los tests**. Eso lo hacen los subagentes de `.claude/agents/`, cada uno con sus skills **precargadas** (campo `skills:` de su definición). Proceso y rúbrica de modelos: DEC-0014 y `06-Desarrollo/Flujo de implementación.md`. Stack, comandos y límites: `06-Desarrollo/Spec de implementación.md`.

**Antes de empezar:** la sesión principal debería estar en **Opus 5.5 con effort medio**. Si no es así, avisalo una vez y seguí.

**Cuidar los tokens:** vos leés el ticket, no las notas de contexto: esas las leen los subagentes. A cada subagente le pasás la ruta del ticket, la rama y el modo, nada más. Guardá el id del implementador del verde: el **fix lo hace ese mismo subagente, continuado con `SendMessage`**, que ya tiene el ticket y el código en contexto (uno nuevo cuesta casi lo mismo que el verde entero). Lo mecánico de cada fase (verificar que los tests sigan intactos, commit y push) es **una sola llamada** a `tickets.mjs fase`; no lo hagas a mano.

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
| `implementador` | `incremental-implementation` |
| `implementador-front` | `incremental-implementation`, `frontend-ui-engineering` |
| `implementador-contrato` | `api-and-interface-design`, `incremental-implementation` |
| `implementador-infra` | `ci-cd-and-automation` |
| `simplificador` | `code-simplification` |
| `reviewer-ticket` | `code-review-and-quality`, `review-de-ticket` |
| `reviewer-seguridad` | `code-review-and-quality`, `security-and-hardening`, `review-de-ticket` |

Los implementadores invocan **a demanda** `debugging-and-error-recovery` (cuando algo falla), `source-driven-development` (una librería nueva o una API dudosa) y, en infra, `shipping-and-launch` (M10).

## 0. Preparar
1. Leé el ticket. Tiene que estar `tomado` por la persona (`git config user.name`). Si no, `/tomar-ticket`.
2. Rama: `git checkout main && git pull --ff-only origin main`. Después, `git checkout <rama>` si ya existe (local o en `origin`), o `git checkout -b <rama>`.
3. **Retomar:** si la rama ya tiene commits, mirá `git log main..HEAD --oneline` y seguí desde la fase que falta (`test` → `feat` → `refactor` → `fix` → `tickets: … hecho`).

**Tests en la misma llamada:** `fase` acepta `--test "<comando>"`, que corre desde la raíz del repo, con bash. Pasale el comando que cubre **solo los tests del ticket y sus vecinos directos** (por ejemplo, `--test "cd src/backend && uv run pytest tests/api/test_errores.py"`). Los vecinos directos son los tests del código que el ticket tocó, por ejemplo los de destinos si se cambió un repositorio compartido. Nunca incluyas la suite completa ni `test_contrato_m1.py` y sus equivalentes: corren una sola vez, en el paso 6 (T-154). Pedile lo mismo a cada subagente cuando le digas qué correr. En el rojo exige que fallen (código 3 si pasan); en verde, refactor y fix, que pasen (código 4 si fallan). En ambos casos no commitea, y muestra las últimas líneas de la salida, así no hace falta correr los tests aparte.
- **Código 5:** el comando no arrancó (126, 127 o 9009, por ejemplo un programa fuera del PATH) o no terminó (una señal o una salida demasiado grande). No corrió ningún test, así que no es ni un rojo ni un verde. Arreglá vos el comando, por ejemplo con `corepack pnpm` en lugar de `pnpm`, y volvé a correr; no se lo devuelvas al subagente.
- Encadená los comandos con `&&`, nunca con `;`: `fase` solo ve el código del último.
- Un «no encontrado» dentro de pnpm o uv sale con 1 o 2 y pasa como rojo, así que en el rojo mirá siempre el motivo de la falla.

## 1. 🔴 Rojo (todas las capas menos `infra`)
- Lanzá `test-writer` con `model: <modelo_tests>`, en el modo de la tabla.
- **Verificá vos,** con la salida de `fase … rojo --test`: los tests tienen que **fallar**, y por el motivo correcto: una aserción, `NotImplementedError` o «no implementado». Si fallan por un error de sintaxis, un import del propio test o un fixture roto, devolvéselo una vez.
- En **e2e** no se exige el rojo: corré `fase … rojo` **sin** `--test` y mirá vos la corrida. Si los tests pasan contra el sistema real, el ticket queda casi cerrado: pasá a la review. Si fallan, decidí con el reporte si es un bug del sistema (paso 2, en modo fix) o del test (devolvéselo).
- `node 06-Desarrollo/herramientas/tickets.mjs fase T-NNN rojo "<qué fija> (RF-…)" --test "<cmd>"`: comprueba que fallan, commitea `test(T-NNN): …` y sube la rama (el push registra actividad para el vencimiento de 48 h).

## 2. 🟢 Verde
- Lanzá el implementador de la tabla con `model: <modelo_impl>`, en modo **verde** (en `infra`, el único modo).
- En `infra`, lo que el implementador reportó como verificado lo volvés a ejecutar vos (pasalo como `--test` si es un comando).
- `node 06-Desarrollo/herramientas/tickets.mjs fase T-NNN verde "<qué hace>" --test "<cmd>"`: comprueba que los tests del ticket y sus vecinos pasen, controla que **estén intactos** desde el rojo, commitea `feat` (`chore` en `infra`) y sube. Si cambió un test, sale con código 2 y lista los archivos: restauralos con el comando que imprime, volvé a correr y devolvéselo al implementador. **Excepción:** si el ticket pide cambiar un archivo de soporte que vive en `tests/` (por ejemplo `conftest.py` o `fabricas.py`) y no los tests del rojo, pedile autorización a la persona y usá `--tocar-tests`; anotalo en el ticket.

## 3. 🔵 Refactor (todas menos `e2e` e `infra`)
- Lanzá `simplificador` con `model: <modelo_impl>`.
- `tickets.mjs fase T-NNN refactor "<qué simplificó>" --test "<cmd>"` (si no hubo cambios, no commitea).

## 4. 🔍 Review
- Lanzá `reviewer-ticket` (o `reviewer-seguridad` si el riesgo es alto) con `model: <modelo_review>`. Pasale los hashes del rojo y del verde y la cola de la salida de `fase`, para que no los reproduzca.
- Clasificá los hallazgos:
  - **bloqueante** e **importante** → se arreglan.
  - **menor** → se arreglan si son baratos; si no, quedan anotados en el ticket.
  - Si un hallazgo te parece falso, comprobalo leyendo el código antes de descartarlo.

## 5. 🔧 Fix
- Continuá con `SendMessage` al **implementador del verde**, en modo **fix**, pasándole los hallazgos a arreglar. Solo si ya no se puede continuar (por ejemplo, al retomar en otra sesión) lanzá uno nuevo con `model: <modelo_impl>`. Si un hallazgo dice que un test está mal y estás de acuerdo, autorizalo **explícitamente** a corregir ese test.
- `tickets.mjs fase T-NNN fix "hallazgos de la review" --test "<cmd>"`. Si autorizaste corregir un test, agregá `--tocar-tests`.
- Si hubo bloqueantes, una sola ronda más de review, solo sobre el diff del fix.

## 6. Checks
Acá corre **una sola vez la suite completa** de cada parte tocada, con lint, type-check y cobertura, usando los comandos de la §4 de la spec. En el backend es `uv run pytest -n auto --cov=…`, que incluye `test_contrato_m1.py` y sus equivalentes. Es el único lugar del flujo donde se corre la suite completa (T-154). Todo tiene que estar en verde antes de abrir el PR.
- Corré los checks cuando ningún subagente esté corriendo tests: con dos suites a la vez, la máquina se satura y aparecen timeouts falsos.
- Si algo falla acá y no falló en las fases, es una regresión fuera de los vecinos. Devolvésela al implementador del verde en modo fix, con `SendMessage`, y cerrala con `fase … fix --test "<los tests que fallaron>"`. Después volvé a correr los checks.
- Guardá la salida resumida: la usa el PR.

## 7. Cierre y PR
1. Completá «Notas de implementación» del ticket en pocas líneas: decisiones, desvíos, hallazgos que quedaron como menores y modelos que se usaron de verdad (incluido algún escalado).
2. `node 06-Desarrollo/herramientas/tickets.mjs fase T-NNN hecho`: marca el ticket, commitea `tickets: T-NNN hecho` (con las notas) y sube.
3. **Abrí el PR con la skill `pr`**, que arma la descripción con el formato del proyecto a partir del ticket, los commits, los tests y la review.
4. **Merge:**
   - **Esperá el CI en verde** con `gh pr checks <PR> --watch`. Corrélo en segundo plano, porque puede tardar más de 10 minutos.
     - `main` no exige checks: el plan gratuito de GitHub no protege ramas en repos privados. Por eso **no uses `--auto`**, porque mergea en el acto, sin esperar al CI.
     - Si el PR tiene conflictos con `main`, el CI no corre. En ese caso, traé `main` a la rama con `git merge origin/main`, nunca con rebase ni `--force`. Resolvé conservando ambos aportes; los archivos generados (`openapi.json`, `tipos.gen.ts`) se regeneran, no se mezclan a mano. Volvé a correr los checks del paso 6.
   - **riesgo normal:** con el CI en verde, `gh pr merge <PR> --merge`.
   - **riesgo alto:** no mergees. Pedile a la persona que otro integrante apruebe el PR en GitHub. Cuando esté aprobado (`gh pr view --json reviewDecision` da `APPROVED`) y el CI esté en verde, volvé a correr `/implementar-ticket T-NNN` y mergeá con `gh pr merge <PR> --merge`.
   - Siempre `--merge`, nunca squash: los commits rojo, verde y refactor quedan como evidencia para el PC3.
   - **No uses `--delete-branch` en el merge.** Si el merge falla (por ejemplo, «Base branch was modified» porque `main` cambió en ese momento), `gh` igual borra la rama remota, y eso **cierra el PR sin mergear**. Pasó con T-030. Si te pasa, recreá la rama con `git push origin HEAD` y reabrí el PR con `gh pr reopen <PR>`: la aprobación se conserva.
5. **Después del merge:**
   1. Confirmá que `gh pr view <PR> --json state` dé `MERGED`.
   2. Recién entonces borrá la rama remota: `git push origin --delete <rama>`.
   3. Corré `git checkout main && git pull --ff-only origin main && node 06-Desarrollo/herramientas/tickets.mjs publicar-grafo`.
   4. Borrá la rama local con `git branch -D <rama>`.

## Cuando algo falla
1. **Primero, depurar con método.** Si un implementador devuelve un verde fallido, pedile (con `SendMessage`) que invoque `debugging-and-error-recovery` y aplique el ciclo reproducir → localizar → reducir → arreglar → proteger antes de reintentar.
2. **Después, escalar.** Si el mismo paso falla **dos veces** con método, relanzalo con el modelo siguiente (haiku → sonnet → opus). Anotalo en el ticket.
3. **Si Opus falla dos veces**, o el ticket es ambiguo o contradice el vault, **pará y preguntale a la persona** con la skill `interview-me`. Si sale una decisión, registrala con la skill `documentation-and-adrs` como una `DEC-` en `05-Diseño/Decisiones/` (formalizada solo con la aprobación del equipo). Nunca elijas en silencio.
4. **Si aparece una falla fuera de lo que pide el ticket, se arregla acá mismo, sin crear un ticket** (DEC-0019).
   - Va en esta rama y en este PR: el `test-writer` escribe el test que la reproduce y el implementador del verde la arregla en modo fix, con `fase … fix --tocar-tests`.
   - Anotala en las «Notas de implementación» y en el PR.
   - Si es **funcionalidad nueva** y no una falla, no la hagas: avisale a la persona, y si acepta, se crea un ticket (`origen: hallazgo T-NNN`) desde `_plantillas/PL-Ticket.md`, en `main`, con `tickets.mjs validar`. Si no queda claro cuál de las dos es, preguntale.

## No hacer
- No commitear a `main` código de `src/`: el código entra solo por PR.
- No usar `--no-verify`, `push --force` ni `reset --hard` sobre trabajo ajeno.
- No marcar `hecho` con tests en rojo o checks fallando.
