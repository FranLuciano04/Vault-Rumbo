---
tipo: caso-uso
estado: en-revision
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 17/09/26
---
# CU-31 Gestionar operadores

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Alta, baja y modificación (ABM) de los **operadores/proveedores** del catálogo. El catálogo de operadores es la **contraparte del `costo`** de un [[Viaje]] y la base de los reportes de **ventas por operador** y **pendiente de pago a operadores** ([[CU-22 Generar reportes y estadísticas]], [[CU-21 Ver dashboard y embudo]]). Ver [[DEC-0009 Operador-Proveedor como entidad de catálogo]].

## Actor principal
[[Actores|admin]]

## Actores secundarios
- [[Actores|dueño]] (ve toda la empresa y accede a configuración; puede gestionar el catálogo).

## Precondiciones
- El [[Usuario]] inició sesión con rol `admin` o `dueño` ([[CU-24 Iniciar sesión]], [[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El admin abre el catálogo de operadores.
2. El sistema lista los operadores existentes.
3. **Alta:** el admin crea un operador con sus datos (nombre; opcional contacto / ejecutivo de cuentas).
4. **Modificación:** edita los datos de un operador existente.
5. **Baja:** da de baja un operador que ya no se usa.
6. El sistema valida y persiste el cambio en el catálogo compartido.

## Flujos alternativos
- **A1 — Nombre duplicado:** el operador ya existe → el sistema rechaza el alta.
- **A2 — Operador en uso:** si hay [[Viaje|Viajes]] asociados, el sistema impide la baja física y aplica **baja lógica** (`activo = false`, conserva el historial y los reportes).
- **A3 — Reactivar:** un operador dado de baja lógica puede reactivarse.

## Postcondiciones
- El catálogo de operadores queda actualizado y disponible para [[CU-10 Registrar economía del viaje]] y los reportes de [[CU-22 Generar reportes y estadísticas]].

## Reglas de negocio aplicadas
- Integridad referencial: no eliminar un operador en uso (baja lógica).

## Entidades del dominio involucradas
- [[Operador]] · [[Viaje]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Paloma (17/09) — CU nuevo para dar ABM a la 13ª entidad [[Operador]] ([[DEC-0009 Operador-Proveedor como entidad de catálogo]], sync 17/09), análogo a [[CU-26 Gestionar destinos]]. Actor `admin`/`dueño`, baja lógica. **Pendiente:** confirmar el módulo (¿*Economía* o *Configuración/Catálogos*?) y el `responsable` de la especificación.
> [!note] Nahuel (18/09) — Sumado el nodo CU-31 al [[DGM — Casos de uso]] (módulo *Economía y pagos*, actor `admin`) y regenerado el entregable DOCX. Se resolvió el pendiente de agregarlo al diagrama.
