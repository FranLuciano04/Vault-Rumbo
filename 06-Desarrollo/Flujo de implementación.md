---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 12/10/26
---
# Flujo de implementación

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Guía operativa de cómo implementamos Rumbo con agentes. El **porqué** y la rúbrica de modelos están en [[DEC-0014 Flujo de implementación con agentes]]. Estado en vivo: [[Tablero de tickets]] y [[Grafo de tickets]].

**En una línea:** la documentación del vault se convierte en una spec. La spec se corta en tickets agrupados por módulo. Cada uno toma un ticket libre con un semáforo en Git, y su Claude lo implementa con TDD usando subagentes. Al cerrar cada módulo, Codex lo revisa.

## Quién hace qué
| Actor | Rol |
|---|---|
| Cada integrante | Lanza los comandos y aprueba en las barreras |
| Orquestador (la sesión de Claude de cada uno, **Opus 5.5 con effort medio**) | Dirige el ticket: lanza los subagentes, verifica, commitea y abre el PR. No escribe código |
| Subagentes de `.claude/agents/` (`test-writer`; `implementador`, `-contrato`, `-front` o `-infra` según la capa; `simplificador`; `reviewer-ticket` o `reviewer-seguridad`) | Escriben los tests, implementan, simplifican y revisan, con el modelo que dice el ticket y sus skills de Addy **precargadas** |
| Codex | Revisa cada módulo terminado; se dispara a mano |
| `06-Desarrollo/herramientas/tickets.mjs` | Lo mecánico: claim, grafo, validación (cero tokens) |

## Fase 0: preparar (una sola vez)
1. **Spec** → `06-Desarrollo/Spec de implementación.md` (skill `spec-driven-development`): qué se construye, comandos, estructura, estilo, testing y límites. Enlaza al vault y no lo copia.
2. **Grill** (skill `interview-me`): los huecos de implementación se resuelven con el equipo y cada respuesta queda en una `DEC-`.
3. **Plan y tickets** (skill `planning-and-task-breakdown`) → `06-Desarrollo/Plan de implementación.md` y `06-Desarrollo/Tickets/`. El sistema completo, en módulos; cada CU cortado por capa (backend, web y mobile contra el contrato OpenAPI) más un ticket e2e por módulo. Al final, `tickets.mjs validar` y `tickets.mjs grafo`.

## Fase 1: el ciclo de un ticket
1. **`/tomar-ticket`:** pull, elige el primer ticket `disponible` y lo marca como suyo con un push a `main`. Si otro lo tomó un instante antes, el push choca y elige otro.
2. **`/implementar-ticket T-NNN`**, en la rama `feature/T-NNN-…`:
   - 🔴 **Rojo:** `test-writer` escribe los tests (nombrados por RF) → el orquestador comprueba que **fallen por el motivo correcto**.
   - 🟢 **Verde:** el implementador de la capa escribe el código mínimo → tests en verde **y** `git diff` sin cambios en los tests.
   - 🔵 **Refactor:** `simplificador` limpia el diff → siguen en verde.
   - 🔍 **Review:** `reviewer-ticket` (o `reviewer-seguridad` si el riesgo es alto), con un **modelo distinto** del implementador → hallazgos clasificados por severidad.
   - 🔧 **Fix:** el **mismo** implementador del verde arregla (se lo continúa, no se lanza otro) → lint, type-check y tests en verde.
   - Cada fase se cierra con `tickets.mjs fase T-NNN <fase> "<mensaje>" --test "<cmd>"`, que en un solo paso corre los tests (tienen que fallar en el rojo y pasar en el resto), controla que no se hayan tocado, commitea y sube.
   - Los tickets de `infra` no siguen TDD (se verifican ejecutando) y los de `e2e` no exigen el rojo.
3. **Cierre:** el PR, escrito con la skill **`pr`** (formato fijo), marca el ticket como `hecho`.
   - **Riesgo normal:** se mergea solo cuando pasa el CI.
   - **Riesgo alto** (auth, permisos, dinero, estados, proceso diario): espera la aprobación de otro integrante.
   - El merge libera el ticket y destraba los que dependían de él.

## Fase 2: barrera de módulo (`/cerrar-modulo MN`)
1. Con todos los tickets del módulo hechos, Claude escribe `06-Desarrollo/Reviews/MN — pedido de review.md`.
2. Un integrante le pide a Codex: «Leé `06-Desarrollo/Review de módulo — rol de Codex.md` y revisá el módulo MN según `06-Desarrollo/Reviews/MN — pedido de review.md`».
3. Codex deja `06-Desarrollo/Reviews/MN — review Codex.md`. Con `/cerrar-modulo MN`, Claude verifica cada hallazgo y convierte los confirmados en **tickets de arreglo**.
4. Con los arreglos y los e2e hechos, y la **aprobación del equipo**, se pone el tag `mod-N`. Se escribe una entrada en la [[Bitácora técnica]] y una línea en [[Estado del proyecto]].

Mientras tanto no se espera: los tickets de otros módulos con las dependencias cumplidas se pueden tomar.

## Estados de un ticket
`libre` → `tomado` → `hecho`, más `bloqueado` si algo externo lo frena. «Disponible» = libre y con todas sus dependencias hechas.

## Reglas de convivencia
- Un ticket por persona a la vez.
- Si un ticket tomado pasa 48 h sin commits en su rama, otro puede liberarlo (`tickets.mjs vencidos`, después `liberar`), avisando.
- Nadie edita a mano `estado`, `asignado`, `tomado_el` ni `rama`, ni el [[Grafo de tickets]].
- El código entra a `main` solo por PR; los claims y las notas, por commits directos.
- Una contradicción con el vault se resuelve con una `DEC-`, nunca en silencio.

## Comandos del script
```bash
node 06-Desarrollo/herramientas/tickets.mjs disponibles
node 06-Desarrollo/herramientas/tickets.mjs tomar T-NNN
node 06-Desarrollo/herramientas/tickets.mjs vencidos
node 06-Desarrollo/herramientas/tickets.mjs liberar T-NNN <motivo>
node 06-Desarrollo/herramientas/tickets.mjs fase T-NNN <rojo|verde|refactor|fix|hecho> "<mensaje>" [--test "<cmd>"] [--tocar-tests]
node 06-Desarrollo/herramientas/tickets.mjs validar
node 06-Desarrollo/herramientas/tickets.mjs grafo
node 06-Desarrollo/herramientas/tickets.mjs publicar-grafo
node 06-Desarrollo/herramientas/tickets.mjs modulo MN
```

**Códigos de salida de `fase`** (en todos, sin commitear): `2` cambiaron archivos de test desde el rojo; `3` los tests pasan en el rojo; `4` los tests fallan en una fase que necesita verde; `5` el comando de `--test` no se pudo ejecutar (código 126, 127 o 9009: típicamente un programa fuera del PATH, como `pnpm`; usar `corepack pnpm`). Con el `5` ningún test corrió, así que no cuenta ni como rojo ni como verde. También sale con `5` si el comando no terminó (lo mató una señal o superó los 64 MB de salida). Encadenar los comandos de `--test` con `&&`, nunca con `;`: solo se ve el código del último.

## Auditoría semanal de dependencias (T-150)
- **Quién mira el aviso:** Nahuel Viniegra. Es quien edita el `cron` de `.github/workflows/auditoria-semanal.yml`, y por eso quien recibe la notificación de GitHub: la regla de GitHub para workflows programados la envía a quien modificó por última vez la sintaxis `cron` ([documentación de GitHub Actions, evento `schedule`](https://docs.github.com/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)).
- **Si la corrida falla:** revisar el job (`pip-audit` o `pnpm-audit`) en la pestaña Actions y decidir:
  - Vulnerabilidad real: crear un ticket con `origen: hallazgo T-150` y actualizar la dependencia en el lockfile.
  - Falso positivo o riesgo aceptado: agregar la excepción comentada, con su motivo: `audit.ignore` en `src/pnpm-workspace.yaml` (pnpm) o `--ignore-vuln <ID>` en el workflow (pip-audit).
- **Cambio de responsable:** si otra persona edita el `cron`, pasa a recibir el aviso de GitHub. Debe actualizar esta sección y avisar al equipo.

## Dónde queda cada cosa
| Qué | Dónde |
|---|---|
| Código | `src/` (`backend/`, `apps/web/`, `apps/mobile/`, `packages/shared/`) |
| Spec, plan y tickets | `06-Desarrollo/` y `06-Desarrollo/Tickets/` (plantilla [[PL-Ticket]]) |
| Grafo y tablero | [[Grafo de tickets]] y [[Tablero de tickets]] |
| Reviews de Codex | `06-Desarrollo/Reviews/` |
| Decisiones | `05-Diseño/Decisiones/DEC-` |
| Skills y subagentes | `.claude/skills/` y `.claude/agents/` (llegan a los tres con un pull) |
