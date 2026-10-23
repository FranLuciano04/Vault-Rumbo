---
id: T-035
titulo: Gestionar usuarios y roles en la web
modulo: M1 — Usuarios y configuración
capa: web
estado: tomado
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
