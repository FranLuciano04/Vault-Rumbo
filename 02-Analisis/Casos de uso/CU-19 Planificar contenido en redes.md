---
tipo: caso-uso
estado: formalizado
modulo: [redes]
responsable: Paloma
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-19 Planificar contenido en redes

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
El empleado planifica las piezas de [[ContenidoRed]] en un **tablero kanban** con calendario, moviéndolas por estados hasta su publicación. El sistema organiza; **no publica automáticamente** ([[Alcance y fuera de alcance]]).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
-

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre el **tablero kanban** de contenido de redes.
2. Crea una pieza de [[ContenidoRed]] con **título/idea**, **canal** (Instagram · TikTok · canal de ventas de WhatsApp) y **fecha de publicación** programada; nace en la columna **idea**.
3. A medida que avanza, mueve la pieza entre columnas: **idea → en producción → listo → publicado**.
4. Edita título, canal o fecha cuando haga falta, y consulta el **calendario** de publicaciones programadas.
5. El sistema guarda el estado kanban y la planificación.

## Flujos alternativos
- **A1 — Generar borrador con IA:** desde una pieza en *idea* o *en producción*, el empleado invoca [[CU-20 Generar propuesta de contenido con IA]] para obtener un borrador.
- **A2 — Reprogramar:** el empleado cambia la fecha de publicación → el calendario se actualiza.
- **A3 — Marcar publicado:** tras publicar manualmente en la red, el empleado mueve la pieza a **publicado** (Rumbo no publica por sí mismo — ver [[Alcance y fuera de alcance]]).
- **A4 — Descartar una pieza:** la idea no va más → el empleado la pasa a **`descartado`** desde cualquier columna previa a `publicado`. Es **baja lógica**: la pieza se conserva, no se borra (mismo criterio que [[Hotel]], [[Reseña]], [[Destino]] y [[Operador]]).
- **A5 — Retroceder una tarjeta:** el tablero se arrastra en **las dos direcciones**; una pieza `listo` que hay que rehacer vuelve a `en producción`.

## Postcondiciones
- La pieza de [[ContenidoRed]] queda registrada con su **estado kanban** y su **fecha**, y el calendario refleja lo programado.

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU.)
- **Sin publicación automática:** el sistema planifica y organiza; la publicación en la red la hace una persona ([[Alcance y fuera de alcance]]).

## Entidades del dominio involucradas
- [[ContenidoRed]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad del flujo kanban.

## 🔎 Revisión
> [!note] Paloma (10/09): (1) **Confirmado:** canales = **Instagram · TikTok · canal de ventas de WhatsApp** (actualizado en la entidad [[ContenidoRed]]). (2) **Confirmado:** la gestión de contenido la puede hacer **cualquier empleado** (sin exclusividad de rol) → revisar en [[DEC-0005 Autenticación y modelo de roles]] la relación `ContenidoRed`–`Usuario`.
