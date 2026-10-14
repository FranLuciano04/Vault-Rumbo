---
id: T-028
titulo: Editar el rol de un usuario protegiendo al último admin
modulo: M1 — Usuarios y configuración
capa: backend
estado: libre
depende_de: [T-027]
tamaño: M
riesgo: alto
modelo_tests: sonnet
modelo_impl: opus
modelo_review: sonnet
trazabilidad: [CU-25, RF-147, RF-148, RF-149, RF-153, DEC-0016]
origen: plan
asignado:
tomado_el:
rama:
pr:
---
# T-028 Editar el rol de un usuario protegiendo al último admin

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña cambian el rol y los accesos de un usuario o lo dan de baja (lógica, con la cuenta de Firebase deshabilitada), sin dejar nunca al sistema sin administrador.

## Criterios de aceptación
- [ ] `PATCH /usuarios/{id}` cambia rol y `acceso_redes`; `POST /usuarios/{id}/baja` pone `activo = false` y deshabilita la cuenta en Firebase.
- [ ] Bajar o cambiar de rol al último `admin` activo → 409 (A4).
- [ ] Tras la baja, el siguiente pedido de ese usuario responde 401.

## Tests esperados
`tests/api/test_usuarios.py`: `test_rf147_editar_rol`, `test_rf148_baja_logica_deshabilita_cuenta`, `test_rf148_baja_corta_el_acceso`, `test_rf149_ultimo_admin_409`.

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
