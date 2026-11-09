---
tipo: decision
estado: en-revision
modulo: [M9]
decisores: [Paloma]
fecha_aprobacion:
supersede:
actualizado: 09/11/26
---
# DEC-0027 Título y cantidad de borradores de la IA

tags:: #tipo/decision #estado/en-revision #pc/pc2 #accion/decidir

> 🟡 **Decidida por Paloma el 09/11/26**, como responsable de [[CU-20 Generar propuesta de contenido con IA|CU-20]], para destrabar [[T-131 Generar borradores de contenido con IA|T-131]]. Nahuel la ratificó el 09/11/26; falta Francisco. T-131 se implementa con esta decisión.

## Contexto
El contrato de `POST /contenidos/propuestas-ia` devuelve `PropuestaIA.borradores`, una lista de `BorradorContenido {titulo, texto}`. El borrador de [[IA — Prompt de CU-20]] tiene dos diferencias con ese contrato:
- **Título:** el prompt le pide a la IA solo el texto del posteo, no un título.
- **Cantidad:** el prompt pide «UN borrador», pero la pantalla 27 del [[Prototipo UI]] muestra dos («Elegido» y «Opción»).

La web de [[T-133 Pedir una propuesta de contenido con IA en la web|T-133]] usa el título solo en un caso: precarga el campo «Título», que es editable, cuando la pieza nueva sale del encabezado (CU-20 A4). Desde una pieza existente no se usa, porque la pieza conserva su título (CU-20 A3).

## Decisión
1. **El título sale del tema del pedido.** El backend completa `BorradorContenido.titulo` con el `tema` que escribió el empleado, sin espacios en los extremos y recortado a 200 caracteres (el máximo de `ContenidoRed.titulo`). La IA no genera títulos, y el contrato no cambia.
2. **Cada pedido devuelve 2 borradores distintos**, como en el prototipo. Se pide con **una sola llamada** a Claude Sonnet 5.5, como dice [[DEC-0012 Modelo de IA del producto|DEC-0012]], con salida estructurada: una lista de 2 textos. El prompt de sistema pasa de «proponer UN borrador» a «proponer DOS borradores distintos entre sí».
3. Si la respuesta de la IA no trae 2 textos válidos, se trata como un error de la IA: `502` problem+json, igual que una falla del modelo (RF-122).

## Alternativas consideradas
- **Que la IA genere también el título:** da títulos más variados, pero agrega un campo más al prompt, al parseo y a los errores posibles, y el empleado igual lo revisa. Se descarta.
- **Sacar `titulo` del contrato:** obliga a regenerar el OpenAPI y los tipos, y a cambiar la web de T-133 justo antes de la entrega. Se descarta.
- **Un borrador por pedido:** respeta el prompt actual, pero se aparta del prototipo, y el empleado tendría que regenerar para comparar. Se descarta.

## Consecuencias
- T-131 implementa los puntos 1 a 3. Sus tests verifican que el título sea el tema y que lleguen 2 borradores.
- [[IA — Prompt de CU-20]] tiene que actualizar el prompt de sistema («DOS borradores») y la sección «Cómo se arma el pedido». El prompt versionado en `negocio/prompts/contenido_red.py` sale de esa nota.
- La web no cambia: ya muestra N borradores y precarga el título.
