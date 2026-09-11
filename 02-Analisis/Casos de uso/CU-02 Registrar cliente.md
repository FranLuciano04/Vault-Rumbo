---
tipo: caso-uso
estado: en-revision
modulo: [clientes]
responsable: Paloma
pc: pc1
actualizado: 10/09/26
---
# CU-02 Registrar cliente

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El empleado da de alta un nuevo [[Cliente]] con sus datos de contacto y segmento, para conservar su ficha e historial y poder asociarlo a consultas y viajes. Es la base de la **memoria del cliente**, el activo del negocio (ver [[Relevamiento — Fuente de verdad]]).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: aporta sus datos; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre **Nuevo cliente**.
2. Carga los datos de la ficha: **nombre**, **contacto** (WhatsApp / Instagram / email), **segmento** (familia · amigos · individual), **preferencias** y, opcionalmente, un **asesor asignado** ([[Usuario]]) para organizarlo en la vista "mis clientes" (no restringe el acceso del resto — ver [[DEC-0005 Autenticación y modelo de roles]]).
3. El sistema valida los datos mínimos (**nombre** y al menos un **contacto** válido: teléfono/WhatsApp o email) y busca posibles fichas duplicadas por contacto o nombre.
4. El sistema crea el [[Cliente]] y confirma el alta.
5. El sistema ofrece continuar registrando una consulta ([[CU-04 Registrar consulta]]) o completar la ficha ([[CU-03 Gestionar ficha del cliente]]).

## Flujos alternativos
- **A1 — Posible duplicado:** en el paso 3 el sistema detecta un `Cliente` con el mismo contacto (o nombre muy similar) → lo advierte y ofrece **abrir la ficha existente** ([[CU-03 Gestionar ficha del cliente]]) en lugar de crear una nueva.
- **A2 — Alta rápida desde una consulta:** el CU se invoca desde [[CU-04 Registrar consulta]] con los datos mínimos; la ficha se completa más tarde ([[CU-03 Gestionar ficha del cliente]]).
- **A3 — Datos mínimos incompletos:** falta el nombre o un contacto válido → el sistema no guarda y pide completarlos.

## Postcondiciones
- Existe un [[Cliente]] con al menos nombre y un contacto (teléfono/WhatsApp o email), disponible para asociarlo a [[Oportunidad|Oportunidades]] ([[CU-04 Registrar consulta]]) y para gestionar su ficha ([[CU-03 Gestionar ficha del cliente]]).
- Una vez dado de alta, el `Cliente` es **visible y editable para toda la agencia** (activo compartido). El `asesor_asignado` solo habilita la vista "mis clientes" y marca responsabilidad, sin bloquear el acceso del resto; la [[Oportunidad]], en cambio, tiene un `responsable` que la gestiona aunque también sea legible por todos (ver [[DEC-0005 Autenticación y modelo de roles]]).
- El `Cliente` **no** es un [[Usuario]]: no accede ni opera el sistema (ver [[Actores]]).

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU; la comisión aplica recién al confirmar el [[Viaje]].)
- Invariante de dominio: un [[Cliente]] no es un [[Usuario]].

## Entidades del dominio involucradas
- [[Cliente]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad del alta de cliente.

## Decisiones asociadas
- [[DEC-0005 Autenticación y modelo de roles]] (visibilidad del `Cliente` según rol).

## 🔎 Revisión
> [!note] Paloma (10/09): Decisiones confirmadas por la responsable, a ratificar en la sync — (1) datos mínimos = **nombre + al menos un contacto** (teléfono/WhatsApp o email); (2) el sistema **detecta duplicados** por contacto/nombre (A1); (3) el `Cliente` queda **visible para toda la agencia** una vez dado de alta. Conviene reflejar (3) en [[DEC-0005 Autenticación y modelo de roles]] (visibilidad — coordinar con Nahuel).
>
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Se resolvió el modelo de visibilidad en [[DEC-0005 Autenticación y modelo de roles]] confirmando el punto (3) de Paloma: `Cliente` **global** (lectura y escritura para toda la agencia) + `asesor_asignado` **opcional** para la vista "mis clientes". Paloma: queda para tu conocimiento; si algo no te cierra, lo vemos en la sync.
