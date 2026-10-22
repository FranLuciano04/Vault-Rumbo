---
id: T-039
titulo: Publicar el contrato de clientes
modulo: M2 — Clientes
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-02, CU-03, RF-031]
origen: plan
asignado: palomap2003
tomado_el: 21/10/26 21:30
rama: feature/T-039-publicar-el-contrato-de-clientes
pr:
---
# T-039 Publicar el contrato de clientes

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de clientes (buscar, registrar, ver, editar e historial), con tipos, hooks y mocks MSW.

## Criterios de aceptación
- [ ] Las cinco rutas del módulo `clientes` con sus esquemas, filtros (texto, etiquetas, «lo mío», paginación) y errores.
- [ ] La respuesta de alta contempla el aviso de posible duplicado y la confirmación explícita.
- [ ] Tipos, hooks y mocks MSW con clientes ficticios.

## Tests esperados
`tests/api/test_contrato_m2.py`: rutas, token y 501; mocks que respetan los esquemas.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulo `clientes`
- `05-Diseño/API/openapi.json` (PC1)
- [[CU-02 Registrar cliente]] — A1
- [[Cliente]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/clientes.py`
- `src/backend/rumbo/presentacion/routers/clientes.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/clientes.ts`

## Fuera de alcance
- La lógica de cada endpoint.

## Notas de implementación
- Contrato publicado: cinco rutas bajo `/api/clientes`, con token y stubs `501`. Filtros `buscar`, `etiqueta`, `segmento`, `mios`, `pagina` y `por_pagina` (hasta 100).
- **CU-02 A1:** el alta responde 409 `ProblemaDuplicado` con `duplicados: Cliente[]`, y `ClienteCrear.confirmar_duplicado` permite crear igual. `ErrorApi` expone `duplicados` para la web.
- **CU-03 A2:** en `ClienteEditar`, un `null` explícito en nombre, contacto, segmento, etiquetas o `no_recontactar` da 422. Solo `preferencias` y `asesor_asignado_id` admiten null.
- `Cliente` publica la auditoría readOnly (mixin `Auditoria` en `esquemas/comunes.py`, reutilizable).
- El historial usa resúmenes mínimos (`OportunidadDelCliente`, `ViajeDelCliente` y `ResenaDelCliente`), porque el vault lo tenía `SinDetallar`. Los pueden reemplazar los tickets de M3 y M4.
- `openapi.py` ahora conserva los esquemas de error declarados, por ejemplo `ProblemaDuplicado`, en lugar de forzar `Problema`. `errores.no_implementado()` queda como helper común de los stubs.
- **Decisión de Paloma (21/10):** el contacto válido es solo teléfono/WhatsApp o email; Instagram no cuenta. zod ya lo valida. El backend solo controla el largo, y el formato lo debe validar el ticket de backend de clientes.
- **Correcciones de tests autorizadas:**
  - En el verde, dos tests de hooks leían `data` sin `waitFor`. Se corrigieron y se descartó el workaround global de TanStack (`setScheduler`).
  - En el fix, el implementador sumó tests para los casos nuevos (`--tocar-tests`).
- Review (Opus): 0 bloqueantes y 5 importantes.
  - Se arreglaron 4: el PATCH con null, `duplicados` en `ErrorApi`, el filtro `segmento` y la auditoría.
  - El quinto, Instagram, lo decidió Paloma.
  - De los menores se arreglaron el filtro `mios` del mock, la nulabilidad en zod, `enabled` en los hooks, el texto del 404 y el `KeyError` de `openapi.py`.
- **Pendientes:**
  - DEC-0008 (el freelance ve solo sus clientes) choca con CU-02 y DEC-0005 (el `Cliente` es global). Lo tiene que resolver el ticket de backend de clientes.
  - `mocks/clientes.ts` importa `usuariosPorRol` desde `./index`, lo que arma un ciclo de imports que hoy no rompe nada.
- **Entorno:** en Windows, `localhost` en `TEST_DATABASE_URL` sumaba 2 s por conexión (IPv6 primero), y la suite de backend pasó de unos 65 s a 31 min con un timeout. Con `127.0.0.1` se resuelve.
- Modelos: tests con Sonnet, implementación y fix con Sonnet, review con Opus. No hubo escalado. El refactor no hizo cambios.
