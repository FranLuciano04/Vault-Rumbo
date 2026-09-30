---
tipo: caso-uso
estado: formalizado
modulo: [seguridad]
responsable: Nahuel
pc: pc1
actualizado: 30/09/26
fecha_aprobacion: 29/09/26
---
# CU-25 Gestionar usuarios y roles

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Alta, baja y edición de [[Usuario|Usuarios]], asignación de su `rol` y de la capacidad de acceso al módulo de redes ([[Actores]], [[DEC-0005 Autenticación y modelo de roles]]).

## Actor principal
[[Actores|admin]] (también `dueño`)

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] inició sesión con rol `admin` o `dueño` ([[CU-24 Iniciar sesión]], [[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El admin abre la gestión de [[Usuario|Usuarios]].
2. El sistema lista los [[Usuario|Usuarios]] con su `rol` y estado.
3. El admin da de alta un [[Usuario]] con `nombre`, `email`, `rol` (`empleado` · `admin` · `dueño` · `freelance`) y sus **credenciales de acceso** (usuario/contraseña individual, [[DEC-0008 Autenticación propia y rol de vendedor freelance]]).
4. Opcionalmente asigna la **capacidad de acceso al módulo de redes** ([[ContenidoRed]]), que no es un rol sino un permiso ([[Actores]]).
5. El sistema valida y guarda el [[Usuario]]. Si el rol es `freelance`, queda con **visibilidad restringida** (solo lo suyo, [[DEC-0008 Autenticación propia y rol de vendedor freelance]]); los [[Cliente|Clientes]] que cree quedan con él como `asesor_asignado`.

## Flujos alternativos
- **A1 — Email duplicado:** el `email` ya existe → el sistema rechaza el alta.
- **A2 — Editar rol o accesos:** el admin cambia el `rol` o la capacidad de redes de un [[Usuario]]; aplica en su próximo inicio de sesión.
- **A3 — Baja de usuario:** baja **lógica** (se desactiva y conserva el historial de lo gestionado); no se elimina físicamente.
- **A4 — Último admin:** el sistema impide quitar el rol `admin` o dar de baja al último [[Usuario]] `admin` para no dejar la empresa sin administración.

## Postcondiciones
- El padrón de [[Usuario|Usuarios]], sus roles y accesos queda actualizado.

## Reglas de negocio aplicadas
- Modelo de roles y visibilidad ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Sync 30/09/26 (Francisco, Nahuel y Paloma): la `dueño` también realiza este caso de uso. Se alinea con DEC-0005 («el dueño tiene todo, más la visión del negocio»), con el relevamiento («Administrador / Dueña: configura comisiones, gestiona usuarios») y con el [[Contrato de la API (OpenAPI)]], que ya lo permitía.

> [!question] Nahuel (10/09): asumo **baja lógica** (A3) y la salvaguarda del **último admin** (A4). Confirmar en la sync. La creación de la propia contraseña/credencial depende del mecanismo pendiente en [[DEC-0005 Autenticación y modelo de roles]].
>
> [!success] Nahuel (18/09, entrevista grill) — **rol `freelance` y credenciales incorporados (Q5):** el alta ahora contempla el rol `freelance` (visibilidad restringida) y las **credenciales usuario/contraseña individual** ([[DEC-0008 Autenticación propia y rol de vendedor freelance]], que resolvió el mecanismo pendiente). A ratificar en sync.
