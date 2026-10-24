---
id: T-028
titulo: Editar el rol de un usuario protegiendo al último admin
modulo: M1 — Usuarios y configuración
capa: backend
estado: hecho
depende_de: [T-027]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-25, RF-147, RF-148, RF-149, RF-153, DEC-0016]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 23/10/26 22:48
rama: feature/T-028-editar-el-rol-de-un-usuario-protegiendo
pr:
---
# T-028 Editar el rol de un usuario protegiendo al último admin

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña cambian el rol y los accesos de un usuario o lo dan de baja (lógica, con la cuenta de Firebase deshabilitada), sin dejar nunca al sistema sin administrador.

## Criterios de aceptación
- [ ] `PATCH /usuarios/{id}` cambia `nombre`, rol y `acceso_redes` (sumar `nombre` a `UsuarioEditar` en el contrato y regenerar tipos y mocks; decidido el 22/10/26, CU-25 A2); `POST /usuarios/{id}/baja` pone `activo = false` y deshabilita la cuenta en Firebase.
- [ ] Bajar o cambiar de rol al último `admin` activo → 409 (A4).
- [ ] Tras la baja, el siguiente pedido de ese usuario responde 401.
- [ ] Solo un `dueno` puede dar de alta a un `dueno` (`POST /usuarios`, código de T-027) o asignar ese rol (`PATCH`). Si lo intenta un `admin` → 403 (CU-25, decidido el 23/10/26).

## Tests esperados
`tests/api/test_usuarios.py`: `test_rf147_editar_rol`, `test_rf147_corregir_nombre`, `test_rf148_baja_logica_deshabilita_cuenta`, `test_rf148_baja_corta_el_acceso`, `test_rf149_ultimo_admin_409`, `test_rf147_admin_no_puede_crear_ni_asignar_dueno_403`.

## Contexto (leer solo esto)
- [[CU-25 Gestionar usuarios y roles]] — A2, A3 y A4
- [[DEC-0016 Autenticación con Firebase|DEC-0016]]
- Contrato: `src/packages/shared/openapi.json` (módulo `seguridad`) y [[Contrato de la API (OpenAPI)]] §Convenciones

## Archivos probables
- `src/backend/rumbo/negocio/servicios/seguridad.py`
- `src/backend/rumbo/presentacion/routers/usuarios.py`

## Fuera de alcance
- Reasignar los clientes de un freelance dado de baja (no lo pide CU-25).

## Notas de implementación
- `editar_usuario` y `dar_de_baja_usuario` en `negocio/servicios/seguridad.py`; el PATCH aplica solo los campos enviados. `UsuarioEditar` suma `nombre` (1..120); `openapi.json` y `tipos.gen.ts` regenerados (los mocks MSW ya mezclaban el cuerpo).
- **Regla de la dueña ampliada por Nahuel (23/10/26), anotada en CU-25:** un admin no puede quitar el rol `dueno` ni dar de baja a una dueña (403). El 403 se evalúa antes que el 409 del último admin.
- **Concurrencia:** se bloquean con `FOR UPDATE` primero los admins activos (por id) y después el usuario objetivo, siempre en ese orden para evitar deadlocks. No hay test de concurrencia real; se apoya en el orden de bloqueo.
- **Baja:** primero se deshabilita la cuenta de Firebase y después `activo = false`. Si Firebase falla → 502 y el usuario sigue activo; `UserNotFoundError` cuenta como deshabilitada; la baja de alguien inactivo es idempotente. El Admin SDK ahora tiene `httpTimeout` de 10 s (antes, 120 s por defecto).
- `test_contrato_m1.py`: PATCH y baja de usuarios pasan a `IMPLEMENTADAS` (con `--tocar-tests`, como los tickets anteriores).
- Review de seguridad (sonnet): 0 bloqueantes, 1 importante (rol leído sin bloqueo) y 2 menores (timeout de Firebase y tests de seguridad faltantes), todos arreglados.
- **Abierto:** proteger a la última `dueno` activa (`#accion/decidir` en CU-25). Menor sin hacer: sumar `nombre` a `NULOS_EN_OBLIGATORIOS` de `test_contrato_m1.py`. En la web falta habilitar la edición del nombre (T-035).
- En esta PC, pytest necesita `--basetemp` dentro del scratchpad: `C:\Users\test123\AppData\Local\Temp\pytest-of-test123` da `PermissionError`. El problema es de la máquina, no del código.
- Modelos: tests sonnet, impl/refactor/fix opus, review sonnet. Sin escalados.
