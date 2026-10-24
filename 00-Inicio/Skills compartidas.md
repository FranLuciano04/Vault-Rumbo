---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 22/10/26
---

# Skills compartidas

tags:: #tipo/referencia #estado/formalizado

> Catálogo y guía de distribución de las skills usadas por el equipo de Rumbo. La meta es que una capacidad necesaria no quede escondida en la cuenta o computadora de una sola persona.

## Cómo funciona

Las skills propias del proyecto se guardan en `.claude/skills/<nombre>/SKILL.md` y se versionan con Git. Cuando Paloma, Nahuel o Francisco hacen pull, Claude Code las descubre automáticamente; no necesitan una instalación separada.

Los plugins, las skills sincronizadas desde una cuenta y otras dependencias externas no siempre pueden copiarse al repositorio. Esas se registran en el catálogo con su fuente y comando de instalación. Si una está marcada como **requerida** y falta, Claude debe avisarlo al inicio de la sesión o antes de la tarea que dependa de ella.

> Después del primer pull que crea `.claude/skills/`, reiniciar Claude Code una vez si la sesión ya estaba abierta. Luego los cambios en `SKILL.md` se detectan en vivo.

## Catálogo

| Skill | Tipo | Estado | Versión | Ubicación o fuente | Invocación | Finalidad |
|---|---|---|---|---|---|---|
| gestionar-skills | proyecto | requerida | 1.0.0 | `.claude/skills/gestionar-skills/SKILL.md` | `/gestionar-skills` o automática | Incorporar, registrar, verificar y compartir skills |
| tomar-ticket | proyecto | requerida | 1.0.0 | `.claude/skills/tomar-ticket/SKILL.md` | `/tomar-ticket` o «dame un ticket» | Semáforo de tickets: tomar, liberar y ver los vencidos ([[DEC-0014 Flujo de implementación con agentes\|DEC-0014]]) |
| implementar-ticket | proyecto | requerida | 1.4.0 | `.claude/skills/implementar-ticket/SKILL.md` | `/implementar-ticket T-NNN` | Orquestar el TDD de un ticket con subagentes y cerrarlo con un PR. 1.1.0 (22/10/26, Francisco): espera el CI sin `--auto`, trae `main` a la rama con un merge si hay conflictos, mergea sin `--delete-branch` y borra la rama recién con el PR en `MERGED` (hallazgo T-030). 1.2.0 (22/10/26, Nahuel): código 5 de `fase` (el comando de tests no arrancó o no terminó: lo arregla el orquestador), encadenar con `&&` (T-152). 1.3.0 (23/10/26, Nahuel): las fases corren solo los tests del ticket y sus vecinos directos; la suite completa corre una vez en el paso 6 (T-154, solución 4; también `implementador` y `simplificador`). 1.4.0 (24/10/26, Paloma): una falla fuera del ticket se arregla en la misma rama y el mismo PR, sin crear un ticket ([[DEC-0019 Las fallas se arreglan al encontrarlas\|DEC-0019]]) |
| pr | proyecto | requerida | 1.0.0 | `.claude/skills/pr/SKILL.md` | `/pr T-NNN` o al cerrar `/implementar-ticket` | Escribir y abrir el PR de un ticket con el formato fijo del proyecto |
| review-de-ticket | proyecto | requerida | 1.0.0 | `.claude/skills/review-de-ticket/SKILL.md` | precargada por `reviewer-ticket` y `reviewer-seguridad` | Criterios y formato de salida de la review de un ticket |
| cerrar-modulo | proyecto | requerida | 1.1.0 | `.claude/skills/cerrar-modulo/SKILL.md` | `/cerrar-modulo MN` | Barrera de módulo: pedido de review a Codex, hallazgos arreglados en ramas `fix/MN-…`, tag `mod-N`. 1.1.0 (24/10/26, Paloma): los hallazgos confirmados se arreglan sin crear tickets ([[DEC-0019 Las fallas se arreglan al encontrarlas\|DEC-0019]]) |

### Copiadas de addyosmani/agent-skills
Tipo `proyecto`, licencia MIT (`.claude/skills/LICENSE-agent-skills`), origen [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) @ `1be8e34` (10/10/26). Cada `SKILL.md` lleva arriba un bloque **«Adaptación Rumbo»** que manda sobre el texto original; las referencias compartidas están en `.claude/references/`. Incorporadas el 12/10/26 por Nahuel, aprobadas por el equipo en [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Para actualizarlas: traer la versión nueva con `/gestionar-skills`, conservar el bloque de adaptación y anotar el commit nuevo acá.

> Los subagentes de `.claude/agents/` **precargan** sus skills con el campo `skills:` del frontmatter (el contenido completo se inyecta al arrancar). La tabla de qué subagente precarga cuál está en `.claude/skills/implementar-ticket/SKILL.md`.

| Skill | Estado | Uso en el flujo |
|---|---|---|
| spec-driven-development | requerida | Fase 0: spec de implementación |
| interview-me | requerida | Fase 0: grill de los huecos de implementación |
| planning-and-task-breakdown | requerida | Fase 0: plan y tickets |
| test-driven-development | requerida | Rojo, verde y refactor de cada ticket |
| incremental-implementation | requerida | Implementación por tajadas y commits por fase |
| source-driven-development | requerida | Verificar contra la documentación oficial del stack; a demanda, ante una librería nueva o una API dudosa (14/10/26) |
| code-review-and-quality | requerida | Review de cada ticket |
| security-and-hardening | requerida | Tickets de riesgo alto (`reviewer-seguridad`) — adaptación alineada con [[DEC-0016 Autenticación con Firebase\|DEC-0016]] el 14/10/26 |
| api-and-interface-design | requerida | Ticket de contrato de cada módulo (`implementador-contrato`) — sumada el 13/10/26 |
| frontend-ui-engineering | requerida | Tickets de web y mobile (`implementador-front`) — sumada el 13/10/26 |
| debugging-and-error-recovery | requerida | Cuando un verde falla, antes de escalar de modelo; la invoca el implementador a demanda (14/10/26) — sumada el 13/10/26 |
| code-simplification | requerida | Paso de refactor (`simplificador`) — sumada el 13/10/26 |
| documentation-and-adrs | opcional | Decisiones (mapeadas a las `DEC-`) y documentación |
| ci-cd-and-automation | requerida | Tickets de `infra` (`implementador-infra`): pipeline de GitHub Actions |
| shipping-and-launch | requerida | Tickets de despliegue (M10), a demanda de `implementador-infra` |
| performance-optimization | opcional | PC3: RNF de rendimiento |
| observability-and-instrumentation | opcional | PC3: logs y diagnóstico |

## Dependencias externas (no son skills)
| Herramienta | Estado | Fuente / instalación | Para qué |
|---|---|---|---|
| pandoc | requerida al compilar entregables | `winget install --id JohnMacFarlane.Pandoc` (Windows) · https://pandoc.org/installing.html | Generar los `.docx` entregables desde los `.md`. Ver [[Entregables — índice]] y [[Especificación de casos de uso — flujo]]. Solo la necesita quien compila el entregable. |
| Node.js (npx) | requerida | https://nodejs.org (LTS) · trae `npx` | Correr `06-Desarrollo/herramientas/tickets.mjs` (semáforo y grafo de tickets) y renderizar los diagramas Mermaid con `npx @mermaid-js/mermaid-cli` (motor ELK). |
| GitHub CLI (`gh`) | requerida para implementar | `winget install --id GitHub.cli` y después `gh auth login` | Abrir y mergear los PR de los tickets (`/implementar-ticket`). |
| Firebase CLI (`firebase-tools`) | requerida para implementar | `npx firebase-tools` (no hace falta instalarlo global). Comando y config: `src/infra/firebase.md` | Firebase Auth Emulator para el desarrollo local y los e2e ([[DEC-0016 Autenticación con Firebase|DEC-0016]]). El emulador de Auth corre en Node y **no necesita Java 17**: el 19/10 arrancó en la PC de Paloma, que tiene Java 8 (T-005). Java 11 o más solo hace falta para otros emuladores (Firestore, Realtime Database), que Rumbo no usa. |
| Codex (OpenAI) | requerida para quien dispara la review de módulo | https://developers.openai.com/codex | Revisor externo de cada módulo según [[Review de módulo — rol de Codex]]. |
| pptxgenjs | requerida al regenerar el deck | `npm install pptxgenjs` (en cualquier carpeta; al correr, `NODE_PATH` apunta a su `node_modules`) | Generar el deck del PC1 con `07-Entregables/build/deck-pc1.js`. Solo lo necesita quien regenera la presentación. |

> **Sin Python:** la plantilla estética del `.docx` se genera con `07-Entregables/build/make-reference.ps1` (**PowerShell**, incluido en Windows, sin dependencias). No hace falta instalar Python.

## Qué debe hacer Claude en cada sesión

1. Hacer `git pull` según `CLAUDE.md`, porque así llegan las skills de proyecto nuevas.
2. Leer este catálogo y comparar las entradas **requeridas** con las skills disponibles en la sesión.
3. Si falta una skill de proyecto, informar que el checkout está incompleto o que hace falta reiniciar Claude Code.
4. Si falta una dependencia externa, avisar con este formato:

> Falta la skill `<nombre>`, requerida para `<motivo>`. Fuente: `<fuente oficial>`. Instalación: `<comando o pasos>`. Necesito autorización para instalarla en esta máquina o cuenta.

5. Continuar sin la skill únicamente si la tarea puede completarse correctamente y dejar explícita la limitación.

## Cómo agregar o instalar una skill

Invocar `/gestionar-skills` o pedirle a Claude que siga este procedimiento:

1. Revisar origen, licencia, versión, permisos y dependencias.
2. Preferir una skill de proyecto para todo procedimiento específico de Rumbo.
3. Guardar la skill y todos sus recursos bajo `.claude/skills/<nombre>/`.
4. Si es externa y no se puede versionar, registrar la fuente oficial y el comando reproducible de instalación.
5. Agregar o actualizar su fila en el catálogo.
6. Comprobar que aparezca en `/skills` y probar una invocación real.
7. Actualizar `CLAUDE.md` solo si la skill cambia el protocolo general de todas las sesiones.
8. Crear un commit que incluya la skill y el catálogo, hacer pull y subirlo a GitHub.

## Datos obligatorios del registro

Para cada skill dejar asentado:

- Nombre y finalidad.
- Tipo: `proyecto`, `plugin`, `sincronizada` o `personal`.
- Estado: `requerida` u `opcional`.
- Versión, tag o commit de origen.
- Ruta dentro del repositorio o fuente oficial.
- Comando de instalación cuando corresponda.
- Forma de invocación y condiciones de activación.
- Responsable y fecha de incorporación.

## Criterios de seguridad

- Revisar cualquier `allowed-tools`, script o comando dinámico antes de incorporar la skill.
- No guardar tokens, cookies, claves API ni credenciales dentro de una skill.
- No copiar skills personales o de terceros sin autorización y licencia compatible.
- Usar versiones o commits identificables para que todo el equipo ejecute la misma variante.
- Eliminar una skill mediante un commit explícito y actualizar el catálogo; no dejar entradas huérfanas.

## Referencias oficiales

- [Skills de Claude Code](https://code.claude.com/docs/en/slash-commands)
- [Plugins de Claude Code](https://code.claude.com/docs/en/plugins)
