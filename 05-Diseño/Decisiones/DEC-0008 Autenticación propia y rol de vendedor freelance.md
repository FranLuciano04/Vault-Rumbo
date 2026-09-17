---
tipo: decision
estado: en-revision
modulo: [seguridad]
decisores: []
supersede:
actualizado: 17/09/26
---
# DEC-0008 Autenticación propia y rol de vendedor freelance

tags:: #tipo/decision #estado/en-revision #pc/pc1 #accion/decidir

> **Propuesta** redactada por Paloma (17/09) a partir de [[Relevamiento — respuestas de la agencia (17-09)]] (bloque 6). **A decidir en la sync.** **Amplía** (no supersede) a [[DEC-0005 Autenticación y modelo de roles]]: resuelve el mecanismo que quedó `#accion/decidir` y agrega un rol.

## Contexto
[[DEC-0005 Autenticación y modelo de roles]] selló el **modelo de roles y visibilidad** (*lectura global + propiedad*) pero dejó el **mecanismo de autenticación** explícitamente `#accion/decidir` (propia y/o Google OAuth). La agencia respondió y, además, sumó un actor que **no** encaja en el modelo de lectura global: el **vendedor freelance**.

## Decisión (propuesta)

### 1. Mecanismo de autenticación: propia, individual
- **Usuario y contraseña individual** por persona (sin cuentas compartidas).
- Motivo del negocio: **identificar quién realizó cada acción** dentro del CRM (**auditoría**).
- Google OAuth queda como **conveniencia opcional/futura**, no requerida.
- → Cierra el `#accion/decidir` de **mecanismo de autenticación** de [[DEC-0005 Autenticación y modelo de roles]].

### 2. Auditoría / trazabilidad
- Registrar **autor y fecha** de las acciones (mínimo: creación/modificación de registros sensibles).
- Base para un log de auditoría. _(Nivel de detalle a definir: `created_by`/`updated_by` vs. log completo.)_

### 3. Nuevo rol `freelance` (vendedor externo) con visibilidad restringida
- Roles resultantes: `dueño`, `admin`, `empleado`, **`freelance`**.
- El `freelance` ve y opera **solo sus** clientes y operaciones (`asesor_asignado` / `responsable` propios); **no** accede a toda la agencia.
- Es la **excepción** al patrón *lectura global* de [[DEC-0005 Autenticación y modelo de roles]] (que sigue vigente para `empleado`/`admin`/`dueño`): a diferencia del `empleado` —que lee todo pero filtra "lo suyo"—, el `freelance` tiene **bloqueo de lectura** fuera de lo propio.
- Catálogo compartido ([[Hotel]], [[Destino]]) probablemente visible para el `freelance` _(a confirmar)_.

### 4. Matriz de visibilidad
Se agrega la dimensión `freelance` (scope = **propio**) a la tabla de [[DEC-0005 Autenticación y modelo de roles#2. Modelo de visibilidad|visibilidad]]. El resto de la matriz no cambia.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Auth propia individual + rol `freelance` con scope propio | Cumple auditoría por persona y el acceso acotado del vendedor externo | Requiere gestión de credenciales y filtros por rol | ✅ (propuesta) |
| Solo Google OAuth | Menos gestión de contraseñas | No garantiza por sí solo identidad individual; no es la preferencia de la agencia | ❌ |
| Cuentas compartidas | Simple | Imposible auditar quién hizo qué | ❌ |

## Cuestiones abiertas `#accion/decidir`
- Alcance exacto del `freelance`: ¿ve catálogo de hoteles/destinos? ¿ve sus propias comisiones/liquidación ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]])?
- Nivel de auditoría: `created_by`/`updated_by` vs. log completo de acciones.
- Gestión de credenciales (alta/reset) en [[CU-25 Gestionar usuarios y roles]].

## Impacto
- Afecta: [[Usuario]] (enum `rol` +`freelance`; login usuario/contraseña; auditoría), [[DEC-0005 Autenticación y modelo de roles]] (amplía: mecanismo resuelto + rol nuevo), [[CU-24 Iniciar sesión]] (login propio), [[CU-25 Gestionar usuarios y roles]] (gestiona freelance y credenciales), [[CU-21 Ver dashboard y embudo]] (A1: el freelance ve solo lo suyo) y, transversalmente, los filtros de visibilidad. La **comisión** del freelance se liquida vía [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]].

## Decisores y fecha
- Propuesta por: **Paloma** (17/09/26), desde el relevamiento traído por Francisco. **Pendiente de ratificar en la sync** (módulo de seguridad es de Nahuel). Sin `fecha_aprobacion` hasta entonces.
