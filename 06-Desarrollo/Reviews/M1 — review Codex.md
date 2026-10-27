---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M1
actualizado: 26/10/26
---
# M1 — review Codex

## Resumen
Revisados los diffs de los 19 merges indicados y contrastados los candidatos con `HEAD` (`85cf59a`) para excluir problemas corregidos después de M1.
Hay un hallazgo bloqueante en la selección de requisitos de la web y dos importantes: divergencias de los mocks y falta de una prueba concurrente del último administrador.
Se reprodujeron en memoria la baja del requisito de otro destino y las respuestas incorrectas de los mocks; no se ejecutó la suite completa ni se modificaron código, tests o datos persistentes.

## Hallazgos

### H-01 · Cambiar de destino conserva la edición y la baja del requisito anterior
- **Severidad:** bloqueante
- **Ubicación:** `src/apps/web/src/features/configuracion/destinos/PestanaDestinos.tsx:163` (merge `98046f9`); estados y acciones en `src/apps/web/src/features/configuracion/destinos/RequisitosDestino.tsx:24` y `src/apps/web/src/features/configuracion/destinos/FormularioRequisito.tsx:50` (mismo merge).
- **Ticket relacionado:** T-036
- **Trazabilidad:** CU-15, flujo principal 2–4 y A1/A3; RF-086, RF-087, RF-088.
- **Problema:** `RequisitosDestino` se reutiliza cuando cambia `conRequisitos`, sin una `key` que identifique al destino ni un reinicio de sus estados `formulario` y `porQuitar`. El título y la consulta pasan al destino nuevo, pero siguen abiertos el formulario o la confirmación del requisito anterior. Guardar y confirmar la baja operan por el identificador de ese requisito anterior. El problema sigue vigente en `HEAD`; los cambios posteriores de estos componentes solo movieron imports.
- **Escenario:** abrir Requisitos de Cancún y pulsar Quitar en un requisito suyo; sin confirmar, abrir Requisitos de Bariloche. La sección ahora dice «Requisitos de Bariloche», pero conserva la confirmación de Cancún: Confirmar da de baja el requisito de Cancún. Se reprodujo con los dos componentes reales montados en React/JSDOM y hooks controlados: bajo el encabezado del destino B, la mutación recibió el identificador del requisito de A. La misma conservación de estado permite abrir Editar en A, cambiar a B y enviar el `PATCH` del requisito de A.
- **Arreglo sugerido:** montar `RequisitosDestino` con `key={conRequisitos.id}`, o reiniciar explícitamente sus formularios y confirmaciones al cambiar `destino.id`. Agregar una prueba que cambie entre dos destinos con una edición o baja pendiente y compruebe que no puede enviarse una mutación sobre el anterior.

### H-02 · Los mocks ocultan errores y mezclan requisitos de distintos destinos
- **Severidad:** importante
- **Ubicación:** `src/packages/shared/src/mocks/m1.ts:208` (merge `0a1bbbe`); también los handlers de parámetros en `:182`, destinos en `:189` y operadores en `:230` del mismo archivo y merge.
- **Ticket relacionado:** entre T-026, T-029, T-032, T-033, T-036 y T-037.
- **Trazabilidad:** CU-15, CU-26, CU-31, DEC-0013; RF-086, RF-090, RF-094; contrato de M1 y punto 8 del pedido de review.
- **Problema:** los handlers devuelven ejemplos y respuestas de éxito sin aplicar las reglas del recurso solicitado. El listado de requisitos ignora `destino_id`; los listados de destinos y operadores ignoran `activo`; las mutaciones aceptan duplicados y parámetros inválidos. Por eso una integración incorrecta puede pasar contra MSW y fallar contra el backend. `m1.test.ts` solo verifica códigos de éxito y la forma del JSON, por lo que tampoco detecta estas diferencias. Los handlers señalados siguen así en `HEAD`.
- **Escenario:** se ejecutaron los handlers originales del merge en memoria: `GET /api/destinos/<id de Bariloche>/requisitos` devolvió los dos requisitos cuyo `destino_id` es Cancún; crear un operador con el nombre ya presente en `operadoresMock` devolvió 201 en vez de 409; un `PUT /api/configuracion` con vigencia y recontacto en 0 y anticipación en −1 devolvió 200 en vez de 422. Además, solicitar destinos u operadores activos devuelve también los ejemplos inactivos.
- **Arreglo sugerido:** respetar el destino y los filtros de cada consulta, y cubrir explícitamente las respuestas de error del contrato, en especial duplicados 409 y entradas inválidas 422. Incorporar pruebas que contrasten esos escenarios con el backend, incluida la pertenencia de cada requisito al destino solicitado y la exclusión de catálogos inactivos.

### H-03 · La protección del último admin carece de una prueba concurrente
- **Severidad:** importante
- **Ubicación:** `src/backend/tests/api/test_usuarios.py:595` (merge `116ff01`), especialmente los pedidos secuenciales de `:602` y `:603`.
- **Ticket relacionado:** T-028
- **Trazabilidad:** CU-25 A4, RF-149, DEC-0016; puntos 2 y 10 del pedido de review.
- **Problema:** las pruebas de RF-149 ejecutan los cambios de rol y las bajas uno después del otro, con una sesión compartida. No hay una prueba con transacciones simultáneas que verifique la función de los bloqueos del repositorio. La implementación incluye `FOR UPDATE`, pero estos casos secuenciales seguirían aprobando si se retirara esa protección. Es un hueco de pruebas del requisito de concurrencia, no una carrera comprobada en el código vigente. La ampliación posterior que protege a la última dueña tampoco agrega una prueba concurrente.
- **Escenario:** con dos admins activos, dos transacciones sin el bloqueo pueden contar dos administradores y desactivar o demover a uno distinto cada una, dejando cero al confirmar. Las pruebas actuales no fuerzan esa superposición y no detectarían la regresión, aunque verifican correctamente el caso secuencial.
- **Arreglo sugerido:** agregar una prueba con dos sesiones y transacciones independientes que sincronice el inicio de dos bajas o demociones. Debe exigir un éxito y un 409, y consultar el estado confirmado para comprobar que queda un admin activo. Verificar que la prueba falle al quitar los bloqueos; cubrir también la combinación de baja y cambio de rol y la protección equivalente de la última dueña.

## Triage de Claude

> Triage del 26/10/26, Nahuel con Claude Opus 5.5, contra `main` en `85cf59a`. Cada hallazgo se verificó en el código vigente.

| Hallazgo | Severidad | Resultado | Motivo | Arreglo |
|---|---|---|---|---|
| H-01 | bloqueante | **confirmado** | `PestanaDestinos.tsx:163` monta `<RequisitosDestino destino={conRequisitos} />` sin `key`. Por eso `formulario` y `porQuitar` (`RequisitosDestino.tsx:24-25`) sobreviven al cambio de destino, y `quitar.mutate(requisito.id)` opera sobre el requisito del destino anterior. Da de baja o edita un requisito de otro destino sin que el usuario lo vea. | rama `fix/M1-requisitos-destino` (web, riesgo normal), junto con el filtro por `destino_id` del mock de H-02, que el test del arreglo necesita. PR [#93](https://github.com/FranLuciano04/Vault-Rumbo/pull/93), mergeado (`ed2a950`). |
| H-02 | importante | **confirmado, con un riesgo menor que el descripto** | Los handlers de `mocks/m1.ts` solo cubren el camino feliz. `recurso()` superpone el cuerpo sin validar, y los listados ignoran `destino_id` y `activo`. Los mocks de los módulos siguientes (`clientes.ts`, `alertas.ts`) sí responden 409/422 con `problema.ts`, así que M1 quedó desparejo. El riesgo es menor porque los tests web de M1 redefinen el handler en cada caso de error (`servidor.use(...)`, por ejemplo en `PestanaDestinos.test.tsx:56-193`). Lo que sí queda sin cubrir es el entorno de desarrollo y cualquier test que use el handler por defecto. | El filtro por `destino_id` va con H-01. El resto (409 por duplicado, 422 de parámetros, filtro `activo`) va en la rama `fix/M1-mocks` (shared, riesgo normal). PR [#95](https://github.com/FranLuciano04/Vault-Rumbo/pull/95), mergeado (`33b0287`). La review dejó fuera, anotados en el PR: el 422 de `pagina` y `por_pagina`, el 404 de los requisitos de un destino inexistente, `normalizarTexto` contra la tabla de tildes del backend y los mensajes exactos de Pydantic. |
| H-03 | importante | **confirmado** | El servicio bloquea bien: `contar_activos_por_rol` y `obtener_bloqueado` usan `with_for_update()` en un orden fijo (`repositorios/seguridad.py:64-90`, `servicios/seguridad.py:199-210`). Pero `test_usuarios.py` no tiene ninguna prueba con dos transacciones simultáneas, y los casos de RF-149 seguirían pasando si se quitara el `FOR UPDATE`. Es un hueco de tests sobre un control de permisos, no una carrera comprobada. | rama `fix/M1-ultimo-admin-concurrente` (backend, solo tests). Toca permisos, así que la revisa `reviewer-seguridad` y el PR necesita la aprobación de otro integrante. Cubre también la última dueña (A5). PR [#100](https://github.com/FranLuciano04/Vault-Rumbo/pull/100), mergeado (`90c6423`), aprobado por otro integrante: 8 tests concurrentes que fallan si se quita el `FOR UPDATE`. |

> **Observación de la review de seguridad de H-03 (26/10/26), fuera de alcance:** el actor se carga con `sesion.get` antes de bloquearse, así que una dueña a la que demueven en paralelo puede completar su acción con el rol viejo. En A5 el resultado final es correcto porque igual da `Conflicto`. Queda como observación, sin arreglo.
