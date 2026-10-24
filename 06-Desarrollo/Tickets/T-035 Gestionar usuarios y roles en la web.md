---
id: T-035
titulo: Gestionar usuarios y roles en la web
modulo: M1 — Usuarios y configuración
capa: web
estado: hecho
depende_de: [T-034]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-25, RF-144, RF-145, RF-146, RF-147, RF-148, RF-149]
origen: plan
asignado: Nahuel Viniegra
tomado_el: 23/10/26 19:56
rama: feature/T-035-gestionar-usuarios-y-roles-en-la-web
pr:
---
# T-035 Gestionar usuarios y roles en la web

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Admin y dueña listan usuarios, dan de alta uno (que recibe el mail de Firebase), cambian su rol o su acceso a redes y lo dan de baja, con los errores del servidor explicados.

## Criterios de aceptación
- [ ] Listado y alta con nombre, email, rol y acceso a redes; aviso de que la persona recibe un mail para elegir su contraseña.
- [ ] Edición de rol y accesos; baja con confirmación.
- [ ] Los 409 (email duplicado, último admin) se muestran como mensajes claros.

## Tests esperados
`describe('RF-144 alta de usuario')`, `describe('RF-146 email duplicado')`, `describe('RF-149 último admin')` con MSW.

## Contexto (leer solo esto)
- [[Prototipo UI]] — pantallas 31 (PNG en `07-Entregables/Prototipo/img/`)
- [[CU-25 Gestionar usuarios y roles]]

## Archivos probables
- `src/apps/web/src/features/configuracion/usuarios/`

## Fuera de alcance
- Restablecer contraseñas desde Rumbo (lo hace cada usuario con Firebase).

## Notas de implementación
- `PestanaUsuarios` + `FormularioUsuario` con el patrón de T-036 (tabla, formulario arriba, `alertdialog` para la baja, aviso «Mostramos N de M»); pestaña «Usuarios y roles» habilitada.
- Redes por rol (DEC-0013): admin y dueño muestran «Por su rol» y el checkbox queda deshabilitado (marcado). Edición con `esquemaEdicionUsuario` (no valida nombre ni email) y PATCH solo con los campos cambiados (`dirtyFields`).
- `errores.ts` (compartido): `aplicarErroresDelServidor` también devuelve el `detail` de un 403. `CLASE_SELECT` pasó a `CampoFormulario.tsx` (lo usan Comisión y Requisitos).
- **Contra el backend real, solo el alta y el listado funcionan hoy:** PATCH, baja, 409 de último admin y 403 del dueño los implementa **T-028**; acá se validaron contra MSW.
- **Pendiente para después de T-028:** habilitar en la web la edición del `nombre` (CU-25 A2) cuando se regenere `UsuarioEditar`. ✅ 24/10/26: pasa a T-037.
- Menor no aplicado: ocultar «Dueño» en el select si el actor no es dueño (`useYo`). Requiere que 4 tests monten un actor dueño; queda para un ticket chico.
- Pendiente del equipo: panel lateral (pantalla 31) vs. formulario arriba, igual que T-036.
- Review (Opus): 0 bloqueantes, 2 importantes y 7 menores; arreglados todos menos el del select. Tests corregidos con autorización (`--tocar-tests`): valor exacto de la columna de redes, nombres de RF en los `describe` y PATCH con igualdad exacta.
- Modelos: tests sonnet, impl/refactor/fix sonnet, review opus. Sin escalados.
