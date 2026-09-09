---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---

# Trabajo en equipo — Git y memoria

tags:: #tipo/referencia #estado/formalizado

> Rutina corta para que Paloma, Nahuel y Francisco trabajemos sobre la misma versión y podamos retomar el proyecto sin depender del historial de un chat.

## Primera configuración

1. Aceptar la invitación al repositorio privado [FranLuciano04/Vault-Rumbo](https://github.com/FranLuciano04/Vault-Rumbo).
2. Clonar el repositorio en una carpeta local que no esté sincronizada por otra nube:

```powershell
git clone https://github.com/FranLuciano04/Vault-Rumbo.git
cd Vault-Rumbo
```

3. Abrir esa carpeta como vault en Obsidian.
4. Instalar **Obsidian Git**, **Dataview** y **Templater** o activar Core Templates.
5. Si Git todavía no tiene nombre y correo configurados:

```powershell
git config --global user.name "Nombre Apellido"
git config --global user.email "correo-usado-en-github@example.com"
```

La guía completa de estructura, nombres y revisiones está en [[Guía del Vault]].

## Qué se guarda por usuario

| Elemento | ¿Se comparte? | Cómo se identifica a la persona |
|---|---|---|
| Archivos del vault | Sí, mediante GitHub | Autor, correo y fecha de cada commit |
| Cambios dentro de una nota | Sí | Historial del archivo y `git blame` por línea |
| Responsable de una nota | Sí | Propiedad `responsable:` del frontmatter |
| Revisiones y decisiones | Sí | Nombre y fecha escritos en la sección de revisión o en la `DEC-` |
| Conversaciones de Claude/Codex | No, por defecto | Quedan en la cuenta y sesión de quien las inició |

El campo `responsable:` indica quién es dueño de la nota, pero no reemplaza el historial: Git registra quién hizo cada modificación real. Por eso cada integrante debe configurar su propio `user.name` y `user.email`; no se debe trabajar con la identidad Git de otra persona.

Para consultar quién actualizó la memoria:

```powershell
git log --oneline --all
git log -- "ruta/de/la/nota.md"
git blame -- "ruta/de/la/nota.md"
```

Si una conversación con IA produce una decisión o avance relevante, ese resultado debe escribirse en el vault y subirse con un commit. El chat puede perderse o permanecer privado; el commit y la nota son la memoria compartida y auditable.

## Al empezar cada sesión

1. Comprobar que no haya trabajo local pendiente:

```powershell
git status
```

2. Traer la última versión:

```powershell
git pull --ff-only origin main
```

3. Leer [[Estado del proyecto]] para conocer la fase, las decisiones abiertas y el próximo entregable.
4. Entrar por [[🏠 Rumbo — Home]] y abrir únicamente el MOC, caso de uso, entidad o decisión relacionada con la tarea.
5. Confirmar que la nota tenga `responsable:` y avisar al equipo antes de editar un diagrama Mermaid compartido.

Si `git status` muestra cambios propios, hay que terminarlos o guardarlos en un commit antes de hacer pull. No se descartan cambios para forzar una actualización.

## Mientras trabajamos

- Una idea o artefacto tiene una sola nota de origen; desde otros módulos se lo enlaza con `[[ ]]`.
- Las notas `borrador` se editan libremente por su responsable. Las notas `en-revision` esperan comentarios del equipo.
- Una decisión no obvia se registra como `DEC-####`. Un cambio sobre contenido formalizado debe quedar justificado por una DEC.
- Los diagramas Mermaid tienen un solo editor a la vez y se actualizan desde las notas de entidad o caso de uso.
- Los documentos originales van en `_adjuntos/Fuentes/`; la información navegable queda en Markdown.
- Nunca se suben contraseñas, tokens, archivos `.env` ni credenciales.

## Cómo mantener la memoria compartida

Antes de cerrar una tarea, actualizar el archivo que corresponda:

| Resultado de la sesión | Dónde queda |
|---|---|
| Avance, próximo paso o bloqueo | [[Estado del proyecto]] |
| Decisión y su justificación | `05-Diseño/Decisiones/DEC-####` |
| Cambio en una entidad o flujo | Nota de entidad/CU y su MOC o diagrama |
| Avance de implementación desde PC2 | [[Bitácora técnica]] |
| Convención técnica necesaria para programar | [[Claude Code — memoria del proyecto]] como resumen y la DEC como detalle |

Orden de autoridad cuando dos notas se contradicen:

1. [[Relevamiento — Fuente de verdad]] para hechos y necesidades del negocio.
2. Decisiones `DEC-` aprobadas.
3. Notas de entidades, reglas y casos de uso según su estado.
4. Diagramas, que son una salida derivada de esas notas.
5. La memoria de Claude, que es un resumen y nunca reemplaza las fuentes anteriores.

## Al terminar cada sesión

1. Actualizar la memoria correspondiente según la tabla anterior.
2. Revisar los cambios:

```powershell
git status
git diff
```

3. Crear un commit claro:

```powershell
git add .
git commit -m "docs: describir el cambio realizado"
```

4. Integrar cualquier cambio remoto y subir:

```powershell
git pull --rebase origin main
git push origin main
```

La sesión termina cuando el cambio y su contexto están en GitHub. Para documentación de PC1 trabajamos con commits pequeños sobre `main`; cuando comience el código de PC2 usaremos ramas `feature/...` y pull requests.

## Si aparece un conflicto

1. Ejecutar `git status` para identificar los archivos afectados.
2. Avisar al responsable de la nota.
3. En prosa, conservar e integrar ambos aportes.
4. En Mermaid, reconciliar el bloque completo y validar que renderice.
5. No borrar el aporte ajeno ni usar `git reset --hard` para resolverlo.

## Trabajar con Claude sin perder contexto

Claude Code iniciado desde la raíz lee `CLAUDE.md` automáticamente. En otro chat o herramienta, pedirle que lea primero ese archivo. El orden de contexto es:

1. [[Estado del proyecto]].
2. [[Claude Code — memoria del proyecto]].
3. El MOC o las notas específicas de la tarea.
4. Las `DEC-` relacionadas.

Prompt inicial sugerido:

> Leé `00-Inicio/Estado del proyecto.md`, `06-Desarrollo/Claude Code — memoria del proyecto.md` y las notas vinculadas a esta tarea. Respetá las decisiones en revisión y no formalices nada sin indicación del equipo. Al terminar, actualizá la memoria correspondiente y prepará un commit claro.

No hace falta pegar el vault completo en el chat. Los enlaces, rutas y estados sirven para cargar solo el contexto necesario; el método completo está en [[Contexto eficiente con Claude (ahorro de tokens)]].
