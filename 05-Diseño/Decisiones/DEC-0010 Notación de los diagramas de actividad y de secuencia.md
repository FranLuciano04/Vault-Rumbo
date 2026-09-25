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

**Diagramas de secuencia** (`DGM-SEC`, en `02-Analisis/Diagramas de secuencia/` salvo el principal del relevamiento, que queda en `02-Analisis/` como vista de negocio — ver más abajo):
- `sequenceDiagram` de Mermaid, con **las clases del sistema como participantes** (además de los actores), según la documentación enlazada arriba.
- **Convenciones acordadas con Nahuel el 25/09** al construir los dos primeros (CU-07 y CU-12):
  - **Participantes:** actores (`actor`) más una capa **boundary-control-entity** parcial: una **única clase de control** por diagrama, `Sistema Rumbo <<control>>` (mismo nombre que usa [[DGM-SEC — De la consulta a la venta]] para la caja negra de negocio), que media entre los actores y las **clases de dominio** del [[DGM — Diagrama de clases]] usadas ese CU, marcadas `<<entity>>` (`Viaje <<entity>>`, `Pago <<entity>>`, etc.). **No hay clase boundary** (pantalla/formulario): no está modelada como clase de dominio y el vault no define pantallas en PC1 (eso es el prototipo de Figma).
  - **Solo entran las clases que el CU manipula**, no las 13 del dominio. Se elige por CU, igual que el análisis ya usaba "Entidades del dominio involucradas" en cada nota `CU-`.
  - **Mensajes en español, en lenguaje natural** (no firmas de método `nombreMetodo(args)`): `E->>S: Carga destino, fechas, categoría y responsable`. Motivo: el [[DGM — Diagrama de clases]] es de dominio y **no lleva operaciones**; inventar firmas de método en la secuencia sugeriría un contrato de API que todavía no se diseñó (eso es tarea de PC2/arquitectura). El mensaje describe la **interacción**, no un método real.
  - **Un marco (`Note over`) por paso del camino principal**, igual que en los `DGM-ACT`, para poder cruzar el diagrama con la tabla de trazabilidad del CU. El flujo alternativo que abre una rama usa `alt`/`opt`; el paralelo real (ej. las dos alertas de CU-07 paso 4) usa `par`/`and`. Un **flujo aparte** que ocurre en otro momento (ej. revertir un cobro) **no necesita un truco de layout** como en actividad: al ser un diagrama de secuencia ya es cronológico de arriba a abajo, así que se dibuja simplemente más abajo, con una `Note` que lo anuncia (`A3 · Corregir un cobro mal registrado (flujo aparte)`).
  - **Cambios de estado** en la respuesta de la entidad, citando la transición: `V-->>S: reservado (EST-Viaje T1)`.
  - `autonumber` y la misma paleta (`%%{init}%%` con `theme: base`) que [[DGM-SEC — De la consulta a la venta]], para que los dos tipos de `DGM-SEC` se vean parientes.
- **El `DGM-SEC` del relevamiento no se toca:** [[DGM-SEC — De la consulta a la venta]] queda como está (actores + "Sistema Rumbo" como caja negra) porque es la Figura 1 del entregable de relevamiento, un documento de negocio para la agencia; los `DGM-SEC` nuevos con clases son la vista de **análisis/diseño**, en una nota aparte por CU.

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
