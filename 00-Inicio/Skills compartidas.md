---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
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

## Dependencias externas (no son skills)
| Herramienta | Estado | Fuente / instalación | Para qué |
|---|---|---|---|
| pandoc | requerida al compilar entregables | `winget install --id JohnMacFarlane.Pandoc` (Windows) · https://pandoc.org/installing.html | Generar los `.docx` entregables desde los `.md`. Ver [[Entregables — índice]] y [[Especificación de casos de uso — flujo]]. Solo la necesita quien compila el entregable. |

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
