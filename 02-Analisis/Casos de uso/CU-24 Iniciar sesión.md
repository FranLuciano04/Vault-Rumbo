---
tipo: caso-uso
estado: formalizado
modulo: [seguridad]
responsable: Nahuel
pc: pc1
actualizado: 13/10/26
fecha_aprobacion: 29/09/26
---
# CU-24 Iniciar sesión

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Autenticar a un [[Usuario]] y cargar su contexto de trabajo según el rol, aplicando la visibilidad segmentada del negocio ([[DEC-0005 Autenticación y modelo de roles]]).

## Actor principal
[[Actores|empleado]] (cualquier [[Usuario]]: `empleado`, `admin`, `dueño` o `freelance`).

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] fue dado de alta y está activo ([[CU-25 Gestionar usuarios y roles]]).

## Flujo principal
1. El [[Usuario]] ingresa su email y su contraseña.
2. El sistema valida la identidad con Firebase Authentication y verifica que el [[Usuario]] exista en Rumbo y esté activo ([[DEC-0016 Autenticación con Firebase|DEC-0016]]).
3. El sistema abre una sesión.
4. El sistema carga el contexto según el `rol`:
   - `empleado` → **lectura global** de [[Cliente|Clientes]], [[Oportunidad|Oportunidades]], [[Viaje|Viajes]] y [[Pago|Pagos]] de toda la agencia, con **vista personal** por defecto de lo que tiene a cargo (filtro "lo mío"); su **agenda de [[Alerta|Alertas]]** muestra las propias.
   - `admin` / `dueño` → toda la empresa (incluidas todas las [[Alerta|Alertas]]), más configuración y reportes.
   - `freelance` → **solo lo suyo** (excepción al *lectura global*, [[DEC-0008 Autenticación propia y rol de vendedor freelance]]): ve y opera únicamente sus [[Cliente|Clientes]], [[Oportunidad|Oportunidades]], [[Viaje|Viajes]], [[Pago|Pagos]] y comisiones; ve el **catálogo compartido** ([[Hotel]], [[Destino]], [[Operador]]) y su agenda de [[Alerta|Alertas]] propias. No accede a la información de toda la agencia.

## Flujos alternativos
- **A1 — Credenciales inválidas o usuario no habilitado:** la contraseña es incorrecta, o la cuenta no corresponde a un [[Usuario]] activo de Rumbo → el sistema rechaza el acceso y no abre sesión.
- **A2 — Inicio con Google:** el [[Usuario]] ingresa con su cuenta de Google. Solo se admite si su email ya fue dado de alta en Rumbo ([[CU-25 Gestionar usuarios y roles|CU-25]]); después, la sesión se abre igual que en el flujo principal ([[DEC-0016 Autenticación con Firebase|DEC-0016]]).
- **A3 — Cerrar sesión:** el [[Usuario]] cierra la sesión y el sistema descarta su contexto.
- **A4 — Olvidé mi contraseña:** el [[Usuario]] pide restablecerla y recibe por mail un link para elegir una nueva ([[DEC-0016 Autenticación con Firebase|DEC-0016]]).

## Postcondiciones
- Sesión activa con los permisos y la visibilidad correspondientes al `rol` del [[Usuario]].

## Reglas de negocio aplicadas
- Autorización a nivel de fila por propietario y rol ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!info] Equipo (13/10/26) — **autenticación con Firebase** ([[DEC-0016 Autenticación con Firebase|DEC-0016]]): el paso 2 valida con Firebase Authentication, A2 (Google) queda habilitado para cuentas ya dadas de alta y se suma A4 (olvidé mi contraseña).
>
> [!question] Nahuel (10/09): el **mecanismo de autenticación** (propia y/o Google OAuth) sigue sin definir en [[DEC-0005 Autenticación y modelo de roles]]. Especifiqué el flujo de forma **agnóstica al mecanismo**; A2 queda como pendiente hasta cerrar la DEC.
>
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Ajustado el paso 4 al modelo de visibilidad resuelto en [[DEC-0005 Autenticación y modelo de roles]] — **lectura global** de Clientes/Oportunidades/Viajes/Pagos con **vista personal** por defecto (no cartera cerrada); solo la agenda de Alertas es personal. El mecanismo de autenticación **sigue sin definir** (aún no sabemos cómo se resolverá). Nahuel: para tu conocimiento; ajustable en la sync.
>
> [!success] Nahuel (18/09, entrevista grill) — **mecanismo resuelto y rol `freelance` propagado (Q5):** la autenticación es **usuario/contraseña individual** ([[DEC-0008 Autenticación propia y rol de vendedor freelance]], sellada 17/09), por lo que A2 (Google OAuth) queda como **conveniencia opcional/futura**. Se agregó al paso 4 el contexto del rol `freelance` (ve solo lo suyo + catálogo compartido).
