---
tipo: analisis
estado: borrador
modulo: []
responsable: Francisco
pc: pc1
actualizado: 29/09/26
---
# IA — Agentes del proyecto

tags:: #tipo/analisis #estado/borrador #pc/pc1

> Responde a la lámina del PC1 «Agentes IA implementados». El foco son los **agentes que el equipo usa para planificar y desarrollar** Rumbo. La IA **dentro del producto** se documenta en lo mínimo indispensable en [[DEC-0012 Modelo de IA del producto]].
>
> ⏳ Paso **E3** del plan a 3 días (frente de Francisco). El 29/09 se dejó armado el diagrama del ciclo de trabajo; falta completar las fichas de cada agente.

## Ciclo de trabajo con el agente
Cada sesión de trabajo con Claude Code sigue el mismo ciclo, definido en [[CLAUDE|CLAUDE.md]]. El vault versionado con Git funciona como **memoria compartida**: lo que no queda escrito en el vault no sobrevive al chat, y cada integrante retoma desde lo que dejó el otro.

```mermaid
flowchart TD
    Inicio(["Inicio de sesión"]) --> Ident["Identifica a la persona por su usuario de Git"]
    Ident --> Pull["git status y git pull<br/>trae el trabajo del resto del equipo"]
    Pull --> Leer["Lee Estado del proyecto,<br/>Bitácora de sesiones y memoria del proyecto"]
    Leer --> Contexto["Abre solo las notas de la tarea<br/>entrando por su MOC y sus DEC"]
    Contexto --> Tarea{"¿Qué pide la persona?"}
    Tarea -->|"Decidir"| Grill["Entrevista de diseño<br/>preguntas con recomendación"]
    Tarea -->|"Explorar el vault"| Sub["Subagentes de búsqueda"]
    Tarea -->|"Producir"| Hacer["Escribe notas, diagramas Mermaid,<br/>entregables o código"]
    Grill --> Hacer
    Sub --> Hacer
    Hacer --> Registrar["Actualiza la nota fuente, el Estado del proyecto<br/>y la Bitácora de sesiones"]
    Registrar --> Commit["Commit con la identidad de la persona"]
    Commit --> Sync["git pull --rebase y git push"]
    Sync --> Fin(["Fin de sesión"])
    Sync -. "la próxima sesión, de cualquier integrante,<br/>arranca desde acá" .-> Inicio
```

## Agentes (a completar)
Para cada agente: rol, modelo, herramientas, de dónde toma el contexto, límites y un ejemplo real de uso.

- **Claude Code** (agente principal, con Claude Opus y Claude Sonnet según la tarea): *a completar*.
- **Subagentes** (búsqueda y exploración del vault): *a completar*.
- **MCP de Figma** (prototipo de interfaces): *a completar*.
