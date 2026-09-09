---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---

# 🪙 Contexto eficiente con Claude — ahorro de tokens

> **Idea central (context engineering 2026):** el cuello de botella no es cuánto sabe Claude, sino **cuánto contexto le cabe útil a la vez**. Cargar todo de una degrada la calidad ("context rot") y quema tokens. La estructura de este vault está diseñada para darle a Claude **lo justo, cuando lo necesita**. Este documento explica *por qué* cada decisión del vault ya ahorra tokens y cómo trabajar en consecuencia.

Anthropic resume la regla como **"quitar restricciones, no agregarlas"**: llegaron a remover >80% del system prompt de Claude Code sin perder rendimiento. Traducción para nosotros: **notas cortas, cargadas bajo demanda, con buenos nombres** > un mega-documento con todo.

---

## Las 6 prácticas y cómo el vault ya las aplica

### 1. Progressive disclosure (revelación progresiva)
No se carga todo el proyecto: se entra por un **resumen** (MOC) y se baja al detalle solo si hace falta.
- **En el vault:** `🏠 Rumbo — Home` → `MOC — Modelo de dominio` → entidad puntual. Tres capas.
- **Cómo trabajar con Claude:** empezá dándole el MOC o `Claude Code — memoria del proyecto.md`, no las 40 notas. Que **pida** la nota que necesite.

### 2. Just-in-time retrieval (traer solo cuando se usa)
Guardar **punteros ligeros** (rutas, IDs, enlaces), no el contenido completo.
- **En el vault:** los enlaces `[[ ]]` y los IDs (`CU-01`, `DEC-0001`) son punteros. Claude Code puede listar y leer *un* archivo por ruta en vez de que le peguemos texto.
- **Cómo trabajar:** en vez de copiar una decisión al chat, decí "leé `05-Diseño/Decisiones/DEC-0001`". Con Claude Code, dejá que use `head`/`grep`/lectura de archivo puntual en lugar de volcar carpetas enteras.

### 3. Metadata como contexto implícito
Carpetas, nombres y fechas ya son señales: Claude infiere qué es una nota **sin leerla entera**.
- **En el vault:** carpetas por fase (`03-Dominio/`), prefijos (`CU-`, `DEC-`), frontmatter (`estado`, `modulo`). Un `grep` de frontmatter responde "¿qué falta para PC1?" sin abrir ningún cuerpo de nota.
- **Cómo trabajar:** confiá en los prefijos y tags; no le expliques a Claude lo que el nombre ya dice.

### 4. Structured note-taking (memoria externa)
Escribir el estado y las decisiones **fuera** de la conversación, en archivos concisos.
- **En el vault:** `Estado del proyecto.md`, la bitácora y las `DEC-` **son** esa memoria persistente. Cada sesión nueva de Claude arranca leyéndolas en vez de re-derivar todo.
- **Cómo trabajar:** al terminar una sesión importante, que Claude vuelque el resumen a `Estado del proyecto` o a una `DEC-`. Así la próxima sesión cuesta pocos tokens de "puesta al día".

### 5. Compaction (compactar al llegar al límite)
Cuando una conversación se llena, resumir y reiniciar conservando solo decisiones y pendientes.
- **En el vault:** las `DEC-` y los MOC **son** la forma compactada del razonamiento; no hace falta re-explicar por qué modelamos algo.
- **Cómo trabajar:** no arrastres chats gigantes; cerrá con un resumen al vault y abrí sesión nueva apuntando a ese resumen.

### 6. Sub-agentes especializados
Tareas acotadas en ventanas de contexto limpias que devuelven un resumen corto (~1–2k tokens), sin contaminar la principal.
- **En el vault:** el dominio ya está partido por módulo y entidad → una tarea ("revisá el módulo Economía") se resuelve con esas pocas notas.
- **Cómo trabajar:** para búsquedas amplias o revisiones de un módulo, pedí un sub-agente que lea *ese* subconjunto y devuelva conclusiones, no el volcado.

---

## `CLAUDE.md` del repo de código = reflejo lean del vault

Cuando arranque el código (PC2), el `CLAUDE.md` del repo **no repite el vault**: es un puntero corto (gotchas + convenciones + hacia dónde ir).

- Mantenelo **liviano y humano**; no expliques lo que Claude descubre solo leyendo el árbol de archivos.
- Detalle complejo → va a una **skill** o a una nota del vault que se referencia, no incrustado.
- **Fuente de verdad = vault.** `CLAUDE.md` solo apunta: *"Modelo de dominio y decisiones en `Vault-Rumbo/`. Español (Argentina), moneda ARS, fechas dd/mm/aa, comisión automática = RN-01."*

Ver [[Claude Code — memoria del proyecto]] para el contenido concreto de ese reflejo.

---

## Checklist rápido (pegar en la sync)

- [ ] ¿Le di a Claude un **MOC/resumen** en vez de todo el vault?
- [ ] ¿Usé **rutas/IDs** como punteros en lugar de copiar contenido al chat?
- [ ] ¿Las notas nuevas son **atómicas y bien nombradas** (así se cargan sueltas)?
- [ ] ¿Volqué el resultado de la sesión a **memoria externa** (`Estado del proyecto`/`DEC-`)?
- [ ] ¿El `CLAUDE.md` del código sigue siendo un **puntero corto**, no una copia?

---

### Fuentes
- [Effective context engineering for AI agents — Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [The new rules of context engineering for Claude 5 models — Claude/Anthropic](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models)
- [Progressive disclosure in AI agents — MindStudio](https://www.mindstudio.ai/blog/progressive-disclosure-ai-agents-context-management)
- [Context engineering best practices for AI-powered dev teams (2026) — Packmind](https://packmind.com/context-engineering-ai-coding/context-engineering-best-practices/)
