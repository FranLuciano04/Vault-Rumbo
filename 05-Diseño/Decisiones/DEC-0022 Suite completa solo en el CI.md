---
tipo: decision
estado: en-revision
modulo: [proceso]
decisores: []
fecha_aprobacion:
supersede: DEC-0014 (en parte: paso 6 «Checks» de /implementar-ticket)
actualizado: 27/10/26
---
# DEC-0022 Suite completa solo en el CI

tags:: #tipo/decision #estado/en-revision #pc/pc2 #accion/decidir

> **Borrador, propuesto por Nahuel el 27/10/26 a partir de la retro de T-066. Hace falta que el equipo lo apruebe.** Mientras no se apruebe, sigue vigente el paso 6 actual.

## Contexto
- **Qué dice hoy el flujo:** el paso 6 de `/implementar-ticket` ([[Flujo de implementación]], T-154) corre la suite completa del backend en la PC antes de abrir el PR. Después, el CI del PR la vuelve a correr entera.
- **Qué pasó en T-066 (PR #111):**

  | Dónde | Corrida | Tiempo |
  |---|---|---|
  | PC (4 núcleos, Windows) | `pytest -n auto --cov=rumbo` | 9 min 31 s |
  | PC | segunda corrida para la cobertura de `negocio/` (ya corregida: ahora sale de `coverage report`, como en el CI) | 12 min 19 s |
  | CI | job «Backend» completo | 3 min 56 s |

- **El problema:** aun con una sola corrida local, cada ticket de backend espera unos 10 minutos para repetir lo que el CI hace en 4 y que de todos modos se exige antes de mergear.
- **Por qué el CI no tiene que esperar a la PC:** `main` no exige checks (plan gratuito de GitHub), pero el paso 7 ya espera el CI en verde antes de mergear.

## Decisión (propuesta)
- **En la PC, en el paso 6:** se corren solo los checks rápidos de cada parte tocada. Son lint, formato y type-check, más los tests del ticket y de sus vecinos directos, que es el mismo `--test` de las fases.
- **En el CI del PR:** la suite completa, con `test_contrato_m1.py` y sus equivalentes, y los umbrales de cobertura pasan a correr solo ahí.
- **Si el CI falla:** se trata como hoy se trata una falla en los checks. Se arregla en la misma rama, en modo fix (DEC-0019), y se espera de nuevo el CI.
- **Excepción:** si el ticket toca algo compartido, como `core/`, los modelos, las migraciones o `conftest.py`, la suite completa se corre igual en la PC antes del PR.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Dejar todo como está (suite completa local, con una sola corrida) | Se detecta una regresión antes de abrir el PR | Unos 10 minutos por ticket de backend que repiten lo que hace el CI | |
| **Suite completa solo en el CI, con excepción para lo compartido** | El CI tarda 4 minutos en vez de 10 y no ocupa la PC; la excepción cubre lo más riesgoso | Una regresión fuera de los vecinos se ve con el PR ya abierto y cuesta una vuelta más de CI | Propuesta |
| Suite completa solo en el CI, sin excepción | Lo más simple | Los cambios en código compartido son justo los que más rompen fuera de los vecinos | |
| Acelerar la suite local (perfilar con `--durations`, más workers) | Mantiene la verificación local | Esfuerzo incierto; la PC tiene 4 núcleos | Complementaria |

## Justificación
- **El CI ya es la barrera:** es obligatorio esperarlo en verde antes de mergear, así que la corrida local es una red repetida.
- **Costo de una falla:** si aparece una regresión, cuesta una vuelta de unos 4 minutos de CI. Hoy cada ticket paga unos 10 minutos, falle o no.
- **Riesgo:** la excepción para el código compartido mantiene la corrida local donde es más probable que aparezca una regresión.

## Impacto
- **Documentos y skills que cambian:**
  - [[Flujo de implementación]] (DEC-0014, T-154).
  - `.claude/skills/implementar-ticket/SKILL.md`, paso 6.
  - [[Spec de implementación]] §4.
- **Restricciones que respeta:** no cambia el CI, los umbrales de cobertura ni el TDD de las fases.

## Decisores y fecha
- Decisores: <Paloma / Nahuel / Francisco>
- Aprobada: (pendiente)

## Estado / supersesión
En revisión. Si se aprueba, se actualizan los tres documentos de «Impacto» y se completa `fecha_aprobacion`.
