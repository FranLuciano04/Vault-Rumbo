---
tipo: caso-uso
estado: formalizado
modulo: [seguridad]
responsable: Nahuel
pc: pc1
actualizado: 13/10/26
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
3. El admin da de alta un [[Usuario]] con `nombre`, `email`, `rol` (`empleado` · `admin` · `dueño` · `freelance`). El sistema crea su **cuenta individual** en Firebase Authentication y le envía por mail el link para elegir su contraseña; nadie más conoce la contraseña ([[DEC-0016 Autenticación con Firebase|DEC-0016]]).
4. Opcionalmente asigna la **capacidad de acceso al módulo de redes** ([[ContenidoRed]]), que no es un rol sino un permiso ([[Actores]]).
5. El sistema valida y guarda el [[Usuario]]. Si el rol es `freelance`, queda con **visibilidad restringida** (solo lo suyo, [[DEC-0008 Autenticación propia y rol de vendedor freelance]]); los [[Cliente|Clientes]] que cree quedan con él como `asesor_asignado`.

## Flujos alternativos
- **A1 — Email duplicado:** el `email` ya tiene un [[Usuario]] en Rumbo → el sistema rechaza el alta. Si el email tiene cuenta en Firebase pero **ningún** `Usuario` (un alta anterior quedó a medias), el sistema completa el alta en lugar de rechazarla (decidido el 23/10/26, Francisco; T-153). Para eso **borra esa cuenta y crea una nueva**, así no queda ninguna credencial previa: ni contraseña, ni proveedor enlazado, ni sesiones (decidido el 24/10/26, Paloma, por la review de seguridad de T-153). El email sigue siendo único.
- **Restricción del rol `dueño` (decidida el 23/10/26, Francisco):** solo un usuario con rol `dueño` puede dar de alta a otro `dueño` o asignarle ese rol a alguien. Un `admin` que lo intente recibe 403.
  - **Ampliación (decidida el 23/10/26, Nahuel; T-028):** tampoco un `admin` puede quitarle el rol `dueño` a una dueña ni darla de baja (403); solo otra `dueño` puede. Un `admin` sí puede corregirle el nombre y el acceso a redes, y reenviar el mismo rol no cuenta como cambio. Queda abierto `#accion/decidir` si se protege a la última `dueño` activa, como al último `admin` (A4).
- **A2 — Editar rol o accesos:** el admin cambia el `rol` o la capacidad de redes de un [[Usuario]]; aplica en su próximo inicio de sesión. También puede corregir su `nombre` (decidido el 22/10/26). El email no se edita, porque identifica la cuenta de Firebase ([[DEC-0016 Autenticación con Firebase|DEC-0016]]).
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
