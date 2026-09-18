---
tipo: caso-uso
estado: en-revision
modulo: [seguridad]
responsable: Nahuel
pc: pc1
actualizado: 11/09/26
---
# CU-24 Iniciar sesión

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Autenticar a un [[Usuario]] y cargar su contexto de trabajo según el rol, aplicando la visibilidad segmentada del negocio ([[DEC-0005 Autenticación y modelo de roles]]).

## Actor principal
[[Actores|empleado]] (cualquier [[Usuario]]: `empleado`, `admin`, `dueño` o `freelance`).

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] fue dado de alta y está activo ([[CU-25 Gestionar usuarios y roles]]).

## Flujo principal
1. El [[Usuario]] ingresa sus credenciales.
2. El sistema valida la identidad.
3. El sistema abre una sesión.
4. El sistema carga el contexto según el `rol` ([[DEC-0005 Autenticación y modelo de roles]], [[DEC-0008 Autenticación propia y rol de vendedor freelance]]):
   - `empleado` → **lectura global** de [[Cliente|Clientes]], [[Oportunidad|Oportunidades]], [[Viaje|Viajes]] y [[Pago|Pagos]] de toda la agencia, con **vista personal** por defecto de lo que tiene a cargo (filtro "lo mío"); su **agenda de [[Alerta|Alertas]]** muestra las propias.
   - `admin` / `dueño` → toda la empresa (incluidas todas las [[Alerta|Alertas]]), más configuración y reportes.
   - `freelance` → **solo lo suyo** (excepción al *lectura global*, [[DEC-0008 Autenticación propia y rol de vendedor freelance]]): ve y opera únicamente sus [[Cliente|Clientes]], [[Oportunidad|Oportunidades]], [[Viaje|Viajes]], [[Pago|Pagos]] y comisiones; ve el **catálogo compartido** ([[Hotel]], [[Destino]], [[Operador]]) y su agenda de [[Alerta|Alertas]] propias. No accede a la información de toda la agencia.

## Flujos alternativos
- **A1 — Credenciales inválidas:** el sistema rechaza el acceso y no abre sesión.
- **A2 — Inicio con Google (OAuth):** alternativa de autenticación prevista mediante una cuenta de Google; una vez validada la identidad, el sistema abre la sesión igual que en el flujo principal.
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
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Ajustado el paso 4 al modelo de visibilidad resuelto en [[DEC-0005 Autenticación y modelo de roles]] — **lectura global** de Clientes/Oportunidades/Viajes/Pagos con **vista personal** por defecto (no cartera cerrada); solo la agenda de Alertas es personal. El mecanismo de autenticación **sigue sin definir** (aún no sabemos cómo se resolverá). Nahuel: para tu conocimiento; ajustable en la sync.
>
> [!success] Nahuel (18/09, entrevista grill) — **mecanismo resuelto y rol `freelance` propagado (Q5):** la autenticación es **usuario/contraseña individual** ([[DEC-0008 Autenticación propia y rol de vendedor freelance]], sellada 17/09), por lo que A2 (Google OAuth) queda como **conveniencia opcional/futura**. Se agregó al paso 4 el contexto del rol `freelance` (ve solo lo suyo + catálogo compartido).
