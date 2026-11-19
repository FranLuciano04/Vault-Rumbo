---
tipo: referencia
estado: borrador
responsable: Nahuel
actualizado: 19/11/26
---
# Guion — uso de la IA en Rumbo

tags:: #tipo/referencia #estado/borrador

> Guion del video para los profesores sobre cómo usamos la IA en el proyecto, desde la idea hasta los flujos de desarrollo y testing. **Borrador:** el reparto de bloques entre los tres es una propuesta a confirmar con el equipo.

## Datos generales
- **Duración objetivo:** unos 15 minutos.
- **Hilo conductor:** «No usamos la IA como un chat suelto, sino como un cuarto integrante, con memoria compartida en Git y reglas escritas».
- **Grabación:** OBS Studio, un archivo por bloque. **Edición:** Clipchamp (cortes, acelerar esperas y títulos por bloque).
- **Escenas de OBS:** «Cámara» (webcam sola, para la intro y el cierre), «Pantalla + cámara» (webcam chica abajo a la derecha) y «Pantalla» (sin cámara, para las demos largas).
- **Narración:** unas 130 palabras por minuto. El texto de cada bloque es una guía: conviene decirlo con palabras propias y no leerlo.

## Reparto propuesto (a confirmar)
| Bloque | Quién | Por qué |
|---|---|---|
| 1, 2 y 8 | Francisco | Armó la estructura inicial del vault y el protocolo para Claude |
| 3 y 4 | Paloma | Especificación de CU, prototipo en Figma y diagramas |
| 5, 6 y 7 | Nahuel | El flujo de implementación con agentes ([[DEC-0014 Flujo de implementación con agentes\|DEC-0014]]) se diseñó en su sesión |

## Preparación antes de grabar
- [ ] Grabar **antes** una corrida real de `/implementar-ticket` (un ticket chico, de riesgo normal) para el bloque 6. En la edición se acelera de 4x a 8x.
- [ ] Grabar el arranque de una sesión de Claude Code (saludo, lectura del estado) para el bloque 3.
- [ ] Tener abiertos en Obsidian: [[🏠 Rumbo — Home]], [[Estado del proyecto]], [[Bitácora de sesiones]], [[Herramientas del proyecto]], [[Elección del proyecto]], un CU (por ejemplo [[CU-01 De la consulta a la venta]]), un diagrama Mermaid, [[Grafo de tickets]] y [[Flujo de implementación]].
- [ ] Tener abiertos en el navegador: un PR mergeado con el formato de la skill `pr`, la pestaña Actions del CI y una review de Codex (`06-Desarrollo/Reviews/M11 — review Codex.md`).
- [ ] **Ocultar secretos:** cerrar cualquier `.env`, la terminal con variables y la clave de NVIDIA. Revisar cada toma antes de exportar.
- [ ] Desactivar notificaciones de Windows, Discord y WhatsApp.
- [ ] Zoom del editor y de la terminal al 125–150 % para que se lea en el video.

---

## Bloque 1 — Intro (1 min)
**En pantalla:** escena «Cámara», después [[🏠 Rumbo — Home]].

**Narración:**
> Somos Francisco, Nahuel y Paloma, y vamos a mostrar cómo usamos la inteligencia artificial para construir Rumbo, un CRM para agencias de turismo PyME. La idea que atraviesa todo el video es esta: no usamos la IA como un chat al que le hacemos preguntas sueltas, sino como un cuarto integrante del equipo. Uno que no tiene memoria propia, así que le dimos una memoria compartida en Git, reglas de trabajo escritas y controles que no dependen de su palabra. Vamos a recorrer el proyecto en orden: cómo elegimos la herramienta y la idea, cómo documentamos, cómo convertimos esa documentación en tickets y cómo cada ticket se implementa y se prueba con agentes.

## Bloque 2 — Elección de la IA y de la idea (1,5 min)
**En pantalla:** [[Herramientas del proyecto]] (tabla comparativa) y [[Elección del proyecto]] (tabla de las tres propuestas).

**Narración:**
> Lo primero fue elegir el agente. Comparamos Claude, ChatGPT, Gemini, Copilot y Cursor, y elegimos Claude por tres razones: su desempeño en código, que tiene un agente que trabaja directamente sobre los archivos del repositorio, que es Claude Code, y que los tres ya lo usábamos y teníamos la versión paga.
>
> Para la idea presentamos tres propuestas: una app de hábitos saludables, una red social gastronómica y Rumbo. Elegimos Rumbo porque teníamos acceso a una agencia real que podía explicarnos cómo trabaja. Eso es importante para el resto del video: la IA nos ayudó a ordenar y especificar, pero los hechos del negocio salieron del relevamiento con la agencia, no de la IA.

**Edición:** resaltar con un recuadro la fila «Elegida» de la comparativa.

## Bloque 3 — El cerebro compartido (2 min)
**En pantalla:** el árbol de carpetas del vault en Obsidian, `CLAUDE.md`, [[Bitácora de sesiones]] y la grabación del arranque de una sesión.

**Narración:**
> El problema de trabajar con IA en equipo es que cada conversación empieza de cero y queda en la cuenta de quien la abrió. Lo resolvimos con un vault de Obsidian versionado en GitHub: es el cerebro compartido del proyecto. Ahí está todo: relevamiento, casos de uso, dominio, decisiones y, más adelante, el código.
>
> El archivo `CLAUDE.md` funciona como el prompt de sistema del agente. Le dice cómo entrar en contexto: identificar quién está trabajando por su usuario de Git, traer la última versión, leer el estado del proyecto y la bitácora, y abrir solo las notas que la tarea necesita. También fija reglas: escribir en español con importes en pesos, respetar el lenguaje del negocio, no inventar datos y no aprobar nada sin el equipo.
>
> Acá se ve una sesión que arranca: Claude me saluda, me cuenta lo que tengo pendiente y lee el estado. Al cerrar, deja una entrada en la bitácora con quién hizo qué, los commits y lo que quedó pendiente. Así, lo que hizo uno con su Claude lo sabe el Claude del otro al día siguiente. Y si alguien necesita enterarse de algo, queda un aviso a su nombre que el agente le cuenta al saludarlo.

**Edición:** acelerar el arranque de la sesión; congelar un segundo en el saludo con el aviso.

## Bloque 4 — Documentación (PC1) (2,5 min)
**En pantalla:** [[Relevamiento — Fuente de verdad]], un CU en `.md`, el `.docx` generado, una `DEC-` (por ejemplo [[DEC-0002 Modelar la consulta como Oportunidad]]), un diagrama Mermaid renderizado y el grafo de Obsidian.

**Narración:**
> Para el primer punto de control, la IA nos ayudó a pasar del relevamiento a la especificación. Fijamos un orden de autoridad: primero el relevamiento, después las decisiones aprobadas y después el resto. Si dos documentos se contradicen, el agente no elige uno en silencio: se abre una decisión, una `DEC-`, que el equipo aprueba. Hoy tenemos 29.
>
> Los casos de uso se escriben en Markdown, que es la fuente de verdad y es barato de leer para el agente. Los documentos que les entregamos a ustedes se generan desde esos archivos con pandoc; nunca se editan a mano.
>
> Los 31 casos de uso se repartieron entre los tres, y cada uno los especificó con su sesión de Claude a partir de una plantilla y de un caso de ejemplo. Los diagramas también son texto: Mermaid. Se versionan con Git, se ve quién cambió qué y las imágenes se exportan con un script.
>
> Un punto importante: el agente propone, pero nada pasa a formalizado sin la aprobación del equipo. Las notas tienen estado: borrador, en revisión y formalizado.

**Edición:** poner lado a lado el `.md` de un CU y su página en el `.docx`.

## Bloque 5 — Del diseño al plan (2 min)
**En pantalla:** [[Spec de implementación]], [[DEC-0015 Decisiones de implementación]], [[Plan de implementación]], un ticket (por ejemplo `T-176`) mostrando su frontmatter y [[Grafo de tickets]].

**Narración:**
> Para pasar al código usamos skills: instrucciones empaquetadas que el agente carga para una tarea concreta. Partimos de las de Addy Osmani, de código abierto, y las adaptamos a Rumbo.
>
> Fueron tres pasos. Primero, una spec de implementación que enlaza al vault en lugar de copiarlo. Segundo, un «grill»: el agente nos interrogó sobre los huecos que quedaban para implementar y cada respuesta quedó en una decisión. Tercero, el plan: el sistema completo cortado en módulos y tickets chicos, con un máximo de tres criterios de aceptación.
>
> Cada ticket declara de qué otros depende, su riesgo, su trazabilidad a casos de uso y requisitos, y qué modelo usar en cada rol: uno para los tests, uno para implementar y otro distinto para revisar. Haiku para lo mecánico, Sonnet para lo estándar y Opus para lo delicado, como estados, dinero y permisos. Así cuidamos los tokens y ponemos el modelo caro solo donde un error cuesta caro. En total fueron 182 tickets, y este grafo se genera solo desde los tickets.

**Edición:** zoom al frontmatter del ticket (`riesgo`, `modelo_*`, `trazabilidad`).

## Bloque 6 — Ciclo de un ticket (3,5 min) ⭐
**En pantalla:** la grabación previa de `/tomar-ticket` y `/implementar-ticket`, el `git log` de la rama mostrando los commits de cada fase y el PR en GitHub.

**Narración:**
> Este es el corazón del flujo. Con `/tomar-ticket`, el agente elige el primer ticket disponible y lo marca como mío con un push a `main`. Si otro lo tomó un segundo antes, el push choca y elige otro. Git hace de semáforo, sin ninguna herramienta extra.
>
> Después, `/implementar-ticket`. Mi sesión de Claude es el orquestador: no escribe código, dirige subagentes, cada uno con un solo rol.
>
> En el rojo, el `test-writer` escribe los tests, nombrados por el requisito que prueban, y se comprueba que fallen por el motivo correcto.
>
> En el verde, el implementador de la capa (backend, contrato, front o infraestructura) escribe el código mínimo para que pasen. Acá hay un control clave: un script verifica que los tests no se hayan tocado desde el rojo. El agente no puede hacer trampa cambiando el test para que pase.
>
> En el refactor, el `simplificador` limpia el código sin cambiar el comportamiento.
>
> En la review, un revisor con un modelo distinto del que implementó busca errores. Si el ticket es de riesgo alto, usa un revisor de seguridad. Los hallazgos los arregla el mismo implementador.
>
> Cada fase queda como un commit, así que la secuencia rojo, verde, refactor queda como evidencia. Al final, el agente abre el pull request con un formato fijo: objetivo, trazabilidad, evidencia de TDD, cobertura, review y modelos usados. Si el riesgo es normal y el CI pasa, se mergea. Si es alto, tiene que aprobarlo otra persona del equipo.

**Edición:** acelerar las esperas de los subagentes de 4x a 8x con un rótulo «x8». Mostrar un rótulo con el nombre de cada fase cuando arranca. Si en la corrida aparece un código de salida del script (por ejemplo, tests que no fallan en el rojo), dejarlo: muestra que el control funciona.

## Bloque 7 — Testing y barrera de módulo (1,5 min)
**En pantalla:** la pestaña Actions del CI, un test con nombre `test_rfNNN_…`, un e2e de Playwright, `06-Desarrollo/Reviews/M11 — review Codex.md` y los tags `mod-N` en GitHub.

**Narración:**
> En la PC se corren solo los tests del ticket y sus vecinos, para ir rápido. La suite completa, la cobertura y los análisis de seguridad corren en el CI de cada pull request, y una auditoría semanal revisa las dependencias. Cada módulo suma tickets de punta a punta con Playwright en la web; en mobile, la barrera del módulo incluye una prueba manual guiada.
>
> Cuando un módulo se termina, pasa una barrera de revisión. Como los tickets ya los revisó Claude, para no repetir los mismos sesgos le pedimos la review a otra familia de modelos: Codex, de OpenAI. Mira el módulo completo, sobre todo cómo se integran los tickets entre sí, y deja sus hallazgos en un archivo. Claude verifica cada uno, arregla los que se confirman y, con la aprobación del equipo, el módulo se cierra con un tag. Ya cerramos once módulos así.

## Bloque 8 — Cierre (1 min)
**En pantalla:** escena «Cámara», con una placa con los números.

**Placa:** más de 2000 commits · 31 casos de uso · 29 decisiones · 182 tickets · 11 módulos cerrados con review externa.

**Narración:**
> ¿Qué aprendimos? Que la IA rinde cuando tiene contexto ordenado y controles que no dependen de lo que dice: tests que no se pueden tocar, revisores con otro modelo, CI y aprobación humana en los puntos de riesgo. También tiene límites: hay que revisar lo que propone, las decisiones de negocio son nuestras y no siempre acierta a la primera; por eso, si un subagente falla dos veces, se pasa a un modelo más capaz y, si sigue fallando, decide una persona. Para nosotros, la IA fue un integrante más del equipo, pero las decisiones siguieron siendo del equipo. Gracias.

---

## Checklist de edición y entrega
- [ ] Unir los bloques en orden, con un título corto al inicio de cada uno.
- [ ] Revisar que no aparezca ningún secreto, correo personal ni clave.
- [ ] Normalizar el volumen de las voces entre bloques.
- [ ] Exportar en 1080p (MP4).
- [ ] Mirarlo completo una vez antes de mandarlo.
