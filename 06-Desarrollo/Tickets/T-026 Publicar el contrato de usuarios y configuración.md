---
id: T-026
titulo: Publicar el contrato de usuarios y configuración
modulo: M1 — Usuarios y configuración
capa: contrato
estado: hecho
depende_de: [T-015]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-25, CU-13, CU-26, CU-15, CU-31, DEC-0013, DEC-0016]
origen: plan
asignado: FranLucianoo
tomado_el: 21/10/26 22:09
rama: feature/T-026-publicar-el-contrato-de-usuarios-y-confi
pr:
---
# T-026 Publicar el contrato de usuarios y configuración

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Existen los esquemas y routers stub (`501`) de usuarios, parámetros, comisión por defecto, destinos, requisitos de destino y operadores, con roles en el contrato, tipos generados, hooks y mocks MSW, para que web avance en paralelo con el backend.

## Criterios de aceptación
- [ ] Las rutas del módulo `seguridad` (usuarios) y `configuracion` del contrato del PC1 existen con sus esquemas, roles y errores, **sin** `restablecer-password` (DEC-0016).
- [ ] Todas responden `501` problem+json y exigen el rol del contrato (403 al resto).
- [ ] Tipos regenerados, hooks de TanStack Query y mocks MSW con datos ficticios para cada ruta.

## Tests esperados
`tests/api/test_contrato_m1.py`: cada ruta existe, exige token y rol, y responde 501; en shared, los mocks respetan los esquemas.

## Contexto (leer solo esto)
- [[Contrato de la API (OpenAPI)]] — módulos `seguridad` y `configuracion`
- `05-Diseño/API/openapi.json` (PC1, referencia de esquemas)
- [[DEC-0016 Autenticación con Firebase|DEC-0016]] — endpoints eliminados
- [[DEC-0013 Datos que faltaban en el ER|DEC-0013]]

## Archivos probables
- `src/backend/rumbo/presentacion/esquemas/{usuarios,configuracion}.py`
- `src/backend/rumbo/presentacion/routers/{usuarios,configuracion}.py`
- `src/packages/shared/src/{hooks,esquemas,mocks}/`

## Fuera de alcance
- La lógica de cada endpoint.

## Notas de implementación
- **Implementación (21-22/10/26, Francisco):**
  - Son 24 operaciones con prefijo `/api`, con los mismos métodos, rutas, tags y `x-roles` que el contrato del PC1. No están `login`, `logout` ni `restablecer-password` (DEC-0016).
  - `presentacion/contrato.py` tiene `operacion()`, que arma la guarda `exigir_roles`, la descripción, los errores y `x-roles`/`x-casos-de-uso`, y `no_implementado()`, que responde 501. El 403 sale antes que el 422, salvo con un cuerpo que no es JSON.
  - Esquemas nuevos en `esquemas/usuarios.py` y `esquemas/configuracion.py`, armados desde el ER y DEC-0013, porque en el PC1 eran `SinDetallar`. Las bases comunes `Entrada`, `Edicion`, `omitible()` y `Auditoria` están en `esquemas/comunes.py`.
  - En shared hay 24 hooks de TanStack Query y 24 mocks MSW (`manejadoresM1`, que se suman a pedido con `crearServidor(...manejadoresM1)`).
- **Decisiones de diseño a confirmar con el equipo:**
  - `UsuarioEditar` solo cambia `rol` y `acceso_redes` (CU-25 A2). Si se quiere corregir el nombre, hay que sumarlo.
  - Los `Decimal` salen como texto y entran como número o texto.
- **Review (Opus):** 0 bloqueantes, 3 importantes y 6 menores, todos arreglados en el fix:
  - un `null` en un campo obligatorio de una edición da 422;
  - la comisión por defecto se valida igual que el CHECK de la base;
  - la auditoría aparece en todas las respuestas;
  - los mocks devuelven los importes como texto;
  - se publican `x-roles` y `x-casos-de-uso`;
  - se valida el formato del email y no se aceptan textos vacíos;
  - `claveYo` se invalida cuando el admin se edita a sí mismo;
  - se aclaró el docstring;
  - `127.0.0.1` en `.env.example`.
- **Velocidad de la suite:** en Windows, `localhost` probaba primero IPv6 y perdía unos 2 s por conexión. Con `127.0.0.1` la suite pasa de unos 14 minutos a 80-90 segundos. Cada uno tiene que cambiarlo en su `src/backend/.env`.
- **Verificación:** pasan 484 tests de backend (97,5 %) y 51 de shared. Lint, ruff, mypy y typecheck de shared y web, sin errores.
- **Modelos:** tests, verde y fix con Sonnet; review con Opus. No hubo escalados.
