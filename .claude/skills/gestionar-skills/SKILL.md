---
name: gestionar-skills
description: Gestiona, instala, crea, actualiza y comparte skills de Claude Code para Rumbo. Usar cuando alguien pida agregar, instalar, eliminar, revisar o distribuir una skill o un plugin con skills.
compatibility: Claude Code con soporte para skills de proyecto en .claude/skills/.
metadata:
  proyecto: Rumbo
  version: "1.0.0"
---

# Gestionar skills compartidas

Aplicar este procedimiento cada vez que se agregue, instale, actualice o elimine una skill.

## Antes de actuar

1. Leer `00-Inicio/Skills compartidas.md` y `.claude/skills/README.md`.
2. Revisar las skills ya disponibles para evitar nombres o funciones duplicadas.
3. Identificar el origen, la versión, la licencia, los requisitos y cualquier permiso de herramientas solicitado.
4. Decidir si corresponde una skill de proyecto o una dependencia externa.

## Skill de proyecto

Usar `.claude/skills/<nombre>/SKILL.md` cuando la skill sea propia de Rumbo o pueda versionarse legalmente con el repositorio.

- Usar un nombre de directorio corto, en minúsculas y con guiones.
- Escribir una `description` que diga qué hace y cuándo debe activarse.
- Mantener el cuerpo enfocado; mover referencias extensas, scripts y recursos a su directorio.
- No incluir secretos, credenciales, datos personales ni permisos de herramientas más amplios de lo necesario.
- Registrar nombre, versión, ubicación, finalidad, responsable y fecha en `00-Inicio/Skills compartidas.md`.

Después de un pull, una skill de proyecto ya está compartida: no pedir que se copie a una carpeta personal.

## Plugin o skill externa

Si la skill proviene de un plugin, marketplace, cuenta sincronizada o instalación personal y no corresponde copiarla:

1. Registrar en el catálogo su fuente oficial, versión o referencia, estado requerido/opcional y comando exacto de instalación.
2. Comprobar si está disponible en la sesión.
3. Si está marcada como requerida y falta, avisar al usuario antes de una tarea que dependa de ella, explicar para qué hace falta y mostrar el comando de instalación.
4. Instalarla únicamente con autorización cuando la acción cambie la máquina, la cuenta o la configuración externa.
5. Verificarla con `/skills`; para plugins, aplicar `/reload-plugins` o reiniciar Claude Code cuando corresponda.

No copiar una skill personal al repositorio sin permiso de su propietario ni versionar contenido cuya licencia no lo permita.

## Validación y cierre

1. Confirmar que cada skill de proyecto tenga un `SKILL.md` válido.
2. Confirmar que el nombre del directorio coincida con el comando `/nombre` esperado.
3. Ejecutar `/skills` y probar al menos un pedido que deba activarla.
4. Actualizar el catálogo y cualquier instrucción afectada en `CLAUDE.md`.
5. Revisar el diff, crear un commit descriptivo y subirlo según el protocolo del repositorio.
6. Informar qué skill se agregó o cambió, cómo se invoca y si alguien debe reiniciar o instalar una dependencia externa.
