---
tipo: caso-uso
estado: formalizado
modulo: [redes]
responsable: Paloma
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-20 Generar propuesta de contenido con IA

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
El empleado genera **borradores** de [[ContenidoRed]] asistidos por IA para agilizar la creación de posteos. La persona revisa y edita el resultado; **no hay publicación automática** ([[Alcance y fuera de alcance]]). La IA es Claude (ver [[DEC-0001 Stack tecnológico]]).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- Servicio de IA (Claude) — genera los borradores a pedido.

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre **Generar propuesta con IA** (desde una pieza de [[ContenidoRed]] o desde cero).
2. Indica el **tema/destino**, el **canal** y el **tono/objetivo** (p. ej. promocionar un destino, anunciar una oferta).
3. El sistema pide a la **IA** uno o varios **borradores** de texto/idea, usando únicamente lo que indicó el empleado (tema, canal, tono); **no accede a datos del negocio** (clientes, catálogo, ventas).
4. El empleado **revisa y edita** el borrador, y guarda el elegido en una pieza de [[ContenidoRed]] (columna *idea* o *en producción* de [[CU-19 Planificar contenido en redes]]).
5. El sistema confirma; **la publicación en la red la hace una persona** ([[Alcance y fuera de alcance]]).

## Flujos alternativos
- **A1 — Regenerar:** el borrador no convence → el empleado ajusta el tema/tono y pide otra propuesta.
- **A2 — Descartar:** ninguna propuesta sirve → no se guarda nada.
- **A3 — Desde una pieza existente:** la propuesta se genera en el contexto de una [[ContenidoRed]] ya creada en el kanban ([[CU-19 Planificar contenido en redes]]).

## Postcondiciones
- Existe un **borrador** de [[ContenidoRed]] generado por IA y **revisado por una persona**, listo para avanzar en el kanban ([[CU-19 Planificar contenido en redes]]).
- Nada se publica automáticamente.

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU.)
- **Sin publicación automática:** la IA propone, la persona decide y publica manualmente ([[Alcance y fuera de alcance]]).

## Entidades del dominio involucradas
- [[ContenidoRed]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la generación asistida.

## Decisiones asociadas
- [[DEC-0001 Stack tecnológico]] (la IA del producto es Claude).

## 🔎 Revisión
> [!note] Paloma (10/09): **Confirmado:** la IA genera a partir de **solo el prompt** del empleado (tema, canal, tono); **no usa datos del negocio** como contexto. Esto mantiene acotada la integración para PC2.
