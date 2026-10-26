---
tipo: referencia
estado: formalizado
responsable: equipo
modulo: M2
actualizado: 26/10/26
---
# M2 — pedido de review

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Pedido de review del módulo **M2 — Clientes** para Codex, según [[Review de módulo — rol de Codex]] y [[DEC-0014 Flujo de implementación con agentes|DEC-0014]]. Los hallazgos van en `06-Desarrollo/Reviews/M2 — review Codex.md`. El tag de cierre es `mod-2`.

## Alcance
M2 arma la gestión de `Cliente`. En el backend incluye el alta con detección de duplicados, la búsqueda según la visibilidad del rol, la edición de la ficha, el historial, el usuario de Instagram, el resumen del listado (asesor, último viaje y oportunidades) y las etiquetas en uso. Todo eso tiene contrato en `@rumbo/shared`, pantallas de listado, alta y ficha en la web, listado, ficha y alta en mobile, y un e2e.

Revisá **solo los diffs de los merges de abajo** (`git diff <merge>^1 <merge>`). `main` ya tiene código de M3 en adelante encima, así que si un archivo cambió después, el código vigente puede no ser el del merge. Si algo de M2 ya se corrigió más adelante, no lo reportes. Los hallazgos de M1 se arreglan aparte (`fix/M1-…`): no entran en esta review.

## Tickets y merges

| Ticket | Capa | Riesgo | Trazabilidad | Merge |
|---|---|---|---|---|
| [[T-039 Publicar el contrato de clientes]] | contrato | normal | CU-02, CU-03, RF-031 | `7c0e5bb` Merge pull request #31 from FranLuciano04/feature/T-039-publicar-el-contrato-de-clientes |
| [[T-040 Registrar clientes detectando duplicados]] | backend | normal | CU-02, RF-001, RF-002, RF-003, RF-150 | `5b2ddc8` Merge pull request #34 from FranLuciano04/feature/T-040-registrar-clientes-detectando-duplicados |
| [[T-041 Buscar clientes según la visibilidad del rol]] | backend | alto | CU-03, RF-005, RF-009, RF-031, RF-151 | `5143433` Merge pull request #48 from FranLuciano04/feature/T-041-buscar-clientes-segun-la-visibilidad-del |
| [[T-042 Editar la ficha del cliente]] | backend | normal | CU-03, CU-30, CU-02, CU-15, RF-002, RF-003, RF-007, RF-008 | `3b974b6` Merge pull request #61 from FranLuciano04/feature/T-042-editar-la-ficha-del-cliente |
| [[T-043 Mostrar el historial del cliente]] | backend | normal | CU-03, RF-006 | `d44d085` Merge pull request #62 from FranLuciano04/feature/T-043-mostrar-el-historial-del-cliente |
| [[T-044 Listar clientes en la web]] | web | normal | CU-03, RF-005, RF-009, RF-031 | `0b44708` Merge pull request #47 from FranLuciano04/feature/T-044-listar-clientes-en-la-web |
| [[T-045 Registrar un cliente en la web]] | web | normal | CU-02, RF-001, RF-002, RF-003 | `34261fd` Merge pull request #69 from FranLuciano04/feature/T-045-registrar-un-cliente-en-la-web |
| [[T-046 Mostrar la ficha editable del cliente en la web]] | web | normal | CU-03, RF-006, RF-007 | `bf6b493` Merge pull request #63 from FranLuciano04/feature/T-046-mostrar-la-ficha-editable-del-cliente-en (y `56f34ef`, merge de `main` en la rama) |
| [[T-047 Consultar clientes desde la app mobile]] | mobile | normal | CU-03, RF-005, RF-006, RF-009 | `b20818b` Merge pull request #72 from FranLuciano04/feature/T-047-consultar-clientes-desde-la-app-mobile (y `2ea4856`, merge de `main` en la rama) |
| [[T-048 Registrar un cliente desde la app mobile]] | mobile | normal | CU-02, RF-001, RF-002, RF-003 | `1c18854` Merge pull request #75 from FranLuciano04/feature/T-048-registrar-un-cliente-desde-la-app-mobile |
| [[T-049 Probar de punta a punta la gestión de clientes]] | e2e | normal | CU-02, CU-03, RF-003, RF-151 | `cc1d187` Merge pull request #71 from FranLuciano04/feature/T-049-probar-de-punta-a-punta-la-gestion-de-cl |
| [[T-149 Guardar el usuario de Instagram del cliente]] | backend | normal | CU-02, CU-03, RF-001, DEC-0017 | `ee54028` Merge pull request #38 from FranLuciano04/feature/T-149-guardar-el-usuario-de-instagram-del-clie |
| [[T-155 Resumir asesor, último viaje y oportunidades en el listado de clientes]] | backend | normal | CU-03, RF-005, RF-006, RF-151 | `33484b4` Merge pull request #56 from FranLuciano04/feature/T-155-resumir-asesor-ultimo-viaje-y-oportunida |
| [[T-156 Listar las etiquetas de clientes en uso]] | backend | normal | RF-031, RF-151 | `cffe742` Merge pull request #52 from FranLuciano04/feature/T-156-listar-las-etiquetas-de-clientes-en-uso |
| [[T-157 Completar el listado de clientes en la web]] | web | normal | CU-03, RF-005, RF-009, RF-031 | `7299e82` Merge pull request #57 from FranLuciano04/feature/T-157-completar-el-listado-de-clientes-en-la-w |

Los 15 merges suman 119 archivos distintos (+11.915 / −444 líneas, con las notas de tickets incluidas). En T-046 y T-047, el diff que importa es el del merge del PR, no el de `main` dentro de la rama.

## Archivos tocados por el módulo
Unión de `git diff --name-only <merge>^1 <merge>` de los 15 merges, sin las notas de tickets ni el grafo.

**Backend (`src/backend/`)**
- Núcleo: `rumbo/main.py`, `rumbo/core/{errores,fechas}.py`, `pyproject.toml`.
- Datos: `rumbo/datos/modelos/{base,comercial}.py`, `rumbo/datos/repositorios/{clientes,seguridad}.py`, `rumbo/datos/semillas/{__init__,clientes}.py`, `alembic/versions/0003_cliente_instagram.py`.
- Negocio: `rumbo/negocio/errores.py`, `rumbo/negocio/servicios/{clientes,configuracion,seguridad}.py`.
- Presentación: `rumbo/presentacion/{errores,openapi}.py`, `rumbo/presentacion/esquemas/{clientes,comunes}.py`, `rumbo/presentacion/routers/{clientes,usuarios}.py`.
- Tests: `tests/api/test_{clientes,buscar_clientes,clientes_instagram,clientes_resumen,contrato_m1,contrato_m2,requisitos,usuarios}.py`, `tests/negocio/test_semilla_clientes.py`, `tests/test_modelos.py`.

**Contrato compartido (`src/packages/shared/`)**
- `openapi.json`, `src/tipos.gen.ts`, `src/index.ts`, `src/cliente.ts`, `src/etiquetas.ts`, `src/formato.ts`, `src/telefono.ts`.
- Esquemas: `src/esquemas/{index,clientes}.ts`.
- Hooks: `src/hooks/{index,clientes,useUsuarios}.ts`.
- Mocks: `src/mocks/{index,clientes,m1,problema}.ts`.
- Tests: `src/{formato,telefono}.test.ts`, `src/esquemas/{clientes,clientes-instagram}.test.ts`, `src/hooks/clientes.test.ts`, `src/mocks/{clientes,m1}.test.ts`.

**Web (`src/apps/web/`)**
- `src/app/{App,SeccionClientes,SeccionNuevoCliente,SeccionFichaCliente,FichaClientePendiente}.tsx`.
- `src/features/clientes/`: `PaginaClientes.tsx`, `TablaClientes.tsx`, `FiltroEtiquetas.tsx`, `segmentos.ts`, `NuevoCliente.tsx`, `FormularioCliente.tsx`, `FichaCliente.tsx`, `EditorEtiquetas.tsx`, `HistorialCliente.tsx` y sus tests (`PaginaClientes`, `FiltroEtiquetas`, `NuevoCliente`, `FichaCliente`).
- Compartido: `src/components/CampoFormulario.tsx`, `src/components/ui/button.tsx`, `src/lib/{errores,iniciales,queryClient,useDebouncedValue}.ts` (con tests de `queryClient` y `useDebouncedValue`).
- Configuración (ajustes de T-046 por los componentes compartidos): `src/features/configuracion/{FormularioComision,FormularioParametros}.tsx`, `destinos/{PestanaDestinos,FormularioDestino,FormularioRequisito,RequisitosDestino}.tsx`, `usuarios/{PestanaUsuarios,FormularioUsuario}.tsx`.
- e2e: `e2e/clientes.spec.ts`, `e2e/compose.ts`, `e2e/configuracion.spec.ts`.

**Mobile (`src/apps/mobile/`)**
- Rutas: `app/(pestanas)/clientes.tsx`, `app/(pestanas)/clientes/{_layout,index,[id],nuevo}.tsx`.
- `src/features/clientes/{ListaClientes,FichaClienteMobile,HistorialClienteMobile,NuevoClienteMobile,VolverAClientes}.tsx`.
- Tests: `__tests__/{clientes,nuevoCliente}.test.tsx`.

## Puntos que conviene mirar entre tickets
1. **Visibilidad por rol (T-041, T-043, T-155, T-156, RF-151).** El `freelance` ve solo sus clientes; los demás roles, todos. Revisá que el filtro se aplique en **cada** lectura: búsqueda, `GET /clientes/{id}`, historial, resumen del listado y etiquetas en uso. Un id ajeno tiene que responder igual que uno inexistente (404), sin revelar que existe. Que el resumen (último viaje, oportunidades) no filtre datos de operaciones de otro asesor.
2. **Duplicados (T-040, T-042, RF-003).** Cómo se detecta un duplicado (teléfono normalizado, email, DNI) y si coincide la normalización de `telefono.ts` en shared con la del backend. Al `freelance` el aviso de duplicado ajeno no le tiene que mostrar los datos del otro cliente (T-042). Revisá qué pasa con dos altas simultáneas del mismo cliente y si la base tiene un índice que lo respalde o depende solo del servicio. Que editar la ficha vuelva a validar duplicados contra los demás y no contra sí mismo.
3. **Edición de la ficha y asesor (T-042, T-046).** El `PATCH` solo cambia los campos enviados. El cambio de asesor exige un asesor activo (`_exigir_asesor_activo`) y solo lo pueden hacer los roles que corresponda; un `freelance` no puede reasignarse un cliente ajeno ni regalar el suyo. T-046 agregó `GET /usuarios/asesores` en `routers/usuarios.py`: revisá qué roles lo usan, que no exponga más que id y nombre, y que la web no ofrezca el selector a quien no puede usarlo. T-042 también tocó `servicios/configuracion.py` (un requisito dado de baja no se edita): fijate que no rompa lo de M1.
4. **Etiquetas (T-042, T-046, T-156, T-157, RF-031).** Normalización (mayúsculas, espacios, duplicados dentro del mismo cliente) igual en el esquema zod, el editor web y el backend. El filtro por etiquetas del listado y `GET` de etiquetas en uso respetan la visibilidad del punto 1.
5. **Instagram (T-149, DEC-0017).** Validación del usuario (largo 30, caracteres, `@` inicial) igual en Pydantic, zod y la columna de la migración `0003`, que agrega una columna nullable con `downgrade`. Revisá cómo se guarda (con o sin `@`, en minúsculas) y si eso afecta la detección de duplicados.
6. **Búsqueda y paginación (T-041, T-044, T-047, T-157).** Escape de `%` y `_` en el `ILIKE`, orden estable para que la paginación no repita ni pierda filas, límites del tamaño de página. En la web, el debounce de `useDebouncedValue` y que la búsqueda no deje respuestas viejas pisando las nuevas.
7. **Contrato backend ↔ shared ↔ web ↔ mobile (T-039 y los tickets de front).** Que `openapi.json` y `tipos.gen.ts` coincidan con los esquemas Pydantic de `esquemas/clientes.py`. Que los mocks de `mocks/clientes.ts` respondan los mismos códigos que el backend real (409 por duplicado con el mismo cuerpo, 404 por ajeno, 422, 403), porque web y mobile se desarrollaron contra los mocks. Que `hooks/clientes.ts` invalide las queries correctas (listado, ficha, historial, etiquetas) después de crear o editar.
8. **Reintentos (T-049).** `lib/queryClient.ts` dejó de reintentar los 4xx. Confirmá que siga reintentando lo que corresponde (red, 5xx) y que mobile tenga el mismo criterio.
9. **Mobile (T-047, T-048).** Mismas validaciones que la web en el alta y el mismo manejo del duplicado. Que la navegación entre listado, ficha y alta no deje datos de otro cliente en pantalla.
10. **Semilla y modelos (T-040, T-155, T-156).** `semillas/clientes.py` idempotente y sin datos inventados del negocio. Los cambios en `modelos/base.py` y `comercial.py` los heredan los módulos siguientes: revisá la auditoría `created_by`/`updated_by` en cada escritura del cliente.
11. **Tests.** Comportamientos de T-041 (riesgo alto) que no tengan test, sobre todo el acceso de un `freelance` a un cliente ajeno por cada ruta. Tests que pasarían con una implementación incorrecta. Que el e2e de T-049 recorra el backend real y no los mocks.

## Especificación de referencia
- [[CU-02 Registrar cliente]], [[CU-03 Gestionar ficha del cliente]]. Tocan de costado [[CU-15 Configurar recordatorios por destino]] y [[CU-30 Sugerir recontacto de clientes]].
- Requisitos: RF-001 a RF-009, RF-031, RF-150, RF-151 en `02-Analisis/Requisitos funcionales.md`.
- Decisiones: DEC-0005, DEC-0008, DEC-0017, DEC-0019.
- Datos: `05-Diseño/Datos/rumbo.sql`. Contrato: `05-Diseño/API/openapi.json`.
