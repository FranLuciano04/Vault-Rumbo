## Prompts usados para construir el producto

El análisis y el diseño de Rumbo se construyeron **guiados con IA**: cada integrante trabaja en sesiones con el agente de desarrollo, Claude Code, sobre el repositorio del proyecto. Lo que orienta al agente son tres tipos de prompt, todos escritos por el equipo y versionados en el repositorio.

### 1. El prompt de sistema del agente: `CLAUDE.md`

Claude Code no recuerda las sesiones anteriores. Lo que le da contexto y reglas en cada sesión es el archivo `CLAUDE.md`, en la raíz del repositorio: el agente lo lee al empezar y funciona como su **prompt de sistema** para este proyecto. El archivo completo va en la carpeta de entrega; estas son sus partes centrales.

**Cómo entra en contexto al iniciar cada sesión:**

1. Identifica a la persona por su usuario de Git y le avisa si tiene tareas pendientes.
2. Revisa el estado del repositorio y trae la última versión del trabajo del equipo.
3. Lee el estado del proyecto, la bitácora de sesiones y la memoria del proyecto.
4. Comprueba que estén disponibles las skills compartidas del equipo.
5. Abre solo las notas relacionadas con la tarea, entrando por su índice, y consulta las decisiones relacionadas antes de proponer un cambio.

**Reglas de trabajo durante la sesión:**

- Escribir en español de Argentina, con importes en ARS y fechas `dd/mm/aa`, y respetar los nombres del lenguaje del negocio (`Cliente`, `Oportunidad`, `Cotización`, `Viaje`, `Pago`, `Alerta`…).
- Respetar el alcance: no implementar pagos online, publicación automática en redes, integración con mayoristas ni facturación.
- No aprobar ni formalizar nada sin la aprobación explícita del equipo, y no inventar datos del negocio: si falta información, avanzar con una propuesta marcada como borrador.
- Cuando dos documentos se contradicen, aplicar el orden de autoridad (el relevamiento, después las decisiones aprobadas y después el resto) y resolverlo con una decisión, no eligiendo una versión en silencio.
- Preservar los cambios de los demás, no guardar credenciales en Git y no cambiar la identidad de Git de nadie.

**Cómo cierra cada sesión:** verifica el resultado, actualiza la memoria del proyecto, registra una entrada en la bitácora (quién, qué se hizo y qué quedó pendiente), revisa los cambios, hace un commit con la identidad de la persona, integra el trabajo remoto y lo sube.

### 2. El prompt de cada sesión

Gracias a `CLAUDE.md`, el pedido con el que arranca una sesión puede ser corto. En Claude Code alcanza con:

> Hola, entrá en contexto.

Con eso el agente aplica todo el protocolo de arriba: saluda a la persona, le avisa qué tiene pendiente y resume el estado del proyecto. Después, cada pedido describe la tarea, por ejemplo «revisemos y decime qué falta» o «armá el entregable con el mismo formato Word que los demás».

Cuando el agente se usa fuera de Claude Code, sin `CLAUDE.md`, el equipo arranca con este prompt:

> Leé `00-Inicio/Estado del proyecto.md`, `06-Desarrollo/Claude Code — memoria del proyecto.md` y las notas vinculadas a esta tarea. Respetá las decisiones en revisión y no formalices nada sin indicación del equipo. Al terminar, actualizá la memoria correspondiente y prepará un commit claro.

### 3. Prompts reutilizables: las skills del proyecto

Un procedimiento que se repite se escribe una vez como **skill**: un prompt con nombre, versionado en `.claude/skills/`, que el agente aplica cuando la tarea lo pide. Por ejemplo, la skill `gestionar-skills` indica cómo incorporar una skill nueva al proyecto:

> Gestiona, instala, crea, actualiza y comparte skills de Claude Code para Rumbo. Usar cuando alguien pida agregar, instalar, eliminar, revisar o distribuir una skill o un plugin con skills.
>
> Antes de actuar: leer el catálogo de skills compartidas, revisar las skills disponibles para evitar duplicados, identificar el origen, la versión, la licencia y los permisos, y decidir si corresponde una skill de proyecto o una dependencia externa.

Así, cualquier integrante obtiene el mismo resultado con el mismo pedido, porque el procedimiento vive en el repositorio y no en la memoria de una persona.
