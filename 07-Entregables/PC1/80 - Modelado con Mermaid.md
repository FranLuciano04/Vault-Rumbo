Todos los diagramas de Rumbo se escriben como **código Mermaid.js** dentro de la nota que los explica, y se exportan a imagen solo para los documentos y la presentación.

## Por qué Mermaid

- **Diagramas como código:** el diagrama es texto, se versiona en Git junto con el resto del proyecto y cada cambio queda registrado con su autor. Dos personas no pisan el mismo diagrama sin que se note.
- **Una sola fuente:** la imagen se genera desde el código; nunca se edita a mano. Si cambia el modelo, se cambia el código y se vuelve a exportar.
- **Cobertura UML:** Mermaid dibuja de forma nativa diagramas de clases, de secuencia, de estados y entidad-relación. Los de casos de uso, actividad y C4 se representan con diagramas de flujo, con la notación de cada uno.
- **Gratis y portable:** no requiere cuenta ni licencia, y lo integran el editor del equipo (Obsidian) y GitHub.

## Cómo se trabaja

- Se usa el motor de diseño **ELK**, que dibuja líneas rectas y ortogonales y ordena mejor los diagramas grandes.
- Cada tipo de diagrama tiene un script que exporta sus imágenes con `mermaid-cli` (`npx @mermaid-js/mermaid-cli`), en alta resolución para que se lean impresas.
- Las convenciones de notación de los diagramas de actividad y de secuencia quedaron registradas como una decisión del equipo.

| Tipo de diagrama | Cantidad |
|---|---|
| Casos de uso | 1 |
| Clases (vista principal y enumeraciones) | 4 |
| Entidad-relación | 1 |
| Estados | 6 |
| Actividad | 5 |
| Secuencia (negocio, análisis y diseño) | 5 |
| Arquitectura (despliegue, monorepo, capas y módulos) | 4 |
| C4 (contexto, contenedores y componentes) | 3 |
| MVC y modelo conceptual por capa | 2 |
| Proceso de trabajo (agente e iteraciones y calidad) | 3 |

## Ejemplo

Este es el código completo del diagrama del pipeline de calidad de la sección de modelo de desarrollo, y la imagen que se genera a partir de él:

```
flowchart LR
    Push(["Cambio en el código"]) --> Lint["Estilo y análisis estático"]
    Lint --> Tipos["Chequeo de tipos"]
    Tipos --> Tests["Pruebas automáticas"]
    Tests --> Seg["Seguridad: dependencias,<br/>código y secretos"]
    Seg --> Deploy(["Despliegue en el servidor<br/>solo desde la rama principal"])
```

![Imagen generada desde el código de arriba.](DES-pipeline-calidad.png){ width=100% }
