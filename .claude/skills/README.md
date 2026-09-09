# Skills compartidas de Rumbo

Esta carpeta contiene las skills de Claude Code propias del proyecto. Cada skill vive en:

```text
.claude/skills/<nombre-de-skill>/
├── SKILL.md              # entrada obligatoria
├── references/           # referencias opcionales
├── scripts/              # automatizaciones opcionales
└── assets/               # recursos opcionales
```

Claude Code descubre automáticamente las skills de proyecto después de clonar o actualizar el repositorio. No hay que copiarlas a `~/.claude/skills/` ni instalarlas por separado en cada computadora.

Si `.claude/skills/` se creó después de iniciar una sesión, reiniciar Claude Code una vez. Las ediciones posteriores de `SKILL.md` se detectan en vivo; después de cambiar scripts u otros recursos de apoyo, reiniciar la sesión para asegurar que se use la versión nueva.

El catálogo, las reglas para agregar skills y las instalaciones externas están en [`00-Inicio/Skills compartidas.md`](../../00-Inicio/Skills%20compartidas.md).

## Regla de incorporación

Toda skill nueva debe:

1. Guardarse en esta carpeta si es específica del proyecto y su licencia permite versionarla.
2. Tener un `SKILL.md` con `name` y una `description` precisa.
3. Incluir dentro de su directorio todos los recursos necesarios.
4. Registrarse en el catálogo del vault.
5. Probarse desde Claude Code con `/skills` y con una invocación real.
6. Subirse a GitHub en el mismo commit que actualiza el catálogo.

Los plugins y las skills externas que no deban copiarse se registran en el catálogo con fuente, versión y comando de instalación. Claude debe avisar si una de ellas está marcada como requerida y falta en la sesión actual.
