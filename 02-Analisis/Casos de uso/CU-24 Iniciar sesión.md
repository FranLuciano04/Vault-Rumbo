---
tipo: caso-uso
estado: en-revision
modulo: [seguridad]
responsable: Nahuel
pc: pc1
actualizado: 10/09/26
---
# CU-24 Iniciar sesión

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Autenticar a un [[Usuario]] y cargar su contexto de trabajo según el rol, aplicando la visibilidad segmentada del negocio ([[DEC-0005 Autenticación y modelo de roles]]).

## Actor principal
[[Actores|empleado]] (cualquier [[Usuario]]: `empleado`, `admin` o `dueño`).

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] fue dado de alta y está activo ([[CU-25 Gestionar usuarios y roles]]).

## Flujo principal
1. El [[Usuario]] ingresa sus credenciales.
2. El sistema valida la identidad.
3. El sistema abre una sesión.
4. El sistema carga el contexto según el `rol` ([[DEC-0005 Autenticación y modelo de roles]]):
   - `empleado` → **lectura global** de [[Cliente|Clientes]], [[Oportunidad|Oportunidades]], [[Viaje|Viajes]] y [[Pago|Pagos]] de toda la agencia, con **vista personal** por defecto de lo que tiene a cargo (filtro "lo mío"); su **agenda de [[Alerta|Alertas]]** muestra las propias.
   - `admin` / `dueño` → toda la empresa (incluidas todas las [[Alerta|Alertas]]), más configuración y reportes.

## Flujos alternativos
- **A1 — Credenciales inválidas:** el sistema rechaza el acceso y no abre sesión.
- **A2 — Inicio con Google (OAuth):** _pendiente de decidir_ — mecanismo aún abierto en [[DEC-0005 Autenticación y modelo de roles]] `#accion/decidir`.
- **A3 — Cerrar sesión:** el [[Usuario]] cierra la sesión y el sistema descarta su contexto.

## Postcondiciones
- Sesión activa con los permisos y la visibilidad correspondientes al `rol` del [[Usuario]].

## Reglas de negocio aplicadas
- Autorización a nivel de fila por propietario y rol ([[DEC-0005 Autenticación y modelo de roles]]).

## Entidades del dominio involucradas
- [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!question] Nahuel (10/09): el **mecanismo de autenticación** (propia y/o Google OAuth) sigue sin definir en [[DEC-0005 Autenticación y modelo de roles]]. Especifiqué el flujo de forma **agnóstica al mecanismo**; A2 queda como pendiente hasta cerrar la DEC.
>
> [!note] Francisco (11/09): Ajustado el paso 4 al modelo de visibilidad resuelto en [[DEC-0005 Autenticación y modelo de roles]] — **lectura global** de Clientes/Oportunidades/Viajes/Pagos con **vista personal** por defecto (no cartera cerrada); solo la agenda de Alertas es personal. El mecanismo de autenticación **sigue sin definir** (aún no sabemos cómo se resolverá). A ratificar con Nahuel.
