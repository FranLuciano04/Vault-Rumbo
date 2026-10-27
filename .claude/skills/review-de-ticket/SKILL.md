---
name: review-de-ticket
description: Criterios, orden de búsqueda y formato de salida para revisar el diff de un ticket de implementación de Rumbo. La precargan los subagentes reviewer-ticket y reviewer-seguridad dentro de /implementar-ticket; no se usa suelta.
---

# Review de un ticket de Rumbo

> La precargan los subagentes `reviewer-ticket` (riesgo normal) y `reviewer-seguridad` (riesgo alto). Solo reportan: no editan archivos.


## Qué recibís
La ruta del ticket (en una rama `fix/…`, el hallazgo con su alcance), la rama y la evidencia del rojo y del verde: los hashes y la cola de la salida de los tests. Mirá el diff con `git diff main...HEAD`. Leé el ticket y las notas que enlaza en «Contexto»: son la especificación contra la que revisás. Los límites del proyecto están en la §7 de `06-Desarrollo/Spec de implementación.md`.

## Qué buscás, en este orden
1. **Corrección contra el dominio:** ¿cumple los criterios de aceptación, los pasos y los flujos alternativos del CU, las reglas (RN) y las DEC enlazadas? (Estados válidos de `Viaje`, `Pago`, `Oportunidad` y `Cotización` según los `EST-*`; multimoneda; comisión de RN-01; baja lógica.)
2. **Permisos:** autorización por fila y por rol (DEC-0005 y DEC-0008: el `freelance` ve solo lo suyo y recibe `404` en lo ajeno), el usuario activo verificado en cada pedido (DEC-0016) y la auditoría `created_by`/`updated_by`.
3. **Bugs de código:** casos borde, `None`/`undefined`, async mal esperado, transacciones (RNF-05), fechas y zona horaria de Argentina, redondeo de importes (`Decimal`, nunca `float`).
4. **Contrato:** respuestas y errores según el OpenAPI del módulo (problem+json, `409` para transiciones inválidas, `422` para validaciones).
5. **Arquitectura y navegabilidad** (spec §6, «Código navegable», y ARQ): cada archivo en su capa y módulo; ningún router ni componente con lógica de negocio; nada que llegue a la base salteándose servicio y repositorio; el repositorio recibe el filtro de visibilidad; un caso de uso, una transacción; nada duplicado de algo que ya existía; nombres del dominio; sin código muerto. Se clasifica **importante**: aunque hoy no cause un bug, los próximos tickets copian el patrón.
6. **Tests:** ¿prueban de verdad el comportamiento, o pasarían con una implementación incorrecta? ¿Falta algún flujo alternativo? ¿Están nombrados por RF?
7. Otros temas de diseño: solo si causan un problema concreto.

**Verificá cada hallazgo** antes de reportarlo leyendo el código real. Tu presupuesto de verificación es acotado:
- La evidencia del rojo y del verde ya te la pasan: tomala como dada.
- Para demostrar un hallazgo, corré solo los tests de los archivos del diff. La suite completa la corre el orquestador una sola vez, en el paso 6 de `/implementar-ticket`; dos suites a la vez en la misma máquina dan timeouts falsos.
- Una mutación (quitar una línea y ver que un test falle) solo en riesgo alto, una por hallazgo, en el mismo árbol y restaurando con `git diff --stat` vacío.

No reportes estilo ni gustos (el formato lo controlan ruff, ESLint y Prettier).

## Formato de salida
Una lista, del más grave al menos grave. Si no hay nada, decilo.

```
[bloqueante|importante|menor] archivo:línea — qué está mal
  Escenario: entrada o estado concreto → resultado incorrecto
  Arreglo sugerido: …
  ¿El test está mal? sí/no
```

- **bloqueante:** comportamiento incorrecto, un permiso roto o pérdida de datos. El ticket no se cierra sin arreglarlo.
- **importante:** un bug probable o un flujo alternativo sin cubrir.
- **menor:** mejoras que no cambian el comportamiento.
