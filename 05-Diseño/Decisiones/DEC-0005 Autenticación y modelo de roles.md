---
tipo: decision
estado: formalizado
modulo: [seguridad]
decisores: [Francisco]
fecha_aprobacion: 11/09/26
supersede:
actualizado: 11/09/26
---
# DEC-0005 Autenticación y modelo de roles

tags:: #tipo/decision #estado/formalizado #pc/pc1

## Contexto
[[ARQ — Vista general]] dejaba abierta la autenticación y los roles de [[Usuario]]. El negocio (agencia PyME; hoy Valentina y Diego, padre e hija) necesita que **la información fluya entre todos** —los clientes son de la agencia, no de quien los cargó— pero que cada persona pueda **organizar y responsabilizarse de lo suyo**. El catálogo de hoteles, reseñas y destinos es **compartido**. El modelo debe ser simple hoy y **escalable** (poder endurecer la visibilidad por equipo/sucursal más adelante sin rehacerlo).

## Decisión (parte resuelta)

### 1. Roles operativos
`empleado`, `admin`, `dueño`.
- **`empleado`:** opera el día a día (clientes, oportunidades, cotizaciones, viajes, pagos, alertas, hoteles, redes).
- **`admin`:** todo lo del empleado **+ configuración** (comisión, usuarios y roles, destinos, requisitos por destino, moderación de reseñas).
- **`dueño`:** todo **+ visión de negocio** (dashboard y reportes de toda la empresa).
- El **acceso al módulo de redes** ([[ContenidoRed]]) no es un rol: es una **capacidad** que `admin`/`dueño` asignan ([[CU-25 Gestionar usuarios y roles]]).

### 2. Modelo de visibilidad: **lectura amplia + propiedad para organización** (patrón *org-wide read + ownership*)
La **propiedad de un registro no restringe su lectura**; solo habilita la vista "lo mío" y marca al responsable. Esto reconcilia las dos necesidades: ver todo para colaborar, y filtrar lo propio para organizarse.

| Entidad | Lectura | Escritura / gestión | Propiedad (vista personal) |
|---|---|---|---|
| [[Cliente]] | Toda la agencia | Toda la agencia | `asesor_asignado` **opcional** → filtro "mis clientes" |
| [[Oportunidad]] | Toda la agencia | Responsable + `admin`/`dueño` | `responsable` (quien la registró) |
| [[Viaje]] · [[Pago]] | Toda la agencia (calendario global) | Responsable + `admin`/`dueño` | `responsable` del viaje |
| [[Alerta]] | **Propias por defecto** (agenda del día); `admin`/`dueño` ven todas | Propietario | Propietario (quien la recibe/creó) |
| [[Hotel]] · [[Reseña]] · [[Destino]] · [[ContenidoRed]] | Compartido (todos) | Compartido; **acciones sensibles = `admin`** (moderar reseña, ABM de destinos, config) | — |

**Principio general:** *lectura global para colaborar · propiedad para responsabilidad y filtro personal · escritura mayormente abierta, salvo configuración y moderación que quedan en `admin`.*

### 3. Soporte en el dominio
Para sostener la propiedad sin bloquear la lectura, las entidades operativas llevan un vínculo con el [[Usuario]] responsable:
- [[Cliente]] → `asesor_asignado` (FK `Usuario`, opcional).
- [[Oportunidad]] → `responsable` (FK `Usuario`).
- [[Viaje]] → `responsable` (FK `Usuario`) — ya reflejado como relación *gestiona* en [[MOC — Modelo de dominio]].
- [[Alerta]] → `propietario` (FK `Usuario`).

## Reconciliación con [[Actores]] (resuelta 10/09/26)
- `empleado` reemplaza a `asesor` (usuario principal).
- Se **separa** `admin` (configuración/operación) de `dueño` (visión del negocio); antes eran el mismo actor.
- El **encargado de redes** deja de ser un rol: pasa a ser una **capacidad de acceso al módulo de redes** ([[ContenidoRed]]).

## Ampliación propuesta 17/09 (`en-revision`)
El relevamiento de la agencia ([[Relevamiento — respuestas de la agencia (17-09)]], bloque 6) responde el mecanismo de autenticación y agrega un rol. Se traslada a [[DEC-0008 Autenticación propia y rol de vendedor freelance]] (a ratificar en la sync):
- **Mecanismo:** autenticación **propia con usuario y contraseña individual** (para auditar quién hizo cada acción). Google OAuth queda opcional/futuro.
- **Nuevo rol `freelance`** (vendedor externo) con **visibilidad restringida** (solo lo suyo): es la **excepción** al patrón *lectura global* de esta DEC, que sigue vigente para `empleado`/`admin`/`dueño`.

## Pendiente `#accion/decidir`
- **Mecanismo de autenticación:** ~~aún no definido~~ → **resuelto como propuesta** en [[DEC-0008 Autenticación propia y rol de vendedor freelance]] (usuario/contraseña individual), pendiente de sellar en la sync.
- **Infraestructura de despliegue:** sigue pendiente, ver [[DEC-0001 Stack tecnológico]] y [[ARQ — Vista general]].

## Impacto
- Afecta: [[Usuario]] (enum `rol`), [[Cliente]] (`asesor_asignado`), [[Oportunidad]] (`responsable`), [[Viaje]] (`responsable`), [[Alerta]] (`propietario`), [[Actores]], [[ARQ — Vista general]] y, transversalmente, casi todos los casos de uso (filtros por propiedad, no por bloqueo).

## Decisores y fecha
- Decisores: Francisco (10/09/26; modelo de visibilidad ampliado 11/09/26) — **Aprobada: 11/09/26** (sync; Francisco y Nahuel presentes, Paloma notificada por Git). Se aprueba el **modelo de roles y visibilidad**; el **mecanismo de autenticación** sigue `#accion/decidir` (no bloquea el sello del resto).
