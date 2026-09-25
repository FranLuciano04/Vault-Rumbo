---
tipo: decision
estado: en-revision
modulo: []
decisores: [Nahuel]
fecha_aprobacion:
supersede:
actualizado: 25/09/26
---
# DEC-0010 Notación de los diagramas de actividad y de secuencia

tags:: #tipo/decision #estado/en-revision #accion/revisar

## Contexto
El checklist de PC1 pide diagramas de **actividad** de los flujos clave, y el equipo también va a hacer diagramas de **secuencia**. El 25/09 se dibujaron primero los de actividad con la sintaxis de secuencia de Mermaid, por una confusión sobre qué formato correspondía a cada tipo. Nahuel lo aclaró:
- los diagramas de **secuencia** siguen el formato de la [documentación de Mermaid](https://mermaid.ai/open-source/syntax/sequenceDiagram.html) y representan **cada clase dentro del sistema** como participante;
- los diagramas de **actividad** siguen el formato UML clásico: nodo inicial, acciones, decisiones, final y **carriles** por participante.

Al rehacerlos apareció un límite técnico: **Mermaid no dibuja carriles en columnas.** Se probaron subgrafos con ELK, con el motor por defecto y con `flowchart LR` + `direction TB`; en los tres casos los carriles se apilan o se desordenan. El diagrama de bloques (`block-beta`) falla al dibujar flechas en Mermaid 12. La regla del vault es que los diagramas de diseño se hagan en Mermaid ([[CLAUDE|CLAUDE.md]]).

## Decisión
**Diagramas de actividad** (`DGM-ACT`, en `02-Analisis/Diagramas de actividad/`):
- `flowchart` de Mermaid con la **notación UML de actividad**: nodo inicial ●, final ◉, acciones redondeadas, rombo de decisión y de fusión, barra de fork/join, guardas entre corchetes.
- **Carril escrito dentro de cada acción**, como admite UML para las particiones: `(Empleado) Registra el cobro`, reforzado con un color por carril (amarillo = Cliente, azul = Empleado, gris = Sistema).
- **Un marco por paso del camino principal** del caso de uso, con su número y nombre, y el código del flujo alternativo en la guarda de la rama que lo origina. Los flujos que ocurren en otro momento (por ejemplo, revertir un cobro) van como **actividad aparte**, con su propio nodo inicial.
- Encabezado `%%{init}%%` común (motor ELK y un `themeCSS` para los nodos inicial y final), copiado de [[DGM-ACT — De la consulta a la venta]].

**Diagramas de secuencia** (`DGM-SEC`, en `02-Analisis/`):
- `sequenceDiagram` de Mermaid, con **las clases del sistema como participantes** (además de los actores), según la documentación enlazada arriba.
- El detalle de convenciones (qué clases aparecen, si se usan los tipos de participante `boundary`/`control`/`entity`, nombres de los mensajes) se define al construir el primero y se agrega acá.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Actividad en Mermaid, carril escrito en la acción + color | Respeta la regla de Mermaid; se ve en Obsidian; versionable | Sin columnas visuales de carriles | ✅ |
| Actividad en PlantUML | Carriles nativos, idéntico al UML de referencia | Rompe la regla de Mermaid; exige Java y `plantuml.jar` (no hay Java en la PC de Nahuel) y un plugin de Obsidian | ❌ |
| Actividad con sintaxis de secuencia de Mermaid | Carriles como líneas de vida | No es notación de actividad; se confunde con los diagramas de secuencia | ❌ (versión descartada del 25/09) |
| Actividad con `block-beta` en grilla | Columnas fijas | Falla al dibujar flechas en Mermaid 12; flechas rectas que se cruzan | ❌ |

## Justificación
Se prioriza mantener **una sola herramienta** de diagramas, versionable y visible en Obsidian sin instalar nada, sobre la fidelidad visual de los carriles. La notación de partición dentro de la acción es UML válido, así que el diagrama sigue siendo correcto aunque no dibuje columnas. Separar con claridad los dos formatos evita volver a confundir actividad con secuencia.

## Impacto
- Diagramas afectados: los 5 `DGM-ACT` de `02-Analisis/Diagramas de actividad/` y los futuros `DGM-SEC`.
- Restricciones que respeta: diagramas en Mermaid ([[CLAUDE|CLAUDE.md]]), sin dependencias nuevas.
- ⚠️ Las formas `@{ shape: … }` requieren Mermaid 11.3 o superior: falta verificar que el Obsidian del equipo las renderice.

## Decisores y fecha
- Decisores: Nahuel (25/09/26). **A ratificar en la sync** con Francisco y Paloma.
- Aprobada: _(pendiente)_

## Vínculo con el código (a partir de PC2)
- No aplica.

## Estado / supersesión
Nueva. No reemplaza a ninguna.
