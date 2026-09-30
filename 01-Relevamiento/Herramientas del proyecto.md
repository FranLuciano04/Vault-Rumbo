---
tipo: referencia
estado: formalizado
responsable: equipo
pc: pc1
actualizado: 30/09/26
---
# Herramientas del proyecto

tags:: #tipo/referencia #estado/formalizado #pc/pc1

Las dos herramientas transversales que el equipo eligió antes de empezar a trabajar: el **agente de inteligencia artificial** que acompaña el desarrollo y la **herramienta de modelado** con la que se construyen los diagramas.

## Agente de IA: Claude

Por acuerdo unánime de los tres integrantes se adoptó **Claude** (Anthropic) como agente de inteligencia artificial de trabajo. La elección se apoya en dos razones prácticas: los tres ya cuentan con la versión paga y todos tienen experiencia previa usándola en proyectos, lo que reduce la curva de aprendizaje y permite ser productivos desde el primer día.

### Por qué es la mejor opción para este caso
- **Ventana de contexto amplia:** permite trabajar con gran cantidad de información del proyecto (requisitos, código, documentación) en una sola conversación, algo útil para un sistema con varios módulos como Rumbo.
- **Fortaleza en programación y razonamiento:** buen desempeño en generación y revisión de código y en el análisis de problemas, lo que acompaña bien un proyecto integrador con web, mobile, backend y API REST.
- **Uso de herramientas y agente de código:** se integra con el flujo de desarrollo —por ejemplo, a través de Claude Code— para leer y editar archivos del proyecto, no solo responder preguntas sueltas.
- **Experiencia previa del equipo:** al haberlo usado en otros proyectos, el equipo conoce su forma de trabajo y puede aprovecharlo mejor que una herramienta nueva.
- **Disponibilidad inmediata:** los tres integrantes disponen de la versión paga, por lo que no hay costos ni gestiones adicionales para empezar a usarlo.

### Comparativa con otras herramientas de IA

Antes de decidir se compararon los principales asistentes de IA para desarrollo, considerando su enfoque, su desempeño en programación, el acceso del equipo y la experiencia previa:

| Herramienta | Enfoque / integración | Desempeño en código | Acceso para el equipo | Decisión |
|---|---|---|---|---|
| **Claude (Anthropic)** | Asistente conversacional + agente de código (Claude Code) que lee y edita archivos del repositorio. | Encabeza SWE-bench Verified a sept. 2026. | Los tres tienen la versión paga y experiencia previa. | **Elegida (principal)** |
| ChatGPT / GPT (OpenAI) | Asistente general muy difundido, con modo agente para código. | Entre los primeros, a la par de Claude. | Requiere sumar suscripción; menos experiencia del equipo. | No elegida |
| Gemini (Google) | Fuerte en contexto largo y análisis de repositorios completos; buen precio. | Competitivo, cerca del tope. | Sin experiencia previa del equipo. | No elegida |
| GitHub Copilot | Autocompletado dentro del editor, cómodo para escribir código línea a línea. | Bueno para completar, más débil para razonar el diseño completo. | Suscripción aparte. | Complementaria (opcional) |
| Cursor | Editor con IA integrada que usa modelos de terceros por debajo. | Depende del modelo que utilice. | Otra herramienta a incorporar al flujo. | No elegida |

**Dónde se ubica Claude:** a septiembre de 2026 los modelos de Claude encabezan SWE-bench Verified (Claude Opus 5 ≈ 96–97 %), a la par de GPT-5.6 (≈ 96 %) y por delante de la mayoría de las alternativas. Como cada benchmark puede coronar a un modelo distinto y los puestos cambian seguido, se toma como referencia y no como dato absoluto.

**Factor decisivo:** el equipo ya está acostumbrado a usar Claude por haberla utilizado en otros proyectos, lo que reduce la curva de aprendizaje, y los tres cuentan con la versión paga; eso los deja productivos desde el primer día sin costos ni gestiones adicionales.

### Dos usos de la IA: para desarrollar y dentro del producto
En Rumbo la IA aparece en dos lugares distintos, con decisiones y justificaciones separadas:

| | IA para desarrollar | IA dentro del producto |
|---|---|---|
| **Qué es** | El agente con el que el equipo analiza, diseña y programa Rumbo | Una función que usan los empleados de la agencia |
| **Quién la usa** | Los tres integrantes del equipo | El empleado con acceso al módulo de redes |
| **Herramienta y modelo** | Claude Code, con Claude Opus o Sonnet según la tarea | Claude Sonnet 5.5, llamado desde el backend con LangChain |
| **Para qué** | Especificar casos de uso, modelar el dominio, dibujar diagramas, generar entregables y escribir código | Generar un borrador de posteo a partir del tema, el canal y el tono ([[CU-20 Generar propuesta de contenido con IA\|CU-20]]) |
| **Qué datos ve** | El vault y el código del proyecto | Solo el tema, el canal y el tono: ningún dato de clientes |
| **Costo** | Incluido en la suscripción paga de cada integrante | Por uso de la API; con unas decenas de borradores por mes, centavos de dólar |

La IA **para desarrollar** se eligió por las razones de arriba: experiencia del equipo, suscripción disponible y desempeño en código. La IA **del producto** se eligió con otro criterio: como la agencia solo percibe la calidad del texto en español y el volumen es bajo, se prefirió Sonnet 5.5 frente a Haiku 4.5, aunque cueste el doble. En los dos casos una persona revisa el resultado: el equipo revisa lo que produce el agente y el empleado revisa el borrador antes de publicarlo a mano, porque la publicación automática en redes está fuera del alcance ([[Alcance y fuera de alcance]]).

Los agentes que usa el equipo, y el enlace a la decisión sobre el modelo del producto, están en [[IA — Agentes del proyecto]].

## Herramienta de modelado: Mermaid

Para los diagramas del diseño (UML) se usa **Mermaid**, que suma el modelado al mismo flujo de trabajo del código.

- **Diagramas como código:** el diagrama se escribe como texto, se versiona en Git junto al código y se edita en segundos.
- **Gratis y portable:** no requiere cuenta ni licencia y renderiza a SVG (vectorial), fácil de insertar en documentos y presentaciones.
- **Cobertura UML:** genera de forma nativa diagramas de clases, de secuencia y de estados; el de casos de uso se representa con un diagrama de flujo que hace de límite del sistema.
- **Frente a Lucid, Miro o draw.io:** se eligió Mermaid por rapidez de iteración e integración con el repositorio; si se necesitara la notación estricta de casos de uso, se complementa con esas herramientas.

## 🔎 Revisión
> [!note] Nahuel (22/09) — nota creada al incorporar el relevamiento al pipeline de entregables; el contenido venía del `.docx` original, que no tenía fuente en el vault. El stack **del producto** es otra cosa y vive en [[DEC-0001 Stack tecnológico]]; esta nota es solo sobre las herramientas **de trabajo del equipo**. Convención vigente: los diagramas se escriben en Mermaid dentro de su nota y se renderizan a imagen solo cuando entran a un entregable ([[PL-Diagrama Mermaid]]).
