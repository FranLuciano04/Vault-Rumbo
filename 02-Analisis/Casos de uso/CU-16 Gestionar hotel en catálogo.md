---
tipo: caso-uso
estado: en-revision
modulo: [hoteles]
responsable: Paloma
pc: pc1
actualizado: 10/09/26
---
# CU-16 Gestionar hotel en catálogo

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado da de alta o edita un [[Hotel]] en el **catálogo compartido** de la agencia, para poder recomendarlo, asociarlo a itinerarios y recibir reseñas.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
-

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre el **catálogo de hoteles** y elige **Nuevo hotel** (o abre uno existente para editarlo).
2. Carga o edita los datos: **nombre**, **destino** (ciudad/país) y **categoría** (estrellas/tipo).
3. El sistema valida los datos mínimos (**nombre** y **destino**) y busca posibles duplicados por nombre + destino.
4. El sistema guarda el [[Hotel]] en el catálogo compartido.
5. El sistema confirma; el `Hotel` queda disponible para búsqueda y recomendación ([[CU-18 Buscar y recomendar hoteles]]), itinerarios ([[CU-09 Armar itinerario de hoteles]]) y reseñas ([[CU-17 Registrar reseña de hotel]]).

## Flujos alternativos
- **A1 — Edición de un hotel existente:** en el paso 1 el empleado abre un `Hotel` del catálogo y modifica sus datos.
- **A2 — Posible duplicado:** en el paso 3 existe un `Hotel` con el mismo nombre y destino → el sistema lo advierte y ofrece abrir el existente en lugar de crear uno nuevo.
- **A3 — Datos mínimos incompletos:** falta el nombre o el destino → el sistema no guarda y pide completarlos.
- **A4 — Baja de un hotel (cerró):** el empleado da de baja un `Hotel` que dejó de operar → **siempre baja lógica**: se marca `estado = cerrado` (se oculta del catálogo activo pero se conserva; **nunca se elimina físicamente**). **Definido** (ver Revisión).

## Postcondiciones
- El [[Hotel]] existe en el catálogo compartido, **visible para toda la agencia**, disponible para [[CU-18 Buscar y recomendar hoteles]], [[CU-17 Registrar reseña de hotel]] y [[CU-09 Armar itinerario de hoteles]].

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU.)

## Entidades del dominio involucradas
- [[Hotel]] · [[Usuario]] · (relación N:M con [[Viaje]] vía `viaje_hotel`, ver [[DEC-0003 Relación Viaje–Hotel y Reseña]])

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad del alta de hotel.

## Decisiones asociadas
- [[DEC-0003 Relación Viaje–Hotel y Reseña]] (relación `Hotel` ⇄ `Viaje` y `Reseña`).

## 🔎 Revisión
> [!note] Paloma (10/09): (2) **Confirmado:** el catálogo lo gestiona cualquier empleado (sin restricción por rol). (1) **Confirmado:** se permite dar de baja un `Hotel` que cerró (A4). **A resolver en la sync (toca dominio):** borrar un `Hotel` con reseñas/viajes rompería la trazabilidad de [[DEC-0003 Relación Viaje–Hotel y Reseña]]; propuesta = eliminar solo si no tiene historial y marcarlo **cerrado** si lo tiene. Si se adopta el estado, agregar el atributo a [[Hotel]] y actualizar [[DGM-ER]].
>
> [!note] Francisco + Nahuel (11/09, sync) — **definido:** la baja de `Hotel` es **siempre lógica** (`estado = cerrado`); **nunca** se elimina físicamente, para no perder historial ni trazabilidad ([[DEC-0003 Relación Viaje–Hotel y Reseña]]). Paloma: notificada por Git como dueña del módulo.
