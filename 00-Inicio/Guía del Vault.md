---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---

# 📚 Guía del Vault — Rumbo

> **Qué es esto:** el manual único de cómo trabajamos el conocimiento del proyecto **Rumbo** (CRM para agencias de turismo PyME) dentro de Obsidian. Si tenés una duda de "dónde va esto", "cómo lo nombro" o "cómo edito sin pisar a otro", la respuesta está acá.
>
> **Regla de oro:** *la mejor estructura es la que los tres usamos sin fricción.* Ante la duda, elegí lo simple. Este vault es la memoria compartida del equipo (Paloma, Nahuel, Francisco) y la fuente de verdad para PC1 → PC2 → PC3.

**Índice**
1. [[#1 · Estructura de carpetas y nomenclatura]]
2. [[#2 · Enlaces y tags]]
3. [[#3 · Workflow colaborativo]]
4. [[#4 · Plantillas]]
5. [[#5 · Flujo de trabajo por fase]]
6. [[#6 · Ritmo y mantenimiento]]
7. [[#7 · Contexto eficiente con Claude (ahorro de tokens)]]

---

## 1 · Estructura de carpetas y nomenclatura

### 1.1 Principio: carpeta por *fase del pensamiento*, no por persona ni por fecha

La estructura sigue el flujo real del proyecto —**relevamiento → análisis → dominio → módulos → diseño → desarrollo**— porque así es predecible: sabés en qué carpeta buscar según *qué tipo de trabajo* estás haciendo. Las carpetas con prefijo `_` (guion bajo) son de soporte y quedan siempre arriba/abajo del explorador.

```
Vault-Rumbo/
├── 00-Inicio/                     ← puerta de entrada y estado del proyecto
│   ├── 🏠 Rumbo — Home.md          (MOC raíz: enlaza a todo)
│   ├── Guía del Vault.md           (este archivo)
│   ├── Estado del proyecto.md      (dónde estamos hoy, qué falta para el próximo PC)
│   └── Cronograma y PC.md
│
├── 01-Relevamiento/               ← fuente de verdad del NEGOCIO (casi congelado)
│   ├── Relevamiento — Fuente de verdad.md
│   ├── Objetivos del sistema.md
│   ├── Alcance y fuera de alcance.md
│   └── Actores.md
│
├── 02-Analisis/                   ← QUÉ hace el sistema
│   ├── MOC — Casos de uso.md
│   ├── Casos de uso/
│   │   ├── CU-01 De la consulta a la venta.md
│   │   ├── CU-02 Registrar cliente.md
│   │   └── CU-03 Emitir cotización.md
│   └── Reglas de negocio/
│       ├── RN-01 Comisión automática.md
│       └── RN-02 Alertas de vencimiento.md
│
├── 03-Dominio/                    ← CÓMO se modela el mundo (10 entidades)
│   ├── MOC — Modelo de dominio.md
│   ├── Entidades/
│   │   ├── Usuario.md      Cliente.md     Oportunidad.md
│   │   ├── Viaje.md        Pago.md        Hotel.md
│   │   ├── Reseña.md       Alerta.md      Cotización.md
│   │   └── ContenidoRed.md
│   └── Diagramas/                 ← TODOS los diagramas del modelo UML
│       ├── DGM — Diagrama de clases.md   (Mermaid classDiagram)
│       ├── DGM-ER.md                     (Mermaid erDiagram)
│       ├── mermaid-config.json           ← configuración de render de clases y ER
│       ├── Clases/                       ← PNG del diagrama de clases
│       ├── DER/                          ← PNG del ER
│       ├── Estados/                      ← EST-*, uno por clase con máquina de estados (+ img/)
│       ├── Actividad/                    ← DGM-ACT-*, uno por flujo clave (+ img/)
│       └── Secuencia/                    ← DGM-SEC-*: la vista de negocio (Figura 1 del relevamiento)
│                                           y los de análisis, con las clases como participantes (+ img/)
│
├── 04-Modulos/                    ← una nota-MOC por módulo funcional
│   ├── MOD-Clientes.md            MOD-Viajes.md        MOD-Economia-Pagos.md
│   ├── MOD-Alertas.md             MOD-Cotizaciones.md  MOD-Catalogo-Hoteles.md
│   ├── MOD-Redes-Sociales.md      MOD-Dashboard.md     MOD-Calendario.md
│
├── 05-Diseño/                     ← DECISIONES y arquitectura
│   ├── MOC — Decisiones (ADR).md
│   ├── Decisiones/
│   │   ├── DEC-0001 Stack tecnológico.md
│   │   └── DEC-0002 Modelar la consulta como Oportunidad.md
│   └── Arquitectura/
│       └── ARQ — Vista general.md
│
├── 06-Desarrollo/                 ← se ACTIVA en PC2 (hoy vive casi vacía)
│   ├── Bitácora técnica.md
│   ├── Convenciones de código.md
│   └── Claude Code — memoria del proyecto.md
│
├── _plantillas/                   ← Templater / plantillas núcleo
├── _meta/                         ← convenciones, tags, workflow Git
├── _adjuntos/                     ← imágenes, exports PNG, maqueta HTML
└── .obsidian/                     ← config del vault (se versiona en Git)
```

> **Por qué carpetas numeradas (`00-`, `01-`…):** fuerzan el orden en el explorador y hacen evidente el flujo. **Por qué `04-Modulos` es solo MOCs:** un módulo (ej. Clientes) *no tiene contenido propio*; es una vista que reúne sus casos de uso + entidades + decisiones. Así una entidad como `Cliente` vive **en un solo lugar** (`03-Dominio`) y se referencia desde donde haga falta. Una nota, un hogar.

### 1.2 Convención de nomenclatura

**Formato:** `PREFIJO-NÚMERO Título descriptivo en minúsculas naturales`

| Tipo de nota | Prefijo | Ejemplo de archivo |
|---|---|---|
| Caso de uso | `CU-##` | `CU-01 De la consulta a la venta` |
| Regla de negocio | `RN-##` | `RN-01 Comisión automática` |
| Entidad del dominio | *(nombre a secas)* | `Cliente`, `Oportunidad` |
| Decisión de diseño (ADR) | `DEC-####` | `DEC-0001 Stack tecnológico` |
| Módulo (MOC) | `MOD-` | `MOD-Economia-Pagos` |
| Arquitectura | `ARQ-` | `ARQ — Vista general` |
| Diagrama | `DGM-` (+`SEC`/`ACT`) | `DGM-ER`, `DGM-SEC-Consulta-a-venta` |
| Mapa de contenido | `MOC —` | `MOC — Modelo de dominio` |

**Reglas:**
- **Español (Argentina)** para todo nombre de dominio, con tildes. Las entidades usan el nombre exacto del *lenguaje ubicuo* (`Reseña`, `Cotización`) — el mismo que irá al código y a los diagramas.
- Números con **cero a la izquierda** (`CU-01`, no `CU-1`) para que ordenen bien.
- Sin fechas en el nombre del archivo: la fecha va en la propiedad `actualizado`.
- El **prefijo lo hace encontrable**: escribís `CU-` en el buscador (`Ctrl+O`) y aparecen todos los casos de uso.

### 1.3 Cómo distinguir madurez de una nota

No creamos carpetas de "borrador" vs "final". El estado es una **propiedad**, así la nota nunca cambia de ubicación ni de enlaces al madurar:

| Estado (`estado:` + `#estado/…`) | Significado | Se puede editar libremente |
|---|---|---|
| `borrador` | Análisis exploratorio, WIP, ideas | Sí, de quien la creó |
| `en-revisión` | Propuesta, esperando OK del equipo | Solo comentarios |
| `formalizado` | Aprobada por el equipo, **congelada para PC1** | No sin una `DEC-` que lo justifique |
| `obsoleto` | Reemplazada; se conserva por trazabilidad | No |

La **documentación de referencia** (glosario, estándares, `_meta/`, relevamiento) lleva `tipo: referencia` y vive estable; no pasa por el ciclo borrador→formalizado.

---

## 2 · Enlaces y tags

### 2.1 División de trabajo: propiedades vs. tags vs. enlaces

- **Enlaces `[[ ]]`** → relaciones *estructurales* entre notas (un CU usa una entidad). Son la columna vertebral: hacen visibles las dependencias en el grafo.
- **Propiedades (frontmatter)** → metadatos *estructurados y consultables* (estado, responsable, módulo). Alimentan Dataview.
- **Tags `#`** → navegación *transversal* rápida (ver todo lo de un estado o de un PC de un vistazo).

Regla práctica: **si conecta dos ideas concretas, es un enlace; si clasifica la nota, es propiedad o tag.**

### 2.2 El grafo de dependencias que queremos ver

Todo el conocimiento debe poder recorrerse en esta cadena (cada flecha = un enlace `[[ ]]`):

```
Relevamiento → Objetivos → Actor → Caso de uso → Entidad(es) del dominio
      → Regla de negocio → Decisión de diseño (DEC) → Arquitectura → Stack → Diagrama UML
```

Ejemplos concretos de enlazado obligatorio:
- Un **caso de uso** enlaza a su(s) `[[Actores]]`, a las **entidades** que toca (`[[Cliente]]`, `[[Cotización]]`) y a las **reglas** que aplica (`[[RN-01 Comisión automática]]`).
- Una **entidad** enlaza a las entidades con las que se relaciona (`Cliente` → `[[Oportunidad]]`, `[[Viaje]]`, `[[Reseña]]`) y a las **decisiones** que la afectan.
- Una **decisión** enlaza a lo que impacta (entidades, arquitectura, CU).
- Un **diagrama** enlaza a las entidades/CU que representa (todo diseño tiene versión gráfica *y* la gráfica apunta a las notas de origen).
- Un **módulo (MOD-)** es un MOC: solo enlaces a sus CU, entidades, reglas y decisiones.

> Usá enlaces "hacia adelante" siempre; los *backlinks* (panel derecho de Obsidian) te dan la navegación inversa gratis. No dupliques enlaces en ambos sentidos a mano.

### 2.3 Taxonomía de tags (cerrada — no inventar fuera de esto)

Tags anidados, todos en minúscula. Definir uno nuevo requiere avisar al equipo (así no se fragmenta).

**`#tipo/…`** — qué es la nota
`caso-uso` · `entidad` · `regla` · `decision` · `analisis` · `diagrama` · `modulo` · `actor` · `referencia`

**`#estado/…`** — madurez (ver 1.3)
`borrador` · `en-revision` · `formalizado` · `obsoleto`

**`#modulo/…`** — a qué módulo pertenece (puede tener varios)
`clientes` · `viajes` · `economia` · `alertas` · `cotizaciones` · `hoteles` · `redes` · `dashboard` · `calendario`

**`#pc/…`** — para qué entrega es relevante
`pc1` · `pc2` · `pc3`

**`#accion/…`** — señales de trabajo (efímeras, se quitan al resolver)
`revisar` · `decidir` · `bloqueado` · `dudas`

**Cuándo aplicar:** los tags de `tipo`, `estado`, `modulo` y `pc` van en el frontmatter **al crear** la nota (las plantillas ya los traen). Los `#accion/…` se agregan en el cuerpo, en el momento, y se borran al cerrarlos. Ejemplo: `#accion/decidir` marca un punto que hay que llevar a la sync semanal.

> **Consultas útiles con Dataview** (van en las notas MOC):
> - "Todo lo que falta formalizar para PC1": `#pc/pc1 AND #estado/borrador`
> - "Mis pendientes": `responsable = "Francisco" AND #accion/revisar`

---

## 3 · Workflow colaborativo

### 3.1 Sincronización: Git como fuente única

El vault **es un repositorio Git**. Es la única sync que cumple las tres condiciones que necesitamos: historial por línea, resolución de conflictos explícita y **diagramas Mermaid versionables** (son texto plano).

- **Plugin:** *Obsidian Git*. Config recomendada: `pull` automático **al abrir** el vault y **cada 10 min**; `commit` automático cada 10 min *con confirmación*, y push manual al terminar una tanda. Así siempre arrancás con la última versión.
- **No usamos** Obsidian Sync ni Drive/Dropbox para el contenido: la sync de archivos binarios rompe merges y no da historial revisable.
- `.gitignore`: incluir `.obsidian/workspace.json` y `.obsidian/cache` (son preferencias locales de cada uno y generan conflictos falsos). Sí versionar el resto de `.obsidian/` para compartir plugins y config.

### 3.2 Qué se edita en conjunto vs. individual (evitar pisarse)

La estrategia anti-conflicto no es coordinar horarios: es **atomizar** el conocimiento para que dos personas casi nunca toquen el mismo archivo.

| Tipo de nota | Modelo de edición |
|---|---|
| **Entidad, CU, Decisión, Regla** | **Un dueño por nota** (`responsable:`). Es atómica → colisiones raras. Si necesitás cambiar la de otro, comentás (3.3), no editás. |
| **Diagrama de clases / ER** | **Nota compartida, pero con dueño rotativo.** El diagrama Mermaid es *una* nota; el bloque de código es indivisible, así que **no se edita en paralelo**. Quien lo toca avisa en el canal, hace su cambio, commit + push, libera. La discusión de qué va en el diagrama ocurre en las notas de *entidad* (individuales), no sobre el diagrama. |
| **MOC / índices** | Compartidas, edición aditiva (agregar un enlace casi nunca genera conflicto real). |
| **Estado del proyecto, Bitácora** | Compartidas, formato de entradas fechadas por autor (append, no reescribir). |

> Diseño clave: **el diagrama es el "output"; las entidades son el "source".** Discutimos y editamos entidades (atómicas, sin choques) y regeneramos/actualizamos el diagrama al final. Esto también facilita el uso de Claude Code para regenerar el Mermaid a partir de las notas de entidad.

### 3.3 Revisión y aprobación (borrador → formalizado)

1. Autor crea/edita la nota en `#estado/borrador`.
2. Cuando la considera lista, la pasa a `#estado/en-revision` y agrega `#accion/revisar`.
3. Los otros dos revisan **con comentarios en la propia nota**, en una sección al pie:
   ```
   ## 🔎 Revisión
   > [!question] Nahuel (09/09): ¿"Oportunidad" y "Consulta" son lo mismo? Ver [[DEC-0002 ...]].
   > [!check] Paloma (10/09): De acuerdo con los atributos.
   ```
   (Usamos *callouts* de Obsidian: `[!question]`, `[!check]`, `[!warning]`.)
4. En la **sync semanal** se aprueba: se pasa a `#estado/formalizado`, se completa `actualizado:` y se borran los `#accion/…`. Solo **acuerdo de los 3** formaliza (o de los presentes, con registro).
5. Cambiar algo ya formalizado **requiere una `DEC-`** que lo justifique (así queda la trazabilidad de por qué cambió).

### 3.4 Manejo de conflictos de versión

Prevención (95% del problema): **pull al abrir**, notas atómicas, un dueño por nota, push seguido al terminar.

Si igual ocurre un conflicto de merge:
- **Notas de prosa (CU, entidad, decisión):** Git marca el conflicto con `<<<<<<<` / `=======` / `>>>>>>>`. Se resuelve conservando **ambos aportes** (casi siempre son secciones distintas) y avisando al otro dueño. Nunca descartar el bloque ajeno sin preguntar.
- **Diagramas Mermaid:** como es texto, el diff es legible línea a línea. Se resuelve como cualquier código: se toman las líneas de ambos, se valida que el diagrama renderice (preview de Obsidian o `mermaid.live`) y recién ahí commit. **Por esto Mermaid y no imágenes**: un `.png` en conflicto es irreconciliable.
- **Regla de desempate:** si dos tocaron lo mismo y no está claro, gana lo que esté `formalizado`; lo demás vuelve a `borrador` y se rehace sobre la base acordada. El **coordinador de la semana** (ver §6) decide si hay trabas.

---

## 4 · Plantillas

Viven en `_plantillas/` y se insertan con el plugin **Templater** (o *Core Templates*). Cada una ya trae el frontmatter y los tags correctos. Las cinco:

- [[PL-Caso de uso]] — actores, precondiciones, flujo principal, alternativos, postcondiciones.
- [[PL-Entidad]] — atributos (nombre · tipo · descripción), responsabilidades, relaciones, estado.
- [[PL-Decisión (ADR)]] — qué, por qué, alternativas, impacto, decisor(es), fecha.
- [[PL-Análisis del sistema]] — justificación, trade-offs, restricciones, referencia al relevamiento.
- [[PL-Diagrama Mermaid]] — cómo documentar y enlazar un diagrama versionable.

Ver la carpeta `_plantillas/` para el contenido; están comentadas por dentro.

---

## 5 · Flujo de trabajo por fase

### 5.1 Fase actual → PC1 (semana 9 · 23/10/26): modelo UML completo

**Meta:** modelo conceptual UML terminado. Concretamente, deben quedar **100% formalizados**:

- [ ] `01-Relevamiento/` completo y formalizado (es la base de todo).
- [ ] Todos los **actores** (4) formalizados.
- [ ] **Casos de uso** de los flujos núcleo formalizados (mínimo: consulta→venta y los CU por módulo principales) con diagrama de casos de uso.
- [ ] Las **10 entidades** del dominio formalizadas: `Usuario`, `Cliente`, `Oportunidad`, `Viaje`, `Pago`, `Hotel`, `Reseña`, `Alerta`, `Cotización`, `ContenidoRed`.
- [ ] `DGM-Clases-dominio` (diagrama de clases) y `DGM-ER` (modelo ER) formalizados y coherentes entre sí.
- [ ] Diagramas de **actividad** de los flujos clave.
- [ ] `ARQ — Vista general` (Web SPA React + Mobile React Native + API REST + PostgreSQL + IA Claude) en `en-revision` o `formalizado`.
- [ ] Decisiones estructurales registradas como `DEC-` (mínimo: stack, y toda elección de modelado no obvia).

**Qué queda en `borrador` sin drama:** prototipo de UI, detalles de módulos secundarios (redes/dashboard pueden ir a alto nivel), fase 2 (facturación, scraping).

**Criterio de cierre de PC1:** en la sync previa a la semana 9, `#pc/pc1 AND #estado/borrador` debe dar **cero resultados** en lo listado arriba. `Estado del proyecto.md` refleja el checklist tildado.

### 5.2 Transición a desarrollo → PC2 (sem. 13 · 20/11/26) y PC3 (sem. 15 · 04/12/26)

Cuando arranca el código, el vault **no se abandona**: se convierte en la memoria de diseño contra la que se contrasta el código. Se activa `06-Desarrollo/`.

- **Diseño congelado vs. evolutivo:**
  - *Congelado:* modelo de dominio, ER y las `DEC-` estructurales formalizadas en PC1. Cambiarlos exige una **nueva `DEC-` que supersede** a la anterior (la vieja pasa a `#estado/obsoleto` con enlace a la nueva). Nunca se edita en silencio.
  - *Evolutivo:* detalles de implementación, UI, endpoints concretos, decisiones tácticas → se registran como `DEC-` nuevas sin tocar las de PC1.
- **Vincular Git de código ↔ notas de decisión:** cada `DEC-` que cambia el código lleva al pie un campo `commits:` / `rama:`. Y al revés: el mensaje de commit referencia el ID de la decisión.
  ```
  feat(pagos): comisión automática al crear reserva

  Implementa RN-01 según DEC-0001. Ver Vault-Rumbo/05-Diseño/Decisiones/DEC-0001.
  ```
  Así, desde una decisión llegás al código y desde un commit llegás al *porqué*.
- **Rol de Claude (Claude Code, agente principal):**
  - El vault es el **contexto que se le da a Claude**: al pedirle una entidad o un endpoint, se le pasan las notas de dominio y las `DEC-` relevantes (ventana de contexto amplia → cabe todo).
  - `06-Desarrollo/Claude Code — memoria del proyecto.md` es un resumen vivo (convenciones, stack, glosario, "no hacer") que se le da como *system prompt* / se replica en el `CLAUDE.md` del repo de código. **Fuente de verdad = vault; el `CLAUDE.md` del código es un reflejo.**
  - Claude puede **regenerar diagramas Mermaid** a partir de las notas de entidad y **documentar código** de vuelta hacia el vault (bitácora técnica). El humano revisa y formaliza; Claude no formaliza solo.

---

## 6 · Ritmo y mantenimiento

### 6.1 Cadencias

| Cadencia | Cuándo | Qué se hace |
|---|---|---|
| **Al empezar a trabajar** (individual) | Cada sesión | `pull`. Mirar `Estado del proyecto`. Tomar una nota `borrador` propia. |
| **Sync semanal** (equipo, ~45 min) | 1×/semana fija | Aprobar `#estado/en-revision` → `formalizado`. Revisar `#accion/decidir` y `#accion/bloqueado`. Actualizar `Estado del proyecto` y checklist del PC. Repartir la semana. |
| **Cierre de PC** | Sems. 9, 13, 15 | Verificar checklist del PC en cero. Tag `#pc/…` cumplido. Snapshot: `git tag pc1`. |

### 6.2 Roles (rotan cada 2 semanas, quedan anotados en `Estado del proyecto`)

- **Coordinador de vault:** vela por la coherencia, hace la limpieza semanal (tags huérfanos, notas sin dueño, enlaces rotos) y **desempata conflictos** de merge y de contenido.
- **Guardián del dominio:** dueño rotativo del diagrama de clases/ER; garantiza que las entidades y el diagrama estén sincronizados.
- **Escriba de decisiones:** se asegura de que toda decisión de la sync quede como `DEC-` (que no se pierda en el chat).

### 6.3 Señales de alerta (la estructura necesita ajuste)

- Aparecen notas que **no encajan** en ningún prefijo/carpeta → falta una convención; discutir, no improvisar carpetas nuevas.
- **Enlaces rotos** o entidades duplicadas (`Cliente` y `Clientes`) → hay ambigüedad de nomenclatura.
- Alguien guarda info en su máquina/chat "porque en el vault no sé dónde va" → la estructura no es predecible; ajustar §1.
- El diagrama de clases y las notas de entidad **discrepan** → falló el flujo source→output; el Guardián del dominio lo reconcilia.
- Muchos conflictos de Git en la misma nota → esa nota no es atómica; **partirla**.
- `#estado/en-revision` se acumula semana a semana → las syncs no están cerrando decisiones; acortar el alcance de lo que se revisa.

---

---

## 7 · Contexto eficiente con Claude (ahorro de tokens)

Esta misma estructura está diseñada para que trabajar con Claude (Claude Code, nuestro agente principal) **cueste menos tokens y dé mejores respuestas**. La clave es *progressive disclosure*: darle a Claude un resumen y que baje al detalle solo si hace falta, en lugar de volcarle todo.

- **No le pegamos el vault entero al chat.** Se entra por un MOC (`🏠 Rumbo — Home` → `MOC — Modelo de dominio` → entidad puntual) y se referencian notas por **ruta/ID** (`leé DEC-0001`), que funcionan como punteros ligeros.
- Las **notas atómicas y bien nombradas** se cargan sueltas; el **frontmatter** deja que un `grep` responda "¿qué falta para PC1?" sin abrir cuerpos de nota.
- El **estado del proyecto y las `DEC-`** son memoria externa: cada sesión nueva arranca leyéndolas, no re-derivando todo.
- El `CLAUDE.md` del repo de código será un **puntero corto** al vault, no una copia.

👉 Detalle completo, con las 6 prácticas y el checklist: [[Contexto eficiente con Claude (ahorro de tokens)]].

---

> **En una frase:** carpetas por fase del pensamiento, una nota atómica con un dueño, enlaces para las relaciones y tags para navegar, Git para versionar (Mermaid incluido), una sync semanal que formaliza, y contexto servido a Claude *bajo demanda* para gastar pocos tokens. Eso sostiene análisis (PC1) y código (PC2/PC3) sin rediseñar nada.
