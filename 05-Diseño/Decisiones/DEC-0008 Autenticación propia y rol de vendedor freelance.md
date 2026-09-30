---
tipo: decision
estado: formalizado
modulo: [seguridad]
decisores: [Francisco, Nahuel, Paloma]
supersede:
fecha_aprobacion: 17/09/26
actualizado: 17/09/26
---
# DEC-0008 Autenticación propia y rol de vendedor freelance

tags:: #tipo/decision #estado/formalizado #pc/pc1

> ✅ **Ratificada en la sync del 17/09/26** (Francisco, Nahuel y Paloma). **Amplía** (no supersede) a [[DEC-0005 Autenticación y modelo de roles]]: resuelve el mecanismo que quedó `#accion/decidir` y agrega un rol. Origen: [[Relevamiento — respuestas de la agencia (17-09)]] (bloque 6).

## Contexto
[[DEC-0005 Autenticación y modelo de roles]] selló el **modelo de roles y visibilidad** (*lectura global + propiedad*) pero dejó el **mecanismo de autenticación** explícitamente `#accion/decidir` (propia y/o Google OAuth). La agencia respondió y, además, sumó un actor que **no** encaja en el modelo de lectura global: el **vendedor freelance**.

## Decisión

### 1. Mecanismo de autenticación: propia, individual
- **Usuario y contraseña individual** por persona (sin cuentas compartidas).
- Motivo del negocio: **identificar quién realizó cada acción** dentro del CRM (**auditoría**).
- Google OAuth queda como **conveniencia opcional/futura**, no requerida.
- → Cierra el `#accion/decidir` de **mecanismo de autenticación** de [[DEC-0005 Autenticación y modelo de roles]].

### 2. Auditoría / trazabilidad
- Para PC1 alcanza con registrar **autor y fecha** de alta/modificación (`created_by` / `updated_by`) en los registros. *(Sync 17/09.)*
- Un **log de acciones completo** queda para **fase 2**.

### 3. Rol `freelance` (vendedor externo) con visibilidad restringida
- Roles resultantes: `dueño`, `admin`, `empleado`, **`freelance`**.
- El `freelance` ve y opera **solo sus** clientes y operaciones (`asesor_asignado` / `responsable` propios); **no** accede a toda la agencia.
- Es la **excepción** al patrón *lectura global* de [[DEC-0005 Autenticación y modelo de roles]] (que sigue vigente para `empleado`/`admin`/`dueño`): a diferencia del `empleado` —que lee todo pero filtra "lo suyo"—, el `freelance` tiene **bloqueo de lectura** fuera de lo propio.
- **Alcance del `freelance` (sync 17/09):**
  - **Ve el catálogo compartido** ([[Hotel]], [[Destino]], [[Operador]]).
  - **Crea clientes**, que quedan **como suyos** (`asesor_asignado` = él).
  - **Ve solo sus** comisiones/liquidación ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]); no la rentabilidad global de la agencia.

### 4. Matriz de visibilidad
Se agrega la dimensión `freelance` (scope = **propio**) a la tabla de [[DEC-0005 Autenticación y modelo de roles#2. Modelo de visibilidad|visibilidad]]. El resto de la matriz no cambia. En el dashboard, `admin`/`dueño` ven la empresa; `empleado` y `freelance` ven **lo suyo** ([[CU-21 Ver dashboard y embudo]] A1).

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Auth propia individual + rol `freelance` con scope propio | Cumple auditoría por persona y el acceso acotado del vendedor externo | Requiere gestión de credenciales y filtros por rol | ✅ |
| Solo Google OAuth | Menos gestión de contraseñas | No garantiza por sí solo identidad individual; no es la preferencia de la agencia | ❌ |
| Cuentas compartidas | Simple | Imposible auditar quién hizo qué | ❌ |

## Cuestiones resueltas en la sync 17/09
- **Alcance del `freelance`:** ve catálogo compartido; crea clientes que quedan como suyos; ve solo sus comisiones.
- **Nivel de auditoría PC1:** `created_by` / `updated_by`; log completo = fase 2.
- **Dashboard:** `admin`/`dueño` = empresa; `empleado` y `freelance` = lo suyo.

## Aclaración de la sync 30/09/26
- **El `freelance` no modifica el catálogo:** consulta los hoteles y sus reseñas, pero **no** da de alta ni edita hoteles ([[CU-16 Gestionar hotel en catálogo|CU-16]]) ni registra reseñas ([[CU-17 Registrar reseña de hotel|CU-17]]). Surgió al ratificar el [[Contrato de la API (OpenAPI)]], que ya lo asumía. No cambia la decisión: precisa qué significa «ve el catálogo compartido».
- **El `freelance` no usa el módulo de redes** ([[CU-19 Planificar contenido en redes|CU-19]] y [[CU-20 Generar propuesta de contenido con IA|CU-20]]): la capacidad `acceso_redes` no se le asigna. También lo asumía el contrato.

## Impacto
- Afecta: [[Usuario]] (enum `rol` +`freelance`; login usuario/contraseña; auditoría `created_by`/`updated_by`), [[DEC-0005 Autenticación y modelo de roles]] (amplía: mecanismo resuelto + rol nuevo), [[CU-24 Iniciar sesión]] (login propio), [[CU-25 Gestionar usuarios y roles]] (gestiona freelance y credenciales), [[CU-21 Ver dashboard y embudo]] (A1: el freelance ve solo lo suyo) y, transversalmente, los filtros de visibilidad. La **comisión** del freelance se liquida vía [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]].

## Decisores y fecha
- Propuesta por **Paloma** (17/09/26) desde el relevamiento traído por Francisco; **ratificada en la sync del 17/09/26** (Francisco, Nahuel y Paloma presentes). **Aprobada: 17/09/26.**
