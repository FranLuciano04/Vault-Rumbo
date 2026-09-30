## Prompts del agente de desarrollo

Claude Code no recuerda las sesiones anteriores. Lo que le da contexto y reglas en cada sesión es el archivo `CLAUDE.md`, en la raíz del repositorio: Claude Code lo lee al empezar y funciona como su **prompt de sistema** para este proyecto. El archivo completo va en la carpeta de entrega; estas son sus partes centrales.

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

**Prompt inicial de ejemplo.** Cuando el agente se usa fuera de Claude Code, el equipo arranca la conversación con este pedido:

> Leé `00-Inicio/Estado del proyecto.md`, `06-Desarrollo/Claude Code — memoria del proyecto.md` y las notas vinculadas a esta tarea. Respetá las decisiones en revisión y no formalices nada sin indicación del equipo. Al terminar, actualizá la memoria correspondiente y prepará un commit claro.
