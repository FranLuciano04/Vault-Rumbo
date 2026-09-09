---
tipo: decision
estado: en-revision
modulo: []
decisores: [Paloma, Nahuel, Francisco]
fecha_aprobacion:
supersede:
actualizado: 09/09/26
---
# DEC-0001 Stack tecnológico

tags:: #tipo/decision #estado/en-revision #pc/pc1

## Contexto
Rumbo es un proyecto integrador con web, mobile, backend, base de datos relacional, API REST e IA. Necesitamos fijar el stack antes de PC1 para que dominio y arquitectura sean coherentes.

## Decisión
- **Web:** SPA en **React**.
- **Mobile:** **React Native**.
- **Backend:** **API REST** (JSON).
- **Base de datos:** **PostgreSQL** (relacional).
- **IA:** **Claude** (Anthropic), vía Claude Code como agente de desarrollo.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| React + React Native | Un lenguaje (JS/TS), equipo con experiencia, reúso de lógica | Dos apps a mantener | ✅ |
| Solo web responsive | Menos superficie | El relevamiento pide mobile | ❌ |
| Otro LLM | — | Los 3 ya pagan y conocen Claude | ❌ (ver relevamiento) |

## Justificación
El equipo ya usa Claude (versión paga, experiencia previa → cero curva). React/React Native maximizan reúso y encajan con un backend REST + PostgreSQL clásico y verificable.

## Impacto
- Afecta: [[ARQ — Vista general]], todas las entidades (persistencia en PostgreSQL).
- Restricciones: alcance sin pagos online ni GDS ([[Alcance y fuera de alcance]]).

## Decisores y fecha
- Decisores: Paloma, Nahuel, Francisco — Aprobada: _(pendiente sync)_

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
