---
tipo: caso-uso
estado: formalizado
modulo: [hoteles, clientes]
responsable: Paloma
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-17 Registrar reseña de hotel

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Tras el viaje, el empleado carga la [[Reseña]] de un [[Cliente]] sobre un [[Hotel]] en el que se alojó. La reseña alimenta el catálogo y la recomendación de hoteles. Ver [[DEC-0003 Relación Viaje–Hotel y Reseña]].

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: autor de la opinión; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existen el [[Cliente]] ([[CU-02 Registrar cliente]]) y el [[Hotel]] ([[CU-16 Gestionar hotel en catálogo]]).

## Flujo principal
1. El empleado abre **Nueva reseña**.
2. Selecciona el [[Cliente]] que viajó y el [[Hotel]] reseñado (opcionalmente el [[Viaje]] de origen, para trazabilidad).
3. Carga el **puntaje** (1 a 5), el **comentario** y la **fecha** (`dd/mm/aa`).
4. El sistema valida (puntaje entre 1 y 5; `Cliente` y `Hotel` obligatorios) y crea la [[Reseña]] en estado `publicada`, asociada al `Hotel` y al `Cliente`.
5. El sistema confirma; la `Reseña` pasa a alimentar el catálogo y la recomendación ([[CU-18 Buscar y recomendar hoteles]]).

## Flujos alternativos
- **A1 — Con viaje asociado:** en el paso 2 se selecciona el [[Viaje]] de origen → se guarda `viaje_id` para trazar de qué viaje surgió ([[DEC-0003 Relación Viaje–Hotel y Reseña]]).
- **A2 — Sin viaje asociado:** no se vincula viaje → `viaje_id` queda vacío (es opcional).
- **A3 — Datos inválidos:** el puntaje está fuera de 1–5 o falta el `Cliente` o el `Hotel` → el sistema no guarda y pide corregir.

## Postcondiciones
- Existe una [[Reseña]] (puntaje, comentario, fecha) del `Cliente` sobre el `Hotel`.
- El `Hotel` suma la reseña a su valoración, disponible para la recomendación ([[CU-18 Buscar y recomendar hoteles]]).

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU.)
- El puntaje es un entero de **1 a 5**; la `Reseña` pertenece a un `Hotel` y a un `Cliente` (ver [[DEC-0003 Relación Viaje–Hotel y Reseña]]).
- Un mismo `Cliente` puede dejar **varias reseñas** sobre el mismo `Hotel` (estadías distintas).
- Una `Reseña` cargada se puede **editar** para corregirla. No se elimina físicamente: la baja es una **moderación** que la deja `oculta` (baja lógica), conservando el historial ([[CU-29 Eliminar reseña]]).

## Entidades del dominio involucradas
- [[Reseña]] · [[Cliente]] · [[Hotel]] · [[Viaje]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la carga de reseña.

## Decisiones asociadas
- [[DEC-0003 Relación Viaje–Hotel y Reseña]]

## 🔎 Revisión
> [!note] Paloma (10/09): (3) **Confirmado:** un cliente puede dejar varias reseñas del mismo hotel. (4) **Confirmado:** la reseña se puede **editar** pero **no borrar**.
>
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Coherencia con el nuevo [[CU-29 Eliminar reseña]] — la `Reseña` nace `publicada` y su baja es lógica (`oculta`, moderación por `admin`), no física. El "no borrar" de Paloma se mantiene: no hay eliminación física. Paloma: para tu conocimiento; ajustable en la sync.
