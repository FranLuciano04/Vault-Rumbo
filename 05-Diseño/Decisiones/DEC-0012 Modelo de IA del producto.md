---
tipo: decision
estado: formalizado
modulo: []
decisores: [Francisco, Nahuel, Paloma]
fecha_aprobacion: 29/09/26
supersede:
actualizado: 29/09/26
---
# DEC-0012 Modelo de IA del producto

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ✅ **Decidida por el equipo completo el 29/09/26** (Francisco, Nahuel y Paloma).

## Contexto
La única función de Rumbo que usa IA es [[CU-20 Generar propuesta de contenido con IA|CU-20]]: a partir del tema, el canal y el tono, genera un borrador de posteo en español que una persona revisa antes de usarlo. [[DEC-0001 Stack tecnológico]] ya fijó LangChain y Claude. Falta elegir qué modelo de Claude se usa. El volumen esperado es bajo: unas decenas de borradores por mes.

## Decisión
- **Modelo: Claude Sonnet 5.5** (`claude-sonnet-5-5`).
- **Integración:** el backend arma, con LangChain, una plantilla de prompt con tres variables (tema, canal y tono) y devuelve un único borrador por pedido, que se puede regenerar. El modelo **no recibe datos de clientes** ni **publica** nada: la publicación sigue siendo manual ([[Alcance y fuera de alcance]]).

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Claude Sonnet 5.5 | Mejor calidad de texto en español; USD 2 por millón de tokens de entrada y USD 10 de salida | Duplica el precio de Haiku | ✅ |
| Claude Haiku 4.5 | Más rápido; USD 1 de entrada y USD 5 de salida por millón de tokens | Texto de marketing de menor calidad | ❌ |

## Justificación
Con unas decenas de borradores por mes, el costo es despreciable con cualquiera de los dos modelos: la diferencia se mide en centavos de dólar por mes. Lo que la agencia percibe es la calidad del texto, así que se elige el modelo de más calidad. Precios de la API de Anthropic al 25/09/26.

## Impacto
- [[CU-20 Generar propuesta de contenido con IA|CU-20]] y [[ARQ — Vista general]] (integración de la API con Claude).
- La IA **para desarrollar** (Claude Code como agente del equipo) es otra cosa y se documenta aparte, en [[IA — Agentes del proyecto]].

## Decisores y fecha
- Decisores: Francisco, Nahuel y Paloma — **aprobada el 29/09/26**.

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
