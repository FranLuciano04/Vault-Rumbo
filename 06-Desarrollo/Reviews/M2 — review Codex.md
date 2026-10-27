---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M2
actualizado: 26/10/26
---
# M2 — review Codex

## Resumen
Revisados los diffs de los 15 merges del pedido y contrastados los hallazgos con `HEAD` (`dc46b5c`) para excluir correcciones posteriores y los pendientes de M1.
Hay dos hallazgos bloqueantes —sobrescritura de datos durante la edición y contactos inválidos aceptados por la API— y cinco importantes sobre duplicados, caché mobile y fidelidad de los mocks.
Se hicieron reproducciones en memoria con Pydantic, funciones del servicio con repositorios controlados, componentes React, hooks reales de consultas y MSW; no se ejecutaron la suite completa ni PostgreSQL, ni se modificaron código, tests o datos persistentes.

## Hallazgos

### H-01 · Refrescar la ficha durante la edición reenvía campos que nadie editó
- **Severidad:** bloqueante
- **Ubicación:** `src/apps/web/src/features/clientes/FormularioCliente.tsx:49` (merge `bf6b493`); estado inicial en `:106` y envío en `:134` del mismo archivo y merge.
- **Ticket relacionado:** T-046
- **Trazabilidad:** CU-03, pasos 3–5; RF-007; T-046, nota de implementación «PATCH: manda solo los campos que cambiaron».
- **Problema:** el formulario conserva los valores de cuando se abrió, pero calcula los cambios contra la prop `ficha` más reciente. Si una consulta se refresca y trae cambios guardados por otra persona, los valores antiguos del formulario pasan a parecer cambios propios, aunque el usuario no haya tocado esos campos. Las etiquetas tienen el mismo problema. Sigue vigente en `HEAD`.
- **Escenario:** A abre la edición de Ana; B actualiza su contacto, segmento y etiquetas. A vuelve a la pestaña y la consulta refresca la ficha; después cambia solo las preferencias y guarda. El PATCH incluye también el contacto, segmento y etiquetas antiguos, sobrescribiendo lo que guardó B. Se reprodujo con el componente y `useCliente` reales, actualizando la caché durante la edición: tanto en el merge como en `HEAD`, cambiar únicamente preferencias envió además nombre, contacto, segmento y etiquetas anteriores.
- **Arreglo sugerido:** calcular los cambios contra una instantánea de la ficha al abrir la edición, o registrar los campos realmente modificados; no usar los datos de un refetch como base nueva de comparación. Mantener la misma referencia inicial para las etiquetas. Agregar una prueba que refresque la consulta mientras se edita y compruebe que el PATCH conserva únicamente los cambios de esa persona.

### H-02 · La API permite guardar un cliente sin teléfono ni email válidos
- **Severidad:** bloqueante
- **Ubicación:** `src/backend/rumbo/presentacion/esquemas/clientes.py:13` (merge `7c0e5bb`), tipo `Contacto` utilizado por el alta de `5b2ddc8` y la edición de `3b974b6`.
- **Ticket relacionado:** entre T-040 y T-042
- **Trazabilidad:** CU-02 A3, CU-03 A2, RF-002, DEC-0017.
- **Problema:** `Contacto` solo exige entre 1 y 200 caracteres. El recorte de espacios de `Entrada` y `Edicion` no valida que sea teléfono o email, y los servicios tampoco lo hacen. La validación correcta de zod protege los formularios, pero una llamada directa a la API puede crear una ficha incontactable o reemplazar el único contacto válido. DEC-0017 exige expresamente implementar en backend la regla que ya tiene shared. El tipo continúa igual en `HEAD`.
- **Escenario:** enviar un alta con nombre, segmento válido y `contacto: "sin contacto"`, o editar una ficha con `{"contacto":"123"}`. Los esquemas reales `ClienteCrear` y `ClienteEditar` aceptaron en memoria esos valores, además de `@ana` y `ana@`; el servicio los guarda sin otra validación, en vez de responder 422 y conservar el contacto anterior. El e2e de edición inválida solo ejercita el rechazo del formulario web, por lo que no detecta este hueco de la API.
- **Arreglo sugerido:** validar el contacto de entrada en Pydantic con la misma regla de teléfono de 7 a 15 dígitos o email que shared. Cubrir POST y PATCH mediante peticiones directas con contactos inválidos y verificar que el PATCH rechazado conserva el dato previo.

### H-03 · Cambiar el formato del teléfono evita el aviso de duplicado
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/datos/repositorios/clientes.py:35` (merge `5b2ddc8`); `existe_contacto`, agregado en el merge `3b974b6`, utiliza la misma comparación literal.
- **Ticket relacionado:** entre T-040 y T-042
- **Trazabilidad:** CU-02 A1, RF-003; punto 2 del pedido de review.
- **Problema:** la detección compara únicamente el contacto pasado a minúsculas. No elimina los separadores de un teléfono ni obtiene una clave equivalente a la que usa `normalizarTelefonoAR` en shared. Esto también afecta el aviso genérico al freelance cuando el contacto pertenece a un cliente ajeno. Ambas consultas siguen así en `HEAD`.
- **Escenario:** existe «Ana Pérez» con `+54 9 11 5555-1234`; se registra «A. Pérez» con `5491155551234` sin confirmar duplicados. Los nombres normalizados son distintos y la igualdad textual de contactos es falsa: el alta no avisa, aunque ambos contactos son el mismo teléfono y shared los normaliza al mismo número. Ni siquiera se necesita una diferencia de prefijo: basta cambiar los espacios o guiones.
- **Arreglo sugerido:** comparar una clave canónica de teléfono, conservando el texto de presentación y la comparación de emails sin distinguir mayúsculas. Usar esa misma clave en `buscar_parecidos` y `existe_contacto`. Probar variantes de formato con nombres diferentes, incluido el caso ajeno del freelance.

### H-04 · Editar nombre o contacto omite toda comprobación de duplicados
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/negocio/servicios/clientes.py:121` (merge `3b974b6`).
- **Ticket relacionado:** T-042
- **Trazabilidad:** CU-03, T-042 («con las mismas validaciones del alta»), RF-003 como regla del alta; punto 2 del pedido de review, que exige expresamente revalidar duplicados al editar y excluir al propio cliente.
- **Problema:** `editar_cliente` comprueba visibilidad y asesor, pero después aplica todos los campos con `setattr` y hace `flush`, sin consultar posibles duplicados. No existe una excepción para el propio cliente porque no se hace ninguna búsqueda. El comportamiento sigue igual en `HEAD`; RF-003 por sí solo describe el alta, y la exigencia de extender el control al PATCH viene del pedido de esta review.
- **Escenario:** A tiene `ana@mail.test` y B tiene otro contacto. `PATCH /clientes/{B}` con `{"contacto":"ana@mail.test"}` sobrescribe el contacto y responde con éxito sin aviso. Se ejecutó en memoria la función real de `HEAD`, extraída mediante AST y con repositorio y sesión controlados: actualizó el contacto y realizó cero consultas de duplicados.
- **Arreglo sugerido:** antes de aplicar un cambio de nombre o contacto, buscar coincidencias contra los demás clientes, excluyendo el identificador editado. Mantener el aviso sin datos ajenos para el freelance y definir la confirmación de la edición en contrato y pantallas; los duplicados confirmados de DEC-0020 deben poder seguir editándose en sus otros campos.

### H-05 · Dos altas simultáneas pueden crear el duplicado sin advertencia
- **Severidad:** importante
- **Ubicación:** `src/backend/rumbo/negocio/servicios/clientes.py:39` (merge `5b2ddc8`), seguido del alta y `flush` en `:53` y `:54`.
- **Ticket relacionado:** T-040
- **Trazabilidad:** CU-02 A1, RF-003, DEC-0020; punto 2 del pedido de review.
- **Problema:** la búsqueda y el alta no tienen exclusión entre transacciones. Dos pedidos pueden comprobar a la vez que no hay coincidencias y después insertar ambos. El modelo de `Cliente` no tiene una restricción que lo impida y la sesión por pedido tampoco serializa esa comprobación. Un índice único incondicional no sería una solución compatible: DEC-0020 permite duplicados cuando se confirman expresamente. El hueco sigue vigente en `HEAD`.
- **Escenario:** sobre una base sin ese cliente, dos pedidos con el mismo contacto y `confirmar_duplicado: false` completan la búsqueda antes de que cualquiera confirme su transacción. Ambos siguen por el alta sin `PosibleDuplicado`, por lo que pueden terminar con dos 201 sin aviso. Se reprodujo la intercalación de la función real de `HEAD` con dos sesiones controladas y ambas lecturas vacías: creó dos filas sin confirmación. No se ejecutó una carrera contra PostgreSQL; el escenario se respalda además en la ausencia de bloqueos y restricciones del modelo.
- **Arreglo sugerido:** serializar la comprobación y la escritura para las claves que identifican posibles duplicados, volviendo a consultar dentro de esa protección y conservando el alta confirmada. Agregar una prueba con dos transacciones reales sincronizadas que exija un alta y una advertencia, además del caso permitido con confirmación.

### H-06 · El listado mobile puede mostrar vacío teniendo clientes en caché
- **Severidad:** importante
- **Ubicación:** `src/apps/mobile/src/features/clientes/ListaClientes.tsx:37` (merge `b20818b`); acumulador inicial vacío en `:20`.
- **Ticket relacionado:** T-047
- **Trazabilidad:** CU-03, RF-005; criterio de T-047 «Lista con búsqueda y scroll paginado».
- **Problema:** al montar, `paginas` empieza vacío y `recibido` se inicializa con `data`. Si la consulta ya tiene datos en caché, la condición `data !== recibido` es falsa y nunca copia esa primera página al acumulador. Cuando el servidor devuelve el mismo contenido, TanStack Query conserva la referencia por comparación estructural, por lo que el refetch tampoco lo corrige. Sigue vigente en `HEAD`. Los tests limpian el `QueryClient` antes de montar y no cubren este caso.
- **Escenario:** volver a montar el listado mientras la primera página aún está en caché y el backend no cambió sus clientes. Se reprodujo con `ListaClientes` y `useClientes` reales, un `QueryClient` precargado y respuesta HTTP controlada: tanto en el merge como en `HEAD`, la caché tenía un cliente, se hizo el refetch y `FlatList` recibió cero ítems con «No encontramos clientes». Con más páginas, además puede intentar avanzar sin haber incorporado la primera.
- **Arreglo sugerido:** incorporar también los datos disponibles en el primer render al acumulador, sin marcarlos como procesados antes de hacerlo, o mantener la paginación en una consulta infinita. Probar el montaje con caché poblada y una respuesta idéntica, además del montaje con caché vacía.

### H-07 · Los mocks aceptan entradas que la API rechaza y omiten duplicados
- **Severidad:** importante
- **Ubicación:** `src/packages/shared/src/mocks/clientes.ts:124` y `:157` (merge `7c0e5bb`).
- **Ticket relacionado:** entre T-039, T-045, T-046 y T-048
- **Trazabilidad:** CU-02 A1/A3, CU-03 A2, RF-002, RF-003; T-039, notas de validación del PATCH; punto 7 del pedido de review.
- **Problema:** el POST del mock detecta duplicados solo por igualdad literal del contacto y el PATCH superpone el JSON sobre la ficha sin validarlo. Por eso una integración incorrecta puede aprobar contra MSW y fallar contra el backend. Esto es independiente de H-02: incluso las validaciones que el backend sí implementa, como rechazar `null` en nombre, quedan omitidas. Las ramas relevantes conservan este comportamiento en `HEAD`.
- **Escenario:** se ejecutaron los handlers reales de `HEAD` en memoria: crear con un nombre ya existente y contacto diferente, o con un email existente en mayúsculas, devolvió 201, aunque el backend detecta esas coincidencias y devuelve 409. `PATCH {"nombre":null}` devolvió 200, frente al 422 exigido por T-039 y aplicado por Pydantic. Un alta sin nombre también devolvió 201 y `GET /clientes?por_pagina=0` devolvió 200 en lugar de 422. Los tests básicos de éxito y duplicado literal no detectan estas diferencias.
- **Arreglo sugerido:** reproducir en MSW las validaciones de entrada y las reglas de duplicados del backend, incluidos los códigos y cuerpos de error. Agregar pruebas de los casos 409 y 422 que hoy divergen, sin depender únicamente de los handlers particulares redefinidos por cada test de pantalla.

## Triage de Claude

Verificado contra `main` (`dc46b5c`) el 26/10/26. Los siete hallazgos se confirman en el código.

| Hallazgo | Severidad | Resultado | Motivo | Arreglo |
|---|---|---|---|---|
| H-01 | bloqueante | confirmado | `FormularioCliente` fija `defaultValues` y `etiquetas` al montar, pero `cambiosDeLaFicha` compara contra la prop `ficha` vigente. Si un refetch trae cambios de otra persona, los valores viejos del formulario viajan como cambios propios. | PR #96 (`fix/M2-edicion-ficha`), mergeado |
| H-02 | bloqueante | confirmado | `Contacto` en `esquemas/clientes.py` solo controla el largo (1 a 200), y el servicio no valida nada más. DEC-0017 deja anotado que falta validar el formato en el backend con la regla de shared. | PR #97 (`fix/M2-contacto-y-duplicados`), mergeado |
| H-03 | importante | confirmado | `buscar_parecidos` y `existe_contacto` comparan `lower(contacto)` de forma literal: `+54 9 11 5555-1234` y `5491155551234` no coinciden. | PR #97 (`fix/M2-contacto-y-duplicados`), mergeado |
| H-04 | importante | confirmado | `editar_cliente` aplica los cambios con `setattr` sin buscar duplicados. T-042 pide «las mismas validaciones del alta», pero RF-003 y CU-03 no dicen cómo se confirma un duplicado al editar. Arreglarlo cambia el contrato del PATCH (`confirmar_duplicado`, 409) y las pantallas web y mobile. El equipo decidió arreglarlo antes del cierre (27/10/26). | PR #108 (`fix/M2-edicion-duplicados`), abierto; necesita aprobación de otro integrante (RF-151) |
| H-05 | importante | confirmado | Entre `buscar_parecidos` y el `flush` del alta no hay lock ni restricción. Con READ COMMITTED, dos altas simultáneas pasan las dos. Un índice único no sirve porque DEC-0020 permite duplicados confirmados: hace falta serializar por clave (lock de transacción). | PR #97 (`fix/M2-contacto-y-duplicados`), mergeado |
| H-06 | importante | confirmado | `ListaClientes` arranca `recibido` con `data` y `paginas` vacío. Con caché poblada, `data !== recibido` es falso y nunca se carga la primera página. | PR #99 (`fix/M2-lista-mobile`), mergeado (372ae1f) |
| H-07 | importante | confirmado | El POST del mock compara `c.contacto === datos.contacto` (ni nombre ni mayúsculas) y no valida la entrada. El PATCH superpone el JSON sin validar (`nombre: null` → 200). | PR #97 (`fix/M2-contacto-y-duplicados`), mergeado, junto con H-02/H-03/H-05 |

H-04: el 26/10/26 quedó para decidir con el equipo; el 27/10/26 el equipo decidió arreglarlo antes de cerrar M2 (PR #108, que también agrega el flujo A4 a CU-03). Menor que quedó sin arreglar en el PR #97: el backend antepone «Value error, » a los mensajes de validación (convención previa, también en otros módulos).
