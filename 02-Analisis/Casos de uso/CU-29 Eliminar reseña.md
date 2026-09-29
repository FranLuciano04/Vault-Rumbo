---
tipo: caso-uso
estado: formalizado
modulo: [hoteles]
responsable: Paloma
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-29 Eliminar reseña

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Dar de baja una [[Reseña]] inapropiada o errónea para que deje de incidir en el catálogo y la recomendación, preservando la trazabilidad ([[DEC-0003 Relación Viaje–Hotel y Reseña]]).

## Actor principal
[[Actores|admin]]

## Actores secundarios
- [[Actores|empleado]] (puede reportar/solicitar la baja — ver Revisión).

## Precondiciones
- Existe una [[Reseña]] `publicada` en el catálogo.

## Flujo principal
1. El admin ubica la [[Reseña]] (desde la ficha del [[Hotel]] o el listado de reseñas).
2. Elige **eliminarla** e indica el motivo.
3. El sistema aplica **baja lógica**: la [[Reseña]] pasa a `estado = oculta`, deja de mostrarse en el catálogo y de contar para la recomendación ([[CU-18 Buscar y recomendar hoteles]]).
4. El registro se conserva para no romper la trazabilidad entre el [[Hotel]], sus [[Reseña|Reseñas]] y los [[Viaje|Viajes]] de origen.

## Flujos alternativos
- **A1 — Restaurar:** el admin revierte una baja y la [[Reseña]] vuelve a `publicada`.
- **A2 — Eliminación física:** solo excepcional y si no rompe la integridad referencial; **por defecto siempre baja lógica**.

## Postcondiciones
- La [[Reseña]] queda `oculta`: no aparece en el catálogo ni pondera en la recomendación; el historial se preserva.

## Reglas de negocio aplicadas
- Integridad referencial: no romper los vínculos de [[DEC-0003 Relación Viaje–Hotel y Reseña]] (baja lógica).

## Entidades del dominio involucradas
- [[Reseña]] · [[Hotel]] · [[Cliente]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!question] Nahuel (10/09): **borrador propuesto** para cubrir el gap de eliminación de [[Reseña]] (pedido en la revisión de cobertura ABM). A validar por **Paloma** (dueña del módulo): (1) agrego `estado` (`publicada · oculta`) a [[Reseña]]; (2) actor — ¿solo `admin` (moderación) o también `empleado`?; (3) ¿baja lógica (recomendada) o física?
>
> [!note] Francisco (11/09) — **definido** (resuelvo las 3 dudas de Nahuel): (1) `estado` `publicada · oculta` **confirmado** en [[Reseña]]; (2) actor = **`admin`** (moderar es acción sensible; el empleado puede reportar/solicitar); (3) **baja lógica** siempre por defecto (preserva la trazabilidad de [[DEC-0003 Relación Viaje–Hotel y Reseña]]); la física es excepcional. Pasa a `en-revision`. Paloma: para tu conocimiento como dueña del módulo, ajustable en la sync.
