---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 10/09/26
---
# Bitácora de sesiones

tags:: #tipo/referencia #estado/formalizado

> Registro cronológico **breve** de cada sesión de trabajo (una entrada por sesión, la más reciente arriba). Es la memoria compartida de "qué se hizo": el vault, no la memoria privada de cada Claude.
>
> **Cómo usarla:** al cerrar la sesión, agregar una entrada corta según [[CLAUDE|CLAUDE.md#Cómo cerrar cada sesión]]. No copiar contenido: enlazar a notas, `DEC-` y commits. Complementa a [[Estado del proyecto]] (que es la foto actual y se mantiene corta).

## Formato
```
## dd/mm/aa — <persona> (<modelo>)
- **Hecho:** …
- **Commits:** <hash>, <hash>
- **Pendiente:** …
```

## 10/09/26 — Francisco (Claude Opus 4.8)
- **Hecho:** Se resolvieron tres decisiones de dominio ([[DEC-0003 Relación Viaje–Hotel y Reseña]], [[DEC-0004 Comisión configurable por porcentaje]], [[DEC-0005 Autenticación y modelo de roles]]) y se reconcilió [[Actores]] con los nuevos roles. Se definió el **catálogo completo de casos de uso** (24 CU + núcleo [[CU-01 De la consulta a la venta|CU-01]]) con [[DGM — Casos de uso|diagrama]] y división entre los tres. Se creó el flujo **md-fuente / docx-derivado** ([[Especificación de casos de uso — flujo]]) y la sección [[Entregables — índice]]; se registró **pandoc** en [[Skills compartidas]] y se agregaron punteros en [[CLAUDE|CLAUDE.md]] y el Home. Se instauró esta **bitácora de sesiones** como dinámica de cierre. Se especificó [[CU-04 Registrar consulta]] como ejemplo de referencia y se dejó de versionar `.obsidian/graph.json`. Se amplió el **checklist de PC1** con el set completo de entregables UML (obligatorios vs recomendados), fijando que los diagramas van en Mermaid y el prototipo UI en Figma (MCP).
- **Commits:** 20f3cc8, 1bea1f9, f17a0dd, a1dbcf5, 7c6e5fe.
- **Pendiente:** ratificar DEC-0003/0004/0005 y formalizar [[DEC-0001 Stack tecnológico]] en la sync; especificar los CU restantes (en `borrador`); definir mecanismo de autenticación e infraestructura; instalar pandoc al compilar el primer entregable.
