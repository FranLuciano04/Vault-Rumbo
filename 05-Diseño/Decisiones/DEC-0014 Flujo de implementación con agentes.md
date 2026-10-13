---
tipo: decision
estado: formalizado
modulo: [desarrollo]
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 12/10/26
supersede:
actualizado: 12/10/26
---
# DEC-0014 Flujo de implementación con agentes

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Aprobada por el equipo completo el 12/10/26** (Francisco, Nahuel y Paloma, reunidos), en la sesión de Claude Code de Nahuel que diseñó el flujo.

## Contexto
Con el análisis y el diseño cerrados en el PC1, empieza la implementación del **sistema completo** (los 31 CU, web y mobile). Lo vamos a hacer tres personas, cada una con su propia sesión de Claude Code. Hacía falta un proceso que:
- convierta la documentación del vault en trabajo implementable sin duplicarla;
- reparta tareas independientes sin que dos personas tomen la misma;
- garantice calidad con TDD y con reviews hechas por un modelo distinto del que escribió el código;
- asigne cada tarea al modelo justo, para cuidar los tokens;
- deje trazabilidad CU → RF → test para el PC3 (testing y documentación).

Se tomó como base el flujo de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT): spec → plan → build → test → review → ship.

## Decisión

### 1. Fase 0: spec, grill y plan (una sola vez)
- **Spec de implementación** (`06-Desarrollo/Spec de implementación.md`), con el formato de `spec-driven-development`: objetivos, comandos, estructura, estilo, testing y límites. **Enlaza** al vault (CU, RF, ER, SQL, OpenAPI, ARQ) y no lo copia.
- **Grill** con `interview-me` sobre los huecos de implementación. Cada respuesta que fije algo nuevo va a una `DEC-`.
- **Plan** (`06-Desarrollo/Plan de implementación.md`) con todos los módulos y sus **tickets** (`06-Desarrollo/Tickets/T-NNN <título>.md`, plantilla [[PL-Ticket]]).

### 2. Tickets
- Tamaño **XS, S o M** (como máximo 3 criterios de aceptación). Un ticket que da L se parte.
- **Corte por capa con contrato:** por cada CU o flujo, un ticket de **backend** (API + pytest), uno de **web** y uno de **mobile**. Los de web y mobile trabajan contra los tipos generados del OpenAPI con mocks (MSW), así que pueden avanzar en paralelo. Cada módulo suma un ticket **e2e** (Playwright o Maestro) que integra todo.
- Cada ticket declara `depende_de`, `riesgo` (`normal` o `alto`), la **trazabilidad** (CU, RF, RN, DEC) y un **modelo por rol** (`modelo_tests`, `modelo_impl`, `modelo_review`).
- Los tests se nombran por requisito (`test_rf070_…`, `describe('RF-070 …')`).

### 3. Bloqueo: dependencias y barreras de revisión
Un ticket se puede tomar cuando **todas sus dependencias están hechas**, aunque sean de otro módulo. El módulo funciona como **barrera de revisión**, no como bloqueo estricto (ver punto 6).

### 4. Semáforo con Git
- El estado vive en el frontmatter del ticket (`libre → tomado → hecho`, más `bloqueado`) y lo maneja `06-Desarrollo/herramientas/tickets.mjs`.
- **Tomar** es un commit en `main` subido con `push`. Si otra persona empujó antes, el push se rechaza, el rebase choca en el mismo ticket y el claim se descarta: Git hace de *compare-and-swap*, así que nadie puede tomar el mismo ticket dos veces.
- **Un ticket por persona** a la vez. Si un ticket tomado pasa **48 h** sin actividad (commits en su rama), otro integrante puede liberarlo, dejando el motivo en el commit.
- El código va en una rama `feature/T-NNN-…` y entra por PR. El PR marca el ticket como `hecho`, así que el merge lo libera en el mismo acto.
- Comandos: `/tomar-ticket`.

### 5. TDD de cada ticket con subagentes
El **orquestador** es la sesión principal de cada persona, en **Opus 5.5 con effort medio**. No escribe el código: dirige, verifica y commitea (`/implementar-ticket`).

| Paso | Subagente (`.claude/agents/`) | Control del orquestador |
|---|---|---|
| 🔴 Rojo | `test-writer` | Los tests fallan, y por el motivo correcto |
| 🟢 Verde | implementador **según la capa**: `implementador` (backend y shared), `implementador-contrato`, `implementador-front` (web y mobile) o `implementador-infra` | Tests en verde y **archivos de test intactos** (`git diff`) |
| 🔵 Refactor | `simplificador` | Siguen en verde y los tests intactos |
| 🔍 Review | `reviewer-ticket`, o `reviewer-seguridad` si el riesgo es alto (**modelo distinto del implementador**) | Clasifica los hallazgos por severidad |
| 🔧 Fix | el mismo implementador (modo fix) | Tests, lint y type-check en verde |

- **Skills precargadas** (actualizado el 13/10/26): cada subagente declara sus skills en el campo `skills:` de su definición y Claude Code inyecta su contenido completo al arrancarlo, así que no dependen de que el modelo las lea. La tabla de qué subagente precarga qué skill está en `.claude/skills/implementar-ticket/SKILL.md`.
- Los tickets de **`infra`** no siguen TDD: se verifican ejecutando lo que construyen. Los de **`e2e`** no exigen el rojo.
- El PR de cada ticket se escribe con la skill **`pr`**, con un formato fijo: objetivo, trazabilidad, evidencia TDD, tests y cobertura, review, modelos usados y checklist.

- En el **front** se aplica TDD a la lógica (hooks, esquemas zod y componentes con lógica). Los e2e son tickets propios de la barrera del módulo.
- **Merge:** si el ticket es de riesgo normal y el CI pasa, se mergea solo. Si es de **riesgo alto** (autenticación, permisos, dinero, estados, proceso diario), necesita la aprobación de otro integrante en GitHub. Siempre con merge commit, para que la secuencia rojo-verde-refactor quede como evidencia.

### 6. Barrera de módulo con un modelo externo
Cuando todos los tickets de un módulo están hechos, `/cerrar-modulo` prepara un pedido de review. **Codex** (OpenAI), disparado a mano por un integrante, lo revisa siguiendo [[Review de módulo — rol de Codex]] y deja sus hallazgos con formato fijo en `06-Desarrollo/Reviews/`. Claude verifica cada hallazgo, convierte los confirmados en **tickets de arreglo** del mismo módulo y, con la **aprobación humana**, cierra el módulo con el tag `mod-N`.

### 7. Rúbrica de modelos por rol

| Modelo | Hace | No hace nunca |
|---|---|---|
| **Haiku 5.5** | Lo mecánico, donde la respuesta la fija un patrón existente o una instrucción exacta: configuración (ruff, ESLint, `tsconfig`, CI desde plantilla), ABM de catálogos **después** del primero, tipos y mocks generados desde el OpenAPI, fixtures, arreglos puntuales de una review | Tests de lógica de negocio, reviews, nada con reglas del dominio ni de riesgo alto |
| **Sonnet 5.5** | Features estándar, la mayoría de los tests, la review de tickets implementados por Opus, el primer ABM que fija el patrón | Implementar lo de riesgo alto |
| **Opus 5.5** | Orquestador. Lógica delicada: estados de `Viaje`, `Pago`, `Oportunidad` y `Cotización`; multimoneda; comisión ([[RN-01 Comisión automática]]); autorización por fila ([[DEC-0005 Autenticación y modelo de roles|DEC-0005]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]); idempotencia del proceso diario; la review de lo que implementan Sonnet o Haiku | — |

- `modelo_review` ≠ `modelo_impl`, y nunca Haiku. Si el riesgo es alto, `modelo_impl` es Opus y los tests no los escribe Haiku. El script `tickets.mjs validar` controla estas reglas.
- **Escalado:** si un subagente falla dos veces en el mismo paso, se relanza con el modelo siguiente (haiku → sonnet → opus). Si Opus falla dos veces, se le pregunta a la persona.
- **Tokens:** cada subagente recibe solo su ticket y las notas que el ticket enlaza; el orquestador no carga esas notas; lo mecánico sin inteligencia (claim, grafo, checks) lo hacen scripts.

### 8. Grafo y tablero
- [[Grafo de tickets]] es un archivo **generado** desde el frontmatter de los tickets: un subgrafo por módulo y un color por estado. Nadie lo edita a mano, así que no genera conflictos; si choca en un rebase, el script lo regenera.
- [[Tablero de tickets]] es una consulta Dataview que muestra en vivo quién tiene qué.

### 9. Skills de Addy Osmani
Se copiaron a `.claude/skills/`, fijadas al commit `1be8e34`, con su licencia y un bloque «Adaptación Rumbo» arriba de cada una: `spec-driven-development`, `planning-and-task-breakdown`, `interview-me`, `test-driven-development`, `incremental-implementation`, `source-driven-development`, `code-review-and-quality`, `security-and-hardening`, `documentation-and-adrs` (mapeada a las `DEC-`), `ci-cd-and-automation`, `shipping-and-launch`, `performance-optimization` y `observability-and-instrumentation` (estas dos, para el PC3). El 13/10/26 se sumaron `api-and-interface-design`, `frontend-ui-engineering`, `debugging-and-error-recovery` y `code-simplification`. Las propias del flujo son `tomar-ticket`, `implementar-ticket`, `cerrar-modulo`, `review-de-ticket` y `pr`. Catálogo en [[Skills compartidas]].

### 10. Código en `src/`
El código vive en el mismo repositorio del vault, dentro de `src/`. Esto **ajusta la estructura** de [[DEC-0001 Stack tecnológico|DEC-0001]]: `src/apps/web`, `src/apps/mobile`, `src/packages/shared` y `src/backend`. Obsidian ignora `src/`.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Bloqueo estricto por módulo | Simple de seguir | Con tres personas deja tiempos muertos esperando al último ticket | ❌ |
| Dependencias + barrera de revisión | Paralelismo real, con la review de módulo igual garantizada | El grafo es más complejo | ✅ |
| GitHub Issues o Projects como semáforo | Interfaz conocida | Asignar no es atómico, y queda fuera del vault | ❌ |
| Frontmatter + push a `main` | Atómico, versionado y visible en Obsidian | Commits de claim en `main` | ✅ |
| Ticket vertical completo (backend + web) | Lo recomienda Addy | Mezcla dos stacks de test y los tickets quedan M/L | ❌ |
| Ticket por capa con contrato | Tickets chicos y paralelos | Hace falta el ticket e2e de integración | ✅ |
| Review de módulo con otro Claude | Todo dentro de Claude Code | Sesgos de la misma familia de modelos | ❌ |
| Review de módulo con Codex | Mirada de otra familia de modelos | Se dispara a mano | ✅ |
| Plugin del marketplace de Addy | Se actualiza solo | Sin adaptar, y cada uno con su versión | ❌ |
| Copiar un subconjunto al repo | La misma versión para los tres, adaptada | Las actualizaciones se traen a mano | ✅ |
| Repositorio de código aparte | Separa vault y código | Dos repos que sincronizar, y el semáforo lejos del código | ❌ |

## Justificación
El vault ya es la fuente de verdad: el flujo lo usa como especificación en vez de copiarlo. El push a `main` da exclusión mutua sin infraestructura extra. Separar los roles de los subagentes (quien escribe los tests no implementa, quien implementa no revisa) y controlar cada paso con comandos y no con la palabra del modelo hace que el TDD sea real. La rúbrica pone a Opus solo donde el error es caro. La review de Codex en cada barrera suma una mirada independiente sin frenar el trabajo diario.

## Impacto
- Afecta a [[DEC-0001 Stack tecnológico|DEC-0001]] (estructura bajo `src/`), [[Bitácora técnica]] (una entrada por módulo cerrado) y [[Claude Code — memoria del proyecto]].
- Notas nuevas: [[Flujo de implementación]], [[Review de módulo — rol de Codex]], [[Grafo de tickets]], [[Tablero de tickets]] y [[PL-Ticket]].
- Herramientas que hacen falta: Node.js (script de tickets), `gh` (los PR) y Codex (para quien dispara la review de módulo).
- Respeta el alcance: sin pagos online, sin publicación automática en redes, sin GDS ni facturación.

## Decisores y fecha
- Propuesta: Nahuel, con Claude Code.
- Decisores: Francisco, Nahuel y Paloma. **Aprobada: 12/10/26.**

## Vínculo con el código (a partir de PC2)
- Rama: `main` (proceso). Commits: el de esta decisión.
